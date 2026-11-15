import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useAuth, emailToId } from '../../context/AuthContext';
import {
  Building2, Calendar, Lock, Unlock, RefreshCw, UserCheck, ShieldCheck, Eye, KeyRound, X, LogOut
} from 'lucide-react';
import { getMonthOptions, formatMonthLabel } from '../../utils/monthOptions';
import { useConfirm } from '../common/useConfirm';

// ---------- Modal nhập mật khẩu để mở Chế Độ Quản Lý ----------
export const Navbar: React.FC = () => {
  const { confirm, ConfirmDialog } = useConfirm();
  const {
    selectedMonth, setSelectedMonth,
    userProfile,
    toggleLockMonth, isMonthLocked,
    canEdit,
  } = useStore();

  const { session, signOut } = useAuth();
  return (
    <>
    <header className="bg-[#F2F1EE] border-b border-[#141414] text-[#141414] sticky top-0 z-40 shadow-sm print:hidden">
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
            {getMonthOptions().map((m) => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>

          <>
              {/* Trạng thái khoá sổ THẬT của tháng đang chọn */}
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

          </>
        </div>

        {/* Right Controls: Role Switcher & Export Master Excel */}
        <div className="flex items-center gap-2">
          {/* Role Switcher Dropdown */}
          {/* Họ tên + chức danh của tài khoản đang đăng nhập */}
          <div className="flex items-center gap-2 bg-white border border-[#141414] px-3 py-1.5 text-xs">
            <UserCheck className="w-4 h-4 text-[#141414]" />
            <div className="text-left">
              <div className="font-bold text-[#141414]">{userProfile.name}</div>
              {userProfile.title && <div className="text-[10px] font-mono text-slate-700">{userProfile.title}</div>}
            </div>
          </div>

          {/* Đăng xuất tài khoản (khác nút thoát Chế Độ Quản Lý ở bên trái) */}
          <button
            onClick={async () => { if (await confirm('Bạn muốn thoát khỏi hệ thống?', { title: 'Đăng xuất', okText: 'Đồng ý', danger: false })) signOut(); }}
            className="flex items-center gap-1.5 border border-[#141414] bg-white px-2.5 py-1.5 text-xs font-bold text-[#141414] transition-all hover:bg-[#FF4444] hover:text-white cursor-pointer"
            title={session?.user?.email ? `Đang đăng nhập: ${emailToId(session.user.email)}` : 'Đăng xuất'}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ĐĂNG XUẤT</span>
          </button>

        </div>

      </div>

    </header>
    {ConfirmDialog}
    </>
  );
};
