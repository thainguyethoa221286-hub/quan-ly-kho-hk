/**
 * Sinh danh sách các tháng cho dropdown "Kỳ Báo Cáo" — TỰ ĐỘNG theo ngày
 * thực tế trên máy, không cần sửa code mỗi khi sang tháng/năm mới.
 *
 * Phạm vi: từ START_MONTH (mốc bắt đầu dùng app) cho tới MONTHS_AHEAD
 * tháng kể từ tháng hiện tại — luôn tự trải dài về sau, kể cả sang
 * 2027, 2028... mà không cần ai chỉnh lại danh sách.
 */
const START_MONTH = '2026-09';
const MONTHS_AHEAD = 6; // luôn hiện sẵn 6 tháng kể từ tháng hiện tại trở đi

function addMonths(thang: string, delta: number): string {
  const [y, m] = thang.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthOptions(): string[] {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const endMonth = addMonths(currentMonth, MONTHS_AHEAD);

  const options: string[] = [];
  let cursor = START_MONTH;
  // Phòng hờ START_MONTH sau endMonth (không xảy ra trong thực tế) để tránh lặp vô hạn
  let guard = 0;
  while (cursor <= endMonth && guard < 120) {
    options.push(cursor);
    cursor = addMonths(cursor, 1);
    guard++;
  }
  return options;
}

export function formatMonthLabel(thang: string): string {
  const [y, m] = thang.split('-');
  return `Tháng ${m}/${y}`;
}
