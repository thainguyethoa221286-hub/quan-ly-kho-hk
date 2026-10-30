/**
 * ============================================================
 *  supabaseLinenService.js — Module 07: Quản Lý Hàng Linen (Supabase)
 * ============================================================
 *  Nghiệp vụ lấy theo "Bảng kê chi tiết giặt ủi" hằng tháng:
 *   - DƠ   = số lượng giao đi giặt trong ngày
 *   - SẠCH = số lượng nhà giặt trả về trong ngày
 *   - NỢ ĐK = số hàng còn nằm bên nhà giặt (chưa trả) từ đầu tháng
 *   - NỢ CUỐI = NỢ ĐK + Σ DƠ − Σ SẠCH
 *   - SL TÍNH TIỀN (Tổng giặt) = Σ SẠCH (Rewash là bảng riêng, KHÔNG tính tiền),
 *     có thể nhập tay đè lên (VD: Màn tính theo cách riêng)
 *   - THÀNH TIỀN = SL tính tiền × Đơn giá ;  + VAT 8%
 * ============================================================
 */
import { supabase } from './supabaseClient';
import { num, prevMonthStr } from './supabaseShared';

export const VAT_RATE = 0.08;

// Danh mục chuẩn + đơn giá lấy từ bảng kê T09/2026
export const DEFAULT_LINEN_ITEMS = [
  ['DRAP LỚN', 6400], ['BAO MỀN LỚN', 12900], ['BAO MỀN NHỎ', 0], ['DRAP NHỎ', 0],
  ['ÁO GỐI', 2400], ['KHĂN MẶT', 1000], ['LÓT CHÂN', 2900], ['KHĂN TAY', 2400],
  ['KHĂN TẮM', 4900], ['BẢO VỆ NỆM', 12000], ['TTT', 25000], ['ÁO TẮM', 7900],
  ['KHĂN ĂN', 3000], ['BẢO VỆ GỐI', 3500], ['VÁY GIƯỜNG', 8000], ['MÀN DÀY', 27000],
  ['MÀN MỎNG', 27000], ['RUỘT MỀN', 22000], ['RUỘT GỐI', 10000], ['TOPPER', 22000],
];

// Hệ số quy đổi khi tính tiền (theo file bảng kê gốc: MÀN MỎNG tính = Sạch × 1.8)
export const LINEN_FACTOR = { manmong: 1.8 };

const CATALOG = 'linen_items';
const MONTHLY = 'linen_monthly';
const DAILY = 'linen_daily';

/** Chuẩn hoá tên để so khớp giữa App và file nhà giặt */
export function normLinenName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

function wrap(error) {
  if (!error) return;
  const msg = error.message || String(error);
  if (/relation .* does not exist|Could not find the table/i.test(msg)) {
    throw new Error('Chưa tạo bảng Linen trong Supabase — hãy chạy file supabase_linen_setup.sql (SQL Editor) một lần.');
  }
  throw new Error(msg);
}

/** Danh mục Linen — tự tạo danh mục mặc định nếu bảng còn trống */
export async function getLinenCatalog() {
  let { data, error } = await supabase.from(CATALOG).select('*').order('stt');
  wrap(error);
  if (!data || data.length === 0) {
    const rows = DEFAULT_LINEN_ITEMS.map(([ten, gia], i) => ({ stt: i + 1, ten_hang: ten, dvt: 'cái', don_gia: gia }));
    const ins = await supabase.from(CATALOG).insert(rows);
    wrap(ins.error);
    const again = await supabase.from(CATALOG).select('*').order('stt');
    wrap(again.error);
    data = again.data;
  }
  return data.map((r) => ({ id: r.id, Stt: r.stt, TenHang: r.ten_hang, DVT: r.dvt, DonGia: Number(r.don_gia) || 0 }));
}

export async function saveLinenCatalogItem(item) {
  const row = { stt: num(item.Stt), ten_hang: item.TenHang, dvt: item.DVT || 'cái', don_gia: num(item.DonGia) };
  if (item.id) {
    const { error } = await supabase.from(CATALOG).update(row).eq('id', item.id);
    wrap(error);
    return { id: item.id };
  }
  const { data, error } = await supabase.from(CATALOG).insert(row).select().single();
  wrap(error);
  return { id: data.id };
}

export async function getLinenMonthly(thang) {
  const { data, error } = await supabase.from(MONTHLY).select('*').eq('thang', thang);
  wrap(error);
  return data;
}

export async function getLinenDaily(thang) {
  const { data, error } = await supabase.from(DAILY).select('*').eq('thang', thang);
  wrap(error);
  return data;
}

/** Lưu (ghi đè) số liệu 1 ngày: entries = [{ TenHang, Do, Sach, RW (rewash dơ), RWSach }] */
export async function saveLinenDay(thang, ngay, entries) {
  const rows = entries.map((e) => ({
    thang, ngay, ten_hang: e.TenHang, do_sl: num(e.Do), sach_sl: num(e.Sach), rw_sl: num(e.RW), rw_sach_sl: num(e.RWSach),
  }));
  const { error } = await supabase.from(DAILY).upsert(rows, { onConflict: 'ngay,ten_hang' });
  wrap(error);
  return { saved: rows.length };
}

/** Lưu số liệu tháng của 1 mặt hàng (chỉ ghi các field được truyền vào) */
export async function saveLinenMonthly(thang, tenHang, fields) {
  const row = { thang, ten_hang: tenHang };
  if ('NoDK' in fields) row.no_dk = num(fields.NoDK);
  if ('RW' in fields) row.rw = num(fields.RW);
  if ('RWNoDK' in fields) row.rw_no_dk = num(fields.RWNoDK);
  if ('GhiChu' in fields) row.ghi_chu = fields.GhiChu || '';
  if ('SlTinhTien' in fields) {
    row.sl_tinh_tien = fields.SlTinhTien === '' || fields.SlTinhTien === null ? null : num(fields.SlTinhTien);
  }
  const { error } = await supabase.from(MONTHLY).upsert(row, { onConflict: 'thang,ten_hang' });
  wrap(error);
  return { ok: true };
}

/**
 * Ghép danh mục + số liệu tháng + số liệu ngày thành bảng tổng hợp.
 * Hàm thuần (không gọi mạng) để dùng lại cho Excel / đối soát.
 */
export function computeLinenSummary(catalog, monthlyRows, dailyRows) {
  const mMap = {};
  monthlyRows.forEach((r) => { mMap[r.ten_hang] = r; });
  const dMap = {};
  dailyRows.forEach((r) => {
    const t = (dMap[r.ten_hang] ||= { do: 0, sach: 0, rw: 0, rwSach: 0 });
    t.do += Number(r.do_sl) || 0;
    t.sach += Number(r.sach_sl) || 0;
    t.rw += Number(r.rw_sl) || 0;
    t.rwSach += Number(r.rw_sach_sl) || 0;
  });

  return catalog.map((c, idx) => {
    const m = mMap[c.TenHang] || {};
    const d = dMap[c.TenHang] || { do: 0, sach: 0, rw: 0, rwSach: 0 };
    const noDK = Number(m.no_dk) || 0;
    const rw = d.rw; // RW = tổng REWASH DƠ nhập hằng ngày (không tính tiền)
    const rwNoDK = Number(m.rw_no_dk) || 0;
    const rwNoCuoi = rwNoDK + d.rw - d.rwSach; // hàng giặt lại còn nằm bên nhà giặt
    const noCuoi = noDK + d.do - d.sach;
    const slOverride = m.sl_tinh_tien === null || m.sl_tinh_tien === undefined ? null : Number(m.sl_tinh_tien);
    const factor = LINEN_FACTOR[normLinenName(c.TenHang)] || 1;
    const slAuto = d.sach * factor; // Rewash không tính tiền
    const slTinhTien = slOverride !== null ? slOverride : slAuto;
    return {
      Stt: idx + 1, id: c.id, TenHang: c.TenHang, DVT: c.DVT, DonGia: c.DonGia,
      NoDK: noDK, TongDo: d.do, TongSach: d.sach, RW: rw, RWSach: d.rwSach, RWNoDK: rwNoDK, RWNoCuoi: rwNoCuoi,
      NoCuoi: noCuoi, SlTinhTien: slTinhTien, SlOverride: slOverride, SlAuto: slAuto, HeSo: factor,
      ThanhTien: slTinhTien * c.DonGia, GhiChu: m.ghi_chu || '',
    };
  });
}

export async function getLinenSummary(thang) {
  const [catalog, monthly, daily] = await Promise.all([getLinenCatalog(), getLinenMonthly(thang), getLinenDaily(thang)]);
  return computeLinenSummary(catalog, monthly, daily);
}

/** Kết chuyển tháng: Nợ ĐK tháng mới = Nợ cuối tháng cũ (mọi thứ khác về 0) */
export async function rolloverLinenMonth(fromThang, toThang) {
  const { count, error: cErr } = await supabase.from(MONTHLY).select('id', { count: 'exact', head: true }).eq('thang', toThang);
  wrap(cErr);
  if (count > 0) throw new Error(`Tháng ${toThang} đã có dữ liệu Linen, không thể kết chuyển đè lên.`);
  const summary = await getLinenSummary(fromThang);
  const rows = summary.map((s) => ({ thang: toThang, ten_hang: s.TenHang, no_dk: s.NoCuoi, rw_no_dk: s.RWNoCuoi, rw: 0, hu_hong: 0, ghi_chu: '' }));
  if (rows.length) {
    const { error } = await supabase.from(MONTHLY).insert(rows);
    wrap(error);
  }
  return { fromThang, toThang, rowsCopied: rows.length };
}

export { prevMonthStr };
