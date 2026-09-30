/**
 * ============================================================
 *  supabaseVPPService.js — Module 05: Văn Phòng Phẩm (VPP) (Supabase)
 * ============================================================
 */
import { supabase } from './supabaseClient';

const TABLE = 'vpp_items';

function rowToItem(row) {
  const dauKy = Number(row.dau_ky) || 0;
  const nhap = Number(row.nhap) || 0;
  const cuoiKy = Number(row.cuoi_ky) || 0;
  return {
    rowIndex: row.id, Stt: row.stt, TenHang: row.ten_hang, DVT: row.dvt,
    DauKy: row.dau_ky, Nhap: row.nhap, CuoiKy: row.cuoi_ky, GhiChu: row.ghi_chu,
    SuDung: (dauKy + nhap) - cuoiKy,
  };
}

export async function getVPPData(thang) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('thang', thang).order('stt');
  if (error) throw new Error(error.message);
  return data.map(rowToItem);
}

export async function saveVPPItem(thang, item) {
  const row = {
    stt: item.Stt, ten_hang: item.TenHang, dvt: item.DVT,
    dau_ky: item.DauKy, nhap: item.Nhap, cuoi_ky: item.CuoiKy, ghi_chu: item.GhiChu,
  };
  if (item.rowIndex) {
    const { error } = await supabase.from(TABLE).update(row).eq('id', item.rowIndex);
    if (error) throw new Error(error.message);
    return { rowIndex: item.rowIndex };
  }
  const { data, error } = await supabase.from(TABLE).insert({ ...row, thang }).select().single();
  if (error) throw new Error(error.message);
  return { rowIndex: data.id };
}

export async function deleteVPPItem(thang, rowIndex) {
  const { error } = await supabase.from(TABLE).delete().eq('id', rowIndex);
  if (error) throw new Error(error.message);
  return { deleted: rowIndex };
}

/** Kết chuyển tháng: DauKy tháng mới = CuoiKy tháng cũ; Nhập/Cuối Kỳ để trống */
export async function rolloverVPPMonth(fromThang, toThang) {
  const { count } = await supabase.from(TABLE).select('id', { count: 'exact', head: true }).eq('thang', toThang);
  if (count > 0) {
    throw new Error(`Tháng ${toThang} đã có dữ liệu VPP, không thể kết chuyển đè lên.`);
  }

  const oldData = await getVPPData(fromThang);
  const newRows = oldData.map((old, idx) => ({
    thang: toThang, stt: idx + 1, ten_hang: old.TenHang, dvt: old.DVT,
    dau_ky: old.CuoiKy, nhap: null, cuoi_ky: null, ghi_chu: old.GhiChu || '',
  }));
  if (newRows.length > 0) {
    const { error } = await supabase.from(TABLE).insert(newRows);
    if (error) throw new Error(error.message);
  }
  return { fromThang, toThang, rowsCopied: newRows.length };
}
