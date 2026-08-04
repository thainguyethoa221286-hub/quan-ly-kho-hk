import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportVPPToExcel, formatVND } from '../../utils/excelExporter';
import { PrintReportModal } from '../common/PrintReportModal';
import { AddItemModal } from '../common/AddItemModal';
import { 
  FileText, Plus, Download, Printer, Trash2, Edit2, CheckCircle2 
} from 'lucide-react';

export const Module05OfficeSupplies: React.FC = () => {
  const { vppItems, updateVPPItem, deleteVPPItem, selectedMonth, isMonthLocked } = useStore();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Totals
  const totalOpening = vppItems.reduce((acc, i) => acc + i.openingStock, 0);
  const totalIncoming = vppItems.reduce((acc, i) => acc + i.incomingQty, 0);
  const totalEnding = vppItems.reduce((acc, i) => acc + i.endingStock, 0);
  const totalUsage = vppItems.reduce((acc, i) => acc + Math.max(0, (i.openingStock + i.incomingQty - i.endingStock)), 0);
  const totalVPPCost = vppItems.reduce((acc, i) => {
    const usage = Math.max(0, (i.openingStock + i.incomingQty - i.endingStock));
    return acc + (usage * i.unitCost);
  }, 0);

  const handleExportExcel = () => {
    exportVPPToExcel(selectedMonth, vppItems);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#141414] text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold text-[#141414] uppercase tracking-wider flex items-center gap-2">
                MODULE 05: VĂN PHÒNG PHẨM (VPP) BUỒNG PHÒNG
                <span className="text-[10px] px-2 py-0.5 bg-[#E4E3E0] text-[#141414] font-mono border border-[#141414]">
                  {vppItems.length} Mặt Hàng
                </span>
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                Theo dõi nhập - xuất - tồn và tổng chi phí sử dụng văn phòng phẩm bộ phận HK.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isMonthLocked}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#141414] hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase border border-[#141414] transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm VPP Mới</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] hover:bg-emerald-600 text-white font-mono font-bold text-xs uppercase border border-[#141414] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export VPP Excel</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#E4E3E0] text-[#141414] font-mono font-bold text-xs border border-[#141414] transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo A4</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">TỔNG TỒN ĐẦU KỲ</p>
          <p className="text-xl font-mono font-bold text-[#141414] mt-1">{totalOpening} <span className="text-xs font-normal text-slate-600">món</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">NHẬP MỚI TRONG KỲ</p>
          <p className="text-xl font-mono font-bold text-[#141414] mt-1">{totalIncoming} <span className="text-xs font-normal text-slate-600">món</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">XUẤT SỬ DỤNG THÁNG</p>
          <p className="text-xl font-mono font-bold text-[#141414] mt-1">{totalUsage} <span className="text-xs font-normal text-slate-600">món</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">TỔNG CHI PHÍ VPP</p>
          <p className="text-xl font-mono font-bold text-[#10B981] mt-1">{formatVND(totalVPPCost)}</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#141414] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#141414] border-collapse">
            
            <thead className="bg-[#E4E3E0] text-[#141414] font-mono font-bold uppercase text-[10px] tracking-tight border-b border-[#141414]">
              <tr>
                <th className="p-2.5 text-center border-r border-[#141414] w-10">STT</th>
                <th className="p-2.5 border-r border-[#141414] w-28">Mã VPP</th>
                <th className="p-2.5 border-r border-[#141414] min-w-[200px]">Tên Văn Phòng Phẩm</th>
                <th className="p-2.5 text-center border-r border-[#141414] w-16">ĐVT</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Tồn Đầu</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Nhập</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Tồn Cuối Kỳ</th>
                <th className="p-2.5 text-right border-r border-[#141414] font-bold">Xuất Sử Dụng</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Đơn Giá (VNĐ)</th>
                <th className="p-2.5 text-right border-r border-[#141414] font-bold text-[#10B981]">Chi Phí (VNĐ)</th>
                <th className="p-2.5 border-r border-[#141414]">Ghi Chú</th>
                <th className="p-2.5 text-center w-20">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#141414]/30 font-medium">
              {vppItems.map((item, index) => {
                const usage = Math.max(0, (item.openingStock + item.incomingQty) - item.endingStock);
                const cost = usage * item.unitCost;

                return (
                  <tr key={item.id} className="hover:bg-[#E4E3E0]/50 transition-colors">
                    <td className="p-2 text-center text-slate-600 font-mono border-r border-[#141414]/30">{index + 1}</td>
                    <td className="p-2 font-mono text-[#141414] font-bold border-r border-[#141414]/30">{item.code}</td>
                    <td className="p-2 font-semibold text-[#141414] border-r border-[#141414]/30">{item.name}</td>
                    <td className="p-2 text-center text-slate-600 font-mono border-r border-[#141414]/30">{item.unit}</td>
                    
                    <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">{item.openingStock}</td>
                    
                    {/* Nhập Editable */}
                    <td className="p-1.5 text-right font-mono border-r border-[#141414]/30 bg-[#F2F1EE]">
                      <input
                        type="number"
                        disabled={isMonthLocked}
                        value={item.incomingQty}
                        onChange={e => updateVPPItem(item.id, { incomingQty: Math.max(0, Number(e.target.value)) })}
                        className="w-16 bg-white border border-[#141414] px-1 py-0.5 text-right text-xs font-mono font-bold text-[#141414] focus:outline-none"
                      />
                    </td>

                    {/* Tồn Cuối Editable */}
                    <td className="p-1.5 text-right font-mono border-r border-[#141414]/30 bg-[#F2F1EE]">
                      <input
                        type="number"
                        disabled={isMonthLocked}
                        value={item.endingStock}
                        onChange={e => updateVPPItem(item.id, { endingStock: Math.max(0, Number(e.target.value)) })}
                        className="w-16 bg-white border border-[#141414] px-1 py-0.5 text-right text-xs font-mono font-bold text-[#141414] focus:outline-none"
                      />
                    </td>

                    {/* Usage Formula */}
                    <td className="p-2 text-right font-mono font-bold text-[#141414] border-r border-[#141414]/30">
                      {usage}
                    </td>

                    <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">
                      {item.unitCost.toLocaleString()}
                    </td>

                    <td className="p-2 text-right font-mono font-bold text-[#10B981] border-r border-[#141414]/30">
                      {formatVND(cost)}
                    </td>

                    <td className="p-2 text-slate-700 border-r border-[#141414]/30 text-[11px]">
                      {item.notes || '-'}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm('Xóa VPP này?')) {
                            deleteVPPItem(item.id);
                          }
                        }}
                        disabled={isMonthLocked}
                        className="p-1 text-slate-500 hover:text-[#FF4444] transition-all cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>

            <tfoot className="bg-[#E4E3E0] text-[#141414] font-mono font-bold text-xs border-t-2 border-[#141414]">
              <tr>
                <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider border-r border-[#141414]">
                  TỔNG CỘNG CHI PHÍ VPP
                </td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalOpening}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalIncoming}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalEnding}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalUsage}</td>
                <td className="p-2.5 border-r border-[#141414] text-center">-</td>
                <td className="p-2.5 text-right font-mono text-[#10B981] border-r border-[#141414]">{formatVND(totalVPPCost)}</td>
                <td colSpan={2} className="p-2.5 text-center">-</td>
              </tr>
            </tfoot>

          </table>
        </div>
      </div>

      {/* Printable Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="BÁO CÁO THEO DÕI VĂN PHÒNG PHẨM BỘ PHẬN BUỒNG PHÒNG"
        subtitle="Chi tiết xuất - nhập - tồn và tổng chi phí sử dụng văn phòng phẩm trong tháng"
        orientation="landscape"
        onExportExcel={handleExportExcel}
      >
        <table className="w-full text-left text-[11px] text-slate-800 border-collapse border border-slate-400">
          <thead className="bg-slate-200 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-1.5 border border-slate-400 text-center">STT</th>
              <th className="p-1.5 border border-slate-400">Mã VPP</th>
              <th className="p-1.5 border border-slate-400">Tên Văn Phòng Phẩm</th>
              <th className="p-1.5 border border-slate-400 text-center">ĐVT</th>
              <th className="p-1.5 border border-slate-400 text-right">Tồn Đầu</th>
              <th className="p-1.5 border border-slate-400 text-right">Nhập</th>
              <th className="p-1.5 border border-slate-400 text-right">Tồn Cuối</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold text-amber-800">Xuất Sử Dụng</th>
              <th className="p-1.5 border border-slate-400 text-right">Đơn Giá</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold text-emerald-800">Chi Phí (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {vppItems.map((item, idx) => {
              const usage = Math.max(0, item.openingStock + item.incomingQty - item.endingStock);
              return (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="p-1 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-1 border border-slate-300 font-mono font-bold">{item.code}</td>
                  <td className="p-1 border border-slate-300">{item.name}</td>
                  <td className="p-1 border border-slate-300 text-center">{item.unit}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.openingStock}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.incomingQty}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.endingStock}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono font-bold text-amber-800">{usage}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.unitCost.toLocaleString()}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono font-bold text-emerald-800">{(usage * item.unitCost).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-[10px]">
            <tr>
              <td colSpan={4} className="p-1.5 border border-slate-400 text-right">TỔNG CỘNG CHI PHÍ VPP</td>
              <td className="p-1.5 border border-slate-400 text-right">{totalOpening}</td>
              <td className="p-1.5 border border-slate-400 text-right">{totalIncoming}</td>
              <td className="p-1.5 border border-slate-400 text-right">{totalEnding}</td>
              <td className="p-1.5 border border-slate-400 text-right text-amber-800">{totalUsage}</td>
              <td className="p-1.5 border border-slate-400 text-right">-</td>
              <td className="p-1.5 border border-slate-400 text-right text-emerald-800">{formatVND(totalVPPCost)}</td>
            </tr>
          </tfoot>
        </table>
      </PrintReportModal>

      {/* Add VPP Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        type="VPP"
      />

    </div>
  );
};
