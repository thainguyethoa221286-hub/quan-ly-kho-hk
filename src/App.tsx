import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveModule } from './components/layout/Sidebar';
import StoreModule from './components/modules/StoreModule';
import PRPOModule from './components/modules/PRPOModule';
import LossDamageModule from './components/modules/LossDamageModule';
import MinibarModule from './components/modules/MinibarModule';
import OfficeSuppliesModule from './components/modules/OfficeSuppliesModule';
import DashboardModule from './components/modules/DashboardModule';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { getMonthOptions, formatMonthLabel } from './utils/monthOptions';

const MONTH_OPTIONS = getMonthOptions();

// ---------- Màn hình bắt buộc chọn tháng khi mở App ----------
function StartupMonthModal() {
  const { selectedMonth, setSelectedMonth, confirmMonth } = useStore();
  const [draft, setDraft] = useState(selectedMonth);

  const handleConfirm = () => {
    setSelectedMonth(draft);
    confirmMonth();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#141414]/80 p-4">
      <div className="w-96 rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-white">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#141414]">Chọn Tháng Làm Việc</h2>
            <p className="text-xs text-slate-500">Xác nhận đúng tháng trước khi bắt đầu, tránh nhầm dữ liệu</p>
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold text-slate-600">Kỳ Báo Cáo</label>
        <select
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mb-5 w-full rounded border border-[#141414] bg-white px-3 py-2.5 text-sm font-bold focus:outline-none"
        >
          {MONTH_OPTIONS.map((m) => (
            <option key={m} value={m}>{formatMonthLabel(m)}</option>
          ))}
        </select>

        <button
          onClick={handleConfirm}
          className="flex w-full items-center justify-center gap-2 rounded bg-[#141414] py-2.5 text-sm font-bold text-white hover:bg-slate-800"
        >
          <CheckCircle2 className="h-4 w-4" /> Xác Nhận & Vào Làm Việc
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const { hasConfirmedMonth } = useStore();
  const [activeModule, setActiveModule] = useState<ActiveModule>('MODULE_01_STORE');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Phân hệ nào đã từng mở thì giữ nguyên trong bộ nhớ (không unmount khi
  // chuyển sang phân hệ khác) — bấm qua lại giữa các mục ở Sidebar (Kho,
  // PR-PO, Hư Hỏng, Minibar, VPP, Báo Cáo Tổng Hợp) sẽ tức thời từ lần thứ 2
  // trở đi, không phải đọc lại dữ liệu từ Google Sheets mỗi lần bấm.
  const [visitedModules, setVisitedModules] = useState<Record<string, boolean>>({ MODULE_01_STORE: true });
  const goToModule = (m: ActiveModule) => {
    setActiveModule(m);
    setVisitedModules((prev) => (prev[m] ? prev : { ...prev, [m]: true }));
  };

  if (!hasConfirmedMonth) {
    return <StartupMonthModal />;
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans selection:bg-[#141414] selection:text-white print:block print:min-h-0 print:bg-white">
      
      {/* Top Header Bar */}
      <Navbar />

      {/* Main Body Workspace */}
      <div className="flex-1 flex overflow-hidden print:block print:overflow-visible">

        {/* Left Collapsible Navigation Sidebar */}
        <Sidebar
          activeModule={activeModule}
          setActiveModule={goToModule}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Main Module Content Screen */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#E4E3E0] print:overflow-visible print:h-auto print:p-0 print:bg-white">
          <div className="max-w-7xl mx-auto print:max-w-none">

            {visitedModules.MODULE_01_STORE && (
              <div className={activeModule === 'MODULE_01_STORE' ? '' : 'hidden'}><StoreModule /></div>
            )}
            {visitedModules.MODULE_02_PRPO && (
              <div className={activeModule === 'MODULE_02_PRPO' ? '' : 'hidden'}><PRPOModule /></div>
            )}
            {visitedModules.MODULE_03_DAMAGE && (
              <div className={activeModule === 'MODULE_03_DAMAGE' ? '' : 'hidden'}><LossDamageModule /></div>
            )}
            {visitedModules.MODULE_04_MINIBAR && (
              <div className={activeModule === 'MODULE_04_MINIBAR' ? '' : 'hidden'}><MinibarModule /></div>
            )}
            {visitedModules.MODULE_05_VPP && (
              <div className={activeModule === 'MODULE_05_VPP' ? '' : 'hidden'}><OfficeSuppliesModule /></div>
            )}
            {visitedModules.MODULE_06_DASHBOARD && (
              <div className={activeModule === 'MODULE_06_DASHBOARD' ? '' : 'hidden'}><DashboardModule /></div>
            )}

          </div>
        </main>

      </div>

    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
