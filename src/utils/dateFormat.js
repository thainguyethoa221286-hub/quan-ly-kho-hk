// ==================================================================
// fmtDateVN — hiển thị MỌI dạng ngày về chuẩn Việt Nam DD/MM/YYYY.
//
// Dữ liệu ngày trong Supabase có thể nằm ở nhiều dạng khác nhau (nhập tay
// bằng ô chọn ngày -> "2026-10-05"; dữ liệu chuyển từ Google Sheets sang ->
// "2026-10-04T17:00:00.000Z" hoặc "10/5/2026" kiểu Mỹ MM/DD/YYYY). Hàm này
// gom về 1 kiểu duy nhất để bảng + Excel không còn hiện ngược ngày/tháng.
//
// ⚠️ Chuỗi dạng "a/b/yyyy" được hiểu là MM/DD/YYYY (kiểu Mỹ — đúng với dữ
// liệu cũ đang bị hiện ngược), trừ khi số đầu > 12 (chắc chắn là ngày) thì
// hiểu là DD/MM/YYYY.
// ==================================================================
const pad2 = (n) => String(n).padStart(2, '0');

export function fmtDateVN(v) {
  if (v === null || v === undefined || v === '') return '';

  if (v instanceof Date) {
    return isNaN(v) ? '' : `${pad2(v.getDate())}/${pad2(v.getMonth() + 1)}/${v.getFullYear()}`;
  }

  const s = String(v).trim();
  let m;

  // "YYYY-MM-DD" thuần (không giờ) — KHÔNG qua Date để khỏi bị lệch múi giờ
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    return `${pad2(m[3])}/${pad2(m[2])}/${m[1]}`;
  }

  // "YYYY-MM-DDTHH:mm:ss(.sss)(Z|+07:00)" — có giờ: đổi sang ngày theo giờ máy (VN)
  if (/^\d{4}-\d{1,2}-\d{1,2}[T\s]/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return `${pad2(m[3])}/${pad2(m[2])}/${m[1]}`;
  }

  // "YYYY/MM/DD"
  if ((m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/))) {
    return `${pad2(m[3])}/${pad2(m[2])}/${m[1]}`;
  }

  // "a/b/YYYY" — mặc định MM/DD/YYYY (kiểu Mỹ); nếu a > 12 thì chắc chắn là DD/MM
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const [day, month] = a > 12 ? [a, b] : [b, a];
    return `${pad2(day)}/${pad2(month)}/${m[3]}`;
  }

  return s;
}
