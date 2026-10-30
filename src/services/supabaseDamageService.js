/**
 * ============================================================
 *  supabaseDamageService.js — Module 03: Báo Cáo Hư Hỏng / FOC (Supabase)
 * ============================================================
 */
import { supabase } from './supabaseClient';
import { getKhoData } from './supabaseStoreService';
import { normalizeName, num } from './supabaseShared';

const CATALOG_TABLE = 'damage_catalog';
const RECORDS_TABLE = 'damage_records';

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

/**
 * Lưu 1 dòng báo cáo hư hỏng.
 * Không còn tự đồng bộ sang cột HƯ HỎNG / MẤT của Kho HK (Module 01) —
 * cột đó giờ nhập tay trực tiếp bên Module 01.
 */
export async function saveDamageItem(thang, item) {
  if (item.rowIndex) {
    const row = {
      stt: num(item.Stt), ngay: item.Ngay, ten_hang: item.TenHang, nhom: item.Nhom,
      vi_tri: item.ViTri, sl: num(item.SL), hinh_thuc: item.HinhThuc,
      thu_khach: item.ThuKhach, foc_cost: num(item.FOCCost),
      nguoi_bao_cao: item.NguoiBaoCao, ghi_chu: item.GhiChu,
    };
    const { error } = await supabase.from(RECORDS_TABLE).update(row).eq('id', item.rowIndex);
    if (error) throw new Error(error.message);
    return { rowIndex: item.rowIndex };
  }

  const row = {
    thang, stt: num(item.Stt), ngay: item.Ngay, ten_hang: item.TenHang, nhom: item.Nhom,
    vi_tri: item.ViTri, sl: num(item.SL), hinh_thuc: item.HinhThuc,
    thu_khach: item.ThuKhach, foc_cost: num(item.FOCCost),
    nguoi_bao_cao: item.NguoiBaoCao, ghi_chu: item.GhiChu,
  };
  const { data, error } = await supabase.from(RECORDS_TABLE).insert(row).select().single();
  if (error) throw new Error(error.message);
  return { rowIndex: data.id };
}

/** Xoá 1 dòng hư hỏng (không ảnh hưởng số liệu Kho HK) */
export async function deleteDamageItem(thang, rowIndex) {
  const { error } = await supabase.from(RECORDS_TABLE).delete().eq('id', rowIndex);
  if (error) throw new Error(error.message);
  return { deleted: rowIndex };
}
