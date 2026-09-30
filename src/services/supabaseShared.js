/**
 * Helper dùng chung cho các supabase*Service.js — giữ đúng hành vi như các
 * hàm cùng tên trong Code.gs (bản Google Apps Script) để 2 bản Sheets /
 * Supabase tính ra cùng kết quả khi so sánh song song.
 */

/** Trả về chuỗi tháng liền trước, VD "2026-09" -> "2026-08" */
export function prevMonthStr(thang) {
  const [y, m] = thang.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Chuẩn hoá tên để so khớp (bỏ khoảng trắng thừa, không phân biệt hoa/thường) */
export function normalizeName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Loại bỏ các dòng trùng tên (theo normalizeName), chỉ giữ dòng đầu tiên */
export function dedupeByName(rows, nameField = 'TenHang') {
  const seen = new Set();
  const result = [];
  rows.forEach((r) => {
    const key = normalizeName(r[nameField]);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(r);
  });
  return result;
}
