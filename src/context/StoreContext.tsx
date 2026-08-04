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

  const [lockedMonths, setLockedMonths] = useState<Record<string, MonthlyReportLock>>(() => {
    const saved = localStorage.getItem('hk_locked_months');
    return saved ? JSON.parse(saved) : {
      '2026-06': {
        month: '2026-06',
        isLocked: true,
        lockedAt: '2026-07-01 08:30',
        lockedBy: 'Trần Thị Mỹ Hoa (HK Manager)',
        totalMinibarRevenue: 42500000,
        totalDamageCost: 3100000,
        totalPRPOValue: 98000000,
        totalInventoryValuation: 312000000,
        discrepancyCount: 0
      }
    };
  });

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

  useEffect(() => {
    localStorage.setItem('hk_locked_months', JSON.stringify(lockedMonths));
  }, [lockedMonths]);

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

  // Module 06 Lock Month & Rollover Logic
  const toggleLockMonth = (month: string) => {
    setLockedMonths(prev => {
      const existing = prev[month];
      if (existing && existing.isLocked) {
        // Unlock
        return {
          ...prev,
          [month]: { ...existing, isLocked: false }
        };
      } else {
        // Lock month and auto-rollover Ending Stock into Opening Stock for Next Month
        const isNowLocked = true;

        // Rollover Store items
        setStoreItems(prevStore => prevStore.map(item => {
          const ending = item.currentWarehouseStock + item.setupQty;
          return {
            ...item,
            openingStock: ending,
            incomingQty: 0,
            transferQty: 0,
            lossAndDamageQty: 0
          };
        }));

        // Rollover Minibar items
        setMinibarItems(prevMB => prevMB.map(item => {
          const setupStock = roomSetups.reduce((acc, room) => acc + (room.itemQuantities[item.code] || 0), 0);
          const actualStock = item.warehouseStock + setupStock;
          return {
            ...item,
            openingStock: actualStock,
            incomingQty: 0,
            billedQty: 0,
            noChangeQty: 0,
            focQty: 0,
            transferFOQty: 0,
            transferFBQty: 0
          };
        }));

        // Rollover VPP
        setVPPItems(prevVPP => prevVPP.map(item => ({
          ...item,
          openingStock: item.endingStock,
          incomingQty: 0
        })));

        return {
          ...prev,
          [month]: {
            month,
            isLocked: isNowLocked,
            lockedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            lockedBy: userProfile.name + ' (' + userProfile.title + ')',
            totalMinibarRevenue: minibarItems.reduce((acc, i) => acc + (i.billedQty * i.sellingPrice), 0),
            totalDamageCost: damageRecords.reduce((acc, i) => acc + (!i.isCharge ? i.costAmount : 0), 0),
            totalPRPOValue: prItems.reduce((acc, i) => acc + (i.adjustedPRQty * i.unitCost), 0),
            totalInventoryValuation: storeItems.reduce((acc, i) => acc + ((i.currentWarehouseStock + i.setupQty) * i.unitCost), 0),
            discrepancyCount: 0
          }
        };
      }
    });
  };

  const isMonthLocked = Boolean(lockedMonths[selectedMonth]?.isLocked);

  const resetToDefaults = () => {
    localStorage.clear();
    setStoreItems(INITIAL_STORE_ITEMS);
    setMinibarItems(INITIAL_MINIBAR_ITEMS);
    setRoomSetups(INITIAL_ROOM_SETUPS);
    setDamageRecords(INITIAL_DAMAGE_RECORDS);
    setVPPItems(INITIAL_VPP_ITEMS);
    setDailyBills(INITIAL_DAILY_BILLS);
    setLockedMonths({
      '2026-06': {
        month: '2026-06',
        isLocked: true,
        lockedAt: '2026-07-01 08:30',
        lockedBy: 'Trần Thị Mỹ Hoa (HK Manager)',
        totalMinibarRevenue: 42500000,
        totalDamageCost: 3100000,
        totalPRPOValue: 98000000,
        totalInventoryValuation: 312000000,
        discrepancyCount: 0
      }
    });
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
