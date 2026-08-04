import * as XLSX from 'xlsx';
import { StoreItem, PRPOItem, DamageRecord, MinibarItem, RoomMinibarSetup, VPPItem } from '../types';

const HOTEL_NAME = 'GRAND PALACE HOTEL & RESORT 5★';
const DEPARTMENT_NAME = 'BỘ PHẬN BUỒNG PHÒNG - HOUSEKEEPING & STORE';

// Utility to format VND for display or number formatting in Excel
export const formatVND = (num: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

// Common signature block rows
const createSignatureRows = (role1 = 'Thủ Kho Vật Tư', role2 = 'Trưởng BP Buồng Phòng', role3 = 'Kế Toán Trưởng') => [
  [],
  ['', '', '', '', 'Ngày ...... Tháng ...... Năm 2026'],
  ['', role1, '', role2, '', role3],
  ['', '(Ký & ghi rõ họ tên)', '', '(Ký & ghi rõ họ tên)', '', '(Ký & ghi rõ họ tên)'],
  [],
  [],
  []
];

// 1. Export Store Inventory to Excel
export const exportStoreInventoryToExcel = (month: string, items: StoreItem[]) => {
  const titleRow = [[HOTEL_NAME], [DEPARTMENT_NAME], [`BÁO CÁO NHẬP - XUẤT - TỒN KHO VẬT TƯ BUỒNG PHÒNG (${month})`], []];
  
  const headers = [
    'STT', 'Mã Vật Tư', 'Tên Vật Tư', 'ĐVT', 'Phân Loại', 'Tồn Đầu Kỳ', 
    'Định Mức Setup', 'Nhập Trong Kỳ', 'Kho Thực Tế', 'Điều Chuyển', 
    'Hao Hụt / Hư Hỏng (Mod 03)', 'Tổng Hiện Có', 'Xuất Sử Dụng', 'Tồn Cuối Kỳ', 
    'Đơn Giá (VNĐ)', 'Giá Trị Tồn Kho (VNĐ)', 'Ghi Chú'
  ];

  const dataRows = items.map((item, idx) => {
    const totalAvailable = item.openingStock + item.incomingQty;
    const endingStock = item.currentWarehouseStock + item.setupQty;
    const usage = Math.max(0, totalAvailable - (item.lossAndDamageQty + item.transferQty + endingStock));
    const valuation = endingStock * item.unitCost;

    return [
      idx + 1,
      item.code,
      item.name,
      item.unit,
      item.category,
      item.openingStock,
      item.setupQty,
      item.incomingQty,
      item.currentWarehouseStock,
      item.transferQty,
      item.lossAndDamageQty,
      totalAvailable,
      usage,
      endingStock,
      item.unitCost,
      valuation,
      item.notes || ''
    ];
  });

  const totals = [
    'TỔNG CỘNG', '', '', '', '',
    items.reduce((acc, i) => acc + i.openingStock, 0),
    items.reduce((acc, i) => acc + i.setupQty, 0),
    items.reduce((acc, i) => acc + i.incomingQty, 0),
    items.reduce((acc, i) => acc + i.currentWarehouseStock, 0),
    items.reduce((acc, i) => acc + i.transferQty, 0),
    items.reduce((acc, i) => acc + i.lossAndDamageQty, 0),
    items.reduce((acc, i) => acc + (i.openingStock + i.incomingQty), 0),
    '', // Usage sum
    items.reduce((acc, i) => acc + (i.currentWarehouseStock + i.setupQty), 0),
    '',
    items.reduce((acc, i) => acc + ((i.currentWarehouseStock + i.setupQty) * i.unitCost), 0),
    ''
  ];

  const wsData = [...titleRow, headers, ...dataRows, totals, ...createSignatureRows()];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 35 }, { wch: 8 }, { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 16 }, { wch: 22 }, { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoKhoHK');
  XLSX.writeFile(wb, `Kho_Vat_Tu_HK_${month}.xlsx`);
};

// 2. Export PR-PO Requisition to Excel
export const exportPRPOToExcel = (month: string, prItems: PRPOItem[]) => {
  const titleRow = [[HOTEL_NAME], [DEPARTMENT_NAME], [`ĐƠN ĐỀ NGHỊ MUA HÀNG & VẬT TƯ (PR-PO) THÁNG ${month}`], []];

  const headers = [
    'STT', 'Mã VT', 'Tên Vật Tư', 'ĐVT', 'Tồn Hiện Tại', 'Định Mức An Toàn', 
    'Nhu Cầu Tháng', 'SL Đề Xuất PR (Formula)', 'SL Duyệt Mua PO', 
    'Đơn Giá Dự Kiến', 'Thành Tiền Mua (VNĐ)', 'Nhà Cung Cấp', 'Ưu Tiên', 'Trạng Thái', 'Ghi Chú'
  ];

  const dataRows = prItems.map((item, idx) => {
    const totalAmount = item.adjustedPRQty * item.unitCost;
    return [
      idx + 1,
      item.code,
      item.name,
      item.unit,
      item.currentStock,
      item.safetyStock,
      item.monthlyUsage,
      item.suggestedPRQty,
      item.adjustedPRQty,
      item.unitCost,
      totalAmount,
      item.supplierName,
      item.priority === 'URGENT' ? 'Khẩn' : item.priority === 'HIGH' ? 'Cao' : 'Bình thường',
      item.status,
      item.notes || ''
    ];
  });

  const totals = [
    'TỔNG NGHĨA VỤ NGUYÊN TẮC', '', '', '', '', '', '', '',
    prItems.reduce((acc, i) => acc + i.adjustedPRQty, 0),
    '',
    prItems.reduce((acc, i) => acc + (i.adjustedPRQty * i.unitCost), 0),
    '', '', '', ''
  ];

  const wsData = [...titleRow, headers, ...dataRows, totals, ...createSignatureRows('Người Đề Xuất', 'Trưởng BP Buồng Duyệt', 'Giám Đốc Mua Hàng')];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 35 }, { wch: 8 }, { wch: 14 },
    { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PR_PO_Requisition');
  XLSX.writeFile(wb, `De_Nghi_Mua_Hang_PR_PO_${month}.xlsx`);
};

// 3. Export Loss & Damage Report
export const exportLossAndDamageToExcel = (month: string, damageRecords: DamageRecord[]) => {
  const titleRow = [[HOTEL_NAME], [DEPARTMENT_NAME], [`BÁO CÁO HƯ HỎNG - THIỆT HẠI & ĐỀN BÙ VẬT TƯ (${month})`], []];

  const headers = [
    'STT', 'Ngày Ghi Nhận', 'Mã VT', 'Tên Vật Tư / Hàng Hóa', 'Vị Trí / Phòng', 'Số Lượng', 
    'Phân Loại Chi Phí', 'Đơn Giá Góc', 'Số Tiền Thu Khách (VNĐ)', 'Số Tiền KS Chịu FOC (VNĐ)', 
    'Người Phê Duyệt FOC / Số Folio', 'Ghi Chú Trạng Thái'
  ];

  const dataRows = damageRecords.map((item, idx) => {
    return [
      idx + 1,
      item.date,
      item.code,
      item.itemName,
      item.location,
      item.quantity,
      item.isCharge ? 'Khách Đền Bù' : 'Khách Sạn Chịu (FOC)',
      item.unitCost,
      item.isCharge ? item.chargePrice : 0,
      !item.isCharge ? item.costAmount : 0,
      item.offerBy || 'N/A',
      item.notes || ''
    ];
  });

  const totalCharge = damageRecords.reduce((acc, i) => acc + (i.isCharge ? i.chargePrice : 0), 0);
  const totalFOC = damageRecords.reduce((acc, i) => acc + (!i.isCharge ? i.costAmount : 0), 0);

  const totals = [
    'TỔNG CỘNG THIỆT HẠI', '', '', '', '',
    damageRecords.reduce((acc, i) => acc + i.quantity, 0),
    '', '', totalCharge, totalFOC, '', ''
  ];

  const wsData = [...titleRow, headers, ...dataRows, totals, ...createSignatureRows('Người Báo Cáo', 'Trưởng BP Buồng Duyệt', 'Lễ Tân / Kế Toán')];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 35 }, { wch: 16 },
    { wch: 10 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 22 },
    { wch: 28 }, { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoHuHong');
  XLSX.writeFile(wb, `Bao_Cao_Hu_Hong_Thiet_Hai_${month}.xlsx`);
};

// 4. Export Minibar Summary Sheet to Excel
export const exportMinibarSummaryToExcel = (
  month: string, 
  minibarItems: MinibarItem[], 
  roomSetups: RoomMinibarSetup[]
) => {
  const titleRow = [[HOTEL_NAME], [DEPARTMENT_NAME], [`BẢNG BÁO CÁO TỔNG KIỂM KÊ & DOANH THU MINIBAR THÁNG ${month}`], []];

  const headers = [
    'STT', 'Mã Hàng', 'Tên Hàng Minibar', 'ĐVT', 'Tồn Đầu Kỳ', 'Nhập Trong Kỳ', 
    'Billed (Đã Bán)', 'No Change', 'FOC (Miễn Phí)', 'Transfer FO', 'Transfer FB', 
    'Tồn Kho MB', 'Tồn Khay Setup Phòng', 'Tồn Sách Vở (Formula)', 'Tồn Thực Tế (Formula)', 
    'Chênh Lệch', 'Đánh Giá Status', 'Giá Bán (VNĐ)', 'Doanh Thu Minibar (VNĐ)'
  ];

  // Helper to calculate total setup stock in rooms for an item
  const calculateSetupStock = (code: string) => {
    return roomSetups.reduce((acc, room) => acc + (room.itemQuantities[code] || 0), 0);
  };

  const dataRows = minibarItems.map((item, idx) => {
    const setupStock = calculateSetupStock(item.code);
    const bookEndingStock = item.openingStock + item.incomingQty - item.billedQty - item.focQty - item.transferFOQty - item.transferFBQty;
    const actualStock = item.warehouseStock + setupStock;
    const discrepancy = bookEndingStock - actualStock;
    const revenue = item.billedQty * item.sellingPrice;

    return [
      idx + 1,
      item.code,
      item.name,
      item.unit,
      item.openingStock,
      item.incomingQty,
      item.billedQty,
      item.noChangeQty,
      item.focQty,
      item.transferFOQty,
      item.transferFBQty,
      item.warehouseStock,
      setupStock,
      bookEndingStock,
      actualStock,
      discrepancy,
      discrepancy === 0 ? '🟢 Cân Bằng' : `⚠️ Khớp lệch ${discrepancy} lon/gói`,
      item.sellingPrice,
      revenue
    ];
  });

  const totals = [
    'TỔNG CỘNG MINIBAR', '', '', '',
    minibarItems.reduce((acc, i) => acc + i.openingStock, 0),
    minibarItems.reduce((acc, i) => acc + i.incomingQty, 0),
    minibarItems.reduce((acc, i) => acc + i.billedQty, 0),
    minibarItems.reduce((acc, i) => acc + i.noChangeQty, 0),
    minibarItems.reduce((acc, i) => acc + i.focQty, 0),
    minibarItems.reduce((acc, i) => acc + i.transferFOQty, 0),
    minibarItems.reduce((acc, i) => acc + i.transferFBQty, 0),
    minibarItems.reduce((acc, i) => acc + i.warehouseStock, 0),
    '', '', '', '', '', '',
    minibarItems.reduce((acc, i) => acc + (i.billedQty * i.sellingPrice), 0)
  ];

  const wsData = [...titleRow, headers, ...dataRows, totals, ...createSignatureRows('Nhân Viên Minibar', 'Thủ Kho & HK Manager', 'Kế Toán Kiểm Soát')];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 32 }, { wch: 8 }, { wch: 12 },
    { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 22 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BangBaoCaoTongMinibar');
  XLSX.writeFile(wb, `Bao_Cao_Tong_Minibar_${month}.xlsx`);
};

// 5. Export VPP (Office Supplies) to Excel
export const exportVPPToExcel = (month: string, vppItems: VPPItem[]) => {
  const titleRow = [[HOTEL_NAME], [DEPARTMENT_NAME], [`BÁO CÁO THEO DÕI & SỬ DỤNG VĂN PHÒNG PHẨM (${month})`], []];

  const headers = [
    'STT', 'Mã VPP', 'Tên Văn Phòng Phẩm', 'ĐVT', 'Tồn Đầu Kỳ', 
    'Nhập Trong Kỳ', 'Tồn Cuối Kỳ', 'Xuất Sử Dụng (Formula)', 'Đơn Giá (VNĐ)', 'Chi Phí Sử Dụng (VNĐ)', 'Ghi Chú'
  ];

  const dataRows = vppItems.map((item, idx) => {
    const usage = (item.openingStock + item.incomingQty) - item.endingStock;
    const cost = usage * item.unitCost;

    return [
      idx + 1,
      item.code,
      item.name,
      item.unit,
      item.openingStock,
      item.incomingQty,
      item.endingStock,
      Math.max(0, usage),
      item.unitCost,
      cost,
      item.notes || ''
    ];
  });

  const totals = [
    'TỔNG CỘNG CHI PHÍ VPP', '', '', '',
    vppItems.reduce((acc, i) => acc + i.openingStock, 0),
    vppItems.reduce((acc, i) => acc + i.incomingQty, 0),
    vppItems.reduce((acc, i) => acc + i.endingStock, 0),
    vppItems.reduce((acc, i) => acc + Math.max(0, (i.openingStock + i.incomingQty - i.endingStock)), 0),
    '',
    vppItems.reduce((acc, i) => acc + (Math.max(0, (i.openingStock + i.incomingQty - i.endingStock)) * i.unitCost), 0),
    ''
  ];

  const wsData = [...titleRow, headers, ...dataRows, totals, ...createSignatureRows('Người Theo Dõi', 'Trưởng BP Buồng Phòng', 'Kế Toán VPP')];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 35 }, { wch: 10 }, { wch: 12 },
    { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 28 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoVPP');
  XLSX.writeFile(wb, `Bao_Cao_Van_Phong_Pham_${month}.xlsx`);
};

// 6. Export All 5 Modules into 1 Master Excel Workbook
export const exportMonthlyMasterWorkbookToExcel = (
  month: string,
  storeItems: StoreItem[],
  prItems: PRPOItem[],
  damageRecords: DamageRecord[],
  minibarItems: MinibarItem[],
  roomSetups: RoomMinibarSetup[],
  vppItems: VPPItem[]
) => {
  const wb = XLSX.utils.book_new();

  // 1. Minibar Sheet
  const mbHeader = [['GRAND PALACE HOTEL & RESORT'], ['BẢNG BÁO CÁO TỔNG MINIBAR - THÁNG ' + month], []];
  const mbCols = ['STT', 'Mã', 'Tên Hàng', 'ĐVT', 'Tồn Đầu', 'Nhập', 'Billed', 'NoChange', 'FOC', 'Trans FO', 'Trans FB', 'Tồn Kho', 'Setup', 'Tồn Sách', 'Tồn Thực Tế', 'Chênh Lệch', 'Doanh Thu (VNĐ)'];
  const mbRows = minibarItems.map((item, idx) => {
    const setupStock = roomSetups.reduce((acc, room) => acc + (room.itemQuantities[item.code] || 0), 0);
    const bookEnd = item.openingStock + item.incomingQty - item.billedQty - item.focQty - item.transferFOQty - item.transferFBQty;
    const actual = item.warehouseStock + setupStock;
    return [
      idx + 1, item.code, item.name, item.unit, item.openingStock, item.incomingQty,
      item.billedQty, item.noChangeQty, item.focQty, item.transferFOQty, item.transferFBQty,
      item.warehouseStock, setupStock, bookEnd, actual, bookEnd - actual, item.billedQty * item.sellingPrice
    ];
  });
  const wsMB = XLSX.utils.aoa_to_sheet([...mbHeader, mbCols, ...mbRows, ...createSignatureRows()]);
  XLSX.utils.book_append_sheet(wb, wsMB, '01_BaoCaoMinibar');

  // 2. Store Inventory Sheet
  const storeHeader = [['GRAND PALACE HOTEL & RESORT'], ['BÁO CÁO KHO VẬT TƯ BUỒNG PHÒNG - THÁNG ' + month], []];
  const storeCols = ['STT', 'Mã VT', 'Tên Vật Tư', 'ĐVT', 'Tồn Đầu', 'Setup', 'Nhập', 'Kho Thực Tế', 'Điều Chuyển', 'Hao Hụt', 'Tổng Có', 'Xuất Dùng', 'Tồn Cuối', 'Đơn Giá', 'Thành Tiền Tồn'];
  const storeRows = storeItems.map((item, idx) => [
    idx + 1, item.code, item.name, item.unit, item.openingStock, item.setupQty, item.incomingQty,
    item.currentWarehouseStock, item.transferQty, item.lossAndDamageQty, item.openingStock + item.incomingQty,
    Math.max(0, (item.openingStock + item.incomingQty) - (item.lossAndDamageQty + item.transferQty + item.currentWarehouseStock + item.setupQty)),
    item.currentWarehouseStock + item.setupQty, item.unitCost, (item.currentWarehouseStock + item.setupQty) * item.unitCost
  ]);
  const wsStore = XLSX.utils.aoa_to_sheet([...storeHeader, storeCols, ...storeRows, ...createSignatureRows()]);
  XLSX.utils.book_append_sheet(wb, wsStore, '02_KhoVatTuHK');

  // 3. Loss & Damage Sheet
  const dmgHeader = [['GRAND PALACE HOTEL & RESORT'], ['BÁO CÁO HƯ HỎNG THIỆT HẠI - THÁNG ' + month], []];
  const dmgCols = ['STT', 'Ngày', 'Mã VT', 'Tên Vật Tư', 'Vị Trí', 'SL', 'Loại Chi Phí', 'Thu Khách (VNĐ)', 'KS Chịu FOC (VNĐ)', 'Người Duyệt'];
  const dmgRows = damageRecords.map((item, idx) => [
    idx + 1, item.date, item.code, item.itemName, item.location, item.quantity,
    item.isCharge ? 'Khách Đền Bù' : 'Khách Sạn Chịu (FOC)',
    item.isCharge ? item.chargePrice : 0, !item.isCharge ? item.costAmount : 0, item.offerBy || ''
  ]);
  const wsDmg = XLSX.utils.aoa_to_sheet([...dmgHeader, dmgCols, ...dmgRows, ...createSignatureRows()]);
  XLSX.utils.book_append_sheet(wb, wsDmg, '03_HuHongThiethai');

  // 4. PR-PO Order Sheet
  const prHeader = [['GRAND PALACE HOTEL & RESORT'], ['ĐƠN MUA HÀNG VẬT TƯ PR-PO - THÁNG ' + month], []];
  const prCols = ['STT', 'Mã VT', 'Tên Vật Tư', 'ĐVT', 'Tồn Kho', 'An Toàn', 'SL PR Đề Xuất', 'SL PO Duyệt', 'Đơn Giá', 'Thành Tiền', 'Nhà Cung Cấp'];
  const prRows = prItems.map((item, idx) => [
    idx + 1, item.code, item.name, item.unit, item.currentStock, item.safetyStock,
    item.suggestedPRQty, item.adjustedPRQty, item.unitCost, item.adjustedPRQty * item.unitCost, item.supplierName
  ]);
  const wsPR = XLSX.utils.aoa_to_sheet([...prHeader, prCols, ...prRows, ...createSignatureRows()]);
  XLSX.utils.book_append_sheet(wb, wsPR, '04_DeNghiMuaHang');

  // 5. VPP Sheet
  const vppHeader = [['GRAND PALACE HOTEL & RESORT'], ['BÁO CÁO VĂN PHÒNG PHẨM - THÁNG ' + month], []];
  const vppCols = ['STT', 'Mã VPP', 'Tên VPP', 'ĐVT', 'Tồn Đầu', 'Nhập', 'Tồn Cuối', 'Xuất Sử Dụng', 'Đơn Giá', 'Chi Phí (VNĐ)'];
  const vppRows = vppItems.map((item, idx) => [
    idx + 1, item.code, item.name, item.unit, item.openingStock, item.incomingQty, item.endingStock,
    Math.max(0, item.openingStock + item.incomingQty - item.endingStock), item.unitCost,
    Math.max(0, item.openingStock + item.incomingQty - item.endingStock) * item.unitCost
  ]);
  const wsVPP = XLSX.utils.aoa_to_sheet([...vppHeader, vppCols, ...vppRows, ...createSignatureRows()]);
  XLSX.utils.book_append_sheet(wb, wsVPP, '05_VanPhongPham');

  XLSX.writeFile(wb, `GRAND_PALACE_Bao_Cao_Tong_Hop_${month}.xlsx`);
};
