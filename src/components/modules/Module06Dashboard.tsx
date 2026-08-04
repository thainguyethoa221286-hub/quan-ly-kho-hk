import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  exportStoreInventoryToExcel, exportPRPOToExcel, exportLossAndDamageToExcel, 
  exportMinibarSummaryToExcel, exportVPPToExcel, exportMonthlyMasterWorkbookToExcel, formatVND 
} from '../../utils/excelExporter';
import { PrintReportModal } from '../common/PrintReportModal';
import { 
  BarChart3, Package, ShoppingCart, AlertTriangle, Coffee, FileText, 
  Lock, Unlock, Download, Printer, Eye, Calendar, ShieldCheck, CheckCircle2, TrendingUp 
} from 'lucide-react';

export const Module06Dashboard: React.FC = () => {
  const { 
    selectedMonth, setSelectedMonth, 
    isMonthLocked, toggleLockMonth, lockedMonths, userProfile,
    storeItems, prItems, damageRecords, minibarItems, roomSetups, vppItems 
  } = useStore();

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    moduleKey: 'M1' | 'M2' | 'M3' | 'M4' | 'M5';
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    moduleKey: 'M1'
  });

  // Calculate realtime KPIs
  const totalMinibarRevenue = minibarItems.reduce((acc, i) => acc + (i.billedQty * i.sellingPrice), 0);
  const totalFOCDamageCost = damageRecords.reduce((acc, i) => acc + (!i.isCharge ? i.costAmount : 0), 0);
  const totalChargeGuest = damageRecords.reduce((acc, i) => acc + (i.isCharge ? i.chargePrice : 0), 0);
  const totalPRPOBudget = prItems.reduce((acc, i) => acc + (i.adjustedPRQty * i.unitCost), 0);
  const totalInventoryValuation = storeItems.reduce((acc, i) => acc + ((i.currentWarehouseStock + i.setupQty) * i.unitCost), 0);
  
  const minibarDiscrepancies = minibarItems.filter(item => {
    const setupStock = roomSetups.reduce((acc, room) => acc + (room.itemQuantities[item.code] || 0), 0);
    const bookEnd = item.openingStock + item.incomingQty - item.billedQty - item.focQty - item.transferFOQty - item.transferFBQty;
    const actual = item.warehouseStock + setupStock;
    return bookEnd !== actual;
  }).length;

  const currentMonthLockData = lockedMonths[selectedMonth];

  const reportCards = [
    {
      key: 'M1' as const,
      num: '01',
      title: 'Báo Cáo Kho Vật Tư Buồng Phòng',
      desc: 'Chi tiết Nhập - Xuất - Tồn kho thực tế & Định mức setup phòng',
      icon: Package,
      itemsCount: `${storeItems.length} mặt hàng`,
      valuation: formatVND(totalInventoryValuation),
      exportFn: () => exportStoreInventoryToExcel(selectedMonth, storeItems)
    },
    {
      key: 'M2' as const,
      num: '02',
      title: 'Đơn Đề Nghị Mua Hàng PR-PO',
      desc: 'Tự động tính lượng PR theo công thức Par Level & duyệt PO',
      icon: ShoppingCart,
      itemsCount: `${prItems.length} mặt hàng mua`,
      valuation: formatVND(totalPRPOBudget),
      exportFn: () => exportPRPOToExcel(selectedMonth, prItems)
    },
    {
      key: 'M3' as const,
      num: '03',
      title: 'Báo Cáo Hư Hỏng & Thu Tiền Đền Bù',
      desc: 'Tổng hợp đồ hư hỏng đền bù khách và chi phí FOC khách sạn chịu',
      icon: AlertTriangle,
      itemsCount: `${damageRecords.length} ca báo cáo`,
      valuation: `Thu: ${formatVND(totalChargeGuest)} | FOC: ${formatVND(totalFOCDamageCost)}`,
      exportFn: () => exportLossAndDamageToExcel(selectedMonth, damageRecords)
    },
    {
      key: 'M4' as const,
      num: '04',
      title: 'Bảng Báo Cáo Tổng Minibar',
      desc: 'Doanh thu bán minibar, kiểm kê kho & cảnh báo chênh lệch',
      icon: Coffee,
      itemsCount: minibarDiscrepancies > 0 ? `⚠️ Lệch ${minibarDiscrepancies} mục` : '🟢 Khớp 100%',
      valuation: `Doanh thu: ${formatVND(totalMinibarRevenue)}`,
      exportFn: () => exportMinibarSummaryToExcel(selectedMonth, minibarItems, roomSetups)
    },
    {
      key: 'M5' as const,
      num: '05',
      title: 'Báo Cáo Chi Phí Văn Phòng Phẩm',
      desc: 'Theo dõi sử dụng & chi phí VPP phục vụ bộ phận HK',
      icon: FileText,
      itemsCount: `${vppItems.length} mặt hàng`,
      valuation: formatVND(vppItems.reduce((acc, i) => acc + (Math.max(0, i.openingStock + i.incomingQty - i.endingStock) * i.unitCost), 0)),
      exportFn: () => exportVPPToExcel(selectedMonth, vppItems)
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#141414] text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2">
                MODULE 06: BÁO CÁO TỔNG HỢP THÁNG & DASHBOARD MANAGEMENT
                <span className="text-[10px] px-2 py-0.5 bg-[#E4E3E0] text-[#141414] font-mono border border-[#141414]">
                  {selectedMonth}
                </span>
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                Trung tâm quản trị báo cáo tổng hợp. 1-Click xem nhanh, 1-Click in A4, 1-Click xuất Excel và Khóa Số Liệu Tháng.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Lock Month Button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportMonthlyMasterWorkbookToExcel(selectedMonth, storeItems, prItems, damageRecords, minibarItems, roomSetups, vppItems)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] hover:bg-emerald-600 text-white font-mono font-bold text-xs uppercase border border-[#141414] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Master Workbook Excel</span>
          </button>

          {/* LOCK MONTH BUTTON */}
          <button
            onClick={() => {
              const confirmMsg = isMonthLocked 
                ? `Mở khóa số liệu tháng ${selectedMonth} để tiếp tục chỉnh sửa?`
                : `KHÓA BÁO CÁO THÁNG ${selectedMonth}?\n\n- Số liệu sẽ được chốt đọc (Read-only).\n- Tồn cuối kỳ này sẽ TỰ ĐỘNG CHUYỂN THÀNH TỒN ĐẦU KỲ cho tháng tiếp theo!`;
              if (window.confirm(confirmMsg)) {
                toggleLockMonth(selectedMonth);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono font-bold text-xs uppercase border border-[#141414] transition-all cursor-pointer ${
              isMonthLocked
                ? 'bg-[#FF4444] text-white hover:bg-red-600'
                : 'bg-[#141414] text-white hover:bg-slate-800'
            }`}
          >
            {isMonthLocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>[ 🔒 ĐÃ KHÓA MONTH ] - MỞ KHÓA</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>[ 🔓 PHÊ DUYỆT & KHÓA MONTH ]</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Month Lock Banner Details */}
      {isMonthLocked && currentMonthLockData && (
        <div className="p-3.5 bg-white border border-[#141414] flex items-center justify-between text-xs text-[#141414]">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#FF4444] shrink-0" />
            <div>
              <p className="font-mono font-bold text-xs text-[#141414] uppercase">
                BÁO CÁO THÁNG {selectedMonth} ĐÃ ĐƯỢC KHÓA SỔ THÀNH CÔNG
              </p>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                Duyệt bởi: <strong>{currentMonthLockData.lockedBy || userProfile.name}</strong> | Lúc: <strong>{currentMonthLockData.lockedAt || 'Lừa duyệt'}</strong>
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-[#10B981] text-white font-mono text-[10px] font-bold border border-[#141414] uppercase">
            ROLLOVER ENDING STOCK OK
          </span>
        </div>
      )}

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-[10px] font-mono font-bold uppercase">
            <span>DOANH THU MINIBAR</span>
            <Coffee className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-lg font-mono font-bold text-[#10B981] mt-2">{formatVND(totalMinibarRevenue)}</p>
          <p className="text-[10px] text-slate-600 mt-1">Ghi nhận Daily Bills</p>
        </div>

        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-[10px] font-mono font-bold uppercase">
            <span>CHI PHÍ HƯ HỎNG FOC</span>
            <AlertTriangle className="w-4 h-4 text-[#FF4444]" />
          </div>
          <p className="text-lg font-mono font-bold text-[#FF4444] mt-2">{formatVND(totalFOCDamageCost)}</p>
          <p className="text-[10px] text-slate-600 mt-1">KS chịu chi phí</p>
        </div>

        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-[10px] font-mono font-bold uppercase">
            <span>NGÂN SÁCH MUA PO</span>
            <ShoppingCart className="w-4 h-4 text-[#141414]" />
          </div>
          <p className="text-lg font-mono font-bold text-[#141414] mt-2">{formatVND(totalPRPOBudget)}</p>
          <p className="text-[10px] text-slate-600 mt-1">Đề xuất mua vật tư</p>
        </div>

        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-[10px] font-mono font-bold uppercase">
            <span>TRỊ GIÁ KHO HK</span>
            <Package className="w-4 h-4 text-[#141414]" />
          </div>
          <p className="text-lg font-mono font-bold text-[#141414] mt-2">{formatVND(totalInventoryValuation)}</p>
          <p className="text-[10px] text-slate-600 mt-1">Kho + Setup room</p>
        </div>

        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-[10px] font-mono font-bold uppercase">
            <span>DISCREPANCY MINIBAR</span>
            <ShieldCheck className="w-4 h-4 text-[#141414]" />
          </div>
          <p className={`text-lg font-mono font-bold mt-2 ${minibarDiscrepancies > 0 ? 'text-[#FF4444]' : 'text-[#10B981]'}`}>
            {minibarDiscrepancies > 0 ? `⚠️ ${minibarDiscrepancies} Mục Lệch` : '🟢 Cân Bằng'}
          </p>
          <p className="text-[10px] text-slate-600 mt-1">Kiểm kê thực tế</p>
        </div>

      </div>

      {/* REPORT CARDS HUB (5 DISTINCT MODULE CARDS) */}
      <div className="space-y-4">
        <h3 className="font-mono font-bold text-xs text-[#141414] uppercase tracking-wider flex items-center gap-2 border-b border-[#141414] pb-2">
          <span>DANH SÁCH 5 PHÂN HỆ BÁO CÁO (REPORT CARDS HUB)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => {
            const IconComp = card.icon;

            return (
              <div
                key={card.key}
                className="bg-white border border-[#141414] p-4 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-800 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-[#141414] text-white">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-500">
                      MOD {card.num}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-[#141414] mt-3 uppercase tracking-tight">
                    {card.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {card.desc}
                  </p>

                  <div className="mt-3 p-2.5 bg-[#F2F1EE] border border-[#141414] space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-600">
                      <span>Số mục:</span>
                      <strong className="text-[#141414]">{card.itemsCount}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Giá trị:</span>
                      <strong className="text-[#141414] truncate">{card.valuation}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Action Trio */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#141414]">
                  <button
                    onClick={() => setPreviewModal({
                      isOpen: true,
                      title: card.title,
                      subtitle: card.desc,
                      moduleKey: card.key
                    })}
                    className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#E4E3E0] hover:bg-slate-300 text-[#141414] text-[10px] font-mono font-bold uppercase border border-[#141414] cursor-pointer"
                    title="Xem nhanh bản xem trước A4"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem Nhanh</span>
                  </button>

                  <button
                    onClick={card.exportFn}
                    className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#10B981] hover:bg-emerald-600 text-white text-[10px] font-mono font-bold uppercase border border-[#141414] cursor-pointer"
                    title="Xuất file Excel cho module này"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={() => setPreviewModal({
                      isOpen: true,
                      title: card.title,
                      subtitle: card.desc,
                      moduleKey: card.key
                    })}
                    className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-[#141414] hover:bg-slate-800 text-white text-[10px] font-mono font-bold uppercase border border-[#141414] cursor-pointer"
                    title="In khổ A4 chuẩn"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In A4</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Preview Modal dynamically loading specific report preview */}
      <PrintReportModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal({ ...previewModal, isOpen: false })}
        title={previewModal.title}
        subtitle={previewModal.subtitle}
        orientation="landscape"
      >
        <div className="p-4 text-center text-slate-700 font-mono text-xs">
          [Đang tải bản xem trước trực quan cho {previewModal.title} - Kỳ {selectedMonth}]
        </div>
      </PrintReportModal>

    </div>
  );
};
