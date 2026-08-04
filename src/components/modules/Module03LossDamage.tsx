import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportLossAndDamageToExcel, formatVND } from '../../utils/excelExporter';
import { PrintReportModal } from '../common/PrintReportModal';
import { AddItemModal } from '../common/AddItemModal';
import { 
  AlertTriangle, Plus, Download, Printer, Edit2, Trash2, CheckCircle2, 
  HelpCircle, DollarSign, ShieldAlert, Sparkles, RefreshCw 
} from 'lucide-react';
import { DamageRecord } from '../../types';

export const Module03LossDamage: React.FC = () => {
  const { damageRecords, updateDamageRecord, deleteDamageRecord, selectedMonth, isMonthLocked } = useStore();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Totals
  const totalChargeAmount = damageRecords.reduce((sum, r) => sum + (r.isCharge ? r.chargePrice : 0), 0);
  const totalFOCCost = damageRecords.reduce((sum, r) => sum + (!r.isCharge ? r.costAmount : 0), 0);
  const totalItemsDamaged = damageRecords.reduce((sum, r) => sum + r.quantity, 0);

  const handleExportExcel = () => {
    exportLossAndDamageToExcel(selectedMonth, damageRecords);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF4444] text-white font-mono font-bold border border-[#141414]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141414] flex items-center gap-2">
                MODULE 03: BÁO CÁO HƯ HỎNG & THIỆT HẠI
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#E4E3E0] text-[#141414] border border-[#141414] uppercase">
                  {damageRecords.length} Trường Hợp
                </span>
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                Quản lý đồ hư hỏng đền bù (Charge) và miễn phí khách sạn chịu (FOC). Tự động đồng bộ số dư với Kho Module 01.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isMonthLocked}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FF4444] hover:bg-rose-700 text-white font-mono font-bold text-xs uppercase border border-[#141414] cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Ghi Nhận Hư Hỏng</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#10B981] hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase border border-[#141414] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#E4E3E0] text-[#141414] font-mono font-bold text-xs border border-[#141414] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In A4</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">TỔNG VẬT TƯ HƯ HỎNG</p>
          <p className="text-xl font-mono font-bold text-[#FF4444] mt-1">{totalItemsDamaged} <span className="text-xs font-normal text-slate-600">món</span></p>
          <p className="text-[10px] font-mono text-[#10B981] mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Đã đồng bộ tự động vào Cột Hao Hụt Module 01
          </p>
        </div>

        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">KHÁCH ĐỀN BÙ (CHARGE)</p>
          <p className="text-xl font-mono font-bold text-[#10B981] mt-1">{formatVND(totalChargeAmount)}</p>
          <p className="text-[10px] text-slate-600 mt-1">Lễ Tân thu tiền qua Folio phòng</p>
        </div>

        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-[#FF4444] uppercase">KHÁCH SẠN CHỊU (FOC)</p>
          <p className="text-xl font-mono font-bold text-[#FF4444] mt-1">{formatVND(totalFOCCost)}</p>
          <p className="text-[10px] text-slate-600 mt-1">Cần có chữ ký phê duyệt FOC</p>
        </div>
      </div>

      {/* Damage & Breakage Matrix Data Table */}
      <div className="bg-white border border-[#141414] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#141414] border-collapse">
            
            <thead className="bg-[#E4E3E0] text-[#141414] font-mono font-bold uppercase text-[10px] tracking-tight border-b border-[#141414]">
              <tr>
                <th className="p-2.5 text-center border-r border-[#141414] w-10">STT</th>
                <th className="p-2.5 border-r border-[#141414] w-24">Ngày</th>
                <th className="p-2.5 border-r border-[#141414] w-28">Mã VT</th>
                <th className="p-2.5 border-r border-[#141414] min-w-[180px]">Tên Vật Tư</th>
                <th className="p-2.5 border-r border-[#141414] w-28">Vị Trí / Phòng</th>
                <th className="p-2.5 text-center border-r border-[#141414] w-14">SL</th>
                <th className="p-2.5 text-center border-r border-[#141414] w-32">Hình Thức Chi Phí</th>
                <th className="p-2.5 text-right border-r border-[#141414] text-[#10B981]">Thu Khách (Charge)</th>
                <th className="p-2.5 text-right border-r border-[#141414] text-[#FF4444]">KS Chịu (FOC Cost)</th>
                <th className="p-2.5 border-r border-[#141414] w-44">Người Duyệt FOC</th>
                <th className="p-2.5 border-r border-[#141414]">Ghi Chú Trạng Thái</th>
                <th className="p-2.5 text-center w-20">Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#141414]/30 font-medium">
              {damageRecords.map((item, index) => {
                const isEditingThis = editingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-[#E4E3E0]/50 transition-colors">
                    <td className="p-2 text-center text-slate-600 font-mono border-r border-[#141414]/30">{index + 1}</td>
                    <td className="p-2 font-mono text-slate-700 border-r border-[#141414]/30">{item.date}</td>
                    <td className="p-2 font-mono text-[#141414] font-bold border-r border-[#141414]/30">{item.code}</td>
                    
                    <td className="p-2 font-semibold text-[#141414] border-r border-[#141414]/30">
                      {item.itemName}
                    </td>

                    <td className="p-2 text-[#141414] font-mono border-r border-[#141414]/30">{item.location}</td>
                    
                    <td className="p-2 text-center font-bold font-mono text-[#FF4444] border-r border-[#141414]/30">
                      {item.quantity}
                    </td>

                    {/* Charge vs FOC Status Badge */}
                    <td className="p-2 text-center border-r border-[#141414]/30">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border uppercase ${
                        item.isCharge
                          ? 'bg-[#10B981] text-white border-[#141414]'
                          : 'bg-[#FF4444] text-white border-[#141414]'
                      }`}>
                        {item.isCharge ? 'Khách Đền Bù' : 'Khách Sạn (FOC)'}
                      </span>
                    </td>

                    {/* Thu Khách Charge */}
                    <td className="p-2 text-right font-mono font-bold text-[#10B981] border-r border-[#141414]/30">
                      {item.isCharge ? formatVND(item.chargePrice) : '-'}
                    </td>

                    {/* KS Chịu FOC - with Pencil Override Feature */}
                    <td className="p-2 text-right font-mono font-bold text-[#FF4444] border-r border-[#141414]/30 bg-[#F2F1EE]">
                      {!item.isCharge ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditingThis ? (
                            <input
                              type="number"
                              value={item.costAmount}
                              onChange={e => updateDamageRecord(item.id, { costAmount: Number(e.target.value), isCostOverridden: true })}
                              onBlur={() => setEditingId(null)}
                              className="w-24 bg-white border border-[#141414] px-1 py-0.5 text-right text-xs font-mono font-bold text-[#FF4444] focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span>{formatVND(item.costAmount)}</span>
                              <button
                                onClick={() => setEditingId(item.id)}
                                disabled={isMonthLocked}
                                className="p-1 text-slate-600 hover:text-[#141414] transition-all cursor-pointer"
                                title="Nhấp nút bút chì để chỉnh sửa số tiền"
                              >
                                <Edit2 className="w-3 h-3 text-[#141414]" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : '-'}
                    </td>

                    {/* Offer By Text Field */}
                    <td className="p-1.5 border-r border-[#141414]/30">
                      <input
                        type="text"
                        disabled={isMonthLocked}
                        value={item.offerBy || ''}
                        onChange={e => updateDamageRecord(item.id, { offerBy: e.target.value })}
                        placeholder="Ms. Hoa FOC-02"
                        className="w-full bg-white border border-[#141414] px-2 py-0.5 text-xs text-[#141414] font-medium focus:outline-none"
                      />
                    </td>

                    {/* Notes */}
                    <td className="p-2 text-slate-600 border-r border-[#141414]/30 text-[11px]">
                      {item.notes || '-'}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm('Xóa báo cáo hư hỏng này?')) {
                            deleteDamageRecord(item.id);
                          }
                        }}
                        disabled={isMonthLocked}
                        className="p-1 text-slate-600 hover:text-[#FF4444] hover:bg-[#E4E3E0] transition-all cursor-pointer disabled:opacity-30"
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
                <td colSpan={5} className="p-2.5 text-right uppercase tracking-wider border-r border-[#141414]">
                  TỔNG CỘNG THIỆT HẠI
                </td>
                <td className="p-2.5 text-center font-mono text-[#FF4444] border-r border-[#141414]">{totalItemsDamaged}</td>
                <td className="p-2.5 border-r border-[#141414]">-</td>
                <td className="p-2.5 text-right font-mono text-[#10B981] border-r border-[#141414]">{formatVND(totalChargeAmount)}</td>
                <td className="p-2.5 text-right font-mono text-[#FF4444] border-r border-[#141414]">{formatVND(totalFOCCost)}</td>
                <td colSpan={3} className="p-2.5 border-r border-[#141414]">-</td>
              </tr>
            </tfoot>

          </table>
        </div>
      </div>

      {/* Printable Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="BÁO CÁO TỔNG HỢP HƯ HỎNG, THIỆT HẠI & ĐỀN BÙ VẬT TƯ"
        subtitle="Chi tiết đồ đạc hư hỏng, thu tiền khách hàng và chi phí đền bù FOC khách sạn chịu"
        orientation="landscape"
        onExportExcel={handleExportExcel}
      >
        <table className="w-full text-left text-[11px] text-slate-800 border-collapse border border-slate-400">
          <thead className="bg-slate-200 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-1.5 border border-slate-400 text-center">STT</th>
              <th className="p-1.5 border border-slate-400">Ngày</th>
              <th className="p-1.5 border border-slate-400">Mã VT</th>
              <th className="p-1.5 border border-slate-400">Tên Vật Tư</th>
              <th className="p-1.5 border border-slate-400">Vị Trí</th>
              <th className="p-1.5 border border-slate-400 text-center">SL</th>
              <th className="p-1.5 border border-slate-400 text-center">Hình Thức</th>
              <th className="p-1.5 border border-slate-400 text-right text-emerald-800">Thu Khách</th>
              <th className="p-1.5 border border-slate-400 text-right text-red-700">KS Chịu FOC</th>
              <th className="p-1.5 border border-slate-400">Người Phê Duyệt / Folio</th>
            </tr>
          </thead>
          <tbody>
            {damageRecords.map((item, idx) => (
              <tr key={item.id} className="border-b border-slate-300">
                <td className="p-1 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-1 border border-slate-300 font-mono">{item.date}</td>
                <td className="p-1 border border-slate-300 font-mono font-bold">{item.code}</td>
                <td className="p-1 border border-slate-300">{item.itemName}</td>
                <td className="p-1 border border-slate-300">{item.location}</td>
                <td className="p-1 border border-slate-300 text-center font-bold text-red-600">{item.quantity}</td>
                <td className="p-1 border border-slate-300 text-center">{item.isCharge ? 'Khách Đền Bù' : 'FOC Khách Sạn'}</td>
                <td className="p-1 border border-slate-300 text-right font-mono text-emerald-800">{item.isCharge ? item.chargePrice.toLocaleString() : '-'}</td>
                <td className="p-1 border border-slate-300 text-right font-mono text-red-700">{!item.isCharge ? item.costAmount.toLocaleString() : '-'}</td>
                <td className="p-1 border border-slate-300">{item.offerBy || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-[10px]">
            <tr>
              <td colSpan={5} className="p-1.5 border border-slate-400 text-right">TỔNG CỘNG THIỆT HẠI</td>
              <td className="p-1.5 border border-slate-400 text-center text-red-600">{totalItemsDamaged}</td>
              <td className="p-1.5 border border-slate-400">-</td>
              <td className="p-1.5 border border-slate-400 text-right text-emerald-800">{formatVND(totalChargeAmount)}</td>
              <td className="p-1.5 border border-slate-400 text-right text-red-700">{formatVND(totalFOCCost)}</td>
              <td className="p-1.5 border border-slate-400">-</td>
            </tr>
          </tfoot>
        </table>
      </PrintReportModal>

      {/* Add Damage Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        type="DAMAGE"
      />

    </div>
  );
};
