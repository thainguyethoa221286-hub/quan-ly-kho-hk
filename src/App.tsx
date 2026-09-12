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

const MONTH_OPTIONS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];

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
          {MONTH_OPTIONS.map((m) => {
            const [y, mm] = m.split('-');
            return <option key={m} value={m}>Tháng {mm}/{y}</option>;
          })}
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

  if (!hasConfirmedMonth) {
    return <StartupMonthModal />;
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex flex-col font-sans selection:bg-[#141414] selection:text-white">
      
      {/* Top Header Bar */}
      <Navbar />

      {/* Main Body Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Collapsible Navigation Sidebar */}
        <Sidebar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Main Module Content Screen */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#E4E3E0]">
          <div className="max-w-7xl mx-auto">
            
           {activeModule === 'MODULE_01_STORE' && <StoreModule />}
            {activeModule === 'MODULE_02_PRPO' && <PRPOModule />}
            {activeModule === 'MODULE_03_DAMAGE' && <LossDamageModule />}
            {activeModule === 'MODULE_04_MINIBAR' && <MinibarModule />}
            {activeModule === 'MODULE_05_VPP' && <OfficeSuppliesModule />}
            {activeModule === 'MODULE_06_DASHBOARD' && <DashboardModule />}

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
