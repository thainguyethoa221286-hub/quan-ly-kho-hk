/**
 * ============================================================
 *  linenStatementExport.js — Xuất "BẢNG KÊ CHI TIẾT GIẶT ỦI" GIỐNG HỆT file mẫu
 * ============================================================
 *  Cách làm: lấy nguyên file Excel mẫu (src/data/linenStatementTemplate.js), giữ
 *  nguyên mọi thứ (định dạng, ô gộp, công thức, dòng/cột ẩn, ghi chú, khổ giấy,
 *  bảng thứ 2 phía dưới...) rồi chỉ thay SỐ LIỆU THẬT từ App vào đúng ô:
 *    - Tiêu đề tháng/năm, thứ + ngày trên đầu bảng
 *    - Nợ ĐK, số DƠ / SẠCH từng ngày, RW, đơn giá của 20 loại linen
 *    - Các ô công thức (Tổng cộng, Dư/Nợ, Tổng giặt, Thành tiền, VAT 8%) ghi lại
 *      cả công thức lẫn giá trị tính sẵn.
 *  Dùng được cho cả file gửi nhà giặt lẫn file lưu nội bộ.
 * ============================================================
 */
import { LINEN_STATEMENT_TEMPLATE_B64 } from '../data/linenStatementTemplate';
import { normLinenName, LINEN_FACTOR } from './supabaseLinenService';

// Thứ tự 20 loại linen trong mẫu (dòng 12, 14, ..., 50 — mỗi loại 2 dòng DƠ/SẠCH)
export const TEMPLATE_ITEMS = [
  'DRAP LỚN', 'BAO MỀN LỚN', 'BAO MỀN NHỎ', 'DRAP NHỎ', 'ÁO GỐI', 'KHĂN MẶT', 'LÓT CHÂN',
  'KHĂN TAY', 'KHĂN TẮM', 'BẢO VỆ NỆM', 'TTT', 'ÁO TẮM', 'KHĂN ĂN', 'BẢO VỆ GỐI',
  'VÁY GIƯỜNG', 'MÀN DÀY', 'MÀN MỎNG', 'RUỘT MỀN', 'RUỘT GỐI', 'TOPPER',
];
const FIRST_ROW = 12;

// Bảng thứ 2 trong mẫu (dòng 65-98) = bảng REWASH: cùng cấu trúc DƠ/SẠCH, mỗi loại 2 dòng.
// Dòng "DƠ" của từng loại (dòng SẠCH = dòng DƠ + 1). Mẫu không có dòng cho Bảo vệ nệm/gối, Màn, Ruột, Topper.
const RW_HEAD_ROWS = [65, 66]; // thứ, ngày
const RW_ROWS = {
  'DRAP LỚN': 67, 'BAO MỀN LỚN': 69, 'BAO MỀN NHỎ': 71, 'DRAP NHỎ': 73, 'ÁO GỐI': 75, 'KHĂN MẶT': 77,
  'LÓT CHÂN': 79, 'KHĂN TAY': 81, 'KHĂN TẮM': 83, 'ÁO TẮM': 85, 'KHĂN ĂN': 91, 'VÁY GIƯỜNG': 93, 'TTT': 95,
};
const RW_ALL_ROWS = [];
for (let r = 67; r <= 97; r += 2) RW_ALL_ROWS.push(r); // 16 khối trong mẫu (gồm MỀN, THẢM, khối KHĂN ĂN thứ 2)
const VAT = 0.08;

// ---------------------------------------------------------------- ZIP (đọc + ghi)
const te = new TextEncoder();
const td = new TextDecoder();

function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = bytes.length - 22;
  while (eocd >= 0 && dv.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('File mẫu Excel không hợp lệ');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = [];
  for (let i = 0; i < count; i++) {
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = td.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const lhNameLen = dv.getUint16(lho + 26, true);
    const lhExtraLen = dv.getUint16(lho + 28, true);
    const start = lho + 30 + lhNameLen + lhExtraLen;
    const raw = bytes.subarray(start, start + csize);
    files.push({ name, data: method === 0 ? raw : await inflateRaw(raw) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Ghi ZIP kiểu STORE (không nén) — Excel mở bình thường */
function writeZip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  files.forEach((f) => {
    const name = te.encode(f.name);
    const crc = crc32(f.data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.data.length, true);
    lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), name, f.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, f.data.length, true); ch.setUint32(24, f.data.length, true);
    ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + f.data.length;
  });
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ---------------------------------------------------------------- Sửa ô trong sheet XML
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function makeCellPatcher(xmlRef) {
  const get = () => xmlRef.xml;
  return function setCell(ref, spec) {
    const xml = get();
    const re = new RegExp(`<c r="${ref}"((?:\\s[^>]*?)?)(?:/>|>([\\s\\S]*?)</c>)`);
    const m = re.exec(xml);
    if (!m) throw new Error(`Mẫu Excel thiếu ô ${ref}`);
    const attrs = m[1].replace(/\st="[^"]*"/, '');
    let out;
    if (spec === null) out = `<c r="${ref}"${attrs}/>`;
    else if (typeof spec === 'number') out = `<c r="${ref}"${attrs}><v>${spec}</v></c>`;
    else if (typeof spec === 'string') out = `<c r="${ref}"${attrs} t="inlineStr"><is><t xml:space="preserve">${esc(spec)}</t></is></c>`;
    else out = `<c r="${ref}"${attrs}><f>${esc(spec.f)}</f><v>${spec.v}</v></c>`;
    xmlRef.xml = xml.slice(0, m.index) + out + xml.slice(m.index + m[0].length);
  };
}

const colLetter = (n) => {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
};
/** Như setCell nhưng bỏ qua nếu mẫu không có ô đó */
function trySet(set, ref, spec) {
  try { set(ref, spec); } catch (e) { /* ô không tồn tại trong mẫu -> bỏ qua */ }
}
/** Hiện lại dòng đang bị ẩn trong mẫu (khi dòng đó có số liệu Rewash) */
function unhideRow(ref, r) {
  ref.xml = ref.xml.replace(new RegExp(`(<row r="${r}"[^>]*?)\\s+hidden="1"`), '$1');
}
const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Dựng file Excel (Blob) + báo cáo những loại linen trên App không có trong mẫu.
 * @param {string} thang        "YYYY-MM"
 * @param {Array}  summary      kết quả computeLinenSummary()
 * @param {Array}  dailyRows    các dòng linen_daily của tháng { ten_hang, ngay, do_sl, sach_sl }
 */
export async function buildLinenStatementBlob({ thang, summary, dailyRows }) {
  const [y, m] = thang.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');

  const files = await readZip(b64ToBytes(LINEN_STATEMENT_TEMPLATE_B64));
  const byName = Object.fromEntries(files.map((f) => [f.name, f]));
  const sheetPath = 'xl/worksheets/sheet1.xml';
  const ref = { xml: td.decode(byName[sheetPath].data) };
  const set = makeCellPatcher(ref);

  // ---- tiêu đề, tháng/năm
  set('A5', `BẢNG KÊ CHI TIẾT GIẶT ỦI THÁNG ${mm}/${y}`);
  set('R9', m);
  set('U9', y);

  // ---- đầu bảng: thứ + ngày (E..AH = ngày 1..30, AI = ngày 31)
  for (let d = 1; d <= 31; d++) {
    const col = colLetter(4 + d);
    if (d <= dim) {
      set(`${col}10`, WEEKDAY[new Date(y, m - 1, d).getDay()]);
      set(`${col}11`, d);
      trySet(set, `${col}${RW_HEAD_ROWS[0]}`, WEEKDAY[new Date(y, m - 1, d).getDay()]);
      trySet(set, `${col}${RW_HEAD_ROWS[1]}`, d);
    } else if (d <= 30) {
      set(`${col}10`, null);
      set(`${col}11`, null);
      trySet(set, `${col}${RW_HEAD_ROWS[0]}`, null);
      trySet(set, `${col}${RW_HEAD_ROWS[1]}`, null);
    }
  }
  if (dim === 31) {
    // cột AI (ngày 31) trong mẫu bị ẩn -> hiện lại
    ref.xml = ref.xml.replace(
      '<col min="35" max="36" width="5" style="5" hidden="1" customWidth="1"/>',
      '<col min="35" max="35" width="5" style="5" customWidth="1"/><col min="36" max="36" width="5" style="5" hidden="1" customWidth="1"/>',
    );
  }

  // ---- gom số liệu ngày theo (loại linen, ngày)
  const dayMap = {};
  dailyRows.forEach((r) => {
    const day = Number(String(r.ngay).slice(8, 10));
    const k = normLinenName(r.ten_hang);
    (dayMap[k] ||= {})[day] = { do: Number(r.do_sl) || 0, sach: Number(r.sach_sl) || 0, rwDo: Number(r.rw_sl) || 0, rwSach: Number(r.rw_sach_sl) || 0 };
  });
  const sumMap = {};
  summary.forEach((s) => { sumMap[normLinenName(s.TenHang)] = s; });
  const templateKeys = new Set(TEMPLATE_ITEMS.map(normLinenName));
  const notInTemplate = summary.filter((s) => !templateKeys.has(normLinenName(s.TenHang))).map((s) => s.TenHang);

  // ---- 20 loại linen × 2 dòng
  let sumTien = 0;
  TEMPLATE_ITEMS.forEach((name, i) => {
    const rDo = FIRST_ROW + i * 2;
    const rSach = rDo + 1;
    const key = normLinenName(name);
    const s = sumMap[key];
    const days = dayMap[key] || {};

    set(`C${rDo}`, s ? s.NoDK : 0);
    let tDo = 0;
    let tSach = 0;
    for (let d = 1; d <= 31; d++) {
      const col = colLetter(4 + d);
      if (d > dim) { if (d <= 30) { set(`${col}${rDo}`, null); set(`${col}${rSach}`, null); } continue; }
      const e = days[d];
      set(`${col}${rDo}`, e ? e.do : null);
      set(`${col}${rSach}`, e ? e.sach : null);
      if (e) { tDo += e.do; tSach += e.sach; }
    }

    const noCuoi = (s ? s.NoDK : 0) + tDo - tSach;
    const override = s && s.SlOverride !== null && s.SlOverride !== undefined ? s.SlOverride : null;
    const factor = LINEN_FACTOR[key] || 1;
    const tongGiat = override !== null ? override : tSach * factor; // Rewash không tính tiền
    const price = s ? s.DonGia : 0;
    const tien = tongGiat * price;
    sumTien += tien;

    set(`AK${rDo}`, { f: `SUM(D${rDo}:AJ${rDo})`, v: tDo });
    set(`AK${rSach}`, { f: `SUM(D${rSach}:AJ${rSach})`, v: tSach });
    set(`AL${rDo}`, { f: `${rDo === FIRST_ROW ? `(C${rDo}+AK${rDo})` : `C${rDo}+AK${rDo}`}-AK${rSach}`, v: noCuoi });
    set(`AM${rDo}`, null); // cột RW của bảng 1 để trống: Rewash nằm ở bảng thứ 2, không tính tiền
    if (override !== null) set(`AN${rDo}`, override);
    else set(`AN${rDo}`, { f: factor !== 1 ? `AK${rSach}*${factor}` : `AK${rSach}-AM${rDo}`, v: tongGiat });
    set(`AO${rDo}`, price ? price : null);
    set(`AP${rDo}`, { f: `AO${rDo}*AN${rDo}`, v: tien });
  });

  // ---- BẢNG 2: REWASH (dòng 65-98) — xoá số cũ của mẫu rồi ghi Rewash Dơ / Rewash Sạch thật
  RW_ALL_ROWS.forEach((rDo) => {
    const rSach = rDo + 1;
    trySet(set, `C${rDo}`, null);
    // Ô AK67 trong mẫu là "công thức dùng chung" cho cả cột: ghi đè nó thì các dòng còn lại mất công thức
    // -> ghi lại công thức tường minh cho mọi khối (giá trị 0, khối có số liệu sẽ được ghi đè bên dưới)
    trySet(set, `AK${rDo}`, { f: `SUM(D${rDo}:AI${rDo})`, v: 0 });
    trySet(set, `AK${rSach}`, { f: `SUM(D${rSach}:AI${rSach})`, v: 0 });
    for (let d = 0; d <= 31; d++) {
      const col = colLetter(4 + d);
      trySet(set, `${col}${rDo}`, null);
      trySet(set, `${col}${rSach}`, null);
    }
  });
  const rwNotInTemplate = [];
  const rwKeys = Object.fromEntries(Object.entries(RW_ROWS).map(([n, r]) => [normLinenName(n), r]));
  summary.forEach((s) => {
    const key = normLinenName(s.TenHang);
    const days = dayMap[key] || {};
    const hasData = s.RWNoDK || s.RW || s.RWSach || Object.values(days).some((e) => e.rwDo || e.rwSach);
    const rDo = rwKeys[key];
    if (!rDo) { if (hasData) rwNotInTemplate.push(s.TenHang); return; }
    const rSach = rDo + 1;
    if (hasData) { unhideRow(ref, rDo); unhideRow(ref, rSach); }
    let tDo = 0;
    let tSach = 0;
    for (let d = 1; d <= dim; d++) {
      const e = days[d];
      if (!e) continue;
      const col = colLetter(4 + d);
      if (e.rwDo) { trySet(set, `${col}${rDo}`, e.rwDo); tDo += e.rwDo; }
      if (e.rwSach) { trySet(set, `${col}${rSach}`, e.rwSach); tSach += e.rwSach; }
    }
    if (s.RWNoDK) trySet(set, `C${rDo}`, s.RWNoDK);
    else trySet(set, `C${rDo}`, 0);
    const rwNo = (s.RWNoDK || 0) + tDo - tSach;
    trySet(set, `AK${rDo}`, { f: `SUM(D${rDo}:AI${rDo})`, v: tDo });
    trySet(set, `AK${rSach}`, { f: `SUM(D${rSach}:AI${rSach})`, v: tSach });
    trySet(set, `AL${rDo}`, { f: `C${rDo}+AK${rDo}-AK${rSach}`, v: rwNo });
    trySet(set, `AN${rDo}`, { f: `AK${rSach}-AM${rDo}`, v: tSach });
    trySet(set, `AP${rDo}`, { f: `AO${rDo}*AN${rDo}`, v: 0 });
  });

  // ---- cụm Tổng / VAT 8% / Tổng cộng (mẫu có 2 cụm, 1 cụm đang ẩn)
  const vat = sumTien * VAT;
  set('AP52', { f: 'SUM(AP12:AP50)', v: sumTien });
  set('AP53', { f: 'AP52*0.08', v: vat });
  set('AP54', { f: 'SUM(AP52:AP53)', v: sumTien + vat });
  set('AP55', { f: 'SUM(AP12:AP51)', v: sumTien });
  set('AP56', { f: 'AP55*0.08', v: vat });
  set('AP57', { f: 'SUM(AP55:AP56)', v: sumTien + vat });

  byName[sheetPath].data = te.encode(ref.xml);

  // ---- tên sheet theo tháng + bắt Excel tính lại công thức khi mở, bỏ calcChain cũ
  const wbPath = 'xl/workbook.xml';
  const oldName = 'LINEN THÁNG 09-2026';
  const newName = `LINEN THÁNG ${mm}-${y}`;
  byName[wbPath].data = te.encode(
    td.decode(byName[wbPath].data)
      .split(oldName).join(newName)
      .replace('<calcPr calcId="191029"', '<calcPr fullCalcOnLoad="1" calcId="191029"'),
  );
  const relsPath = 'xl/_rels/workbook.xml.rels';
  byName[relsPath].data = te.encode(td.decode(byName[relsPath].data).replace(/<Relationship [^>]*calcChain[^>]*\/>/, ''));
  const ctPath = '[Content_Types].xml';
  byName[ctPath].data = te.encode(td.decode(byName[ctPath].data).replace(/<Override [^>]*calcChain[^>]*\/>/, ''));
  const kept = files.filter((f) => f.name !== 'xl/calcChain.xml');

  return { blob: writeZip(kept), notInTemplate, rwNotInTemplate };
}

/** Tạo file và tải về máy */
export async function downloadLinenStatement({ thang, summary, dailyRows }) {
  const { blob, notInTemplate, rwNotInTemplate } = await buildLinenStatementBlob({ thang, summary, dailyRows });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bang_ke_chi_tiet_giat_ui_${thang}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { notInTemplate, rwNotInTemplate };
}
