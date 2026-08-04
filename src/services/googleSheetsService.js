/**
 * ============================================================
 *  googleSheetsService.js
 *  Kết nối React frontend <-> Google Apps Script backend (Code.gs)
 *  Dùng kỹ thuật JSONP (inject thẻ <script>) để tránh lỗi CORS.
 * ============================================================
 *
 *  ⚠️ SAU KHI DEPLOY Code.gs, DÁN LINK ".../exec" VÀO ĐÂY:
 */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmyZcMifCATWJNgMLESCmRdNN4dgbetHynqtus-PX0Hk4A-K-CViqkGmNereDs6Eyd/exec';

let jsonpCounter = 0;

/**
 * Gọi Apps Script bằng JSONP. Trả về Promise resolve dữ liệu (data),
 * hoặc reject nếu success=false hoặc timeout.
 */
function jsonpRequest(params, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const callbackName = `gsCallback_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      clearTimeout(timer);
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Hết thời gian chờ phản hồi từ Google Sheets (timeout).'));
    }, timeoutMs);

    window[callbackName] = (result) => {
      cleanup();
      if (result && result.success) {
        resolve(result.data);
      } else {
        reject(new Error((result && result.error) || 'Lỗi không xác định từ backend.'));
      }
    };

    const query = new URLSearchParams({ ...params, callback: callbackName }).toString();
    script.src = `${APPS_SCRIPT_URL}?${query}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Không kết nối được tới Google Apps Script.'));
    };
    document.body.appendChild(script);
  });
}

/** Lấy toàn bộ dữ liệu Kho của 1 tháng (VD: "2026-07") */
export function getKhoData(thang) {
  return jsonpRequest({ action: 'getKho', thang });
}

/**
 * Lưu 1 dòng (thêm mới nếu không có rowIndex, cập nhật nếu có).
 * item: { rowIndex?, Stt, MaHang, TenHang, DVT, DauKy, SetUp, Nhap,
 *         Transfer, HuHongMat, SuDung, Cost, GhiChu }
 */
export function saveKhoItem(thang, item) {
  return jsonpRequest({ action: 'saveKho', thang, item: JSON.stringify(item) });
}

/** Xoá 1 dòng theo rowIndex */
export function deleteKhoItem(thang, rowIndex) {
  return jsonpRequest({ action: 'deleteKho', thang, rowIndex });
}

/** Danh sách các tháng đã có dữ liệu, VD: ["2026-06", "2026-07"] */
export function listAvailableMonths() {
  return jsonpRequest({ action: 'listMonths' });
}

/** Kết chuyển từ tháng hiện tại sang tháng kế tiếp */
export function rolloverMonth(fromThang, toThang) {
  return jsonpRequest({ action: 'rolloverMonth', fromThang, toThang });
}
