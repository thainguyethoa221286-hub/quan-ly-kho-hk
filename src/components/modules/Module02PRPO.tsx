import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportPRPOToExcel, formatVND } from '../../utils/excelExporter';
import { PrintReportModal } from '../common/PrintReportModal';
import { 
  ShoppingCart, RefreshCw, Download, Printer, CheckCircle2, AlertCircle, 
  ArrowRight, ShieldAlert, FileSpreadsheet, Edit3, Save 
} from 'lucide-react';
import { PRPOItem } from '../../types';

export const Module02PRPO: React.FC = () => {
  const { prItems, generatePRPOList, updatePRItem, selectedMonth, isMonthLocked } = useStore();

  const [selectedPRId, setSelectedPRId] = useState<string | null>(prItems[0]?.id || null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const selectedPR = prItems.find(p => p.id === selectedPRId) || prItems[0];

  // Calculate totals
  const totalSuggested = prItems.reduce((acc, i) => acc + i.suggestedPRQty, 0);
  const totalAdjustedPO = prItems.reduce((acc, i) => acc + i.adjustedPRQty, 0);
  const totalPOBudget = prItems.reduce((acc, i) => acc + (i.adjustedPRQty * i.unitCost), 0);
  const urgentCount = prItems.filter(i => i.priority === 'URGENT' || i.priority === 'HIGH').length;

  const handleExportExcel = () => {
    exportPRPOToExcel(selectedMonth, prItems);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#141414] text-[#E4E3E0] font-mono font-bold">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141414] flex items-center gap-2">
                MODULE 02: MUA HÀNG TỰ ĐỘNG PR-PO
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#E4E3E0] text-[#141414] border border-[#141414] uppercase">
                  PR Qty = Monthly Usage + Safety Stock
                </span>
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                Tự động đề xuất vật tư cần mua dựa trên Par Level & nhu cầu sử dụng thực tế. Cho phép Trưởng phòng chỉnh sửa trước khi gửi PO.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={generatePRPOList}
            disabled={isMonthLocked}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#E4E3E0] text-[#141414] font-mono font-bold text-xs border border-[#141414] cursor-pointer disabled:opacity-50"
            title="Tính toán lại toàn bộ danh mục đề xuất mua hàng"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tự Động Tính Lại PR</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#10B981] hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase border border-[#141414] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export PR-PO Excel</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase border border-[#141414] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Phiếu PR-PO</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">TỔNG SL ĐỀ XUẤT PR</p>
          <p className="text-xl font-mono font-bold text-[#141414] mt-1">{totalSuggested.toLocaleString()} <span className="text-xs font-normal text-slate-600">sản phẩm</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">TỔNG SL PO ĐÃ DUYỆT</p>
          <p className="text-xl font-mono font-bold text-[#10B981] mt-1">{totalAdjustedPO.toLocaleString()} <span className="text-xs font-normal text-slate-600">sản phẩm</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-[#FF4444] uppercase">MẶT HÀNG MUA KHẨN</p>
          <p className="text-xl font-mono font-bold text-[#FF4444] mt-1">{urgentCount} <span className="text-xs font-normal text-slate-600">mục</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-[#10B981] uppercase">NGÂN SÁCH PO DỰ KIẾN</p>
          <p className="text-xl font-mono font-bold text-[#10B981] mt-1">{formatVND(totalPOBudget)}</p>
        </div>
      </div>

      {/* Dual Panel Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Panel: Auto-generated Requisition List */}
        <div className="lg:col-span-7 bg-white border border-[#141414] overflow-hidden shadow-sm flex flex-col">
          <div className="p-3 bg-[#E4E3E0] border-b border-[#141414] flex items-center justify-between">
            <h3 className="font-mono font-bold text-xs text-[#141414] uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              1. Danh Sách Đề Xuất Mua Hàng Auto ({prItems.length} mục)
            </h3>
            <span className="text-[10px] font-mono text-slate-600">CHỌN 1 DÒNG ĐỂ ĐIỀU CHỈNH</span>
          </div>

          <div className="divide-y divide-[#141414]/20 overflow-y-auto max-h-[520px]">
            {prItems.map((item) => {
              const isSelected = selectedPR?.id === item.id;
              const isLow = item.currentStock <= item.safetyStock;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPRId(item.id)}
                  className={`p-3 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected 
                      ? 'bg-[#141414] text-[#E4E3E0] font-medium' 
                      : 'hover:bg-[#E4E3E0]/50 text-[#141414]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 border font-mono text-xs font-bold ${
                      isLow ? 'bg-[#FF4444] text-white border-[#141414]' : isSelected ? 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]' : 'bg-[#E4E3E0] text-[#141414] border-[#141414]'
                    }`}>
                      {item.code}
                    </div>

                    <div>
                      <div className="font-bold text-xs flex items-center gap-2">
                        {item.name}
                        {item.priority === 'URGENT' && (
                          <span className="px-1 py-0.2 bg-[#FF4444] text-white font-mono text-[9px] uppercase border border-[#141414]">KHẨN</span>
                        )}
                      </div>
                      <div className={`text-[11px] font-mono flex items-center gap-3 mt-0.5 ${isSelected ? 'text-[#E4E3E0]/80' : 'text-slate-600'}`}>
                        <span>Tồn: <strong>{item.currentStock} {item.unit}</strong></span>
                        <span>An toàn: <strong>{item.safetyStock}</strong></span>
                        <span>Sử dụng: <strong>{item.monthlyUsage}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className={`text-xs font-bold ${isSelected ? 'text-[#E4E3E0]' : 'text-[#141414]'}`}>
                      PR: {item.suggestedPRQty} {item.unit}
                    </div>
                    <div className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-[#10B981]' : 'text-[#10B981]'}`}>
                      PO: {item.adjustedPRQty} {item.unit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Requisition Adjustment & Submission Form */}
        <div className="lg:col-span-5 bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm flex flex-col justify-between">
          {selectedPR ? (
            <div className="space-y-4">
              
              <div className="pb-3 border-b border-[#141414] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                    2. CHI TIẾT PHÊ DUYỆT ĐƠN PO
                  </span>
                  <h3 className="font-bold text-base text-[#141414] mt-0.5">
                    [{selectedPR.code}] {selectedPR.name}
                  </h3>
                </div>
                <span className="px-2 py-0.5 bg-white text-[#141414] font-mono text-xs border border-[#141414]">
                  {selectedPR.unit}
                </span>
              </div>

              {/* Formula explanation box */}
              <div className="p-3 bg-white border border-[#141414] text-xs space-y-1 font-mono">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Tồn Kho Hiện Tại:</span>
                  <strong className="text-[#141414]">{selectedPR.currentStock} {selectedPR.unit}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Mức An Toàn (Safety Stock):</span>
                  <strong className="text-[#141414]">{selectedPR.safetyStock} {selectedPR.unit}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Sử Dụng Trung Bình/Tháng:</span>
                  <strong className="text-[#141414]">{selectedPR.monthlyUsage} {selectedPR.unit}</strong>
                </div>
                <div className="pt-2 border-t border-[#141414]/20 flex items-center justify-between font-bold text-[#141414]">
                  <span>Đề Xuất Mua PR (Công Thức):</span>
                  <span className="text-sm">{selectedPR.suggestedPRQty} {selectedPR.unit}</span>
                </div>
              </div>

              {/* Adjust Quantity Input */}
              <div>
                <label className="block text-xs font-mono font-bold text-[#141414] mb-1 uppercase">
                  SỐ LƯỢNG PHÊ DUYỆT PO *
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={isMonthLocked}
                  value={selectedPR.adjustedPRQty}
                  onChange={e => updatePRItem(selectedPR.id, { adjustedPRQty: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-white border border-[#141414] px-3 py-2 text-sm font-mono font-bold text-[#10B981] focus:outline-none"
                />
              </div>

              {/* Supplier & Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">ĐƠN GIÁ MUA DỰ KIẾN</label>
                  <input
                    type="number"
                    disabled={isMonthLocked}
                    value={selectedPR.unitCost}
                    onChange={e => updatePRItem(selectedPR.id, { unitCost: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-white border border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-700 mb-1">MỨC ƯU TIÊN</label>
                  <select
                    disabled={isMonthLocked}
                    value={selectedPR.priority}
                    onChange={e => updatePRItem(selectedPR.id, { priority: e.target.value as any })}
                    className="w-full bg-white border border-[#141414] px-3 py-1.5 text-xs font-mono text-[#141414] font-bold"
                  >
                    <option value="NORMAL">Bình Thường</option>
                    <option value="HIGH">Ưu Tiên Cao</option>
                    <option value="URGENT">Khẩn Cấp (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">NHÀ CUNG CẤP ƯU TIÊN</label>
                <input
                  type="text"
                  disabled={isMonthLocked}
                  value={selectedPR.supplierName}
                  onChange={e => updatePRItem(selectedPR.id, { supplierName: e.target.value })}
                  placeholder="VD: Cty VinaLinen, Cty Minibar VietNam"
                  className="w-full bg-white border border-[#141414] px-3 py-1.5 text-xs text-[#141414]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 mb-1">GHI CHÚ ĐƠN HÀNG PO</label>
                <textarea
                  rows={2}
                  disabled={isMonthLocked}
                  value={selectedPR.notes || ''}
                  onChange={e => updatePRItem(selectedPR.id, { notes: e.target.value })}
                  placeholder="Ghi chú thêm về quy cách đóng gói, thời gian giao hàng..."
                  className="w-full bg-white border border-[#141414] px-3 py-1.5 text-xs text-[#141414] focus:outline-none"
                />
              </div>

              {/* Total Calculation */}
              <div className="p-3 bg-white border border-[#141414] flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700 uppercase">Thành Tiền PO:</span>
                <span className="text-base font-bold text-[#10B981] font-mono">
                  {formatVND(selectedPR.adjustedPRQty * selectedPR.unitCost)}
                </span>
              </div>

            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 font-mono text-xs">CHỌN SẢN PHẨM ĐỂ ĐIỀU CHỈNH</div>
          )}

          <div className="pt-3 mt-3 border-t border-[#141414] text-right">
            <span className="text-[11px] font-mono text-slate-700 flex items-center justify-end gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
              Tự động đồng bộ số liệu
            </span>
          </div>

        </div>

      </div>

      {/* Printable Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="ĐƠN ĐỀ NGHỊ MUA HÀNG VẬT TƯ BUỒNG PHÒNG (PR-PO)"
        subtitle="Danh mục vật tư đề xuất mua sắm theo định mức an toàn Par Level"
        orientation="landscape"
        onExportExcel={handleExportExcel}
      >
        <table className="w-full text-left text-[11px] text-slate-800 border-collapse border border-slate-400">
          <thead className="bg-slate-200 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-1.5 border border-slate-400 text-center">STT</th>
              <th className="p-1.5 border border-slate-400">Mã VT</th>
              <th className="p-1.5 border border-slate-400">Tên Vật Tư</th>
              <th className="p-1.5 border border-slate-400 text-center">ĐVT</th>
              <th className="p-1.5 border border-slate-400 text-right">Tồn Hiện Tại</th>
              <th className="p-1.5 border border-slate-400 text-right">An Toàn</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold text-amber-700">SL Đề Xuất PR</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold text-emerald-800">SL Duyệt Mua PO</th>
              <th className="p-1.5 border border-slate-400 text-right">Đơn Giá Dự Kiến</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold">Thành Tiền (VNĐ)</th>
              <th className="p-1.5 border border-slate-400">Nhà Cung Cấp</th>
            </tr>
          </thead>
          <tbody>
            {prItems.map((item, idx) => (
              <tr key={item.id} className="border-b border-slate-300">
                <td className="p-1 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-1 border border-slate-300 font-mono font-bold">{item.code}</td>
                <td className="p-1 border border-slate-300">{item.name}</td>
                <td className="p-1 border border-slate-300 text-center">{item.unit}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.currentStock}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.safetyStock}</td>
                <td className="p-1 border border-slate-300 text-right font-mono font-bold text-amber-700">{item.suggestedPRQty}</td>
                <td className="p-1 border border-slate-300 text-right font-mono font-bold text-emerald-800">{item.adjustedPRQty}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.unitCost.toLocaleString()}</td>
                <td className="p-1 border border-slate-300 text-right font-mono font-bold">{(item.adjustedPRQty * item.unitCost).toLocaleString()}</td>
                <td className="p-1 border border-slate-300 text-[10px]">{item.supplierName}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-[10px]">
            <tr>
              <td colSpan={6} className="p-1.5 border border-slate-400 text-right">TỔNG CỘNG PO</td>
              <td className="p-1.5 border border-slate-400 text-right text-amber-700">{totalSuggested}</td>
              <td className="p-1.5 border border-slate-400 text-right text-emerald-800">{totalAdjustedPO}</td>
              <td className="p-1.5 border border-slate-400 text-right">-</td>
              <td className="p-1.5 border border-slate-400 text-right text-emerald-800">{formatVND(totalPOBudget)}</td>
              <td className="p-1.5 border border-slate-400">-</td>
            </tr>
          </tfoot>
        </table>
      </PrintReportModal>

    </div>
  );
};
