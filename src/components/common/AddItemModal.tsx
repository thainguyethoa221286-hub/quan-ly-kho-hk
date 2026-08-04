import React, { useState } from 'react';
import { X, Plus, Save } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ModuleCategory } from '../../types';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'STORE' | 'DAMAGE' | 'VPP';
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, type }) => {
  const { addStoreItem, addDamageRecord, addVPPItem, storeItems } = useStore();

  // Store Item State
  const [storeForm, setStoreForm] = useState({
    code: '',
    name: '',
    unit: 'Cái',
    category: 'LINEN' as ModuleCategory,
    openingStock: 0,
    setupQty: 0,
    incomingQty: 0,
    currentWarehouseStock: 0,
    transferQty: 0,
    unitCost: 0,
    minParLevel: 50,
    notes: ''
  });

  // Damage Record State
  const [damageForm, setDamageForm] = useState({
    date: new Date().toISOString().split('T')[0],
    code: storeItems[0]?.code || 'HK-LN-001',
    itemName: storeItems[0]?.name || 'Vỏ chăn King Size',
    unit: 'Cái',
    quantity: 1,
    category: 'LINEN' as any,
    location: 'Phòng 101',
    reportedBy: 'HK Supervisor',
    isCharge: true,
    chargePrice: 100000,
    unitCost: 100000,
    costAmount: 100000,
    offerBy: 'Lễ Tân Folio',
    notes: ''
  });

  // VPP Form State
  const [vppForm, setVppForm] = useState({
    code: '',
    name: '',
    unit: 'Cái',
    openingStock: 0,
    incomingQty: 0,
    endingStock: 0,
    unitCost: 0,
    notes: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'STORE') {
      if (!storeForm.code || !storeForm.name) {
        alert('Vui lòng nhập Mã và Tên vật tư');
        return;
      }
      addStoreItem(storeForm);
    } else if (type === 'DAMAGE') {
      addDamageRecord(damageForm);
    } else if (type === 'VPP') {
      if (!vppForm.code || !vppForm.name) {
        alert('Vui lòng nhập Mã và Tên VPP');
        return;
      }
      addVPPItem(vppForm);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/70 p-4 overflow-y-auto">
      <div className="bg-[#F2F1EE] border border-[#141414] w-full max-w-xl p-6 text-[#141414] shadow-2xl">
        
        <div className="flex items-center justify-between pb-4 border-b border-[#141414]">
          <h2 className="text-base font-mono font-bold text-[#141414] uppercase flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#141414]" />
            {type === 'STORE' ? 'Thêm Vật Tư Kho Buồng Phong Mới' : type === 'DAMAGE' ? 'Ghi Nhận Báo Cáo Hư Hỏng / FOC' : 'Thêm Văn Phòng Phẩm Mới'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-[#141414] hover:bg-[#E4E3E0] border border-[#141414] transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* TYPE: STORE ITEM */}
          {type === 'STORE' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Mã Vật Tư *</label>
                  <input
                    type="text"
                    value={storeForm.code}
                    onChange={e => setStoreForm({ ...storeForm, code: e.target.value })}
                    placeholder="VD: HK-LN-010"
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-[#141414]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Đơn Vị Tính (ĐVT)</label>
                  <input
                    type="text"
                    value={storeForm.unit}
                    onChange={e => setStoreForm({ ...storeForm, unit: e.target.value })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Tên Vật Tư *</label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                  placeholder="VD: Khăn lau tay Cotton"
                  className="w-full bg-white border border-[#141414] px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Phân Loại Phân Hệ</label>
                  <select
                    value={storeForm.category}
                    onChange={e => setStoreForm({ ...storeForm, category: e.target.value as ModuleCategory })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-medium"
                  >
                    <option value="LINEN">Linen & Khăn</option>
                    <option value="AMENITIES">Guest Amenities</option>
                    <option value="CHEMICAL">Hóa Chất Tẩy Rửa</option>
                    <option value="EQUIPMENT">Dụng Cụ Làm Phòng</option>
                    <option value="OTHER">Vật Tư Khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Đơn Giá Gốc (VNĐ)</label>
                  <input
                    type="number"
                    value={storeForm.unitCost}
                    onChange={e => setStoreForm({ ...storeForm, unitCost: Number(e.target.value) })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Tồn Đầu Kỳ</label>
                  <input
                    type="number"
                    value={storeForm.openingStock}
                    onChange={e => setStoreForm({ ...storeForm, openingStock: Number(e.target.value) })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Định Mức Setup</label>
                  <input
                    type="number"
                    value={storeForm.setupQty}
                    onChange={e => setStoreForm({ ...storeForm, setupQty: Number(e.target.value) })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Kho Thực Tế</label>
                  <input
                    type="number"
                    value={storeForm.currentWarehouseStock}
                    onChange={e => setStoreForm({ ...storeForm, currentWarehouseStock: Number(e.target.value) })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono font-bold text-[#10B981]"
                  />
                </div>
              </div>
            </>
          )}

          {/* TYPE: DAMAGE RECORD */}
          {type === 'DAMAGE' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Chọn Vật Tư Bị Hỏng</label>
                  <select
                    value={damageForm.code}
                    onChange={e => {
                      const selected = storeItems.find(i => i.code === e.target.value);
                      if (selected) {
                        setDamageForm({
                          ...damageForm,
                          code: selected.code,
                          itemName: selected.name,
                          unit: selected.unit,
                          unitCost: selected.unitCost,
                          costAmount: selected.unitCost * damageForm.quantity
                        });
                      }
                    }}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono"
                  >
                    {storeItems.map(item => (
                      <option key={item.id} value={item.code}>
                        [{item.code}] {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Số Lượng Hỏng</label>
                  <input
                    type="number"
                    min="1"
                    value={damageForm.quantity}
                    onChange={e => {
                      const qty = Math.max(1, Number(e.target.value));
                      setDamageForm({
                        ...damageForm,
                        quantity: qty,
                        costAmount: damageForm.unitCost * qty
                      });
                    }}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Vị Trí / Phòng</label>
                  <input
                    type="text"
                    value={damageForm.location}
                    onChange={e => setDamageForm({ ...damageForm, location: e.target.value })}
                    placeholder="VD: Phòng 402, Nhà giặt"
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Người Phát Hiện</label>
                  <input
                    type="text"
                    value={damageForm.reportedBy}
                    onChange={e => setDamageForm({ ...damageForm, reportedBy: e.target.value })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Charge vs FOC Radio */}
              <div className="p-3 bg-[#E4E3E0] border border-[#141414] space-y-2">
                <label className="block text-xs font-mono font-bold text-[#141414] uppercase">Hình Thức Xử Lý Chi Phí *</label>
                <div className="flex items-center gap-6 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#10B981]">
                    <input
                      type="radio"
                      name="chargeType"
                      checked={damageForm.isCharge}
                      onChange={() => setDamageForm({ ...damageForm, isCharge: true })}
                      className="accent-[#141414]"
                    />
                    <span>Khách Đền Bù (Thu Tiền)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#FF4444]">
                    <input
                      type="radio"
                      name="chargeType"
                      checked={!damageForm.isCharge}
                      onChange={() => setDamageForm({ ...damageForm, isCharge: false })}
                      className="accent-[#141414]"
                    />
                    <span>Khách Sạn Chịu (FOC)</span>
                  </label>
                </div>

                {damageForm.isCharge ? (
                  <div>
                    <label className="block text-[11px] font-mono text-[#141414] mb-1">Số Tiền Thu Khách (VNĐ)</label>
                    <input
                      type="number"
                      value={damageForm.chargePrice}
                      onChange={e => setDamageForm({ ...damageForm, chargePrice: Number(e.target.value) })}
                      className="w-full bg-white border border-[#141414] px-3 py-1.5 text-xs font-mono font-bold text-[#10B981]"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#141414] mb-1">Chi Phí Tự Tính (VNĐ)</label>
                      <input
                        type="number"
                        value={damageForm.costAmount}
                        onChange={e => setDamageForm({ ...damageForm, costAmount: Number(e.target.value), isCostOverridden: true })}
                        className="w-full bg-white border border-[#141414] px-3 py-1.5 text-xs font-mono font-bold text-[#FF4444]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#141414] mb-1">Offer By / Người Duyệt FOC</label>
                      <input
                        type="text"
                        value={damageForm.offerBy}
                        onChange={e => setDamageForm({ ...damageForm, offerBy: e.target.value })}
                        placeholder="VD: Ms. Hoa FOC-02"
                        className="w-full bg-white border border-[#141414] px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TYPE: VPP */}
          {type === 'VPP' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Mã VPP *</label>
                  <input
                    type="text"
                    value={vppForm.code}
                    onChange={e => setVppForm({ ...vppForm, code: e.target.value })}
                    placeholder="VD: VPP-006"
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">ĐVT</label>
                  <input
                    type="text"
                    value={vppForm.unit}
                    onChange={e => setVppForm({ ...vppForm, unit: e.target.value })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Tên Văn Phòng Phẩm *</label>
                <input
                  type="text"
                  value={vppForm.name}
                  onChange={e => setVppForm({ ...vppForm, name: e.target.value })}
                  placeholder="VD: Sổ ghi chép HK Logbook"
                  className="w-full bg-white border border-[#141414] px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Tồn Đầu</label>
                  <input
                    type="number"
                    value={vppForm.openingStock}
                    onChange={e => setVppForm({ ...vppForm, openingStock: Number(e.target.value) })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Nhập Trong Kỳ</label>
                  <input
                    type="number"
                    value={vppForm.incomingQty}
                    onChange={e => setVppForm({ ...vppForm, incomingQty: Number(e.target.value) })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Tồn Cuối Kỳ</label>
                  <input
                    type="number"
                    value={vppForm.endingStock}
                    onChange={e => setVppForm({ ...vppForm, endingStock: Number(e.target.value) })}
                    className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-[#141414] mb-1">Đơn Giá (VNĐ)</label>
                <input
                  type="number"
                  value={vppForm.unitCost}
                  onChange={e => setVppForm({ ...vppForm, unitCost: Number(e.target.value) })}
                  className="w-full bg-white border border-[#141414] px-3 py-2 text-xs font-mono font-bold"
                />
              </div>
            </>
          )}

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#141414]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#E4E3E0] border border-[#141414] text-xs font-mono font-bold text-[#141414] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-[#141414] hover:bg-slate-800 text-white text-xs font-mono font-bold border border-[#141414] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thông Tin</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
