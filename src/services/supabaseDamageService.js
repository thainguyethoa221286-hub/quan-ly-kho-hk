/**
 * ============================================================
 *  supabaseDamageService.js — Module 03: Báo Cáo Hư Hỏng / FOC (Supabase)
 * ============================================================
 */
import { supabase } from './supabaseClient';
import { getKhoData, saveKhoItem } from './supabaseStoreService';
import { normalizeName } from './supabaseShared';

const CATALOG_TABLE = 'damage_catalog';
const RECORDS_TABLE = 'damage_records';

// Chỉ 2 nhóm này mới cộng/trừ ngược vào HuHongMat bên Kho HK (Module 01).
// Nhóm Minibar không đồng bộ ở đây (Module 04 tự tổng hợp trực tiếp).
const SYNC_TO_STORE_GROUPS = ['CCDC', 'Amenities'];

function catalogRowToItem(row) {
  return { rowIndex: row.id, TenHang: row.ten_hang, DVT: row.dvt, Nhom: row.nhom };
}

function recordRowToItem(row) {
  return {
    rowIndex: row.id,
    Stt: row.stt,
    Ngay: row.ngay,
    TenHang: row.ten_hang,
    Nhom: row.nhom,
    ViTri: row.vi_tri,
    SL: row.sl,
    HinhThuc: row.hinh_thuc,
    ThuKhach: row.thu_khach,
    FOCCost: row.foc_cost,
    NguoiBaoCao: row.nguoi_bao_cao,
    GhiChu: row.ghi_chu,
    Synced: row.synced === true,
  };
}

/**
 * Danh mục Item cho Module 03 — tự bổ sung (không xoá/sửa) Item có trong
 * Kho HK (tháng đang chọn) nhưng chưa có trong catalog.
 */
export async function getDamageItemsCatalog(thang) {
  const storeItems = await getKhoData(thang);
  const { data, error } = await supabase.from(CATALOG_TABLE).select('*').order('id');
  if (error) throw new Error(error.message);
  let catalogRows = data.map(catalogRowToItem);

  const existingNames = new Set(catalogRows.map((r) => normalizeName(r.TenHang)));
  const toAppend = storeItems
    .filter((it) => !existingNames.has(normalizeName(it.TenHang)))
    .map((it) => ({ ten_hang: it.TenHang, dvt: it.DVT, nhom: '' }));

  if (toAppend.length > 0) {
    const { error: insErr } = await supabase.from(CATALOG_TABLE).insert(toAppend);
    if (insErr) throw new Error(insErr.message);
    const { data: data2, error: err2 } = await supabase.from(CATALOG_TABLE).select('*').order('id');
    if (err2) throw new Error(err2.message);
    catalogRows = data2.map(catalogRowToItem);
  }
  return catalogRows;
}

export async function getDamageData(thang) {
  const { data, error } = await supabase.from(RECORDS_TABLE).select('*').eq('thang', thang).order('stt');
  if (error) throw new Error(error.message);
  return data.map(recordRowToItem);
}

/** Cộng/trừ SL vào HuHongMat bên Module 01 (nếu tìm thấy tên khớp) */
async function adjustStoreHuHongMat(thang, tenHang, nhom, deltaSL) {
  if (!SYNC_TO_STORE_GROUPS.includes(nhom)) return false;
  const storeItems = await getKhoData(thang);
  const match = storeItems.find((it) => it.TenHang === tenHang);
  if (!match) return false;
  const newHuHongMat = Math.max((Number(match.HuHongMat) || 0) + deltaSL, 0);
  await saveKhoItem(thang, { ...match, HuHongMat: newHuHongMat });
  return true;
}

/**
 * Lưu 1 dòng báo cáo hư hỏng.
 * - Tạo mới: nếu Nhóm CCDC/Amenities và Item trùng tên Kho HK -> cộng SL vào
 *   HuHongMat bên đó, đánh dấu Synced=true.
 * - Cập nhật dòng có sẵn: chỉ ghi đè, KHÔNG đụng lại đồng bộ.
 */
export async function saveDamageItem(thang, item) {
  if (item.rowIndex) {
    const row = {
      stt: item.Stt, ngay: item.Ngay, ten_hang: item.TenHang, nhom: item.Nhom,
      vi_tri: item.ViTri, sl: item.SL, hinh_thuc: item.HinhThuc,
      thu_khach: item.ThuKhach, foc_cost: item.FOCCost,
      nguoi_bao_cao: item.NguoiBaoCao, ghi_chu: item.GhiChu,
    };
    const { error } = await supabase.from(RECORDS_TABLE).update(row).eq('id', item.rowIndex);
    if (error) throw new Error(error.message);
    return { rowIndex: item.rowIndex };
  }

  const synced = await adjustStoreHuHongMat(thang, item.TenHang, item.Nhom, Number(item.SL) || 0);
  const row = {
    thang, stt: item.Stt, ngay: item.Ngay, ten_hang: item.TenHang, nhom: item.Nhom,
    vi_tri: item.ViTri, sl: item.SL, hinh_thuc: item.HinhThuc,
    thu_khach: item.ThuKhach, foc_cost: item.FOCCost,
    nguoi_bao_cao: item.NguoiBaoCao, ghi_chu: item.GhiChu, synced,
  };
  const { data, error } = await supabase.from(RECORDS_TABLE).insert(row).select().single();
  if (error) throw new Error(error.message);
  return { rowIndex: data.id, synced };
}

/** Xoá 1 dòng hư hỏng — nếu từng đồng bộ, trừ ngược SL khỏi Kho HK */
export async function deleteDamageItem(thang, rowIndex) {
  const { data: row, error: getErr } = await supabase.from(RECORDS_TABLE).select('*').eq('id', rowIndex).single();
  if (getErr) throw new Error(getErr.message);
  if (row && row.synced) {
    await adjustStoreHuHongMat(thang, row.ten_hang, row.nhom, -(Number(row.sl) || 0));
  }
  const { error } = await supabase.from(RECORDS_TABLE).delete().eq('id', rowIndex);
  if (error) throw new Error(error.message);
  return { deleted: rowIndex };
}
