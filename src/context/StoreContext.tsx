import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  StoreItem, PRPOItem, DamageRecord, MinibarItem, 
  RoomMinibarSetup, VPPItem, DailyMinibarBill, UserProfile, Role, MonthlyReportLock 
} from '../types';
import { 
  INITIAL_STORE_ITEMS, INITIAL_MINIBAR_ITEMS, 
  INITIAL_ROOM_SETUPS, INITIAL_DAMAGE_RECORDS, 
  INITIAL_VPP_ITEMS, INITIAL_DAILY_BILLS 
} from '../data/mockData';
import { getMonthLockStatus, setMonthLockStatus } from '../services/googleSheetsService';

// ⚠️ MẬT KHẨU CHẾ ĐỘ QUẢN LÝ — đổi trực tiếp chuỗi này nếu muốn đổi mật khẩu.
// Ai gõ đúng mật khẩu này sẽ chuyển App sang chế độ "Quản Lý" (sửa được dữ liệu).
// Mặc định App luôn mở ở chế độ "Chỉ Xem" cho tới khi mở khoá.
const MANAGER_PASSWORD = 'MHOTEL2026';

interface StoreContextType {
  selectedMonth: string; // e.g. "2026-07"
  setSelectedMonth: (month: string) => void;
  
  userProfile: UserProfile;
  setUserRole: (role: Role) => void;

  storeItems: StoreItem[];
  addStoreItem: (item: Omit<StoreItem, 'id' | 'lossAndDamageQty'>) => void;
  updateStoreItem: (id: string, updates: Partial<StoreItem>) => void;
  deleteStoreItem: (id: string) => void;

  prItems: PRPOItem[];
  generatePRPOList: () => void;
  updatePRItem: (id: string, updates: Partial<PRPOItem>) => void;

  damageRecords: DamageRecord[];
  addDamageRecord: (record: Omit<DamageRecord, 'id'>) => void;
  updateDamageRecord: (id: string, updates: Partial<DamageRecord>) => void;
  deleteDamageRecord: (id: string) => void;

  minibarItems: MinibarItem[];
  updateMinibarItem: (id: string, updates: Partial<MinibarItem>) => void;

  roomSetups: RoomMinibarSetup[];
  updateRoomSetup: (roomNumber: string, itemCode: string, qty: number) => void;

  dailyBills: DailyMinibarBill[];
  addDailyBill: (bill: Omit<DailyMinibarBill, 'id'>) => void;

  vppItems: VPPItem[];
  addVPPItem: (item: Omit<VPPItem, 'id'>) => void;
  updateVPPItem: (id: string, updates: Partial<VPPItem>) => void;
  deleteVPPItem: (id: string) => void;

  lockedMonths: Record<string, MonthlyReportLock>;
  toggleLockMonth: (month: string) => void;
  isMonthLocked: boolean;

  // Phân quyền: Chế độ Quản Lý (sửa được) vs Chỉ Xem
  isManagerMode: boolean;
  unlockManager: (password: string) => boolean;
  lockManagerSession: () => void;
  canEdit: boolean; // = isManagerMode && !isMonthLocked (dùng để khoá input ở mọi module)

  resetToDefaults: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Trần Thị Mỹ Hoa',
    role: 'HK_MANAGER',
    title: 'Trưởng Bộ Phận Buồng Phòng (HK Manager)',
    department: 'Housekeeping & Store Dept'
  });

  const [storeItems, setStoreItems] = useState<StoreItem[]>(() => {
    const saved = localStorage.getItem('hk_store_items');
    return saved ? JSON.parse(saved) : INITIAL_STORE_ITEMS;
  });

  const [prItems, setPRItems] = useState<PRPOItem[]>(() => {
    const saved = localStorage.getItem('hk_pr_items');
    if (saved) return JSON.parse(saved);
    // Initial auto calculation
    return INITIAL_STORE_ITEMS.map(item => {
      const current = item.currentWarehouseStock + item.setupQty;
      const monthlyUsage = item.openingStock + item.incomingQty - current;
      const target = item.setupQty + item.minParLevel;
      const suggested = Math.max(0, target - current);
      return {
        id: 'pr-' + item.id,
        storeItemId: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        currentStock: current,
        safetyStock: item.minParLevel,
        monthlyUsage: Math.max(0, monthlyUsage),
        suggestedPRQty: suggested,
        adjustedPRQty: suggested,
        unitCost: item.unitCost,
        supplierName: item.category === 'LINEN' ? 'Cty May Mặc VinaLinen' : 'Cty TNHH Thương Mại Khách Sạn Việt',
        priority: suggested > 50 ? 'HIGH' : 'NORMAL',
        status: 'DRAFT',
        notes: suggested > 0 ? 'Tự động đề xuất theo định mức Par Level' : 'Đủ tồn kho'
      };
    });
  });

  const [damageRecords, setDamageRecords] = useState<DamageRecord[]>(() => {
    const saved = localStorage.getItem('hk_damage_records');
    return saved ? JSON.parse(saved) : INITIAL_DAMAGE_RECORDS;
  });

  const [minibarItems, setMinibarItems] = useState<MinibarItem[]>(() => {
    const saved = localStorage.getItem('hk_minibar_items');
    return saved ? JSON.parse(saved) : INITIAL_MINIBAR_ITEMS;
  });

  const [roomSetups, setRoomSetups] = useState<RoomMinibarSetup[]>(() => {
    const saved = localStorage.getItem('hk_room_setups');
    return saved ? JSON.parse(saved) : INITIAL_ROOM_SETUPS;
  });

  const [dailyBills, setDailyBills] = useState<DailyMinibarBill[]>(() => {
    const saved = localStorage.getItem('hk_daily_bills');
    return saved ? JSON.parse(saved) : INITIAL_DAILY_BILLS;
  });

  const [vppItems, setVPPItems] = useState<VPPItem[]>(() => {
    const saved = localStorage.getItem('hk_vpp_items');
    return saved ? JSON.parse(saved) : INITIAL_VPP_ITEMS;
  });

  const [lockedMonths, setLockedMonths] = useState<Record<string, MonthlyReportLock>>({});

  // ---- Phân quyền: Chế độ Quản Lý (localStorage, tồn tại tới khi tự khoá lại) ----
  const [isManagerMode, setIsManagerMode] = useState<boolean>(() => {
    return localStorage.getItem('hk_manager_mode') === 'true';
  });

  const unlockManager = (password: string): boolean => {
    if (password === MANAGER_PASSWORD) {
      setIsManagerMode(true);
      localStorage.setItem('hk_manager_mode', 'true');
      return true;
    }
    return false;
  };

  const lockManagerSession = () => {
    setIsManagerMode(false);
    localStorage.removeItem('hk_manager_mode');
  };

  // ---- Khoá Sổ Tháng THẬT — lưu trên Google Sheets, áp dụng cho mọi người ----
  const [isMonthLocked, setIsMonthLockedReal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMonthLockStatus(selectedMonth)
      .then((res: { locked: boolean }) => { if (!cancelled) setIsMonthLockedReal(Boolean(res.locked)); })
      .catch(() => { if (!cancelled) setIsMonthLockedReal(false); });
    return () => { cancelled = true; };
  }, [selectedMonth]);

  const toggleLockMonth = async (month: string) => {
    if (!isManagerMode) return; // an toàn: chỉ Quản lý mới được khoá/mở khoá
    try {
      const res: { locked: boolean } = await setMonthLockStatus(month, !isMonthLocked);
      if (month === selectedMonth) setIsMonthLockedReal(Boolean(res.locked));
    } catch (e) {
      console.error('Lỗi khi đổi trạng thái khoá sổ:', e);
    }
  };

  const canEdit = isManagerMode && !isMonthLocked;

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('hk_store_items', JSON.stringify(storeItems));
  }, [storeItems]);

  useEffect(() => {
    localStorage.setItem('hk_pr_items', JSON.stringify(prItems));
  }, [prItems]);

  useEffect(() => {
    localStorage.setItem('hk_damage_records', JSON.stringify(damageRecords));
  }, [damageRecords]);

  useEffect(() => {
    localStorage.setItem('hk_minibar_items', JSON.stringify(minibarItems));
  }, [minibarItems]);

  useEffect(() => {
    localStorage.setItem('hk_room_setups', JSON.stringify(roomSetups));
  }, [roomSetups]);

  useEffect(() => {
    localStorage.setItem('hk_daily_bills', JSON.stringify(dailyBills));
  }, [dailyBills]);

  useEffect(() => {
    localStorage.setItem('hk_vpp_items', JSON.stringify(vppItems));
  }, [vppItems]);

  // AUTO-SYNC: Sync Damage Records with Store Inventory (Module 03 -> Module 01)
  useEffect(() => {
    setStoreItems(prevStoreItems => {
      let changed = false;
      const updated = prevStoreItems.map(item => {
        // Sum total damaged quantity for this item code in damageRecords
        const totalDamaged = damageRecords
          .filter(d => d.code === item.code)
          .reduce((sum, d) => sum + d.quantity, 0);

        if (item.lossAndDamageQty !== totalDamaged) {
          changed = true;
          return { ...item, lossAndDamageQty: totalDamaged };
        }
        return item;
      });
      return changed ? updated : prevStoreItems;
    });
  }, [damageRecords]);

  // AUTO-SYNC: Sync Daily Bills with Minibar Billed & FOC quantities (Module 04A -> Module 04C)
  useEffect(() => {
    setMinibarItems(prevMinibar => {
      let changed = false;
      const updated = prevMinibar.map(item => {
        let totalBilled = 0;
        let totalFOC = 0;

        dailyBills.forEach(bill => {
          bill.items.forEach(bi => {
            if (bi.itemCode === item.code) {
              totalBilled += bi.billedQty;
              totalFOC += bi.focQty;
            }
          });
        });

        // Combine base billed plus bills
        if (item.billedQty !== (item.billedQty || 0)) {
          changed = true;
        }
        return item;
      });
      return changed ? updated : prevMinibar;
    });
  }, [dailyBills]);

  // Handle User Role Change
  const setUserRole = (role: Role) => {
    const titles: Record<Role, { title: string; dept: string }> = {
      HK_MANAGER: { title: 'Trưởng Bộ Phận Buồng Phòng (HK Manager)', dept: 'Management Dept' },
      STOREKEEPER: { title: 'Thủ Kho Vật Tư (Storekeeper)', dept: 'HK Store Warehouse' },
      HK_SUPERVISOR: { title: 'Giám Sát Buồng (HK Supervisor)', dept: 'Floor Operations' },
      ACCOUNTANT: { title: 'Kế Toán Kiểm Soát (Auditor)', dept: 'Finance & Accounting' }
    };

    setUserProfile({
      name: role === 'HK_MANAGER' ? 'Trần Thị Mỹ Hoa' : role === 'STOREKEEPER' ? 'Nguyễn Văn Nam' : role === 'HK_SUPERVISOR' ? 'Phạm Hồng Nhung' : 'Lê Thị Thu Hương',
      role,
      title: titles[role].title,
      department: titles[role].dept
    });
  };

  // Module 01 Actions
  const addStoreItem = (item: Omit<StoreItem, 'id' | 'lossAndDamageQty'>) => {
    const newItem: StoreItem = {
      ...item,
      id: 'st-' + Date.now(),
      lossAndDamageQty: 0
    };
    setStoreItems(prev => [...prev, newItem]);
  };

  const updateStoreItem = (id: string, updates: Partial<StoreItem>) => {
    setStoreItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const deleteStoreItem = (id: string) => {
    setStoreItems(prev => prev.filter(item => item.id !== id));
  };

  // Module 02 Actions
  const generatePRPOList = () => {
    const newList: PRPOItem[] = storeItems.map(item => {
      const current = item.currentWarehouseStock + item.setupQty;
      const monthlyUsage = item.openingStock + item.incomingQty - current;
      const target = item.setupQty + item.minParLevel;
      const suggested = Math.max(0, target - current);

      return {
        id: 'pr-' + item.id,
        storeItemId: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        currentStock: current,
        safetyStock: item.minParLevel,
        monthlyUsage: Math.max(0, monthlyUsage),
        suggestedPRQty: suggested,
        adjustedPRQty: suggested,
        unitCost: item.unitCost,
        supplierName: item.category === 'LINEN' ? 'Cty May Mặc VinaLinen' : 'Cty TNHH Thương Mại Khách Sạn Việt',
        priority: suggested > 100 ? 'URGENT' : suggested > 30 ? 'HIGH' : 'NORMAL',
        status: 'DRAFT',
        notes: suggested > 0 ? 'Tự động tính theo công thức: PR = Usage + Safety Stock - Current Stock' : 'Đã đủ định mức'
      };
    });
    setPRItems(newList);
  };

  const updatePRItem = (id: string, updates: Partial<PRPOItem>) => {
    setPRItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // Module 03 Actions
  const addDamageRecord = (record: Omit<DamageRecord, 'id'>) => {
    const newRecord: DamageRecord = {
      ...record,
      id: 'dmg-' + Date.now()
    };
    setDamageRecords(prev => [newRecord, ...prev]);
  };

  const updateDamageRecord = (id: string, updates: Partial<DamageRecord>) => {
    setDamageRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteDamageRecord = (id: string) => {
    setDamageRecords(prev => prev.filter(r => r.id !== id));
  };

  // Module 04 Actions
  const updateMinibarItem = (id: string, updates: Partial<MinibarItem>) => {
    setMinibarItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const updateRoomSetup = (roomNumber: string, itemCode: string, qty: number) => {
    setRoomSetups(prev => prev.map(room => {
      if (room.roomNumber === roomNumber) {
        return {
          ...room,
          itemQuantities: {
            ...room.itemQuantities,
            [itemCode]: Math.max(0, qty)
          }
        };
      }
      return room;
    }));
  };

  const addDailyBill = (bill: Omit<DailyMinibarBill, 'id'>) => {
    const newBill: DailyMinibarBill = {
      ...bill,
      id: 'bill-' + Date.now()
    };
    setDailyBills(prev => [newBill, ...prev]);

    // Also update Minibar Items billed / FOC quantities directly
    setMinibarItems(prev => prev.map(m => {
      const match = bill.items.find(bi => bi.itemCode === m.code);
      if (match) {
        return {
          ...m,
          billedQty: m.billedQty + match.billedQty,
          focQty: m.focQty + match.focQty
        };
      }
      return m;
    }));
  };

  // Module 05 Actions
  const addVPPItem = (item: Omit<VPPItem, 'id'>) => {
    const newItem: VPPItem = {
      ...item,
      id: 'vpp-' + Date.now()
    };
    setVPPItems(prev => [...prev, newItem]);
  };

  const updateVPPItem = (id: string, updates: Partial<VPPItem>) => {
    setVPPItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const deleteVPPItem = (id: string) => {
    setVPPItems(prev => prev.filter(i => i.id !== id));
  };

  const resetToDefaults = () => {
    localStorage.clear();
    setStoreItems(INITIAL_STORE_ITEMS);
    setMinibarItems(INITIAL_MINIBAR_ITEMS);
    setRoomSetups(INITIAL_ROOM_SETUPS);
    setDamageRecords(INITIAL_DAMAGE_RECORDS);
    setVPPItems(INITIAL_VPP_ITEMS);
    setDailyBills(INITIAL_DAILY_BILLS);
    setLockedMonths({});
  };

  return (
    <StoreContext.Provider value={{
      selectedMonth, setSelectedMonth,
      userProfile, setUserRole,
      storeItems, addStoreItem, updateStoreItem, deleteStoreItem,
      prItems, generatePRPOList, updatePRItem,
      damageRecords, addDamageRecord, updateDamageRecord, deleteDamageRecord,
      minibarItems, updateMinibarItem,
      roomSetups, updateRoomSetup,
      dailyBills, addDailyBill,
      vppItems, addVPPItem, updateVPPItem, deleteVPPItem,
      lockedMonths, toggleLockMonth, isMonthLocked,
      isManagerMode, unlockManager, lockManagerSession, canEdit,
      resetToDefaults
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
