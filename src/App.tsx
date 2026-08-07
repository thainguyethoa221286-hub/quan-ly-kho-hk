import React, { useState } from 'react';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveModule } from './components/layout/Sidebar';
import StoreModule from './components/modules/StoreModule';
import PRPOModule from './components/modules/PRPOModule';
import LossDamageModule from './components/modules/LossDamageModule';
import MinibarModule from './components/modules/MinibarModule';
import OfficeSuppliesModule from './components/modules/OfficeSuppliesModule';
import DashboardModule from './components/modules/DashboardModule';

export default function App() {
  const [activeModule, setActiveModule] = useState<ActiveModule>('MODULE_01_STORE');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <StoreProvider>
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
    </StoreProvider>
  );
}
