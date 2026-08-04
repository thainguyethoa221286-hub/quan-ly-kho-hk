export type Role = 'HK_MANAGER' | 'STOREKEEPER' | 'HK_SUPERVISOR' | 'ACCOUNTANT';

export interface UserProfile {
  name: string;
  role: Role;
  title: string;
  department: string;
}

export type ModuleCategory = 'MINIBAR' | 'LINEN' | 'AMENITIES' | 'CHEMICAL' | 'EQUIPMENT' | 'OFFICE' | 'OTHER';

// Module 01: Store Inventory Item
export interface StoreItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: ModuleCategory;
  openingStock: number;       // Tồn đầu
  setupQty: number;           // Định mức setup phòng
  incomingQty: number;        // Nhập trong kỳ
  currentWarehouseStock: number; // Kho thực tế
  transferQty: number;        // Điều chuyển / Chuyển giao
  lossAndDamageQty: number;   // Auto-synced from Module 03 Damage entries
  unitCost: number;           // Đơn giá (VND)
  minParLevel: number;        // Mức an toàn
  notes?: string;
}

// Module 02: PR-PO Order Requisition Item
export interface PRPOItem {
  id: string;
  storeItemId: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  safetyStock: number;
  monthlyUsage: number;
  suggestedPRQty: number;     // PR Quantity = Formula: (Monthly Usage + Safety Stock) - Current Stock
  adjustedPRQty: number;      // Quantity adjusted by HK Manager
  unitCost: number;
  supplierName: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'HK_APPROVED' | 'PO_SUBMITTED' | 'RECEIVED';
  notes?: string;
}

// Module 03: Loss & Damage Item Record
export type DamageCategory = 'IN_ROOM' | 'MINIBAR' | 'LINEN' | 'EQUIPMENT' | 'OTHER';

export interface DamageRecord {
  id: string;
  date: string;               // YYYY-MM-DD
  code: string;
  itemName: string;
  unit: string;
  quantity: number;
  category: DamageCategory;
  location: string;           // e.g., "Room 304", "Laundry", "Floor 5 Pantry"
  reportedBy: string;
  isCharge: boolean;          // true = Charge guest, false = No-Charge (FOC / Hotel expense)
  chargePrice: number;        // Price charged to guest
  unitCost: number;           // Standard unit cost
  costAmount: number;         // Calculated cost (Qty * UnitCost), can be overridden
  isCostOverridden?: boolean; // Flag if overridden via Pencil button
  offerBy: string;            // Text field, e.g. "Ms. Hoa FOC-02", "GĐKS miễn phí"
  notes?: string;
}

// Module 04: Minibar Control & Setup
export interface MinibarItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  openingStock: number;
  incomingQty: number;
  billedQty: number;          // Total sales/billed to guest
  noChangeQty: number;        // Checked - no change
  focQty: number;             // Complimentary/FOC
  transferFOQty: number;      // Welcome drinks at Front Desk
  transferFBQty: number;      // Transferred to F&B bar/restaurant
  warehouseStock: number;     // Stock in HK Minibar Warehouse
  unitCost: number;
  sellingPrice: number;       // Retail price on Minibar menu
}

// Floor Setup Matrix
export interface RoomMinibarSetup {
  roomNumber: string;         // e.g. "101", "PH1"
  floor: string;              // e.g. "F1", "F2", "Penthouse", "F&B"
  roomType: 'STANDARD' | 'DELUXE' | 'SUITE' | 'PENTHOUSE';
  itemQuantities: Record<string, number>; // itemCode -> setupQty in fridge
}

// Daily Minibar Consumption Entry
export interface DailyMinibarBill {
  id: string;
  date: string;               // YYYY-MM-DD
  roomNumber: string;
  floor: string;
  items: {
    itemCode: string;
    itemName: string;
    billedQty: number;
    focQty: number;
    unitPrice: number;
  }[];
  totalAmount: number;
  staffName: string;
  status: 'PENDING' | 'POSTED_FO';
}

// Module 05: Office Supplies (VPP)
export interface VPPItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  openingStock: number;
  incomingQty: number;
  endingStock: number;
  unitCost: number;
  notes?: string;
}

// Module 06: Monthly State Lock
export interface MonthlyReportLock {
  month: string;              // YYYY-MM (e.g. "2026-07")
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  totalMinibarRevenue: number;
  totalDamageCost: number;
  totalPRPOValue: number;
  totalInventoryValuation: number;
  discrepancyCount: number;
}
