/**
 * ============================================================
 *  supabasePRPOService.js — Module 02: Đề Xuất Mua Hàng PR-PO (Supabase)
 *  Cùng "hình dạng" hàm với googleSheetsService.js / Code.gs.
 * ============================================================
 */
import { supabase } from './supabaseClient';
import { getKhoData, saveKhoItem } from './supabaseStoreService';
import { prevMonthStr } from './supabaseShared';

const TABLE = 'prpo_items';

function rowToItem(row) {
  return {
    rowIndex: row.id,
    Stt: row.stt,
    TenHang: row.ten_hang,
    DVT: row.dvt,
    StockMax: row.stock_max,
    GhiChu: row.ghi_chu,
    Hidden: row.hidden === true,
  };
}

async function readPrpoRows(thang) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('thang', thang).order('stt');
  if (error) throw new Error(error.message);
  return data.map(rowToItem);
}

/**
 * Lấy danh sách PR-PO của 1 tháng (kèm cả mặt hàng đang ẩn — frontend tự lọc).
 * StockInHand luôn lấy "sống" từ Ton của Module 01 (Kho HK).
 */
export async function getPRPOData(thang) {
  const storeItems = await getKhoData(thang);
  let prpoRows = await readPrpoRows(thang);

  // Kế thừa danh sách PR-PO từ tháng liền trước khi tháng hiện tại chưa có gì
  if (prpoRows.length === 0) {
    const prevThang = prevMonthStr(thang);
    const prevRows = await readPrpoRows(prevThang);
    if (prevRows.length > 0) {
      const newRows = prevRows.map((r, idx) => ({
        thang,
        stt: idx + 1,
        ten_hang: r.TenHang,
        dvt: r.DVT,
        stock_max: r.StockMax,
        ghi_chu: r.GhiChu || '',
        hidden: r.Hidden === true,
      }));
      const { error } = await supabase.from(TABLE).insert(newRows);
      if (error) throw new Error(error.message);
      prpoRows = await readPrpoRows(thang);
    }
  }

  const stockMap = {};
  storeItems.forEach((it) => { stockMap[it.TenHang] = Number(it.Ton) || 0; });

  // Fallback: item nào Kho tháng hiện tại chưa có thì lấy Tồn tháng trước
  const missingNames = prpoRows.map((r) => r.TenHang).filter((n) => stockMap[n] === undefined);
  if (missingNames.length > 0) {
    const prevThang = prevMonthStr(thang);
    const prevStoreItems = await getKhoData(prevThang);
    const prevStockMap = {};
    prevStoreItems.forEach((it) => { prevStockMap[it.TenHang] = Number(it.Ton) || 0; });
    missingNames.forEach((n) => {
      if (prevStockMap[n] !== undefined) stockMap[n] = prevStockMap[n];
    });
  }

  return prpoRows.map((r) => {
    const stockInHand = stockMap[r.TenHang] !== undefined ? stockMap[r.TenHang] : 0;
    const stockMax = Number(r.StockMax) || 0;
    const deXuatMua = Math.max(stockMax - stockInHand, 0);
    return { ...r, StockInHand: stockInHand, DeXuatMua: deXuatMua };
  });
}

export async function savePRPOItem(thang, item) {
  const row = {
    thang,
    stt: item.Stt,
    ten_hang: item.TenHang,
    dvt: item.DVT,
    stock_max: item.StockMax,
    ghi_chu: item.GhiChu || '',
    hidden: item.Hidden === true || item.Hidden === 'true',
  };

  if (item.rowIndex) {
    const { data, error } = await supabase.from(TABLE).update(row).eq('id', item.rowIndex).select().single();
    if (error) throw new Error(error.message);
    return { rowIndex: data.id };
  }
  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw new Error(error.message);
  return { rowIndex: data.id };
}

/** Ẩn/Hiện lại 1 mặt hàng (không xoá dòng thật) */
export async function setPRPOHidden(thang, rowIndex, hidden) {
  const { error } = await supabase.from(TABLE).update({ hidden }).eq('id', rowIndex);
  if (error) throw new Error(error.message);
  return { rowIndex, hidden };
}

/** Tạo 1 mặt hàng hoàn toàn mới — thêm vào cả Kho HK (Module 01) và PR-PO (Module 02) */
export async function addNewItemFull(thang, tenHang, dvt) {
  const storeItems = await getKhoData(thang);
  const already = storeItems.some((it) => it.TenHang === tenHang);
  if (!already) {
    await saveKhoItem(thang, {
      Stt: storeItems.length + 1,
      MaHang: '',
      TenHang: tenHang,
      DVT: dvt,
      DauKy: 0, SetUp: 0, Nhap: 0, Transfer: 0, HuHongMat: 0, Ton: 0, Cost: 0, GhiChu: '',
    });
  }

  const prpoRows = await readPrpoRows(thang);
  await savePRPOItem(thang, { Stt: prpoRows.length + 1, TenHang: tenHang, DVT: dvt, StockMax: 0, GhiChu: '', Hidden: false });

  return { created: tenHang };
}
