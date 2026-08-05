import React from 'react';
import { useStore } from '../../context/StoreContext';
import { exportMonthlyMasterWorkbookToExcel } from '../../utils/excelExporter';
import { 
  Building2, Calendar, Lock, Unlock, Download, RefreshCw, UserCheck, ShieldCheck 
} from 'lucide-react';
import { Role } from '../../types';

export const Navbar: React.FC = () => {
  const { 
    selectedMonth, setSelectedMonth, 
    userProfile, setUserRole, 
    lockedMonths, toggleLockMonth, isMonthLocked,
    storeItems, prItems, damageRecords, minibarItems, roomSetups, vppItems, resetToDefaults
  } = useStore();

  const handleExportAll = () => {
    exportMonthlyMasterWorkbookToExcel(
      selectedMonth,
      storeItems,
      prItems,
      damageRecords,
      minibarItems,
      roomSetups,
      vppItems
    );
  };

  return (
    <header className="bg-[#F2F1EE] border-b border-[#141414] text-[#141414] sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] text-[#E4E3E0] flex items-center justify-center font-mono font-bold shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg tracking-tight text-[#141414]">
              M HOTEL
            </h1>
            <p className="text-xs text-slate-600 hidden sm:block font-sans">
              Hệ Thống Quản Lý Kho Buồng Phòng, Minibar & Vật Tư
            </p>
          </div>
        </div>

        {/* Center Controls: Month Picker & Lock Indicator */}
        <div className="flex items-center gap-2 bg-[#E4E3E0] p-1.5 border border-[#141414]">
          <div className="flex items-center gap-1.5 px-2 text-[#141414] text-xs font-mono font-semibold uppercase">
            <Calendar className="w-4 h-4 text-[#141414]" />
            <span className="hidden md:inline">Kỳ Báo Cáo:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white text-[#141414] text-xs font-mono font-bold px-3 py-1.5 border border-[#141414] focus:outline-none focus:ring-2 focus:ring-[#141414] cursor-pointer"
          >
            <option value="2026-05">Tháng 05/2026</option>
            <option value="2026-06">Tháng 06/2026 (Đã Khóa)</option>
            <option value="2026-07">Tháng 07/2026 (Hiện Tại)</option>
            <option value="2026-08">Tháng 08/2026</option>
            <option value="2026-09">Tháng 09/2026</option>
          </select>

          {/* Month Lock Toggle Badge */}
          <button
            onClick={() => toggleLockMonth(selectedMonth)}
            title={isMonthLocked ? 'Nhấp để mở khóa chỉnh sửa' : 'Nhấp để khóa số liệu tháng & chuyển số dư đầu kỳ tiếp theo'}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold border border-[#141414] transition-all cursor-pointer ${
              isMonthLocked
                ? 'bg-[#FF4444] text-white hover:bg-red-700'
                : 'bg-[#10B981] text-white hover:bg-emerald-700'
            }`}
          >
            {isMonthLocked ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ĐÃ KHÓA SỔ</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">MỞ SỔ HD</span>
              </>
            )}
          </button>
        </div>

        {/* Right Controls: Role Switcher & Export Master Excel */}
        <div className="flex items-center gap-2">
          {/* Role Switcher Dropdown */}
          <div className="relative group">
            <div className="flex items-center gap-2 bg-white hover:bg-[#E4E3E0] border border-[#141414] px-3 py-1.5 cursor-pointer text-xs transition-colors">
              <UserCheck className="w-4 h-4 text-[#141414]" />
              <div className="text-left">
                <div className="font-bold text-[#141414]">{userProfile.name}</div>
                <div className="text-[10px] font-mono text-slate-700">{userProfile.title.split('(')[0]}</div>
              </div>
            </div>

            {/* Role dropdown list */}
            <div className="absolute right-0 mt-1 w-64 bg-white border border-[#141414] shadow-xl py-2 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase text-slate-500 border-b border-[#141414] mb-1">
                Đổi Vai Trò Thao Tác
              </div>
              <button
                onClick={() => setUserRole('HK_MANAGER')}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[#E4E3E0] flex items-center justify-between font-medium ${userProfile.role === 'HK_MANAGER' ? 'text-[#141414] font-bold bg-[#E4E3E0]' : 'text-slate-800'}`}
              >
                <span>Trưởng BP Buồng (HK Manager)</span>
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setUserRole('STOREKEEPER')}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[#E4E3E0] flex items-center justify-between font-medium ${userProfile.role === 'STOREKEEPER' ? 'text-[#141414] font-bold bg-[#E4E3E0]' : 'text-slate-800'}`}
              >
                <span>Thủ Kho Vật Tư (Storekeeper)</span>
              </button>
              <button
                onClick={() => setUserRole('HK_SUPERVISOR')}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[#E4E3E0] flex items-center justify-between font-medium ${userProfile.role === 'HK_SUPERVISOR' ? 'text-[#141414] font-bold bg-[#E4E3E0]' : 'text-slate-800'}`}
              >
                <span>Giám Sát Minibar & Tầng</span>
              </button>
              <button
                onClick={() => setUserRole('ACCOUNTANT')}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[#E4E3E0] flex items-center justify-between font-medium ${userProfile.role === 'ACCOUNTANT' ? 'text-[#141414] font-bold bg-[#E4E3E0]' : 'text-slate-800'}`}
              >
                <span>Kế Toán Kiểm Soát (Auditor)</span>
              </button>
            </div>
          </div>

          {/* Export Master Excel */}
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 bg-[#141414] hover:bg-slate-800 text-white px-3.5 py-1.5 font-mono font-bold text-xs uppercase border border-[#141414] transition-all cursor-pointer"
            title="Xuất file Excel tổng hợp gồm tất cả 5 sheet báo cáo"
          >
            <Download className="w-4 h-4" />
            <span className="hidden lg:inline">Master Excel</span>
          </button>

          {/* Reset Mock Data */}
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn khôi phục dữ liệu mẫu ban đầu?')) {
                resetToDefaults();
              }
            }}
            className="p-1.5 text-[#141414] hover:bg-[#E4E3E0] border border-[#141414] transition-all cursor-pointer"
            title="Khôi phục dữ liệu mẫu ban đầu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
