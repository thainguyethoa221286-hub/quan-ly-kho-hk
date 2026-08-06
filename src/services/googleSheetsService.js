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

/** Kết chuyển từ tháng hiện tại sang tháng kế tiếp — thao tác này có thể mất
 * nhiều thời gian hơn bình thường (tạo tab mới + ghi nhiều dòng), nên dùng
 * thời gian chờ dài hơn (60s) để tránh báo lỗi timeout giả trong khi
 * Google Sheets vẫn đang xử lý thành công phía sau. */
export function rolloverMonth(fromThang, toThang) {
  return jsonpRequest({ action: 'rolloverMonth', fromThang, toThang }, 60000);
}

/** ===== Module 02: Đề Xuất Mua Hàng PR-PO ===== */

/** Lấy danh sách PR-PO của 1 tháng (bao gồm cả mặt hàng đang ẩn — frontend tự lọc) */
export function getPRPOData(thang) {
  return jsonpRequest({ action: 'getPRPO', thang }, 30000);
}

/** Lưu 1 dòng PR-PO (StockMax, GhiChu) */
export function savePRPOItem(thang, item) {
  return jsonpRequest({ action: 'savePRPO', thang, item: JSON.stringify(item) });
}

/** Ẩn (hidden=true) hoặc hiện lại (hidden=false) 1 mặt hàng PR-PO — KHÔNG xoá dòng thật */
export function setPRPOHidden(thang, rowIndex, hidden) {
  return jsonpRequest({ action: 'setPRPOHidden', thang, rowIndex, hidden: String(hidden) });
}

/** Tạo mặt hàng hoàn toàn mới — tự động thêm vào cả Module 01 (Kho) và Module 02 (PR-PO) */
export function addNewItemFull(thang, tenHang, dvt) {
  return jsonpRequest({ action: 'addNewItemFull', thang, tenHang, dvt });
}

/** ===== Module 03: Báo Cáo Hư Hỏng / FOC ===== */

/** Lấy danh mục Item cho Module 03 (tự bổ sung Item mới từ Module 01, cột Nhom để trống) */
export function getDamageItemsCatalog(thang) {
  return jsonpRequest({ action: 'getDamageCatalog', thang }, 30000);
}

/** Lấy danh sách báo cáo hư hỏng của 1 tháng */
export function getDamageData(thang) {
  return jsonpRequest({ action: 'getDamageData', thang });
}

/** Lưu 1 dòng báo cáo hư hỏng (tạo mới sẽ tự đồng bộ SL vào Module 01 nếu trùng tên) */
export function saveDamageItem(thang, item) {
  return jsonpRequest({ action: 'saveDamageItem', thang, item: JSON.stringify(item) });
}

/** Xoá 1 dòng báo cáo hư hỏng (tự trừ ngược SL khỏi Module 01 nếu dòng đó từng đồng bộ) */
export function deleteDamageItem(thang, rowIndex) {
  return jsonpRequest({ action: 'deleteDamageItem', thang, rowIndex });
}
