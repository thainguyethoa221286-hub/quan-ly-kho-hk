import * as XLSX from 'xlsx-js-style';

// ==================================================================
// Gom dữ liệu `bills` (1 tháng) thành Ma Trận Ngày × Phòng × Mặt Hàng —
// dùng chung cho "Xem Nhanh" (trong MinibarModule.jsx), "Xuất Báo Cáo
// Daily Bills (Excel)" (trong MinibarModule.jsx) VÀ sheet "Minibar Daily"
// trong "Xuất Báo Cáo Tổng Của Tháng" (DashboardModule.jsx).
// ==================================================================
export function buildDailyBillsMatrix(bills) {
  const dayMap = {};
  bills.forEach((b) => {
    if (!dayMap[b.Ngay]) dayMap[b.Ngay] = new Set();
    dayMap[b.Ngay].add(b.Phong);
  });
  const dayGroups = Object.keys(dayMap)
    .sort()
    .map((ngay) => ({
      ngay,
      dayNum: Number(ngay.split('-')[2]) || ngay,
      rooms: [...dayMap[ngay]].sort((a, c) => a.localeCompare(c, undefined, { numeric: true })),
    }));

  // Ô ma trận (giao Ngày × Phòng × Item) = SLBill + SLFOC cộng dồn — tổng SỐ
  // LƯỢNG THỰC TẾ đã tiêu dùng, không phân biệt Bill hay FOC trong từng ô.
  const qtyMap = {};
  // Tổng BILLED / Tổng FOC riêng của từng Item, cộng dồn cả tháng — dùng cho
  // 2 cột Total ở cuối bảng.
  const billMap = {};
  const focMap = {};
  // Ngày|Phòng nào có phát sinh FOC (bất kể Item) — để bôi đỏ Số Phòng.
  const focRoomSet = new Set();

  bills.forEach((b) => {
    const key = `${b.Ngay}|${b.Phong}|${b.TenHang}`;
    qtyMap[key] = (qtyMap[key] || 0) + (Number(b.SLBill) || 0) + (Number(b.SLFOC) || 0);
    billMap[b.TenHang] = (billMap[b.TenHang] || 0) + (Number(b.SLBill) || 0);
    focMap[b.TenHang] = (focMap[b.TenHang] || 0) + (Number(b.SLFOC) || 0);
    if (Number(b.SLFOC) > 0) focRoomSet.add(`${b.Ngay}|${b.Phong}`);
  });

  return { dayGroups, qtyMap, billMap, focMap, focRoomSet };
}

/**
 * Dựng sheet "Ma Trận Ngày × Phòng × Mặt Hàng" (giống hệt layout/style của
 * nút "Xuất Báo Cáo Daily Bills (Excel)" trong MinibarModule.jsx) và append
 * thẳng vào 1 workbook `wb` đã có sẵn, dưới tên sheet `sheetName`.
 *
 * Dùng chung cho cả file xuất riêng (1 sheet, 1 workbook mới) và cho sheet
 * "Minibar Daily" bên trong "Xuất Báo Cáo Tổng Của Tháng" (nhiều sheet,
 * cùng 1 workbook) — tránh lặp lại ~100 dòng style/merge code 2 nơi.
 */
export function appendMinibarDailySheet(wb, { bills, catalog, thang, sheetName = `Minibar_Daily_${thang}` }) {
  const { dayGroups, qtyMap, billMap, focMap, focRoomSet } = buildDailyBillsMatrix(bills);

  // Xác định vị trí cột: STT, CODE, TÊN MẶT HÀNG | (từng nhóm Ngày -> từng Phòng) | TOTAL (FOC | BILLED) | Ghi chú | Đơn giá
  const FIXED_LEFT = 3;
  const dayColStart = [];
  let cursor = FIXED_LEFT;
  dayGroups.forEach((g) => { dayColStart.push(cursor); cursor += g.rooms.length; });
  const totalFOCCol = cursor;
  const totalBilledCol = cursor + 1;
  const ghiChuCol = cursor + 2;
  const donGiaCol = cursor + 3;
  const lastCol = donGiaCol;

  const HEADER_ROW = 1; // "Dòng 2" (Ngày / tên cột)
  const SUBHEADER_ROW = 2; // "Dòng 3" (Số Phòng / FOC / BILLED)
  const DATA_START = 3; // "Dòng 4" trở đi

  const [y, m] = thang.split('-').map(Number);
  const LEGEND_ROW = DATA_START + catalog.length; // 1 dòng ghi chú cuối bảng
  const totalRows = LEGEND_ROW + 1;
  const aoa = Array.from({ length: totalRows }, () => Array(lastCol + 1).fill(''));

  aoa[0][0] = `BÁO CÁO SỐ LƯỢNG MINIBAR T ${String(m).padStart(2, '0')}/${y}`;
  aoa[HEADER_ROW][0] = 'STT';
  aoa[HEADER_ROW][1] = 'CODE';
  aoa[HEADER_ROW][2] = 'TÊN MẶT HÀNG';
  dayGroups.forEach((g, idx) => { aoa[HEADER_ROW][dayColStart[idx]] = g.dayNum; });
  aoa[HEADER_ROW][totalFOCCol] = 'TOTAL';
  aoa[SUBHEADER_ROW][totalFOCCol] = 'FOC';
  aoa[SUBHEADER_ROW][totalBilledCol] = 'BILLED';
  aoa[HEADER_ROW][ghiChuCol] = 'Ghi chú';
  aoa[HEADER_ROW][donGiaCol] = 'Đơn giá';
  dayGroups.forEach((g, idx) => {
    g.rooms.forEach((room, ri) => { aoa[SUBHEADER_ROW][dayColStart[idx] + ri] = room; });
  });

  catalog.forEach((c, i) => {
    const r = DATA_START + i;
    aoa[r][0] = i + 1;
    aoa[r][1] = ''; // CODE — App hiện chưa lưu mã sản phẩm riêng cho từng Item Minibar
    aoa[r][2] = c.TenHang;
    dayGroups.forEach((g, idx) => {
      g.rooms.forEach((room, ri) => {
        const qty = qtyMap[`${g.ngay}|${room}|${c.TenHang}`] || 0;
        if (qty > 0) aoa[r][dayColStart[idx] + ri] = qty;
      });
    });
    aoa[r][totalFOCCol] = focMap[c.TenHang] || '';
    aoa[r][totalBilledCol] = billMap[c.TenHang] || '';
    aoa[r][ghiChuCol] = '';
    aoa[r][donGiaCol] = Number(c.DonGia) || '';
  });

  aoa[LEGEND_ROW][0] = 'Ghi chú: Số Phòng được gạch chân màu ĐỎ = Ngày đó phòng này có phát sinh hàng FOC (miễn phí) trong số lượng tiêu dùng.';

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merge: Title | STT/CODE/TÊN MẶT HÀNG (dọc 2 dòng) | từng nhóm Ngày (ngang theo số Phòng) | TOTAL (ngang qua FOC+BILLED) | Ghi chú/Đơn giá (dọc 2 dòng) | Ghi chú cuối bảng
  const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, { s: { r: LEGEND_ROW, c: 0 }, e: { r: LEGEND_ROW, c: lastCol } }];
  [0, 1, 2].forEach((c) => merges.push({ s: { r: HEADER_ROW, c }, e: { r: SUBHEADER_ROW, c } }));
  dayGroups.forEach((g, idx) => {
    const startC = dayColStart[idx];
    const endC = startC + g.rooms.length - 1;
    if (endC > startC) merges.push({ s: { r: HEADER_ROW, c: startC }, e: { r: HEADER_ROW, c: endC } });
  });
  merges.push({ s: { r: HEADER_ROW, c: totalFOCCol }, e: { r: HEADER_ROW, c: totalBilledCol } });
  [ghiChuCol, donGiaCol].forEach((c) => merges.push({ s: { r: HEADER_ROW, c }, e: { r: SUBHEADER_ROW, c } }));
  ws['!merges'] = merges;

  ws['!cols'] = Array.from({ length: lastCol + 1 }, (_, c) => {
    if (c === 0) return { wch: 5 };
    if (c === 1) return { wch: 11 };
    if (c === 2) return { wch: 24 };
    if (c === totalFOCCol || c === totalBilledCol || c === ghiChuCol || c === donGiaCol) return { wch: 11 };
    return { wch: 6 };
  });

  const thin = { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } };
  const headerFill = { fgColor: { rgb: 'E2E8F0' } };
  const setStyle = (r, c, style) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = { ...(ws[ref].s || {}), ...style };
  };

  setStyle(0, 0, { font: { bold: true, sz: 14, name: 'Times New Roman' }, alignment: { horizontal: 'center', vertical: 'center' } });

  // Map ngược: cột -> { ngay, room } để biết cột Số Phòng nào cần tô đỏ (có FOC)
  const colToRoom = {};
  dayGroups.forEach((g, idx) => {
    g.rooms.forEach((room, ri) => { colToRoom[dayColStart[idx] + ri] = { ngay: g.ngay, room }; });
  });
  const redBottom = { bottom: { style: 'medium', color: { rgb: 'FF0000' } } };

  for (let c = 0; c <= lastCol; c++) {
    setStyle(HEADER_ROW, c, { font: { bold: true, sz: 10, name: 'Times New Roman' }, fill: headerFill, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: thin });
    const roomInfo = colToRoom[c];
    const hasFOC = roomInfo && focRoomSet.has(`${roomInfo.ngay}|${roomInfo.room}`);
    setStyle(SUBHEADER_ROW, c, {
      font: { bold: true, sz: 10, name: 'Times New Roman', underline: hasFOC, color: hasFOC ? { rgb: 'FF0000' } : undefined },
      fill: headerFill,
      alignment: { horizontal: 'center', vertical: 'center' },
      border: hasFOC ? { ...thin, ...redBottom } : thin,
    });
  }

  for (let r = DATA_START; r < LEGEND_ROW; r++) {
    for (let c = 0; c <= lastCol; c++) {
      const isTenHang = c === 2;
      const isMoney = c === totalFOCCol || c === totalBilledCol || c === donGiaCol;
      setStyle(r, c, {
        font: { sz: 10, name: 'Times New Roman', bold: isTenHang },
        alignment: { horizontal: isTenHang ? 'left' : isMoney ? 'right' : 'center', vertical: 'center' },
        border: thin,
        ...(isMoney ? { numFmt: '#,##0' } : {}),
      });
    }
  }

  setStyle(LEGEND_ROW, 0, { font: { sz: 9, italic: true, name: 'Times New Roman', color: { rgb: 'FF0000' } }, alignment: { horizontal: 'left', vertical: 'center' } });

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return ws;
}
