import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportStoreInventoryToExcel, formatVND } from '../../utils/excelExporter';
import { PrintReportModal } from '../common/PrintReportModal';
import { AddItemModal } from '../common/AddItemModal';
import { 
  Package, Search, Plus, Download, Printer, Filter, Info, Trash2, Edit2, CheckCircle, AlertCircle 
} from 'lucide-react';
import { ModuleCategory, StoreItem } from '../../types';

export const Module01Store: React.FC = () => {
  const { storeItems, updateStoreItem, deleteStoreItem, selectedMonth, isMonthLocked } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Keyboard Excel navigation & inline editing target
  const [editingCell, setEditingCell] = useState<{ id: string; field: keyof StoreItem } | null>(null);

  const filteredItems = storeItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Calculate totals
  const totalOpening = filteredItems.reduce((sum, i) => sum + i.openingStock, 0);
  const totalSetup = filteredItems.reduce((sum, i) => sum + i.setupQty, 0);
  const totalIncoming = filteredItems.reduce((sum, i) => sum + i.incomingQty, 0);
  const totalWarehouse = filteredItems.reduce((sum, i) => sum + i.currentWarehouseStock, 0);
  const totalDamage = filteredItems.reduce((sum, i) => sum + i.lossAndDamageQty, 0);
  const totalEnding = filteredItems.reduce((sum, i) => sum + (i.currentWarehouseStock + i.setupQty), 0);
  const totalValuation = filteredItems.reduce((sum, i) => sum + ((i.currentWarehouseStock + i.setupQty) * i.unitCost), 0);

  const handleExportExcel = () => {
    exportStoreInventoryToExcel(selectedMonth, filteredItems);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Controls */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#141414] text-[#E4E3E0] font-mono font-bold">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#141414] flex items-center gap-2">
                MODULE 01: KHO HK & VẬT TƯ BUỒNG PHÒNG
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#E4E3E0] text-[#141414] border border-[#141414] uppercase">
                  {filteredItems.length} Mặt Hàng
                </span>
              </h2>
              <p className="text-xs text-slate-700 mt-0.5">
                Báo cáo Nhập - Xuất - Tồn kho thực tế & Tồn khay setup phòng. Tự động đồng bộ số liệu hư hỏng từ Module 03.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            disabled={isMonthLocked}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141414] hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase border border-[#141414] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Vật Tư</span>
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

      {/* Filter Tabs & Search Bar */}
      <div className="bg-[#F2F1EE] border border-[#141414] p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc mã vật tư (VD: HK-LN-001)..."
            className="w-full bg-white border border-[#141414] pl-9 pr-4 py-1.5 text-xs text-[#141414] font-medium focus:outline-none focus:ring-1 focus:ring-[#141414]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'LINEN', label: 'Linen & Khăn' },
            { id: 'AMENITIES', label: 'Amenities' },
            { id: 'CHEMICAL', label: 'Hóa Chất' },
            { id: 'EQUIPMENT', label: 'Dụng Cụ' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-mono font-bold transition-all border border-[#141414] cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#141414] text-[#E4E3E0]'
                  : 'bg-white text-[#141414] hover:bg-[#E4E3E0]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">TỔNG TỒN ĐẦU KỲ</p>
          <p className="text-xl font-mono font-bold text-[#141414] mt-1">{totalOpening.toLocaleString()} <span className="text-xs font-normal text-slate-600">mục</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-slate-600 uppercase">ĐỊNH MỨC SETUP ROOM</p>
          <p className="text-xl font-mono font-bold text-[#141414] mt-1">{totalSetup.toLocaleString()} <span className="text-xs font-normal text-slate-600">mục</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-[#FF4444] uppercase">HAO HỤT / HU HỎNG</p>
          <p className="text-xl font-mono font-bold text-[#FF4444] mt-1">{totalDamage.toLocaleString()} <span className="text-xs font-normal text-slate-600">mục</span></p>
        </div>
        <div className="bg-[#F2F1EE] border border-[#141414] p-3.5 shadow-sm">
          <p className="text-[10px] font-mono font-bold text-[#10B981] uppercase">TỔNG GIÁ TRỊ KHO HÀNG</p>
          <p className="text-xl font-mono font-bold text-[#10B981] mt-1">{formatVND(totalValuation)}</p>
        </div>
      </div>

      {/* Main Excel Multi-column Data Table */}
      <div className="bg-white border border-[#141414] overflow-hidden shadow-md">
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-left text-xs text-[#141414] border-collapse">
            
            {/* Table Header */}
            <thead className="bg-[#E4E3E0] text-[#141414] font-mono font-bold uppercase sticky top-0 z-20 border-b border-[#141414] text-[10px] tracking-tight">
              <tr>
                <th className="p-2.5 w-10 text-center border-r border-[#141414]">STT</th>
                <th className="p-2.5 w-28 border-r border-[#141414]">Mã VT</th>
                <th className="p-2.5 min-w-[200px] border-r border-[#141414]">Tên Vật Tư</th>
                <th className="p-2.5 w-16 text-center border-r border-[#141414]">ĐVT</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Tồn Đầu</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Setup Room</th>
                <th className="p-2.5 text-right border-r border-[#141414] bg-[#F2F1EE]">Nhập Trong Kỳ</th>
                <th className="p-2.5 text-right border-r border-[#141414] bg-[#F2F1EE]">Kho Thực Tế</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Điều Chuyển</th>
                <th className="p-2.5 text-right text-[#FF4444] border-r border-[#141414]">Hao Hụt</th>
                <th className="p-2.5 text-right font-bold border-r border-[#141414]">Tổng Có</th>
                <th className="p-2.5 text-right font-bold border-r border-[#141414]">Xuất Sử Dụng</th>
                <th className="p-2.5 text-right font-bold text-[#10B981] border-r border-[#141414]">Tồn Cuối Kỳ</th>
                <th className="p-2.5 text-right border-r border-[#141414]">Đơn Giá (VNĐ)</th>
                <th className="p-2.5 text-right font-bold border-r border-[#141414]">Thành Tiền Tồn</th>
                <th className="p-2.5 text-center w-20">Thao Tác</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-[#141414]/30 font-medium">
              {filteredItems.map((item, index) => {
                const totalAvailable = item.openingStock + item.incomingQty;
                const endingStock = item.currentWarehouseStock + item.setupQty;
                const usage = Math.max(0, totalAvailable - (item.lossAndDamageQty + item.transferQty + endingStock));
                const valuation = endingStock * item.unitCost;

                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-[#E4E3E0]/50 transition-colors group"
                  >
                    <td className="p-2 text-center text-slate-600 font-mono border-r border-[#141414]/30">{index + 1}</td>
                    
                    <td className="p-2 font-mono text-[#141414] font-bold border-r border-[#141414]/30">
                      {item.code}
                    </td>

                    <td className="p-2 font-semibold text-[#141414] border-r border-[#141414]/30">
                      {item.name}
                      {item.notes && <span className="block text-[10px] font-normal text-slate-600 italic">{item.notes}</span>}
                    </td>

                    <td className="p-2 text-center text-slate-700 border-r border-[#141414]/30">
                      <span className="px-1 py-0.5 border border-[#141414] text-[10px] font-mono bg-[#E4E3E0]">
                        {item.unit}
                      </span>
                    </td>

                    {/* Tồn Đầu */}
                    <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">
                      {item.openingStock.toLocaleString()}
                    </td>

                    {/* Setup Room */}
                    <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">
                      {item.setupQty.toLocaleString()}
                    </td>

                    {/* Nhập Trong Kỳ - Editable */}
                    <td className="p-1.5 text-right font-mono border-r border-[#141414]/30 bg-[#F2F1EE]">
                      <input
                        type="number"
                        disabled={isMonthLocked}
                        value={item.incomingQty}
                        onChange={e => updateStoreItem(item.id, { incomingQty: Math.max(0, Number(e.target.value)) })}
                        className="w-16 bg-white border border-[#141414] px-1 py-0.5 text-right text-xs font-mono font-bold text-[#141414] focus:outline-none"
                      />
                    </td>

                    {/* Kho Thực Tế - Editable */}
                    <td className="p-1.5 text-right font-mono border-r border-[#141414]/30 bg-[#F2F1EE]">
                      <input
                        type="number"
                        disabled={isMonthLocked}
                        value={item.currentWarehouseStock}
                        onChange={e => updateStoreItem(item.id, { currentWarehouseStock: Math.max(0, Number(e.target.value)) })}
                        className="w-16 bg-white border border-[#141414] px-1 py-0.5 text-right text-xs font-mono font-bold text-[#10B981] focus:outline-none"
                      />
                    </td>

                    {/* Điều Chuyển */}
                    <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">
                      {item.transferQty.toLocaleString()}
                    </td>

                    {/* Hao Hụt / Hư Hỏng - Auto Synced Badge */}
                    <td className="p-2 text-right font-mono border-r border-[#141414]/30">
                      <span className={`px-1.5 py-0.5 border font-bold text-xs font-mono ${
                        item.lossAndDamageQty > 0 ? 'bg-[#FF4444] text-white border-[#141414]' : 'text-slate-500 border-slate-300'
                      }`}>
                        {item.lossAndDamageQty}
                      </span>
                    </td>

                    {/* Tổng Có */}
                    <td className="p-2 text-right font-mono font-bold text-[#141414] border-r border-[#141414]/30">
                      {totalAvailable.toLocaleString()}
                    </td>

                    {/* Xuất Sử Dụng Formula */}
                    <td className="p-2 text-right font-mono font-bold text-[#141414] border-r border-[#141414]/30">
                      {usage.toLocaleString()}
                    </td>

                    {/* Tồn Cuối Kỳ Formula */}
                    <td className="p-2 text-right font-mono font-bold text-[#10B981] border-r border-[#141414]/30">
                      {endingStock.toLocaleString()}
                    </td>

                    {/* Đơn Giá */}
                    <td className="p-2 text-right font-mono text-slate-700 border-r border-[#141414]/30">
                      {item.unitCost.toLocaleString()}
                    </td>

                    {/* Thành Tiền Tồn */}
                    <td className="p-2 text-right font-mono font-bold text-[#141414] border-r border-[#141414]/30">
                      {formatVND(valuation)}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center">
                      <button
                        onClick={() => {
                          if (window.confirm(`Xóa vật tư [${item.code}] ${item.name}?`)) {
                            deleteStoreItem(item.id);
                          }
                        }}
                        disabled={isMonthLocked}
                        className="p-1 text-slate-600 hover:text-[#FF4444] hover:bg-[#E4E3E0] transition-all disabled:opacity-30 cursor-pointer"
                        title="Xóa vật tư"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer Totals */}
            <tfoot className="bg-[#E4E3E0] text-[#141414] font-mono font-bold text-xs border-t-2 border-[#141414] sticky bottom-0 z-10">
              <tr>
                <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider border-r border-[#141414]">
                  TỔNG CỘNG ({filteredItems.length} MỤC)
                </td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalOpening.toLocaleString()}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalSetup.toLocaleString()}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalIncoming.toLocaleString()}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">{totalWarehouse.toLocaleString()}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">-</td>
                <td className="p-2.5 text-right font-mono text-[#FF4444] border-r border-[#141414]">{totalDamage.toLocaleString()}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">-</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">-</td>
                <td className="p-2.5 text-right font-mono text-[#10B981] border-r border-[#141414]">{totalEnding.toLocaleString()}</td>
                <td className="p-2.5 text-right font-mono border-r border-[#141414]">-</td>
                <td className="p-2.5 text-right font-mono text-[#10B981] border-r border-[#141414]">{formatVND(totalValuation)}</td>
                <td className="p-2.5 text-center">-</td>
              </tr>
            </tfoot>

          </table>
        </div>
      </div>

      {/* Printable Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="BÁO CÁO NHẬP - XUẤT - TỒN KHO VẬT TƯ BUỒNG PHÒNG"
        subtitle="Chi tiết kho thực tế, tồn khay setup phòng và trị giá kho vật tư"
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
              <th className="p-1.5 border border-slate-400 text-right">Tồn Đầu</th>
              <th className="p-1.5 border border-slate-400 text-right">Setup Room</th>
              <th className="p-1.5 border border-slate-400 text-right">Nhập</th>
              <th className="p-1.5 border border-slate-400 text-right">Kho Thực Tế</th>
              <th className="p-1.5 border border-slate-400 text-right">Hao Hụt</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold">Xuất Sử Dụng</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold">Tồn Cuối Kỳ</th>
              <th className="p-1.5 border border-slate-400 text-right">Đơn Giá</th>
              <th className="p-1.5 border border-slate-400 text-right font-bold">Trị Giá Tồn (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => {
              const totalAvailable = item.openingStock + item.incomingQty;
              const endingStock = item.currentWarehouseStock + item.setupQty;
              const usage = Math.max(0, totalAvailable - (item.lossAndDamageQty + item.transferQty + endingStock));
              return (
                <tr key={item.id} className="border-b border-slate-300">
                  <td className="p-1 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-1 border border-slate-300 font-mono font-bold">{item.code}</td>
                  <td className="p-1 border border-slate-300">{item.name}</td>
                  <td className="p-1 border border-slate-300 text-center">{item.unit}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.openingStock}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.setupQty}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.incomingQty}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.currentWarehouseStock}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono text-red-600">{item.lossAndDamageQty}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono font-bold">{usage}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono font-bold text-emerald-700">{endingStock}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono">{item.unitCost.toLocaleString()}</td>
                  <td className="p-1 border border-slate-300 text-right font-mono font-bold">{(endingStock * item.unitCost).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-[10px]">
            <tr>
              <td colSpan={4} className="p-1.5 border border-slate-400 text-right">TỔNG CỘNG</td>
              <td className="p-1.5 border border-slate-400 text-right">{totalOpening}</td>
              <td className="p-1.5 border border-slate-400 text-right">{totalSetup}</td>
              <td className="p-1.5 border border-slate-400 text-right">{totalIncoming}</td>
              <td className="p-1.5 border border-slate-400 text-right">{totalWarehouse}</td>
              <td className="p-1.5 border border-slate-400 text-right text-red-600">{totalDamage}</td>
              <td className="p-1.5 border border-slate-400 text-right">-</td>
              <td className="p-1.5 border border-slate-400 text-right text-emerald-700">{totalEnding}</td>
              <td className="p-1.5 border border-slate-400 text-right">-</td>
              <td className="p-1.5 border border-slate-400 text-right text-emerald-800">{formatVND(totalValuation)}</td>
            </tr>
          </tfoot>
        </table>
      </PrintReportModal>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        type="STORE"
      />

    </div>
  );
};
