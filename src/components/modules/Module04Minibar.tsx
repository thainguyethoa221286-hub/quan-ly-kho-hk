import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportMinibarSummaryToExcel, formatVND } from '../../utils/excelExporter';
import { PrintReportModal } from '../common/PrintReportModal';
import { 
  Coffee, Layers, Receipt, AlertCircle, CheckCircle2, Download, Printer, 
  Plus, Edit2, ShieldAlert, Sparkles, PlusCircle, RotateCcw, AlertTriangle 
} from 'lucide-react';
import { MinibarItem } from '../../types';

export const Module04Minibar: React.FC = () => {
  const { 
    minibarItems, updateMinibarItem, 
    roomSetups, updateRoomSetup, 
    dailyBills, addDailyBill, 
    selectedMonth, isMonthLocked 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'SUMMARY_C' | 'DAILY_BILL_A' | 'FLOOR_SETUP_B'>('SUMMARY_C');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Daily Bill Quick Form State
  const [selectedRoom, setSelectedRoom] = useState('301');
  const [selectedFloor, setSelectedFloor] = useState('F3');
  const [billQuantities, setBillQuantities] = useState<Record<string, { billed: number; foc: number }>>({
    'MB-BEV-001': { billed: 1, foc: 0 },
    'MB-BEV-002': { billed: 0, foc: 0 },
  });

  // Calculate setup stock helper
  const getSetupStock = (code: string) => {
    return roomSetups.reduce((acc, room) => acc + (room.itemQuantities[code] || 0), 0);
  };

  // Minibar Discrepancy list
  const minibarSummaryData = minibarItems.map(item => {
    const setupStock = getSetupStock(item.code);
    const bookEndingStock = item.openingStock + item.incomingQty - item.billedQty - item.focQty - item.transferFOQty - item.transferFBQty;
    const actualStock = item.warehouseStock + setupStock;
    const discrepancy = bookEndingStock - actualStock;
    const revenue = item.billedQty * item.sellingPrice;

    return {
      ...item,
      setupStock,
      bookEndingStock,
      actualStock,
      discrepancy,
      revenue
    };
  });

  const totalDiscrepancies = minibarSummaryData.filter(i => i.discrepancy !== 0).length;
  const totalMinibarRevenue = minibarSummaryData.reduce((sum, i) => sum + i.revenue, 0);
  const totalBilledSales = minibarSummaryData.reduce((sum, i) => sum + i.billedQty, 0);

  const handleExportExcel = () => {
    exportMinibarSummaryToExcel(selectedMonth, minibarItems, roomSetups);
  };

  const handlePostDailyBill = () => {
    const billItems: any[] = [];
    let billTotal = 0;

    Object.entries(billQuantities).forEach(([code, value]) => {
      const qtyObj = value as { billed: number; foc: number };
      if (qtyObj.billed > 0 || qtyObj.foc > 0) {
        const item = minibarItems.find(m => m.code === code);
        if (item) {
          billItems.push({
            itemCode: item.code,
            itemName: item.name,
            billedQty: qtyObj.billed,
            focQty: qtyObj.foc,
            unitPrice: item.sellingPrice
          });
          billTotal += qtyObj.billed * item.sellingPrice;
        }
      }
    });

    if (billItems.length === 0) {
      alert('Vui lòng chọn số lượng sản phẩm tiêu dùng!');
      return;
    }

    addDailyBill({
      date: new Date().toISOString().split('T')[0],
      roomNumber: selectedRoom,
      floor: selectedFloor,
      items: billItems,
      totalAmount: billTotal,
      staffName: 'HK Supervisor',
      status: 'POSTED_FO'
    });

    alert(`Đã ghi nhận Bill Minibar Phòng ${selectedRoom} - Tổng tiền: ${formatVND(billTotal)}!`);
    setBillQuantities({});
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#141414] text-[#E4E3E0] font-mono font-bold">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141414] flex items-center gap-2">
                MODULE 04: QUẢN LÝ MINIBAR & ĐỊNH MỨC PHÒNG
                {totalDiscrepancies > 0 ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FF4444] text-white font-bold border border-[#141414]">
                    ⚠️ Lệch Kê {totalDiscrepancies} Mục
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#10B981] text-white font-bold border border-[#141414]">
                    🟢 Khớp 100% Cân Bằng
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                Theo dõi tiêu dùng Daily Bills, Định mức khay setup theo tầng và Bảng báo cáo tổng kiểm kê Minibar.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#10B981] hover:bg-emerald-700 text-white font-mono font-bold text-xs uppercase border border-[#141414] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Minibar Excel</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase border border-[#141414] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo Cáo A4</span>
          </button>
        </div>
      </div>

      {/* Sub-module Navigation Tabs */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-2 shadow-sm flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setActiveTab('SUMMARY_C')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-bold transition-all border border-[#141414] cursor-pointer ${
            activeTab === 'SUMMARY_C'
              ? 'bg-[#141414] text-[#E4E3E0]'
              : 'bg-white text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Coffee className="w-4 h-4" />
          <span>SUB 4C: BẢNG BÁO CÁO TỔNG MINIBAR</span>
        </button>

        <button
          onClick={() => setActiveTab('DAILY_BILL_A')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-bold transition-all border border-[#141414] cursor-pointer ${
            activeTab === 'DAILY_BILL_A'
              ? 'bg-[#141414] text-[#E4E3E0]'
              : 'bg-white text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>SUB 4A: GHI NHẬN DAILY BILLS</span>
        </button>

        <button
          onClick={() => setActiveTab('FLOOR_SETUP_B')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-bold transition-all border border-[#141414] cursor-pointer ${
            activeTab === 'FLOOR_SETUP_B'
              ? 'bg-[#141414] text-[#E4E3E0]'
              : 'bg-white text-[#141414] hover:bg-[#E4E3E0]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>SUB 4B: MATRIX SETUP THEO TẦNG</span>
        </button>
      </div>

      {/* SUB-MODULE 4C: MINIBAR SUMMARY SHEET */}
      {activeTab === 'SUMMARY_C' && (
        <div className="space-y-6">
          
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
              <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">DOANH THU MINIBAR ĐÃ BÁN</p>
              <p className="text-xl font-mono font-bold text-[#10B981] mt-1">{formatVND(totalMinibarRevenue)}</p>
              <p className="text-[10px] font-mono text-slate-600 mt-1">Tổng {totalBilledSales} lon/gói đã ghi bill</p>
            </div>

            <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
              <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">CHÊNH LỆCH KIỂM KÊ</p>
              <p className={`text-xl font-mono font-bold mt-1 ${totalDiscrepancies > 0 ? 'text-[#FF4444]' : 'text-[#10B981]'}`}>
                {totalDiscrepancies > 0 ? `⚠️ Lệch ${totalDiscrepancies} Mặt Hàng` : '🟢 Khớp Hoàn Toàn'}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">Công thức: Tồn Sách Vở - Tồn Thực Tế</p>
            </div>

            <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
              <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">TỒN KHAY SETUP PHÒNG</p>
              <p className="text-xl font-mono font-bold text-[#141414] mt-1">
                {minibarSummaryData.reduce((sum, i) => sum + i.setupStock, 0)} <span className="text-xs font-normal text-slate-600">mục</span>
              </p>
              <p className="text-[10px] text-slate-600 mt-1">Lấy tự động từ Matrix Sub 4B</p>
            </div>
          </div>

          {/* Main Minibar Summary Table */}
          <div className="bg-white border border-[#141414] overflow-hidden shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#141414] border-collapse">
                
                <thead className="bg-[#E4E3E0] text-[#141414] font-mono font-bold uppercase text-[10px] tracking-tight border-b border-[#141414]">
                  <tr>
                    <th className="p-2.5 text-center border-r border-[#141414] w-10">STT</th>
                    <th className="p-2.5 border-r border-[#141414] w-24">Mã Hàng</th>
                    <th className="p-2.5 border-r border-[#141414] min-w-[180px]">Tên Hàng Minibar</th>
                    <th className="p-2.5 text-center border-r border-[#141414] w-12">ĐVT</th>
                    <th className="p-2.5 text-right border-r border-[#141414]">Tồn Đầu</th>
                    <th className="p-2.5 text-right border-r border-[#141414]">Nhập</th>
                    <th className="p-2.5 text-right border-r border-[#141414] text-[#10B981]">Billed (Bán)</th>
                    <th className="p-2.5 text-right border-r border-[#141414]">No Change</th>
                    <th className="p-2.5 text-right border-r border-[#141414]">FOC</th>
                    <th className="p-2.5 text-right border-r border-[#141414]">Trans FO</th>
                    <th className="p-2.5 text-right border-r border-[#141414]">Trans FB</th>
                    <th className="p-2.5 text-right border-r border-[#141414] font-bold">Tồn Kho MB</th>
                    <th className="p-2.5 text-right border-r border-[#141414] font-bold">Setup Room</th>
                    <th className="p-2.5 text-right border-r border-[#141414] font-bold">Tồn Sách Vở</th>
                    <th className="p-2.5 text-right border-r border-[#141414] font-bold">Tồn Thực Tế</th>
                    <th className="p-2.5 text-center border-r border-[#141414] font-bold">Discrepancy</th>
                    <th className="p-2.5 text-right font-bold text-[#10B981]">Doanh Thu (VNĐ)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#141414]/30 font-medium">
                  {minibarSummaryData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-[#E4E3E0]/50 transition-colors">
                      <td className="p-2 text-center text-slate-600 font-mono border-r border-[#141414]/30">{index + 1}</td>
                      <td className="p-2 font-mono text-[#141414] font-bold border-r border-[#141414]/30">{item.code}</td>
                      <td className="p-2 font-semibold text-[#141414] border-r border-[#141414]/30">{item.name}</td>
                      <td className="p-2 text-center text-slate-600 font-mono border-r border-[#141414]/30">{item.unit}</td>
                      <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">{item.openingStock}</td>
                      <td className="p-2 text-right font-mono text-[#141414] border-r border-[#141414]/30">{item.incomingQty}</td>
                      
                      {/* Billed sales */}
                      <td className="p-2 text-right font-mono font-bold text-[#10B981] border-r border-[#141414]/30 bg-[#F2F1EE]">
                        {item.billedQty}
                      </td>

                      <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">{item.noChangeQty}</td>
                      <td className="p-2 text-right font-mono border-r border-[#141414]/30">{item.focQty}</td>
                      <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">{item.transferFOQty}</td>
                      <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">{item.transferFBQty}</td>
                      
                      {/* Warehouse Stock - Editable */}
                      <td className="p-1.5 text-right font-mono border-r border-[#141414]/30 bg-[#F2F1EE]">
                        <input
                          type="number"
                          disabled={isMonthLocked}
                          value={item.warehouseStock}
                          onChange={e => updateMinibarItem(item.id, { warehouseStock: Math.max(0, Number(e.target.value)) })}
                          className="w-16 bg-white border border-[#141414] px-1 py-0.5 text-right text-xs font-mono font-bold text-[#141414] focus:outline-none"
                        />
                      </td>

                      {/* Setup Room Stock from Sub 4B */}
                      <td className="p-2 text-right font-mono font-bold text-[#141414] border-r border-[#141414]/30">
                        {item.setupStock}
                      </td>

                      {/* Book Ending Stock */}
                      <td className="p-2 text-right font-mono font-bold text-[#141414] border-r border-[#141414]/30">
                        {item.bookEndingStock}
                      </td>

                      {/* Actual Stock */}
                      <td className="p-2 text-right font-mono font-bold text-[#141414] border-r border-[#141414]/30">
                        {item.actualStock}
                      </td>

                      {/* Variance Alert Badge */}
                      <td className="p-2 text-center border-r border-[#141414]/30">
                        {item.discrepancy === 0 ? (
                          <span className="px-2 py-0.5 border border-[#141414] bg-[#10B981] text-white font-mono text-[10px] font-bold uppercase">
                            🟢 OK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 border border-[#141414] bg-[#FF4444] text-white font-mono text-[10px] font-bold uppercase">
                            ⚠️ {item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}
                          </span>
                        )}
                      </td>

                      {/* Revenue */}
                      <td className="p-2 text-right font-mono font-bold text-[#10B981]">
                        {formatVND(item.revenue)}
                      </td>

                    </tr>
                  ))}
                </tbody>

                <tfoot className="bg-[#E4E3E0] text-[#141414] font-mono font-bold text-xs border-t-2 border-[#141414]">
                  <tr>
                    <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider border-r border-[#141414]">
                      TỔNG CỘNG MINIBAR
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#10B981] border-r border-[#141414]">{totalBilledSales}</td>
                    <td colSpan={9} className="p-2.5 border-r border-[#141414] text-center text-slate-500">-</td>
                    <td className="p-2.5 text-right font-mono text-[#10B981]">{formatVND(totalMinibarRevenue)}</td>
                  </tr>
                </tfoot>

              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-MODULE 4A: DAILY BILL ENTRY */}
      {activeTab === 'DAILY_BILL_A' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form */}
          <div className="lg:col-span-5 bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm space-y-4">
            <h3 className="font-mono font-bold text-xs text-[#141414] uppercase tracking-wider flex items-center gap-2 border-b border-[#141414] pb-2">
              <Receipt className="w-4 h-4" />
              Ghi Nhận Tiêu Dùng Hàng Ngày Theo Phòng
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono font-bold text-[#141414] uppercase mb-1">Số Phòng (Room)</label>
                <input
                  type="text"
                  value={selectedRoom}
                  onChange={e => setSelectedRoom(e.target.value)}
                  placeholder="VD: 301, PH1"
                  className="w-full bg-white border border-[#141414] px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-[#141414] uppercase mb-1">Tầng (Floor)</label>
                <select
                  value={selectedFloor}
                  onChange={e => setSelectedFloor(e.target.value)}
                  className="w-full bg-white border border-[#141414] px-2.5 py-1.5 text-xs font-mono font-bold text-[#141414]"
                >
                  <option value="F1">Tầng 1 (F1)</option>
                  <option value="F2">Tầng 2 (F2)</option>
                  <option value="F3">Tầng 3 (F3)</option>
                  <option value="F4">Tầng 4 (F4)</option>
                  <option value="F5">Tầng 5 (F5)</option>
                  <option value="F6">Tầng 6 (F6)</option>
                  <option value="F7">Tầng 7 (F7)</option>
                  <option value="F8">Tầng 8 (F8)</option>
                  <option value="F9">Tầng 9 (F9)</option>
                  <option value="Penthouse">Penthouse</option>
                </select>
              </div>
            </div>

            {/* Item Quick Counters */}
            <div className="space-y-2 pt-2 border-t border-[#141414]/30 max-h-80 overflow-y-auto">
              <label className="block text-xs font-mono font-bold text-[#141414] uppercase mb-1">
                Chọn Sản Phẩm Tiêu Dùng:
              </label>

              {minibarItems.map(item => {
                const currentQty = billQuantities[item.code] || { billed: 0, foc: 0 };

                return (
                  <div key={item.id} className="p-2 bg-white border border-[#141414] flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-[#141414]">{item.name}</div>
                      <div className="text-[10px] text-slate-600 font-mono">{formatVND(item.sellingPrice)} / {item.unit}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono font-bold text-[#10B981]">Bill:</span>
                        <input
                          type="number"
                          min="0"
                          value={currentQty.billed}
                          onChange={e => setBillQuantities({
                            ...billQuantities,
                            [item.code]: { ...currentQty, billed: Math.max(0, Number(e.target.value)) }
                          })}
                          className="w-12 bg-[#E4E3E0] border border-[#141414] px-1 text-center text-xs font-mono font-bold text-[#141414]"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono font-bold text-[#FF4444]">FOC:</span>
                        <input
                          type="number"
                          min="0"
                          value={currentQty.foc}
                          onChange={e => setBillQuantities({
                            ...billQuantities,
                            [item.code]: { ...currentQty, foc: Math.max(0, Number(e.target.value)) }
                          })}
                          className="w-12 bg-[#E4E3E0] border border-[#141414] px-1 text-center text-xs font-mono font-bold text-[#FF4444]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handlePostDailyBill}
              disabled={isMonthLocked}
              className="w-full py-2.5 bg-[#141414] hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase border border-[#141414] cursor-pointer"
            >
              Ghi Nhận Bill Minibar & Chuyển Lễ Tân
            </button>

          </div>

          {/* Right Log List */}
          <div className="lg:col-span-7 bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm space-y-4">
            <h3 className="font-mono font-bold text-xs text-[#141414] uppercase tracking-wider flex items-center justify-between border-b border-[#141414] pb-2">
              <span>Lịch Sử Daily Bills Đã Ghi Nhận ({dailyBills.length})</span>
              <span className="text-xs text-[#10B981] font-mono">Đã Đồng Bộ Lễ Tân FO</span>
            </h3>

            <div className="space-y-2 overflow-y-auto max-h-[500px]">
              {dailyBills.map((bill) => (
                <div key={bill.id} className="p-3 bg-white border border-[#141414] space-y-2">
                  <div className="flex items-center justify-between border-b border-[#141414]/30 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#141414] text-white font-mono font-bold text-xs">
                        Phòng {bill.roomNumber} ({bill.floor})
                      </span>
                      <span className="text-xs text-slate-600 font-mono">{bill.date}</span>
                    </div>

                    <span className="text-xs font-bold text-[#10B981] font-mono">
                      {formatVND(bill.totalAmount)}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    {bill.items.map((bi, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[#141414]">
                        <span>{bi.itemName} x{bi.billedQty + bi.focQty}</span>
                        <span className="text-slate-600 font-mono">{formatVND(bi.unitPrice * bi.billedQty)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10px] text-slate-600 pt-1 flex items-center justify-between border-t border-[#141414]/20 font-mono">
                    <span>NV Báo Cáo: {bill.staffName}</span>
                    <span className="text-[#10B981] font-bold">FO POSTED</span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>
      )}

      {/* SUB-MODULE 4B: FLOOR SETUP MATRIX */}
      {activeTab === 'FLOOR_SETUP_B' && (
        <div className="bg-white border border-[#141414] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#141414] pb-3">
            <div>
              <h3 className="font-mono font-bold text-xs text-[#141414] uppercase tracking-wider">
                SUB 4B: MATRIX ĐỊNH MỨC KHO NỔI THEO TẦNG (FLOOR SETUP MATRIX)
              </h3>
              <p className="text-xs text-slate-700 mt-0.5">
                Chỉnh sửa số lượng thực tế trong tủ lạnh minibar từng phòng. Số dư được tự động cộng dồn sang Cột Setup Room ở Bảng Báo Cáo Tổng.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#141414] border-collapse">
              <thead className="bg-[#E4E3E0] text-[#141414] font-mono font-bold uppercase text-[10px] border-b border-[#141414]">
                <tr>
                  <th className="p-2.5 border-r border-[#141414] w-20">Phòng</th>
                  <th className="p-2.5 border-r border-[#141414] w-20">Tầng</th>
                  <th className="p-2.5 border-r border-[#141414] w-28">Hạng Phòng</th>
                  {minibarItems.map(item => (
                    <th key={item.id} className="p-2.5 text-center border-r border-[#141414] min-w-[100px]">
                      {item.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]/30 font-mono">
                {roomSetups.map((room) => (
                  <tr key={room.roomNumber} className="hover:bg-[#E4E3E0]/50">
                    <td className="p-2 font-bold text-[#141414] border-r border-[#141414]/30">{room.roomNumber}</td>
                    <td className="p-2 text-slate-600 border-r border-[#141414]/30">{room.floor}</td>
                    <td className="p-2 text-[#141414] border-r border-[#141414]/30">{room.roomType}</td>

                    {minibarItems.map(item => {
                      const qty = room.itemQuantities[item.code] || 0;
                      return (
                        <td key={item.id} className="p-1.5 text-center border-r border-[#141414]/30">
                          <input
                            type="number"
                            min="0"
                            disabled={isMonthLocked}
                            value={qty}
                            onChange={e => updateRoomSetup(room.roomNumber, item.code, Number(e.target.value))}
                            className="w-12 bg-[#F2F1EE] border border-[#141414] px-1 py-0.5 text-center text-xs text-[#141414] font-mono font-bold focus:outline-none"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Printable Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="BẢNG BÁO CÁO TỔNG KIỂM KÊ & DOANH THU MINIBAR"
        subtitle="Chi tiết xuất - nhập - tồn sách vở - tồn thực tế và doanh thu minibar theo quy chuẩn 5 sao"
        orientation="landscape"
        onExportExcel={handleExportExcel}
      >
        <table className="w-full text-left text-[11px] text-slate-800 border-collapse border border-slate-400">
          <thead className="bg-slate-200 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-1.5 border border-slate-400 text-center">STT</th>
              <th className="p-1.5 border border-slate-400">Mã</th>
              <th className="p-1.5 border border-slate-400">Tên Hàng Minibar</th>
              <th className="p-1.5 border border-slate-400 text-center">ĐVT</th>
              <th className="p-1.5 border border-slate-400 text-right">Tồn Đầu</th>
              <th className="p-1.5 border border-slate-400 text-right">Nhập</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold text-emerald-800">Billed</th>
              <th className="p-1.5 border border-slate-400 text-right">FOC</th>
              <th className="p-1.5 border border-slate-400 text-right">Tồn Kho</th>
              <th className="p-1.5 border border-slate-400 text-right">Setup Room</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold">Tồn Sách</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold">Tồn Thực Tế</th>
              <th className="p-1.5 border border-slate-400 text-center font-bold">Chênh Lệch</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold">Doanh Thu (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {minibarSummaryData.map((item, idx) => (
              <tr key={item.id} className="border-b border-slate-300">
                <td className="p-1 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-1 border border-slate-300 font-mono font-bold">{item.code}</td>
                <td className="p-1 border border-slate-300">{item.name}</td>
                <td className="p-1 border border-slate-300 text-center">{item.unit}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.openingStock}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.incomingQty}</td>
                <td className="p-1 border border-slate-300 text-right font-mono font-bold text-emerald-800">{item.billedQty}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.focQty}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.warehouseStock}</td>
                <td className="p-1 border border-slate-300 text-right font-mono">{item.setupStock}</td>
                <td className="p-1 border border-slate-300 text-right font-mono font-bold">{item.bookEndingStock}</td>
                <td className="p-1 border border-slate-300 text-right font-mono font-bold text-amber-800">{item.actualStock}</td>
                <td className="p-1 border border-slate-300 text-center font-bold">
                  {item.discrepancy === 0 ? '🟢 OK' : `⚠️ ${item.discrepancy}`}
                </td>
                <td className="p-1 border border-slate-300 text-right font-mono font-bold">{item.revenue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-[10px]">
            <tr>
              <td colSpan={6} className="p-1.5 border border-slate-400 text-right">TỔNG CỘNG MINIBAR</td>
              <td className="p-1.5 border border-slate-400 text-right text-emerald-800">{totalBilledSales}</td>
              <td colSpan={6} className="p-1.5 border border-slate-400 text-right">-</td>
              <td className="p-1.5 border border-slate-400 text-right font-bold text-emerald-800">{formatVND(totalMinibarRevenue)}</td>
            </tr>
          </tfoot>
        </table>
      </PrintReportModal>

    </div>
  );
};
