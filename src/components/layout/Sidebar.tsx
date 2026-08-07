import React from 'react';
import { 
  Package, ShoppingCart, AlertTriangle, Coffee, FileText, 
  BarChart3, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export type ActiveModule = 'MODULE_01_STORE' | 'MODULE_02_PRPO' | 'MODULE_03_DAMAGE' | 'MODULE_04_MINIBAR' | 'MODULE_05_VPP' | 'MODULE_06_DASHBOARD';

interface SidebarProps {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  isCollapsed,
  setIsCollapsed
}) => {
  const { minibarItems, roomSetups } = useStore();

  // Chỉ còn giữ lại cảnh báo lệch kiểm kê Minibar (module 04)
  const minibarDiscrepancies = minibarItems.filter(item => {
    const setupStock = roomSetups.reduce((acc, room) => acc + (room.itemQuantities[item.code] || 0), 0);
    const bookEnd = item.openingStock + item.incomingQty - item.billedQty - item.focQty - item.transferFOQty - item.transferFBQty;
    const actual = item.warehouseStock + setupStock;
    return bookEnd !== actual;
  }).length;

  const navItems = [
    {
      id: 'MODULE_01_STORE' as ActiveModule,
      num: '01',
      title: 'Kho HK & Vật Tư',
      subtitle: 'Quản lý kho nhập - xuất - tồn vật tư',
      icon: Package,
      showWarning: false,
    },
    {
      id: 'MODULE_02_PRPO' as ActiveModule,
      num: '02',
      title: 'Đề Xuất Mua Hàng PR-PO',
      subtitle: 'Tự động tính toán lượng PR đề xuất',
      icon: ShoppingCart,
      showWarning: false,
    },
    {
      id: 'MODULE_03_DAMAGE' as ActiveModule,
      num: '03',
      title: 'Báo Cáo Hư Hỏng / FOC',
      subtitle: 'Ghi nhận thiệt hại & thu tiền đền bù',
      icon: AlertTriangle,
      showWarning: false,
    },
    {
      id: 'MODULE_04_MINIBAR' as ActiveModule,
      num: '04',
      title: 'Minibar & Setup Phòng',
      subtitle: 'Bill daily, khay setup & báo cáo tổng',
      icon: Coffee,
      showWarning: minibarDiscrepancies > 0,
    },
    {
      id: 'MODULE_05_VPP' as ActiveModule,
      num: '05',
      title: 'Văn Phòng Phẩm (VPP)',
      subtitle: 'Theo dõi chi phí VPP bộ phận HK',
      icon: FileText,
      showWarning: false,
    },
    {
      id: 'MODULE_06_DASHBOARD' as ActiveModule,
      num: '06',
      title: 'Báo Cáo Tháng Tổng Hợp',
      subtitle: 'Dashboard KPI, xem nhanh & xuất Excel',
      icon: BarChart3,
      showWarning: false,
    }
  ];

  return (
    <aside className={`bg-[#F2F1EE] border-r border-[#141414] transition-all duration-300 flex flex-col justify-between shrink-0 ${isCollapsed ? 'w-16' : 'w-72'}`}>
      
      {/* Top Header inside Sidebar */}
      <div>
        <div className="p-3 border-b border-[#141414] flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#10B981]" />
              <span className="text-[11px] font-mono font-bold text-[#141414] uppercase tracking-wider">
                PHÂN HỆ BÁO CÁO
              </span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded bg-white border border-[#141414] text-[#141414] hover:bg-[#E4E3E0] transition-all mx-auto cursor-pointer"
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Module Nav Links */}
        <nav className="p-2 space-y-1.5">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeModule === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-all cursor-pointer text-left group relative border ${
                  isActive
                    ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] font-bold shadow-sm'
                    : 'bg-white text-[#141414] border-[#141414]/30 hover:bg-[#E4E3E0] hover:border-[#141414]'
                }`}
                title={isCollapsed ? `${item.num}. ${item.title}` : undefined}
              >
                <div className={`p-1.5 shrink-0 border ${
                  isActive ? 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0]' : 'bg-[#E4E3E0] text-[#141414] border-[#141414]'
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">
                        <span className="font-mono opacity-80 mr-1">{item.num}.</span>
                        {item.title}
                      </span>
                      {item.showWarning && (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-slate-300 font-normal' : 'text-slate-600'}`}>
                      {item.subtitle}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

    </aside>
  );
};
