import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, Plus, Download, Printer, Loader2, X, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import {
  getDamageItemsCatalog,
  getDamageData,
  saveDamageItem,
  deleteDamageItem,
} from '../../services/googleSheetsService';

const GROUPS = ['Amenities', 'CCDC', 'Linen', 'Minibar', 'Hút thuốc', 'Khác'];
const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');

// Lấy ngày hôm nay theo GIỜ ĐỊA PHƯƠNG (không dùng toISOString() vì nó quy
// đổi sang UTC, dễ bị lùi lại 1 ngày vào buổi tối/đêm ở múi giờ Việt Nam).
const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Hiển thị ngày lưu dạng "YYYY-MM-DD" thành "DD/MM/YYYY" cho dễ đọc
const fmtDateDisplay = (iso) => {
  if (!iso) return '';
  const parts = String(iso).split('-');
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

// Cho phép gõ số tiền có dấu chấm HOẶC phẩy làm ngăn cách hàng nghìn
// (VD: "10.000" hoặc "10,000" đều hiểu là 10000) — không dùng type="number"
// vì trình duyệt hiểu dấu chấm là số thập phân, gây sai số.
const parseAmount = (str) => {
  if (str === null || str === undefined || str === '') return 0;
  const cleaned = String(str).replace(/[.,\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
};

// ---------- Modal: Ghi Nhận Báo Cáo Hư Hỏng / FOC ----------
function AddDamageModal({ catalog, onCancel, onConfirm }) {
  const [form, setForm] = useState({
    Nhom: '',
    TenHang: '',
    SL: 1,
    Ngay: todayISO(),
    ViTri: '',
    NguoiBaoCao: '',
    HinhThuc: 'CHARGE',
    SoTien: '',
    GhiChu: '',
  });
  const [saving, setSaving] = useState(false);

  const itemsInGroup = useMemo(
    () => catalog.filter((it) => it.Nhom === form.Nhom),
    [catalog, form.Nhom]
  );

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    if (!form.TenHang || !form.SL) return;
    setSaving(true);
    try {
      await onConfirm(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="max-h-[90vh] w-[560px] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Plus className="h-5 w-5" /> Ghi Nhận Báo Cáo Hư Hỏng / FOC
          </h3>
          <button onClick={onCancel}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Chọn Nhóm Vật Tư</label>
            <select
              value={form.Nhom}
              onChange={(e) => setForm((f) => ({ ...f, Nhom: e.target.value, TenHang: '' }))}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none"
            >
              <option value="">-- Chọn nhóm --</option>
              {GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Chọn Item</label>
            <select
              value={form.TenHang}
              onChange={set('TenHang')}
              disabled={!form.Nhom}
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none disabled:bg-slate-100"
            >
              <option value="">{form.Nhom ? '-- Chọn item --' : 'Chọn nhóm trước'}</option>
              {itemsInGroup.map((it) => (
                <option key={it.TenHang} value={it.TenHang}>{it.TenHang}</option>
              ))}
            </select>
            {form.Nhom && itemsInGroup.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600">Nhóm này chưa có Item nào — vào Google Sheet tab "DAMAGE_ITEMS_CATALOG" để gán nhóm cho Item.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Số Lượng Hỏng</label>
            <input type="number" min="1" value={form.SL} onChange={set('SL')} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Ngày</label>
            <input type="date" value={form.Ngay} onChange={set('Ngay')} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Vị Trí / Phòng</label>
            <input
              value={form.ViTri}
              onChange={(e) => setForm((f) => ({ ...f, ViTri: e.target.value.replace(/[^0-9]/g, '') }))}
              placeholder="VD: 402 (chỉ nhập số)"
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Phê Duyệt Bởi</label>
            <input value={form.NguoiBaoCao} onChange={set('NguoiBaoCao')} placeholder="VD: HK Supervisor" className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" />
          </div>
        </div>

        <div className="mt-4 rounded border border-slate-200 p-3">
          <label className="mb-2 block text-xs font-semibold text-slate-600">Hình Thức Xử Lý Chi Phí *</label>
          <div className="mb-3 flex gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" checked={form.HinhThuc === 'CHARGE'} onChange={() => setForm((f) => ({ ...f, HinhThuc: 'CHARGE' }))} />
              <span className="font-semibold text-teal-600">Khách Đền Bù (Thu Tiền)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="radio" checked={form.HinhThuc === 'FOC'} onChange={() => setForm((f) => ({ ...f, HinhThuc: 'FOC' }))} />
              <span className="font-semibold text-red-500">Khách Sạn Chịu (FOC)</span>
            </label>
          </div>
          <label className="mb-1 block text-xs text-slate-500">
            {form.HinhThuc === 'CHARGE' ? 'Số Tiền Thu Khách (VNĐ)' : 'Số Tiền KS Chịu FOC (VNĐ)'}
          </label>
          <input
            value={form.SoTien}
            onChange={set('SoTien')}
            onBlur={() => setForm((f) => ({ ...f, SoTien: f.SoTien ? fmtNumber(parseAmount(f.SoTien)) : '' }))}
            placeholder="VD: 10.000 hoặc 10000"
            inputMode="numeric"
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none"
          />
          {form.SoTien !== '' && (
            <p className="mt-1 text-[11px] text-slate-400">
              Số tiền sẽ ghi nhận: <strong className="text-slate-600">{fmtNumber(parseAmount(form.SoTien))} đ</strong>
            </p>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Ghi Chú</label>
          <textarea
            value={form.GhiChu}
            onChange={set('GhiChu')}
            rows={2}
            placeholder="Nguyên nhân hư hỏng, thông tin phát sinh..."
            className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
          <button onClick={onCancel} className="rounded border border-[#141414] px-4 py-2 text-sm">Huỷ</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.TenHang || !form.SL}
            className="flex items-center gap-1.5 rounded bg-[#141414] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Lưu Thông Tin
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LossDamageModule() {
  const { selectedMonth } = useStore();
  const thang = selectedMonth;

  const [items, setItems] = useState([]);
  const [editingCell, setEditingCell] = useState(null); // "rowIndex-field" đang được focus
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingRows, setSavingRows] = useState({});

  const loadData = useCallback(async (month) => {
    setLoading(true);
    setError(null);
    try {
      const [damageData, catalogData] = await Promise.all([
        getDamageData(month),
        getDamageItemsCatalog(month),
      ]);
      setItems(damageData);
      setCatalog(catalogData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(thang);
  }, [thang, loadData]);

  const totals = useMemo(() => {
    const sumCharge = items.reduce((acc, it) => acc + (Number(it.ThuKhach) || 0), 0);
    const sumFOC = items.reduce((acc, it) => acc + (Number(it.FOCCost) || 0), 0);
    return { sumCharge, sumFOC };
  }, [items]);

  const handleAdd = async (form) => {
    try {
      const itemMeta = catalog.find((c) => c.TenHang === form.TenHang);
      const newItem = {
        Stt: items.length + 1,
        Ngay: form.Ngay,
        TenHang: form.TenHang,
        Nhom: itemMeta ? itemMeta.Nhom : form.Nhom,
        ViTri: form.ViTri,
        SL: Number(form.SL) || 0,
        HinhThuc: form.HinhThuc,
        ThuKhach: form.HinhThuc === 'CHARGE' ? parseAmount(form.SoTien) : 0,
        FOCCost: form.HinhThuc === 'FOC' ? parseAmount(form.SoTien) : 0,
        NguoiBaoCao: form.NguoiBaoCao,
        GhiChu: form.GhiChu,
      };
      await saveDamageItem(thang, newItem);
      setShowAddModal(false);
      await loadData(thang);
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    }
  };

  const handleFieldChange = (rowIndex, field, value) => {
    setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, [field]: value } : it)));
  };

  const persistRow = async (rowIndex) => {
    const item = items.find((it) => it.rowIndex === rowIndex);
    if (!item) return;
    setSavingRows((s) => ({ ...s, [rowIndex]: true }));
    try {
      await saveDamageItem(thang, item);
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSavingRows((s) => {
        const copy = { ...s };
        delete copy[rowIndex];
        return copy;
      });
    }
  };

  const handleDelete = async (rowIndex) => {
    if (!window.confirm('Xoá dòng báo cáo này? Nếu đã đồng bộ sang Module 01, số lượng hư hỏng sẽ được trừ ngược lại.')) return;
    try {
      await deleteDamageItem(thang, rowIndex);
      setItems((prev) => prev.filter((it) => it.rowIndex !== rowIndex));
    } catch (err) {
      setError('Lỗi khi xoá: ' + err.message);
    }
  };

  // ---- Excel export: Damage & Breakage, banner vàng theo nhóm ----
  const handleExportExcel = () => {
    const [y, m] = thang.split('-').map(Number);
    const monthLabels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const grey = 'D9D9D9';
    const yellow = 'FFD966';
    const black = '141414';
    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } },
    };
    const headers = ['STT', 'NGÀY', 'ITEMS', 'QUANTITY', 'CHARGE', 'NO CHARGE', 'OFFER BY', 'NOTE'];

    const aoa = [];
    aoa.push([`Damage & Breakage   ${monthLabels[m - 1]}-${y}`]);
    aoa.push([]);
    aoa.push(headers);
    const bannerRows = [];
    const dataRowRange = [];

    GROUPS.forEach((group) => {
      const groupItems = items.filter((it) => (it.Nhom || 'Khác') === group);
      if (groupItems.length === 0) return;
      bannerRows.push(aoa.length);
      aoa.push([group.toUpperCase()]);
      const startRow = aoa.length;
      groupItems.forEach((it, idx) => {
        aoa.push([idx + 1, fmtDateDisplay(it.Ngay), it.TenHang, it.SL, it.ThuKhach || '', it.FOCCost || '', it.NguoiBaoCao, it.GhiChu]);
      });
      dataRowRange.push([startRow, aoa.length - 1]);
    });

    const totalRowIdx = aoa.length;
    aoa.push(['', '', 'TỔNG CỘNG', '', totals.sumCharge, totals.sumFOC, '', '']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = headers.length - 1;
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
    bannerRows.forEach((r) => merges.push({ s: { r, c: 0 }, e: { r, c: lastCol } }));
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 5 }, { wch: 11 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 26 }];

    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };

    setStyle(0, 0, { font: { bold: true, sz: 13, name: 'Times New Roman' }, alignment: { horizontal: 'left' } });
    for (let c = 0; c < headers.length; c++) {
      setStyle(2, c, {
        font: { bold: true, sz: 10, color: { rgb: black }, name: 'Times New Roman' },
        fill: { fgColor: { rgb: grey } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: thinBorder,
      });
    }
    bannerRows.forEach((r) => {
      setStyle(r, 0, {
        font: { bold: true, sz: 11, name: 'Times New Roman' },
        fill: { fgColor: { rgb: yellow } },
        alignment: { horizontal: 'left', vertical: 'center' },
      });
    });
    dataRowRange.forEach(([start, end]) => {
      for (let r = start; r <= end; r++) {
        for (let c = 0; c < headers.length; c++) {
          const isNum = [3, 4, 5].includes(c);
          setStyle(r, c, {
            font: { sz: 10, name: 'Times New Roman' },
            alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
            border: thinBorder,
            ...(c === 4 || c === 5 ? { numFmt: '#,##0' } : {}),
          });
        }
      }
    });
    for (let c = 0; c < headers.length; c++) {
      setStyle(totalRowIdx, c, {
        font: { bold: true, sz: 10, name: 'Times New Roman' },
        fill: { fgColor: { rgb: 'F2F2F2' } },
        border: thinBorder,
        ...(c === 4 || c === 5 ? { numFmt: '#,##0' } : {}),
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `HuHong_${thang}`);
    XLSX.writeFile(wb, `Damage_Breakage_${thang}.xlsx`);
  };

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
        }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; appearance: textfield; }
      `}</style>

      {/* ---- Header ---- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#141414]">BÁO CÁO HƯ HỎNG / FOC</h1>
            <p className="text-xs text-slate-500">Quản lý đồ hư hỏng: đền bù (charge) và miễn phí khách sạn chịu (FOC). Tự động đồng bộ số dư vào Kho Module 01.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" /> Ghi Nhận Báo Cáo
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]"
          >
            <Download className="h-3.5 w-3.5" /> Xuất Báo Cáo Loss & Damage
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]"
          >
            <Printer className="h-3.5 w-3.5" /> In A4
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ---- Stat cards ---- */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
        <div className="rounded border border-[#141414] bg-white p-4">
          <p className="text-xs font-mono uppercase text-slate-500">Khách Đền Bù (Charge)</p>
          <p className="mt-1 text-2xl font-bold text-teal-600">{fmtNumber(totals.sumCharge)} đ</p>
          <p className="text-[11px] text-slate-400">Lễ Tân thu tiền qua Folio phòng</p>
        </div>
        <div className="rounded border border-[#141414] bg-white p-4">
          <p className="text-xs font-mono uppercase text-slate-500">Chi Phí Thiệt Hại FOC</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{fmtNumber(totals.sumFOC)} đ</p>
          <p className="text-[11px] text-slate-400">Cần có chữ ký phê duyệt FOC</p>
        </div>
      </div>

      {/* ---- Table ---- */}
      <div className="max-h-[calc(100vh-340px)] overflow-y-auto overflow-x-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#F2F1EE] font-mono uppercase text-[10px] text-[#141414]">
            <tr>
              {['STT', 'NGÀY', 'ITEM', 'VỊ TRÍ/PHÒNG', 'SL', 'HÌNH THỨC CHI PHÍ', 'THU KHÁCH (CHARGE)', 'CHI PHÍ THIỆT HẠI FOC', 'PHÊ DUYỆT BỞI', 'GHI CHÚ', 'THAO TÁC'].map((h, i) => (
                <th key={h + i} className={`sticky top-0 z-20 border border-[#141414]/30 bg-[#F2F1EE] px-2 py-2 text-left shadow-[0_1px_0_0_#141414] ${i === 2 ? 'min-w-[220px]' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /> Đang tải dữ liệu...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={11} className="py-8 text-center text-slate-400">Chưa có báo cáo hư hỏng nào trong tháng này.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.rowIndex} className={savingRows[it.rowIndex] ? 'opacity-50' : ''}>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.Stt}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 whitespace-nowrap">{fmtDateDisplay(it.Ngay)}</td>
                  <td className="min-w-[220px] border border-[#141414]/30 px-2 py-1 font-medium">{it.TenHang}</td>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.ViTri}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right">{it.SL}</td>
                  <td className="border border-[#141414]/30 px-2 py-1">
                    <span className={`whitespace-nowrap rounded px-2 py-1 text-[10px] font-bold text-white ${it.HinhThuc === 'CHARGE' ? 'bg-teal-500' : 'bg-red-400'}`}>
                      {it.HinhThuc === 'CHARGE' ? 'KHÁCH ĐỀN BÙ' : 'KHÁCH SẠN (FOC)'}
                    </span>
                  </td>
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      value={editingCell === `${it.rowIndex}-ThuKhach` ? (it.ThuKhach ?? '') : (it.ThuKhach ? fmtNumber(it.ThuKhach) : '')}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'ThuKhach', e.target.value)}
                      onFocus={() => setEditingCell(`${it.rowIndex}-ThuKhach`)}
                      onBlur={() => {
                        handleFieldChange(it.rowIndex, 'ThuKhach', parseAmount(it.ThuKhach));
                        setEditingCell(null);
                        persistRow(it.rowIndex);
                      }}
                      inputMode="numeric"
                      placeholder="0"
                      className="w-24 bg-transparent px-2 py-1 text-right text-teal-600 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      value={editingCell === `${it.rowIndex}-FOCCost` ? (it.FOCCost ?? '') : (it.FOCCost ? fmtNumber(it.FOCCost) : '')}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'FOCCost', e.target.value)}
                      onFocus={() => setEditingCell(`${it.rowIndex}-FOCCost`)}
                      onBlur={() => {
                        handleFieldChange(it.rowIndex, 'FOCCost', parseAmount(it.FOCCost));
                        setEditingCell(null);
                        persistRow(it.rowIndex);
                      }}
                      inputMode="numeric"
                      placeholder="0"
                      className="w-24 bg-transparent px-2 py-1 text-right text-red-500 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      value={it.NguoiBaoCao || ''}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'NguoiBaoCao', e.target.value)}
                      onBlur={() => persistRow(it.rowIndex)}
                      className="w-28 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      value={it.GhiChu || ''}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'GhiChu', e.target.value)}
                      onBlur={() => persistRow(it.rowIndex)}
                      className="w-40 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="border border-[#141414]/30 px-1 py-1 text-center print:hidden">
                    <button onClick={() => handleDelete(it.rowIndex)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <AddDamageModal
          catalog={catalog}
          onCancel={() => setShowAddModal(false)}
          onConfirm={handleAdd}
        />
      )}
    </div>
  );
}
