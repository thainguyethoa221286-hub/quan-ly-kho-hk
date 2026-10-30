// ==================================================================
// excelService.js — Chuẩn hoá định dạng MỌI sheet khi xuất Excel
// theo mẫu báo cáo kế toán doanh nghiệp:
//   1. Tiêu đề (dòng 1): GỘP Ô từ cột A tới cột cuối của bảng, căn giữa,
//      IN HOA, in đậm, Times New Roman.
//   2. Dòng tiêu đề cột: nền xanh nhạt, chữ đậm, căn giữa.
//      - STT / ĐVT / Mã / Code / Ngày  -> căn giữa
//      - Tên mặt hàng / Ghi chú ...    -> căn trái
//      - Cột số (Đầu kỳ, Nhập, Sử dụng, Tồn, Đơn giá, Thành tiền ...)
//        -> căn phải, có phân cách hàng ngàn
//   3. Tự động chỉnh độ rộng cột (autofit) theo nội dung.
// ==================================================================
import * as XLSX from 'xlsx-js-style';

export const FONT_NAME = 'Times New Roman';
const HEADER_FILL = 'D9E1F2'; // xanh nhạt
const BANNER_FILL = 'FFF2CC';
const TOTAL_FILL = 'F2F2F2';
const BORDER_COLOR = '999999';

const THIN = {
  top: { style: 'thin', color: { rgb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { rgb: BORDER_COLOR } },
  left: { style: 'thin', color: { rgb: BORDER_COLOR } },
  right: { style: 'thin', color: { rgb: BORDER_COLOR } },
};

/** Tự đoán kiểu căn lề của cột theo tên tiêu đề cột */
export function inferColType(label) {
  const t = String(label || '').trim().toUpperCase();
  if (/^(STT|ĐVT|DVT|MÃ|MA|MÃ HÀNG|CODE|NGÀY|NGAY|DATE|TT)(\s|$)/.test(t)) return 'center';
  if (/(TÊN|TEN|ITEM|NAME|GHI CHÚ|NOTE|VỊ TRÍ|VI TRI|NHÓM|NHOM|OFFER|NGƯỜI|NGUOI|HÌNH THỨC|THƯ KHÁCH|LÝ DO|DIỄN GIẢI)/.test(t)) return 'text';
  return 'num';
}

const numFmtFor = (v) => (Number.isInteger(v) ? '#,##0' : '#,##0.0##');

/** Số ký tự hiển thị của 1 giá trị (để autofit) */
function displayLen(v, type) {
  if (v === null || v === undefined || v === '') return 0;
  if (type === 'num' && typeof v === 'number') {
    return v.toLocaleString('en-US', { maximumFractionDigits: 3 }).length;
  }
  return String(v)
    .split('\n')
    .reduce((mx, line) => Math.max(mx, line.length), 0);
}

/** Tạo hàm setStyle(r, c, style) cho 1 worksheet (gộp style mới vào style cũ) */
export function makeStyler(ws) {
  return (r, c, style) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = { ...(ws[ref].s || {}), ...style };
  };
}

/**
 * Tạo 1 sheet chuẩn kế toán.
 *
 * @param {object}   o
 * @param {string}   o.title      Tiêu đề báo cáo (tự IN HOA)
 * @param {string[]} o.headers    Tên các cột
 * @param {Array}    o.rows       Mỗi phần tử là:
 *                                  mảng giá trị         -> dòng dữ liệu
 *                                  { banner: 'TEXT' }   -> dòng nhóm (gộp ô, nền vàng nhạt)
 *                                  { total: [...] }     -> dòng tổng cộng (in đậm)
 * @param {string[]} [o.colTypes] 'center' | 'text' | 'num' cho từng cột (mặc định tự đoán theo tên cột)
 * @param {string[]} [o.subtitles] Các dòng phụ dưới tiêu đề (gộp ô + căn giữa)
 * @param {number[]} [o.minWidths] Độ rộng tối thiểu từng cột
 * @param {object}   [o.redCols]  { colIndex: true } cột chữ đỏ (tuỳ chọn)
 * @returns {{ws, lastCol, headerRow, dataStart, dataEnd, nextRow, colTypes}}
 */
export function buildStandardSheet({ title, headers, rows, colTypes, subtitles = [], minWidths = [], redCols = {} }) {
  const lastCol = headers.length - 1;
  const types = headers.map((h, i) => (colTypes && colTypes[i]) || inferColType(h));

  const aoa = [[String(title || '').toUpperCase()]];
  subtitles.forEach((s) => aoa.push([s]));
  const subtitleCount = subtitles.length;
  const headerRow = aoa.length;
  aoa.push(headers);
  const dataStart = aoa.length;

  const bannerRows = [];
  const totalRows = [];
  const dataRows = [];
  rows.forEach((row) => {
    const r = aoa.length;
    if (row && !Array.isArray(row) && row.banner !== undefined) {
      bannerRows.push(r);
      aoa.push([row.banner]);
    } else if (row && !Array.isArray(row) && row.total) {
      totalRows.push(r);
      aoa.push(row.total);
    } else {
      dataRows.push(r);
      aoa.push(row);
    }
  });
  const dataEnd = aoa.length - 1;

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ---- Merge: tiêu đề + phụ đề + dòng nhóm, từ cột A tới cột cuối ----
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
  for (let i = 1; i <= subtitleCount; i++) merges.push({ s: { r: i, c: 0 }, e: { r: i, c: lastCol } });
  bannerRows.forEach((r) => merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } }));
  ws['!merges'] = merges;

  const setStyle = makeStyler(ws);
  const rowsInfo = [];
  rowsInfo[0] = { hpt: 26 };
  ws['!rows'] = rowsInfo;

  // ---- Tiêu đề ----
  setStyle(0, 0, {
    font: { bold: true, sz: 14, name: FONT_NAME },
    alignment: { horizontal: 'center', vertical: 'center' },
  });
  for (let i = 1; i <= subtitleCount; i++) {
    setStyle(i, 0, { font: { bold: true, sz: 11, name: FONT_NAME }, alignment: { horizontal: 'center', vertical: 'center' } });
  }

  // ---- Header cột ----
  for (let c = 0; c <= lastCol; c++) {
    setStyle(headerRow, c, {
      font: { bold: true, sz: 10, name: FONT_NAME, color: { rgb: redCols[c] ? 'FF0000' : '141414' } },
      fill: { patternType: 'solid', fgColor: { rgb: HEADER_FILL } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: THIN,
    });
  }
  rowsInfo[headerRow] = { hpt: 30 };

  // ---- Dòng nhóm ----
  bannerRows.forEach((r) => {
    for (let c = 0; c <= lastCol; c++) {
      setStyle(r, c, {
        font: { bold: true, sz: 11, name: FONT_NAME },
        fill: { patternType: 'solid', fgColor: { rgb: BANNER_FILL } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: THIN,
      });
    }
  });

  // ---- Dòng dữ liệu & tổng ----
  const styleBodyRow = (r, bold, fill) => {
    for (let c = 0; c <= lastCol; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = ws[ref];
      const t = types[c];
      const isNumCell = t === 'num' && cell && typeof cell.v === 'number';
      setStyle(r, c, {
        font: { sz: 10, bold, name: FONT_NAME, color: { rgb: redCols[c] ? 'FF0000' : '141414' } },
        alignment: {
          horizontal: t === 'center' ? 'center' : t === 'num' ? 'right' : 'left',
          vertical: 'center',
          wrapText: t === 'text',
        },
        border: THIN,
        ...(fill ? { fill: { patternType: 'solid', fgColor: { rgb: fill } } } : {}),
        ...(isNumCell ? { numFmt: numFmtFor(cell.v) } : {}),
      });
    }
  };
  dataRows.forEach((r) => styleBodyRow(r, false));
  totalRows.forEach((r) => styleBodyRow(r, true, TOTAL_FILL));

  // ---- Autofit độ rộng cột ----
  const widths = headers.map((h, c) => {
    // header có thể xuống dòng: lấy từ dài nhất sau khi tách theo khoảng trắng dài > 14 ký tự
    const hLen = displayLen(h, 'text');
    let mx = Math.min(hLen, 16);
    for (let r = dataStart; r <= dataEnd; r++) {
      if (bannerRows.includes(r)) continue;
      const v = aoa[r] ? aoa[r][c] : '';
      mx = Math.max(mx, displayLen(v, types[c]));
    }
    const min = minWidths[c] || (types[c] === 'center' ? 6 : 8);
    return { wch: Math.max(min, Math.min(mx + 3, 60)) };
  });
  ws['!cols'] = widths;

  return { ws, lastCol, headerRow, dataStart, dataEnd, nextRow: aoa.length, colTypes: types };
}

/** Tạo workbook 1 sheet và tải về luôn */
export function downloadStandardWorkbook({ sheetName, fileName, ...sheetOpts }) {
  const { ws } = buildStandardSheet(sheetOpts);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

/** Thêm 1 sheet chuẩn vào workbook có sẵn (dùng cho Master Workbook) */
export function appendStandardSheet(wb, sheetName, sheetOpts) {
  const res = buildStandardSheet(sheetOpts);
  XLSX.utils.book_append_sheet(wb, res.ws, sheetName);
  return res;
}
