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
 * ---- Hàng đợi giới hạn số request chạy song song ----
 * Khi người dùng sửa nhanh nhiều dòng/ô liên tiếp (ví dụ Tab qua 20 dòng
 * trong bảng Kho), mỗi lần rời ô (onBlur) sẽ gọi lưu ngay lập tức, tạo ra
 * hàng chục request JSONP cùng lúc. Google Apps Script Web App không xử lý
 * tốt nhiều request đồng thời (bị nghẽn/timeout), đây là NGUYÊN NHÂN CHÍNH
 * gây lỗi đỏ "Không kết nối được tới Google Apps Script" và làm app phải
 * tải lại trang. Hàng đợi dưới đây giới hạn tối đa 3 request chạy song
 * song, các request còn lại tự động chờ tới lượt thay vì bắn hết cùng lúc.
 */
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequestCount = 0;
const requestQueue = [];

function runNextInQueue() {
  if (activeRequestCount >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) return;
  const task = requestQueue.shift();
  activeRequestCount++;
  task().finally(() => {
    activeRequestCount--;
    runNextInQueue();
  });
}

function enqueueRequest(task) {
  return new Promise((resolve, reject) => {
    requestQueue.push(() => task().then(resolve, reject));
    runNextInQueue();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Gọi Apps Script bằng JSONP đúng 1 lần (không hàng đợi, không thử lại). */
function jsonpRequestOnce(params, timeoutMs) {
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

/**
 * Gọi Apps Script bằng JSONP. Trả về Promise resolve dữ liệu (data).
 * Có hàng đợi giới hạn 3 request song song (xem ghi chú ở trên) và tự động
 * thử lại tối đa 2 lần (cách nhau 1.5s rồi 3s) nếu bị timeout/mất kết nối,
 * trước khi thật sự báo lỗi cho người dùng — giúp giảm mạnh lỗi đỏ
 * "Không kết nối được tới Google Apps Script" khi thao tác nhanh.
 */
function jsonpRequest(params, timeoutMs = 20000, retries = 2) {
  return enqueueRequest(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await jsonpRequestOnce(params, timeoutMs);
      } catch (err) {
        lastErr = err;
        if (attempt < retries) await sleep(1500 * (attempt + 1));
      }
    }
    throw lastErr;
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
  // retries = 0: đây là thao tác không thể lặp lại an toàn (có thể tạo dữ liệu
  // trùng nếu request đầu đã chạy xong ở backend nhưng phản hồi về chậm/mất).
  return jsonpRequest({ action: 'rolloverMonth', fromThang, toThang }, 60000, 0);
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
  // retries = 0: tránh tạo trùng mặt hàng nếu request đầu đã tạo xong ở
  // backend nhưng phản hồi về chậm/mất.
  return jsonpRequest({ action: 'addNewItemFull', thang, tenHang, dvt }, 20000, 0);
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

/** ===== Module 04: Quản Lý Minibar ===== */

// -- Danh mục Item Minibar --
export function getMinibarCatalog() {
  return jsonpRequest({ action: 'getMinibarCatalog' }, 30000);
}
export function saveMinibarCatalogItem(item) {
  return jsonpRequest({ action: 'saveMinibarCatalogItem', item: JSON.stringify(item) });
}

// -- Sub 4B: Ma trận Setup theo Tầng --
export function getMinibarSetup() {
  return jsonpRequest({ action: 'getMinibarSetup' }, 30000);
}
export function saveMinibarSetupItem(item) {
  return jsonpRequest({ action: 'saveMinibarSetupItem', item: JSON.stringify(item) });
}

// -- Bảng F&B / FO (theo tháng) --
export function getMinibarFBFO(thang) {
  return jsonpRequest({ action: 'getMinibarFBFO', thang }, 30000);
}
export function saveMinibarFBFOItem(thang, item) {
  return jsonpRequest({ action: 'saveMinibarFBFOItem', thang, item: JSON.stringify(item) });
}

// -- Sub 4A: Daily Bills --
export function getMinibarBills(thang) {
  return jsonpRequest({ action: 'getMinibarBills', thang }, 30000);
}
export function saveMinibarBill(thang, bill) {
  return jsonpRequest({ action: 'saveMinibarBill', thang, bill: JSON.stringify(bill) });
}
export function deleteMinibarBill(thang, billId) {
  return jsonpRequest({ action: 'deleteMinibarBill', thang, billId });
}

// -- Sub 4C: Bảng Báo Cáo Tổng --
export function getMinibarSummary(thang) {
  return jsonpRequest({ action: 'getMinibarSummary', thang }, 30000);
}
export function saveMinibarSummaryItem(thang, item) {
  return jsonpRequest({ action: 'saveMinibarSummaryItem', thang, item: JSON.stringify(item) });
}
export function rolloverMinibarMonth(fromThang, toThang) {
  return jsonpRequest({ action: 'rolloverMinibarMonth', fromThang, toThang }, 60000, 0);
}

/** ===== Module 05: Văn Phòng Phẩm (VPP) ===== */
export function getVPPData(thang) {
  return jsonpRequest({ action: 'getVPPData', thang });
}
export function saveVPPItem(thang, item) {
  return jsonpRequest({ action: 'saveVPPItem', thang, item: JSON.stringify(item) });
}
export function deleteVPPItem(thang, rowIndex) {
  return jsonpRequest({ action: 'deleteVPPItem', thang, rowIndex });
}
export function rolloverVPPMonth(fromThang, toThang) {
  return jsonpRequest({ action: 'rolloverVPPMonth', fromThang, toThang }, 60000, 0);
}

/** ===== Khoá Sổ Tháng (dùng chung toàn bộ 6 module) ===== */
export function getMonthLockStatus(thang) {
  return jsonpRequest({ action: 'getMonthLock', thang });
}
export function setMonthLockStatus(thang, locked) {
  return jsonpRequest({ action: 'setMonthLock', thang, locked: String(locked) });
}
