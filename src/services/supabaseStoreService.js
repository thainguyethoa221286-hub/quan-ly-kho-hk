/**
 * ============================================================
 *  supabaseStoreService.js — Bản THỬ NGHIỆM module Kho HK & Vật Tư
 *  chạy trên Supabase thay vì Google Sheets + Apps Script.
 * ============================================================
 *  Cùng "hình dạng" (tên hàm, tham số, field trả về) với
 *  googleSheetsService.js để StoreModule.jsx chỉ cần đổi 1 dòng import,
 *  không phải sửa logic gì khác.
 * ============================================================
 */
import { supabase } from './supabaseClient';

// Chuyển mọi giá trị input (kể cả '', null, undefined, hoặc chuỗi không phải
// số) thành số 0 trước khi gửi lên cột `numeric` của Postgres — tránh lỗi
// "invalid input syntax for type numeric" khi người dùng xoá trắng ô rồi bấm
// ra ngoài (onBlur) trước khi gõ số mới.
function num(v) {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Các field nào là số (phải sanitize qua num()) trước khi ghi vào Supabase.
const NUMERIC_FIELDS = new Set([
  'Stt', 'DauKy', 'SetUp', 'Nhap', 'Transfer', 'HuHongMat',
  'SuDung', 'TongXuat', 'Ton', 'TongKho', 'Cost', 'ThanhTien',
]);

const TABLE = 'store_items';

// Cột trong Supabase (snake_case) <-> field trong app (PascalCase, khớp
// đúng tên đang dùng ở StoreModule.jsx / Code.gs cho khỏi lẫn lộn).
const FIELD_MAP = {
  Stt: 'stt',
  MaHang: 'ma_hang',
  TenHang: 'ten_hang',
  DVT: 'dvt',
  DauKy: 'dau_ky',
  SetUp: 'set_up',
  Nhap: 'nhap',
  Transfer: 'transfer',
  HuHongMat: 'hu_hong_mat',
  SuDung: 'su_dung',
  TongXuat: 'tong_xuat',
  Ton: 'ton',
  TongKho: 'tong_kho',
  Cost: 'cost',
  ThanhTien: 'thanh_tien',
  GhiChu: 'ghi_chu',
};

function rowToItem(row) {
  const item = { rowIndex: row.id };
  Object.entries(FIELD_MAP).forEach(([appField, col]) => {
    item[appField] = row[col];
  });
  return item;
}

function itemToRow(item) {
  const row = {};
  Object.entries(FIELD_MAP).forEach(([appField, col]) => {
    if (item[appField] !== undefined) {
      row[col] = NUMERIC_FIELDS.has(appField) ? num(item[appField]) : item[appField];
    }
  });
  return row;
}

/** Lấy toàn bộ dữ liệu Kho của 1 tháng (VD: "2026-09") */
export async function getKhoData(thang) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('thang', thang)
    .order('stt', { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(rowToItem);
}

/** Lưu 1 dòng (thêm mới nếu không có rowIndex, cập nhật nếu có) */
export async function saveKhoItem(thang, item) {
  const row = itemToRow(item);

  if (item.rowIndex) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(row)
      .eq('id', item.rowIndex)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToItem(data);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...row, thang })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return rowToItem(data);
}

/** Xoá 1 dòng theo rowIndex (= id trong Supabase) */
export async function deleteKhoItem(thang, rowIndex) {
  const { error } = await supabase.from(TABLE).delete().eq('id', rowIndex);
  if (error) throw new Error(error.message);
  return { deleted: rowIndex };
}

/** Danh sách các tháng đã có dữ liệu, VD: ["2026-09", "2026-10"] */
export async function listAvailableMonths() {
  const { data, error } = await supabase.from(TABLE).select('thang');
  if (error) throw new Error(error.message);
  const months = Array.from(new Set(data.map((r) => r.thang))).sort();
  return months;
}

/**
 * Kết chuyển tháng: DauKy tháng mới = Ton (tồn thực tế) của tháng cũ.
 * Reset Nhap/Transfer/HuHongMat/Ton về '' (cần nhập tay lại sau kiểm kê).
 */
export async function rolloverMonth(fromThang, toThang) {
  const { count, error: countErr } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('thang', toThang);
  if (countErr) throw new Error(countErr.message);
  if (count > 0) {
    throw new Error(`Tháng ${toThang} đã có dữ liệu, không thể kết chuyển đè lên.`);
  }

  const oldData = await getKhoData(fromThang);
  if (oldData.length === 0) {
    throw new Error(`Không tìm thấy dữ liệu tháng ${fromThang}`);
  }

  const newRows = oldData.map((old) => {
    const dauKy = Number(old.Ton) || 0;
    const setUp = Number(old.SetUp) || 0;
    return {
      thang: toThang,
      stt: old.Stt,
      ma_hang: old.MaHang || '',
      ten_hang: old.TenHang,
      dvt: old.DVT,
      dau_ky: dauKy,
      set_up: setUp,
      nhap: 0,
      transfer: 0,
      hu_hong_mat: 0,
      su_dung: 0,
      tong_xuat: 0,
      ton: 0,
      tong_kho: setUp, // Ton mới = 0 -> TongKho = 0 + SetUp
      cost: Number(old.Cost) || 0,
      thanh_tien: 0,
      ghi_chu: old.GhiChu || '',
    };
  });

  const { error } = await supabase.from(TABLE).insert(newRows);
  if (error) throw new Error(error.message);

  return { fromThang, toThang, rowsCopied: newRows.length };
}
