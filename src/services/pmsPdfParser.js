import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * ============================================================
 *  pmsPdfParser.js — Đọc file "Báo Cáo Buồng Phòng" PMS ezCloud (PDF)
 * ============================================================
 *  Mỗi hoá đơn trong PDF có dạng:
 *    "Số hóa đơn: 416-0107  Ngày hóa đơn: 01/07/2026  Mã đặt phòng: 204170
 *     Số phòng: 416  Phòng gốc: 416  Nhân viên: Thái Nguyệt Hoa"
 *    "BQ174 Nước suối Evian / Evian 33cl 60,000 2 120,000 0"
 *
 *  ⚠️ Bảng ánh xạ mã sản phẩm -> tên chuẩn hoá: nếu PDF sau này xuất hiện
 *  mã sản phẩm mới (ngoài BQ174/BQ267/BQ269), cần bổ sung thêm vào đây,
 *  và tên Item trên App (khi Post Bill) PHẢI khớp chính xác với tên chuẩn
 *  hoá này thì đối soát mới nhận diện đúng.
 * ============================================================
 */
const PRODUCT_CODE_MAP = {
  BQ174: 'Evian 330ml',
  BQ267: 'Pepsi 320ml',
  BQ269: '7Up 320ml',
};

const HEADER_RE = /Số hóa đơn:\s*(\S+)\s*Ngày hóa đơn:\s*(\d{2}\/\d{2}\/\d{4})\s*Mã đặt phòng:\s*(\S+)\s*Số phòng:\s*(\S+)\s*Phòng gốc:\s*(\S+)\s*Nhân viên:\s*(.+)/;
const PRODUCT_RE = /^(BQ\d+)\s+(.+?)\s+([\d,]+)\s+(\d+)\s+([\d,]+)\s+(\d+)$/;

function toISODate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m}-${d}`;
}

/** Ghép các mảnh chữ trong 1 trang PDF thành từng dòng theo toạ độ (giống chế độ "layout" khi copy PDF) */
function extractLinesFromPage(content) {
  const rows = {};
  content.items.forEach((item) => {
    const y = Math.round(item.transform[5]);
    if (!rows[y]) rows[y] = [];
    rows[y].push({ x: item.transform[4], text: item.str });
  });
  const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a); // PDF: y lớn = ở trên
  return sortedY
    .map((y) => rows[y].sort((a, b) => a.x - b.x).map((t) => t.text).join(' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function parseLines(lines) {
  const records = [];
  let current = null;
  lines.forEach((line) => {
    const h = line.match(HEADER_RE);
    if (h) {
      current = { ngay: toISODate(h[2]), phong: h[4] };
      return;
    }
    const p = line.match(PRODUCT_RE);
    if (p && current) {
      const code = p[1];
      const soLuong = Number(p[4]) || 0;
      const tenItem = PRODUCT_CODE_MAP[code] || p[2].trim();
      records.push({ ngay: current.ngay, phong: current.phong, tenItem, soLuong, maSanPham: code });
    }
  });
  return records;
}

/**
 * Đọc file PDF Báo Cáo Buồng Phòng PMS, trả về mảng bản ghi thô:
 * [{ ngay: 'YYYY-MM-DD', phong: '416', tenItem: 'Evian 330ml', soLuong: 2, maSanPham: 'BQ174' }, ...]
 */
export async function parsePMSPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    allLines.push(...extractLinesFromPage(content));
  }
  return parseLines(allLines);
}

/** Gộp tổng SL theo Ngày + Số Phòng + Item -> { "ngay|phong|tenItem": tongSL } */
export function summarizePMSRecords(records) {
  const map = {};
  records.forEach((r) => {
    const key = `${r.ngay}|${r.phong}|${r.tenItem}`;
    map[key] = (map[key] || 0) + r.soLuong;
  });
  return map;
}
