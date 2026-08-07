import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { exportMonthlyMasterWorkbookToExcel } from '../../utils/excelExporter';
import { 
  Building2, Calendar, Lock, Unlock, Download, RefreshCw, UserCheck, ShieldCheck, Eye, KeyRound, X, LogOut
} from 'lucide-react';

// ---------- Modal nhập mật khẩu để mở Chế Độ Quản Lý ----------
function ManagerPasswordModal({ onCancel, onConfirm }) {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = () => {
    const ok = onConfirm(password);
    if (!ok) setErrorMsg('Sai mật khẩu, thử lại nhé.');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-80 rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-[#141414]">
            <KeyRound className="h-4 w-4" /> Chế Độ Quản Lý
          </h3>
          <button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <p className="mb-3 text-xs text-slate-500">Nhập mật khẩu Quản lý để bật quyền chỉnh sửa dữ liệu.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Mật khẩu Quản lý"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none"
        />
        {errorMsg && <p className="mt-1 text-xs text-red-500">{errorMsg}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border border-[#141414] px-3 py-1.5 text-sm">Huỷ</button>
          <button onClick={handleSubmit} className="rounded bg-[#141414] px-3 py-1.5 text-sm font-bold text-white">Mở Khoá</button>
        </div>
      </div>
    </div>
  );
}

export const Navbar: React.FC = () => {
  const { 
    selectedMonth, setSelectedMonth, 
    userProfile, setUserRole, 
    toggleLockMonth, isMonthLocked,
    isManagerMode, unlockManager, lockManagerSession, canEdit,
    storeItems, prItems, damageRecords, minibarItems, roomSetups, vppItems, resetToDefaults
  } = useStore();

  const [showPasswordModal, setShowPasswordModal] = useState(false);

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

  const handleConfirmPassword = (password: string) => {
    const ok = unlockManager(password);
    if (ok) setShowPasswordModal(false);
    return ok;
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
            <option value="2026-06">Tháng 06/2026</option>
            <option value="2026-07">Tháng 07/2026</option>
            <option value="2026-08">Tháng 08/2026</option>
            <option value="2026-09">Tháng 09/2026</option>
          </select>

          {/* Nút chính: Chưa mở Chế Độ Quản Lý -> yêu cầu mật khẩu */}
          {!isManagerMode ? (
            <button
              onClick={() => setShowPasswordModal(true)}
              title="Đang ở chế độ Chỉ Xem — bấm để mở Chế Độ Quản Lý"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold border border-[#141414] bg-slate-500 text-white transition-all cursor-pointer hover:bg-slate-600"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CHỈ XEM</span>
            </button>
          ) : (
            <>
              {/* Đã ở Chế Độ Quản Lý: hiện trạng thái khoá sổ THẬT của tháng đang chọn */}
              <button
                onClick={() => toggleLockMonth(selectedMonth)}
                title={isMonthLocked ? 'Nhấp để mở khoá chỉnh sửa tháng này' : 'Nhấp để khoá sổ liệu tháng này (không ai sửa được cho tới khi mở lại)'}
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
                    <span className="hidden sm:inline">QUẢN LÝ (SỬA ĐƯỢC)</span>
                  </>
                )}
              </button>

              <button
                onClick={lockManagerSession}
                title="Thoát Chế Độ Quản Lý, quay về Chỉ Xem"
                className="flex items-center gap-1 p-1.5 border border-[#141414] bg-white text-[#141414] hover:bg-[#E4E3E0] cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
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

          {/* Reset Mock Data - chỉ Quản lý mới thấy được */}
          {isManagerMode && (
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
          )}

        </div>

      </div>

      {showPasswordModal && (
        <ManagerPasswordModal
          onCancel={() => setShowPasswordModal(false)}
          onConfirm={handleConfirmPassword}
        />
      )}
    </header>
  );
};
