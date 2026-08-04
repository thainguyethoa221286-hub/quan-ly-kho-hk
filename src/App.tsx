import React, { useState } from 'react';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveModule } from './components/layout/Sidebar';
import { Module01Store } from './components/modules/Module01Store';
import { Module02PRPO } from './components/modules/Module02PRPO';
import { Module03LossDamage } from './components/modules/Module03LossDamage';
import { Module04Minibar } from './components/modules/Module04Minibar';
import { Module05OfficeSupplies } from './components/modules/Module05OfficeSupplies';
import { Module06Dashboard } from './components/modules/Module06Dashboard';

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
              
              {activeModule === 'MODULE_01_STORE' && <Module01Store />}
              {activeModule === 'MODULE_02_PRPO' && <Module02PRPO />}
              {activeModule === 'MODULE_03_DAMAGE' && <Module03LossDamage />}
              {activeModule === 'MODULE_04_MINIBAR' && <Module04Minibar />}
              {activeModule === 'MODULE_05_VPP' && <Module05OfficeSupplies />}
              {activeModule === 'MODULE_06_DASHBOARD' && <Module06Dashboard />}

            </div>
          </main>

        </div>

      </div>
    </StoreProvider>
  );
}
