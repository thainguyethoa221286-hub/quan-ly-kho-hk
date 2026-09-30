/**
 * ============================================================
 *  supabaseMinibarService.js — Module 04: Quản Lý Minibar (Supabase)
 *  5 phần: catalog, setup (ma trận tầng), FBFO, bills (daily), summary.
 * ============================================================
 */
import { supabase } from './supabaseClient';
import { getDamageData } from './supabaseDamageService';
import { normalizeName, dedupeByName, prevMonthStr } from './supabaseShared';

const FLOORS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'];
const CATALOG_TABLE = 'minibar_catalog';
const SETUP_TABLE = 'minibar_setup';
const FBFO_TABLE = 'minibar_fbfo';
const BILLS_TABLE = 'minibar_bills';
const SUMMARY_TABLE = 'minibar_summary';

// ========== 1. Danh mục Item Minibar ==========
function catalogRowToItem(row) {
  return { rowIndex: row.id, TenHang: row.ten_hang, DVT: row.dvt, DonGia: row.don_gia };
}

export async function getMinibarCatalog() {
  const { data, error } = await supabase.from(CATALOG_TABLE).select('*').order('id');
  if (error) throw new Error(error.message);
  return dedupeByName(data.map(catalogRowToItem));
}

export async function saveMinibarCatalogItem(item) {
  const row = { ten_hang: item.TenHang, dvt: item.DVT, don_gia: item.DonGia };
  if (item.rowIndex) {
    const { error } = await supabase.from(CATALOG_TABLE).update(row).eq('id', item.rowIndex);
    if (error) throw new Error(error.message);
    return { rowIndex: item.rowIndex };
  }
  const { data, error } = await supabase.from(CATALOG_TABLE).insert(row).select().single();
  if (error) throw new Error(error.message);
  return { rowIndex: data.id };
}

// ========== 2. Ma trận Setup theo Tầng ==========
function setupRowToItem(row) {
  const item = { rowIndex: row.id, TenHang: row.ten_hang };
  FLOORS.forEach((f) => { item[f] = row[f.toLowerCase()]; });
  return item;
}

export async function getMinibarSetup() {
  const catalog = await getMinibarCatalog();
  const { data, error } = await supabase.from(SETUP_TABLE).select('*');
  if (error) throw new Error(error.message);
  let rows = data.map(setupRowToItem);

  const existingNames = new Set(rows.map((r) => normalizeName(r.TenHang)));
  const toAppend = [];
  catalog.forEach((it) => {
    if (!existingNames.has(normalizeName(it.TenHang))) {
      toAppend.push({ ten_hang: it.TenHang, f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, f9: 0 });
      existingNames.add(normalizeName(it.TenHang));
    }
  });
  if (toAppend.length > 0) {
    const { error: insErr } = await supabase.from(SETUP_TABLE).insert(toAppend);
    if (insErr) throw new Error(insErr.message);
    const { data: data2, error: err2 } = await supabase.from(SETUP_TABLE).select('*');
    if (err2) throw new Error(err2.message);
    rows = data2.map(setupRowToItem);
  }

  rows = dedupeByName(rows);
  return rows.map((r) => {
    const total = FLOORS.reduce((sum, f) => sum + (Number(r[f]) || 0), 0);
    return { ...r, Total: total };
  });
}

export async function saveMinibarSetupItem(item) {
  const row = {};
  FLOORS.forEach((f) => { row[f.toLowerCase()] = item[f]; });
  const { error } = await supabase.from(SETUP_TABLE).update(row).eq('id', item.rowIndex);
  if (error) throw new Error(error.message);
  return { rowIndex: item.rowIndex };
}

// ========== 3. Bảng F&B / FO (theo tháng) ==========
function fbfoRowToItem(row) {
  return {
    rowIndex: row.id, Stt: row.stt, TenHang: row.ten_hang,
    FBTonDau: row.fb_ton_dau, FBTonCuoi: row.fb_ton_cuoi,
    FOTonDau: row.fo_ton_dau, FOTonCuoi: row.fo_ton_cuoi, GhiChu: row.ghi_chu,
  };
}

export async function getMinibarFBFO(thang) {
  const catalog = await getMinibarCatalog();
  const { data, error } = await supabase.from(FBFO_TABLE).select('*').eq('thang', thang).order('stt');
  if (error) throw new Error(error.message);
  let rows = data.map(fbfoRowToItem);

  const existingNames = new Set(rows.map((r) => normalizeName(r.TenHang)));
  const toAppend = [];
  catalog.forEach((it) => {
    if (!existingNames.has(normalizeName(it.TenHang))) {
      toAppend.push({ thang, stt: rows.length + toAppend.length + 1, ten_hang: it.TenHang, fb_ton_dau: 0, fb_ton_cuoi: 0, fo_ton_dau: 0, fo_ton_cuoi: 0, ghi_chu: '' });
      existingNames.add(normalizeName(it.TenHang));
    }
  });
  if (toAppend.length > 0) {
    const { error: insErr } = await supabase.from(FBFO_TABLE).insert(toAppend);
    if (insErr) throw new Error(insErr.message);
    const { data: data2, error: err2 } = await supabase.from(FBFO_TABLE).select('*').eq('thang', thang).order('stt');
    if (err2) throw new Error(err2.message);
    rows = data2.map(fbfoRowToItem);
  }

  rows = dedupeByName(rows);
  return rows.map((r) => {
    const fbTonDau = Number(r.FBTonDau) || 0;
    const fbTonCuoi = Number(r.FBTonCuoi) || 0;
    const foTonDau = Number(r.FOTonDau) || 0;
    const foTonCuoi = Number(r.FOTonCuoi) || 0;
    return { ...r, FBTransfer: fbTonDau - fbTonCuoi, FOTransfer: foTonDau - foTonCuoi };
  });
}

export async function saveMinibarFBFOItem(thang, item) {
  const row = {
    fb_ton_dau: item.FBTonDau, fb_ton_cuoi: item.FBTonCuoi,
    fo_ton_dau: item.FOTonDau, fo_ton_cuoi: item.FOTonCuoi, ghi_chu: item.GhiChu,
  };
  const { error } = await supabase.from(FBFO_TABLE).update(row).eq('id', item.rowIndex);
  if (error) throw new Error(error.message);
  return { rowIndex: item.rowIndex };
}

// ========== 4. Daily Bills ==========
function billRowToItem(row) {
  return {
    rowIndex: row.id, Stt: row.stt, BillId: row.bill_id, Ngay: row.ngay, Phong: row.phong,
    Tang: row.tang, TenHang: row.ten_hang, DVT: row.dvt, DonGia: row.don_gia,
    SLBill: row.sl_bill, SLFOC: row.sl_foc, NguoiBaoCao: row.nguoi_bao_cao, GhiChu: row.ghi_chu,
  };
}

export async function getMinibarBills(thang) {
  const { data, error } = await supabase.from(BILLS_TABLE).select('*').eq('thang', thang).order('id');
  if (error) throw new Error(error.message);
  return data.map(billRowToItem);
}

function getNextBillSeq(existingRows, phong, ngay) {
  const billIds = new Set(existingRows.filter((r) => r.Phong === phong && r.Ngay === ngay).map((r) => r.BillId));
  return billIds.size + 1;
}

/** Lưu 1 Bill (nhiều dòng Item). Có billId -> xoá dòng cũ rồi ghi lại. Không có -> tạo billId mới. */
export async function saveMinibarBill(thang, bill) {
  const rows = await getMinibarBills(thang);
  let billId = bill.billId;

  if (billId) {
    const { error: delErr } = await supabase.from(BILLS_TABLE).delete().eq('bill_id', billId).eq('thang', thang);
    if (delErr) throw new Error(delErr.message);
  } else {
    const seq = getNextBillSeq(rows, bill.phong, bill.ngay);
    billId = `${bill.phong}_${bill.ngay}_${seq}`;
  }

  const newRows = bill.items.map((it, idx) => ({
    thang, stt: idx + 1, bill_id: billId, ngay: bill.ngay, phong: bill.phong, tang: bill.tang,
    ten_hang: it.tenHang, dvt: it.dvt, don_gia: it.donGia, sl_bill: it.slBill, sl_foc: it.slFOC,
    nguoi_bao_cao: bill.nguoiBaoCao, ghi_chu: bill.ghiChu || '',
  }));
  const { error } = await supabase.from(BILLS_TABLE).insert(newRows);
  if (error) throw new Error(error.message);

  return { billId, rowsWritten: newRows.length };
}

export async function deleteMinibarBill(thang, billId) {
  const { data, error: selErr } = await supabase.from(BILLS_TABLE).select('id').eq('bill_id', billId).eq('thang', thang);
  if (selErr) throw new Error(selErr.message);
  const { error } = await supabase.from(BILLS_TABLE).delete().eq('bill_id', billId).eq('thang', thang);
  if (error) throw new Error(error.message);
  return { deleted: true, count: data.length };
}

// ========== 5. Bảng Báo Cáo Tổng ==========
function summaryRowToItem(row) {
  return {
    rowIndex: row.id, Stt: row.stt, TenHang: row.ten_hang, DVT: row.dvt,
    TonDau: row.ton_dau, Nhap: row.nhap, TonKho: row.ton_kho, GhiChu: row.ghi_chu,
  };
}

/**
 * Bảng báo cáo tổng Minibar — ghép dữ liệu "sống" từ Bills (Billed/FOC),
 * Module 03 (No Charge, Nhóm=Minibar), FBFO (Transfer), MinibarSetup (Setup
 * Room). Chỉ TonDau/Nhap/TonKho/GhiChu lưu tĩnh trong bảng minibar_summary.
 */
export async function getMinibarSummary(thang) {
  const catalog = await getMinibarCatalog();
  const { data, error } = await supabase.from(SUMMARY_TABLE).select('*').eq('thang', thang).order('stt');
  if (error) throw new Error(error.message);
  let rows = data.map(summaryRowToItem);

  const existingNames = new Set(rows.map((r) => normalizeName(r.TenHang)));
  const toAppend = [];
  catalog.forEach((it) => {
    if (!existingNames.has(normalizeName(it.TenHang))) {
      toAppend.push({ thang, stt: rows.length + toAppend.length + 1, ten_hang: it.TenHang, dvt: it.DVT, ton_dau: 0, nhap: 0, ton_kho: 0, ghi_chu: '' });
      existingNames.add(normalizeName(it.TenHang));
    }
  });
  if (toAppend.length > 0) {
    const { error: insErr } = await supabase.from(SUMMARY_TABLE).insert(toAppend);
    if (insErr) throw new Error(insErr.message);
    const { data: data2, error: err2 } = await supabase.from(SUMMARY_TABLE).select('*').eq('thang', thang).order('stt');
    if (err2) throw new Error(err2.message);
    rows = data2.map(summaryRowToItem);
  }
  rows = dedupeByName(rows);

  // Tự "chữa lành" TonDau = 0 (tháng mới xem trước khi bấm Kết Chuyển) bằng
  // TonThucTe của tháng liền trước.
  const needsFix = rows.some((r) => (Number(r.TonDau) || 0) === 0);
  if (needsFix) {
    const prevThang = prevMonthStr(thang);
    const { count } = await supabase.from(SUMMARY_TABLE).select('id', { count: 'exact', head: true }).eq('thang', prevThang);
    if (count > 0) {
      const prevSummary = await getMinibarSummary(prevThang); // không đệ quy vô hạn: TonThucTe không phụ thuộc TonDau
      const prevMap = {};
      prevSummary.forEach((p) => { prevMap[normalizeName(p.TenHang)] = p.TonThucTe; });

      const fixes = [];
      rows = rows.map((r) => {
        if ((Number(r.TonDau) || 0) !== 0) return r;
        const prevVal = prevMap[normalizeName(r.TenHang)];
        if (prevVal === undefined) return r;
        fixes.push({ rowIndex: r.rowIndex, newTonDau: prevVal });
        return { ...r, TonDau: prevVal };
      });
      await Promise.all(fixes.map((f) => supabase.from(SUMMARY_TABLE).update({ ton_dau: f.newTonDau }).eq('id', f.rowIndex)));
    }
  }

  const bills = await getMinibarBills(thang);
  const billedMap = {}, focMap = {};
  bills.forEach((b) => {
    const key = normalizeName(b.TenHang);
    billedMap[key] = (billedMap[key] || 0) + (Number(b.SLBill) || 0);
    focMap[key] = (focMap[key] || 0) + (Number(b.SLFOC) || 0);
  });

  const damageRows = (await getDamageData(thang)).filter((d) => d.Nhom === 'Minibar');
  const noChargeMap = {};
  damageRows.forEach((d) => {
    const key = normalizeName(d.TenHang);
    noChargeMap[key] = (noChargeMap[key] || 0) + (Number(d.SL) || 0);
  });

  const fbfoRows = await getMinibarFBFO(thang);
  const fbfoMap = {};
  fbfoRows.forEach((r) => { fbfoMap[normalizeName(r.TenHang)] = r; });

  const setupRows = await getMinibarSetup();
  const setupMap = {};
  setupRows.forEach((r) => { setupMap[normalizeName(r.TenHang)] = r.Total; });

  return rows.map((r) => {
    const key = normalizeName(r.TenHang);
    const tonDau = Number(r.TonDau) || 0;
    const nhap = Number(r.Nhap) || 0;
    const tonKho = Number(r.TonKho) || 0;
    const billed = billedMap[key] || 0;
    const foc = focMap[key] || 0;
    const noCharge = noChargeMap[key] || 0;
    const fbfo = fbfoMap[key] || { FBTransfer: 0, FOTransfer: 0, FBTonDau: 0 };
    const transferFB = fbfo.FBTransfer || 0;
    const transferFO = fbfo.FOTransfer || 0;
    const setupFloors = setupMap[key] || 0;
    const setupRoom = setupFloors + (Number(fbfo.FBTonDau) || 0);

    const tonSachVo = (tonDau + nhap) - (billed + noCharge + foc + transferFO + transferFB);
    const tonThucTe = tonKho + setupRoom;
    const chenhLech = tonSachVo - tonThucTe;

    return {
      ...r, Billed: billed, FOC: foc, NoCharge: noCharge,
      TransferFB: transferFB, TransferFO: transferFO, SetupRoom: setupRoom,
      TonSachVo: tonSachVo, TonThucTe: tonThucTe, ChenhLech: chenhLech,
    };
  });
}

export async function saveMinibarSummaryItem(thang, item) {
  const row = { ton_dau: item.TonDau, nhap: item.Nhap, ton_kho: item.TonKho, ghi_chu: item.GhiChu };
  const { error } = await supabase.from(SUMMARY_TABLE).update(row).eq('id', item.rowIndex);
  if (error) throw new Error(error.message);
  return { rowIndex: item.rowIndex };
}

/** Kết chuyển tháng: TonDau tháng mới = TonThucTe tháng cũ */
export async function rolloverMinibarMonth(fromThang, toThang) {
  const { count } = await supabase.from(SUMMARY_TABLE).select('id', { count: 'exact', head: true }).eq('thang', toThang);
  if (count > 0) {
    throw new Error(`Tháng ${toThang} đã có dữ liệu Minibar, không thể kết chuyển đè lên.`);
  }

  const oldData = await getMinibarSummary(fromThang);
  const newRows = oldData.map((old, idx) => ({
    thang: toThang, stt: idx + 1, ten_hang: old.TenHang, dvt: old.DVT,
    ton_dau: old.TonThucTe, nhap: 0, ton_kho: 0, ghi_chu: old.GhiChu || '',
  }));
  if (newRows.length > 0) {
    const { error } = await supabase.from(SUMMARY_TABLE).insert(newRows);
    if (error) throw new Error(error.message);
  }
  return { fromThang, toThang, rowsCopied: newRows.length };
}
