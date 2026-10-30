/**
 * ============================================================
 *  laundryFileParser.js — Đọc file đối soát của NHÀ GIẶT (Excel / PDF)
 * ============================================================
 *  Trả về: [{ TenHang, Do, Sach, NoDK }] — tổng DƠ (giao giặt) và SẠCH (nhận về) cả tháng.
 *
 *  1) Excel "Bảng kê chi tiết giặt ủi" (mẫu M Hotel T09/2026):
 *       cột A = MẶT HÀNG, cột B = DƠ / SẠCH (2 dòng cho mỗi mặt hàng),
 *       cột C = NỢ ĐK, các cột ngày, cột "TỔNG CỘNG" = tổng cả tháng.
 *     Nếu ô TỔNG CỘNG bị trống thì cộng các cột ngày.
 *  2) Excel/CSV dạng phẳng: 1 dòng / mặt hàng với cột "Giao/Dơ" và "Nhận/Sạch".
 *  3) PDF: đọc ở mức THỬ NGHIỆM — dòng bắt đầu bằng tên mặt hàng + 2 số đầu tiên
 *     (Giao, Nhận). Cần kiểm tra lại kết quả trên màn hình đối soát.
 * ============================================================
 */
import * as XLSX from 'xlsx-js-style';
import { normLinenName } from './supabaseLinenService';

const n = (v) => {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined || v === '') return NaN;
  const x = Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(x) ? x : NaN;
};

function parseDetailedSheet(rows) {
  // tìm cột TỔNG CỘNG và dòng tiêu đề "MẶT HÀNG"
  let colTotal = -1;
  let headerRow = -1;
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    (rows[r] || []).forEach((cell, c) => {
      const k = normLinenName(cell);
      if (k === 'tongcong' && colTotal < 0) colTotal = c;
    });
    if (normLinenName((rows[r] || [])[0]) === 'mathang' && headerRow < 0) headerRow = r;
  }
  if (headerRow < 0) return null;

  const out = [];
  for (let r = headerRow + 1; r < rows.length - 1; r++) {
    const row = rows[r] || [];
    const typ = normLinenName(row[1]);
    const name = String(row[0] ?? '').trim();
    if (!(name && typ === 'do')) {
      if (out.length > 0 && typ !== 'sach') break; // hết khối bảng
      continue;
    }
    const next = rows[r + 1] || [];
    if (normLinenName(next[1]) !== 'sach') continue;

    const sumDays = (arr) => {
      let s = 0;
      for (let c = 3; c < (colTotal > 0 ? colTotal : arr.length); c++) {
        const v = n(arr[c]);
        if (Number.isFinite(v)) s += v;
      }
      return s;
    };
    let tDo = colTotal > 0 ? n(row[colTotal]) : NaN;
    let tSach = colTotal > 0 ? n(next[colTotal]) : NaN;
    if (!Number.isFinite(tDo)) tDo = sumDays(row);
    if (!Number.isFinite(tSach)) tSach = sumDays(next);
    const noDK = n(row[2]);
    out.push({ TenHang: name, Do: tDo, Sach: tSach, NoDK: Number.isFinite(noDK) ? noDK : 0 });
    r += 1;
  }
  return out;
}

function parseFlatSheet(rows) {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r] || [];
    const keys = row.map((c) => normLinenName(c));
    const cName = keys.findIndex((k) => /^(mathang|ten|tenhang|item|loai)/.test(k));
    const cDo = keys.findIndex((k) => /^(do|giao|gui|giaogiat|sldo)/.test(k));
    const cSach = keys.findIndex((k) => /^(sach|nhan|tra|nhantra|slsach)/.test(k));
    if (cName >= 0 && cDo >= 0 && cSach >= 0) {
      const out = [];
      for (let i = r + 1; i < rows.length; i++) {
        const name = String(rows[i]?.[cName] ?? '').trim();
        if (!name) continue;
        const d = n(rows[i][cDo]);
        const s = n(rows[i][cSach]);
        if (Number.isFinite(d) || Number.isFinite(s)) out.push({ TenHang: name, Do: Number.isFinite(d) ? d : 0, Sach: Number.isFinite(s) ? s : 0, NoDK: 0 });
      }
      return out;
    }
  }
  return null;
}

async function parseExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: null });
    const res = parseDetailedSheet(rows) || parseFlatSheet(rows);
    if (res && res.length > 0) return res;
  }
  return [];
}

async function parsePdf(file, catalogNames) {
  const pdfjsLib = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    const byY = {};
    content.items.forEach((it) => {
      const y = Math.round(it.transform[5]);
      (byY[y] ||= []).push(it);
    });
    Object.keys(byY).sort((a, b) => b - a).forEach((y) => {
      lines.push(byY[y].sort((a, b) => a.transform[4] - b.transform[4]).map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim());
    });
  }
  const out = [];
  catalogNames.forEach((name) => {
    const key = normLinenName(name);
    const line = lines.find((l) => normLinenName(l).startsWith(key) || normLinenName(l.split(/\d/)[0]) === key);
    if (!line) return;
    const nums = (line.match(/-?\d[\d,.]*/g) || []).map((x) => n(x)).filter(Number.isFinite);
    if (nums.length >= 2) out.push({ TenHang: name, Do: nums[0], Sach: nums[1], NoDK: 0 });
  });
  return out;
}

/** Đọc file nhà giặt — catalogNames chỉ dùng cho PDF */
export async function parseLaundryFile(file, catalogNames = []) {
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return { records: await parsePdf(file, catalogNames), experimental: true };
  return { records: await parseExcel(file), experimental: false };
}
