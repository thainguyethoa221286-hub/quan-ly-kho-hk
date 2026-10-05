import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Coffee, Download, Printer, Loader2, X, AlertTriangle, Plus, Minus, RefreshCw,
  Layers, Receipt, ChevronDown, Edit2, Trash2, FileUp, Search, Rocket, Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import { parsePMSPdfFile, normalizeMinibarItemName } from '../../services/pmsPdfParser';
// ⚠️ BẢN THỬ NGHIỆM (nhánh supabase-pilot): đọc/ghi qua Supabase.
import {
  getMinibarCatalog, saveMinibarCatalogItem,
  getMinibarSetup, saveMinibarSetupItem,
  getMinibarFBFO, saveMinibarFBFOItem,
  getMinibarBills, saveMinibarBill, deleteMinibarBill,
  getMinibarNoPostBills, saveMinibarNoPostBill, deleteMinibarNoPostBill,
  getMinibarSummary, saveMinibarSummaryItem,
} from '../../services/supabaseMinibarService';

const FLOORS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'];
// Thuế VAT áp cho Tổng Tiền hiển thị trên mỗi Bill ở Lịch Sử Daily Bills (+8%).
const VAT_RATE = 0.08;
const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');
const parseAmount = (str) => {
  if (str === null || str === undefined || str === '') return 0;
  const cleaned = String(str).replace(/[.,\s]/g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmtDateDisplay = (iso) => {
  if (!iso) return '';
  const p = String(iso).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
};
const nextMonthStr = (thang) => {
  const [y, m] = thang.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const hideSpinnerCSS = `
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; appearance: textfield; }
`;
const gridKeyNav = (e, field) => {
  if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const inputs = Array.from(document.querySelectorAll(`input[data-field="${field}"]`));
  const idx = inputs.indexOf(e.target);
  if (idx === -1) return;
  if ((e.key === 'Enter' || e.key === 'ArrowDown') && idx < inputs.length - 1) inputs[idx + 1].focus();
  else if (e.key === 'ArrowUp' && idx > 0) inputs[idx - 1].focus();
};

// ==================================================================
// Gom dữ liệu `bills` (1 tháng) thành Ma Trận Ngày × Phòng × Mặt Hàng —
// dùng chung cho cả "Xem Nhanh" (xem trong app) và "Xuất Excel".
// ==================================================================
function buildDailyBillsMatrix(bills) {
  const dayMap = {};
  bills.forEach((b) => {
    if (!dayMap[b.Ngay]) dayMap[b.Ngay] = new Set();
    dayMap[b.Ngay].add(b.Phong);
  });
  const dayGroups = Object.keys(dayMap)
    .sort()
    .map((ngay) => ({
      ngay,
      dayNum: Number(ngay.split('-')[2]) || ngay,
      rooms: [...dayMap[ngay]].sort((a, c) => a.localeCompare(c, undefined, { numeric: true })),
    }));

  // Ô ma trận (giao Ngày × Phòng × Item) = SLBill + SLFOC cộng dồn — tổng SỐ
  // LƯỢNG THỰC TẾ đã tiêu dùng, không phân biệt Bill hay FOC trong từng ô.
  const qtyMap = {};
  // Tổng BILLED / Tổng FOC riêng của từng Item, cộng dồn cả tháng — dùng cho
  // 2 cột Total ở cuối bảng.
  const billMap = {};
  const focMap = {};
  // Ngày|Phòng nào có phát sinh FOC (bất kể Item) — để bôi đỏ Số Phòng.
  const focRoomSet = new Set();

  bills.forEach((b) => {
    const key = `${b.Ngay}|${b.Phong}|${b.TenHang}`;
    qtyMap[key] = (qtyMap[key] || 0) + (Number(b.SLBill) || 0) + (Number(b.SLFOC) || 0);
    billMap[b.TenHang] = (billMap[b.TenHang] || 0) + (Number(b.SLBill) || 0);
    focMap[b.TenHang] = (focMap[b.TenHang] || 0) + (Number(b.SLFOC) || 0);
    if (Number(b.SLFOC) > 0) focRoomSet.add(`${b.Ngay}|${b.Phong}`);
  });

  return { dayGroups, qtyMap, billMap, focMap, focRoomSet };
}

// ==================================================================
// Modal: Xem Nhanh Báo Cáo Daily Bills — xem ngay trong App, KHÔNG xuất file.
// Chỉ dùng khi cần kiểm tra nhanh trước khi quyết định có xuất Excel hay không.
// ==================================================================
function DailyBillsMatrixPreviewModal({ bills, catalog, thang, onClose, onExport }) {
  const { dayGroups, qtyMap, billMap, focMap, focRoomSet } = useMemo(() => buildDailyBillsMatrix(bills), [bills]);
  const [y, m] = thang.split('-').map(Number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="flex max-h-[90vh] w-full max-w-[96vw] flex-col rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#141414]">
            <Eye className="h-5 w-5" /> Xem Nhanh — BÁO CÁO SỐ LƯỢNG MINIBAR T {String(m).padStart(2, '0')}/{y}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={onExport} className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
              <Download className="h-3.5 w-3.5" /> Xuất Excel
            </button>
            <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
          </div>
        </div>

        {bills.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">Chưa có Bill nào trong tháng để xem.</p>
        ) : (
          <>
            <div className="flex-1 overflow-auto rounded border border-slate-200">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-slate-200 font-bold text-[#141414]">
                    <th rowSpan={2} className="sticky left-0 z-20 min-w-[36px] border border-slate-300 bg-slate-200 px-1.5 py-1">STT</th>
                    <th rowSpan={2} className="sticky left-[36px] z-20 min-w-[160px] border border-slate-300 bg-slate-200 px-2 py-1 text-left">TÊN MẶT HÀNG</th>
                    {dayGroups.map((g) => (
                      <th key={g.ngay} colSpan={g.rooms.length} className="border border-slate-300 px-1 py-1">{g.dayNum}</th>
                    ))}
                    <th colSpan={2} className="border border-slate-300 px-1 py-1">TOTAL</th>
                    <th rowSpan={2} className="border border-slate-300 px-1.5 py-1">Đơn giá</th>
                  </tr>
                  <tr className="bg-slate-200 font-bold text-[#141414]">
                    {dayGroups.map((g) => g.rooms.map((room) => {
                      const hasFOC = focRoomSet.has(`${g.ngay}|${room}`);
                      return (
                        <th key={`${g.ngay}-${room}`} className={`min-w-[34px] border border-slate-300 px-1 py-1 ${hasFOC ? 'border-b-2 border-b-red-600 text-red-600 underline' : ''}`}>
                          {room}
                        </th>
                      );
                    }))}
                    <th className="border border-slate-300 px-1.5 py-1">FOC</th>
                    <th className="border border-slate-300 px-1.5 py-1">BILLED</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((c, i) => (
                    <tr key={c.TenHang} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="sticky left-0 z-10 border border-slate-200 bg-inherit px-1.5 py-1 text-center">{i + 1}</td>
                      <td className="sticky left-[36px] z-10 min-w-[160px] border border-slate-200 bg-inherit px-2 py-1 font-semibold">{c.TenHang}</td>
                      {dayGroups.map((g) => g.rooms.map((room) => {
                        const qty = qtyMap[`${g.ngay}|${room}|${c.TenHang}`] || 0;
                        return (
                          <td key={`${g.ngay}-${room}`} className="border border-slate-200 px-1 py-1 text-center">{qty > 0 ? qty : ''}</td>
                        );
                      }))}
                      <td className="border border-slate-200 px-1.5 py-1 text-right font-semibold text-amber-600">{focMap[c.TenHang] ? fmtNumber(focMap[c.TenHang]) : ''}</td>
                      <td className="border border-slate-200 px-1.5 py-1 text-right font-semibold text-emerald-600">{billMap[c.TenHang] ? fmtNumber(billMap[c.TenHang]) : ''}</td>
                      <td className="border border-slate-200 px-1.5 py-1 text-right">{fmtNumber(c.DonGia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] italic text-red-600">
              Ghi chú: Số Phòng được gạch chân màu đỏ = Ngày đó phòng này có phát sinh hàng FOC (miễn phí) trong số lượng tiêu dùng.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ==================================================================
// Ô số lượng có nút Tăng/Giảm (dùng chung cho BILL / FOC / NO POST)
// ==================================================================
const QTY_STEPPER_THEME = {
  bill: { label: 'text-blue-500', btn: 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100', input: 'border-blue-300 bg-blue-50' },
  foc: { label: 'text-amber-600', btn: 'border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100', input: 'border-amber-300 bg-amber-50' },
  nopost: { label: 'text-purple-600', btn: 'border-purple-300 bg-purple-50 text-purple-600 hover:bg-purple-100', input: 'border-purple-300 bg-purple-50' },
};

function QtyStepper({ label, theme, value, onChange }) {
  const t = QTY_STEPPER_THEME[theme];
  const n = Number(value) || 0;
  const dec = () => onChange(String(Math.max(0, n - 1)));
  const inc = () => onChange(String(n + 1));
  return (
    <div>
      <label className={`mb-0.5 block text-center text-[9px] font-bold ${t.label}`}>{label}</label>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={dec} className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border ${t.btn}`}>
          <Minus className="h-3 w-3" />
        </button>
        <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
          className={`w-11 rounded border-2 ${t.input} px-1 py-1 text-center text-sm focus:outline-none`} placeholder="0" />
        <button type="button" onClick={inc} className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border ${t.btn}`}>
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ==================================================================
// Modal: Thêm Item Minibar mới vào danh mục
// ==================================================================
function AddCatalogItemModal({ onCancel, onConfirm }) {
  const [tenHang, setTenHang] = useState('');
  const [dvt, setDvt] = useState('');
  const [donGia, setDonGia] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!tenHang || !dvt) return;
    setSaving(true);
    try {
      await onConfirm({ tenHang, dvt, donGia: parseAmount(donGia) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">+ Thêm Item Minibar</h3>
          <button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tên mặt hàng</label>
            <input value={tenHang} onChange={(e) => setTenHang(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="VD: Coca Cola 330ml" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">ĐVT</label>
            <input value={dvt} onChange={(e) => setDvt(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="VD: Lon" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Đơn giá bán (VNĐ)</label>
            <input value={donGia} onChange={(e) => setDonGia(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="VD: 65.000" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border border-[#141414] px-3 py-1.5 text-sm">Huỷ</button>
          <button onClick={handleSave} disabled={saving || !tenHang || !dvt} className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Thêm
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// Modal: Chênh Lệch Kiểm Kê
// ==================================================================
function DiscrepancyModal({ items, onClose }) {
  const mismatched = items.filter((it) => Number(it.ChenhLech) !== 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="max-h-[80vh] w-[600px] overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-red-600">
            <AlertTriangle className="h-5 w-5" /> Chênh Lệch Kiểm Kê ({mismatched.length} mục)
          </h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        {mismatched.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Không có chênh lệch nào 🎉</p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-700 text-xs font-bold uppercase tracking-wide text-white">
              <tr>
                <th className="border border-white/20 px-2 py-1.5 text-left">Item</th>
                <th className="border border-white/20 px-2 py-1.5 text-right">Tồn Trên Báo Cáo</th>
                <th className="border border-white/20 px-2 py-1.5 text-right">Tồn Thực Tế</th>
                <th className="border border-white/20 px-2 py-1.5 text-right">Chênh Lệch</th>
              </tr>
            </thead>
            <tbody>
              {mismatched.map((it, idx) => (
                <tr key={it.rowIndex} className={`transition-colors hover:bg-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="border border-slate-300 px-2 py-1.5 font-medium">{it.TenHang}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{fmtNumber(it.TonSachVo)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right">{fmtNumber(it.TonThucTe)}</td>
                  <td className="border border-slate-300 px-2 py-1.5 text-right font-bold text-red-600">
                    {it.ChenhLech > 0 ? '+' : ''}{fmtNumber(it.ChenhLech)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ==================================================================
// SUB 4C: Bảng Báo Cáo Tổng Minibar
// ==================================================================
// ==================================================================
// Đối soát App HK vs PMS PDF
// ==================================================================
function compareAppVsPMS(appBillRows, pmsRecords) {
  const appMap = {};
  appBillRows.forEach((r) => {
    const key = `${r.Ngay}|${r.Phong}|${normalizeMinibarItemName(r.TenHang)}`;
    appMap[key] = (appMap[key] || 0) + (Number(r.SLBill) || 0);
  });
  const pmsMap = {};
  pmsRecords.forEach((r) => {
    const key = `${r.ngay}|${r.phong}|${normalizeMinibarItemName(r.tenItem)}`;
    pmsMap[key] = (pmsMap[key] || 0) + r.soLuong;
  });
  const allKeys = new Set([...Object.keys(appMap), ...Object.keys(pmsMap)]);
  const rows = [];
  allKeys.forEach((key) => {
    const [ngay, phong, tenItem] = key.split('|');
    const slApp = appMap[key] || 0;
    const slPms = pmsMap[key] || 0;
    const diff = slApp - slPms;
    if (diff !== 0) rows.push({ ngay, phong, tenItem, slApp, slPms, diff });
  });
  return rows.sort((a, b) => a.ngay.localeCompare(b.ngay) || a.phong.localeCompare(b.phong));
}

function PMSReconciliationModal({ rows, onClose }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [roomFilter, setRoomFilter] = useState('');

  const filtered = useMemo(() => rows.filter((r) => {
    if (fromDate && r.ngay < fromDate) return false;
    if (toDate && r.ngay > toDate) return false;
    if (roomFilter && !r.phong.includes(roomFilter.trim())) return false;
    return true;
  }), [rows, fromDate, toDate, roomFilter]);

  const handleExport = () => {
    const grey = 'D9D9D9';
    const thin = { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } };
    const headers = ['NGÀY', 'SỐ PHÒNG', 'TÊN ITEM MINIBAR', 'SL BILLED (APP HK)', 'SL BILLED (PMS PDF)', 'CHÊNH LỆCH', 'TRẠNG THÁI'];
    const aoa = [['M HOTEL - BÁO CÁO ĐỐI SOÁT BILL MINIBAR (APP HK vs PMS)'], [], headers];
    filtered.forEach((r) => {
      aoa.push([fmtDateDisplay(r.ngay), r.phong, r.tenItem, r.slApp, r.slPms, r.diff, r.diff > 0 ? 'Thừa trên App' : 'Thiếu trên App']);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = headers.length - 1;
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
    ws['!cols'] = [{ wch: 11 }, { wch: 9 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 16 }];
    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };
    setStyle(0, 0, { font: { bold: true, sz: 13, name: 'Times New Roman' } });
    for (let c = 0; c <= lastCol; c++) setStyle(2, c, { font: { bold: true, sz: 9, name: 'Times New Roman' }, fill: { fgColor: { rgb: grey } }, alignment: { horizontal: 'center', wrapText: true }, border: thin });
    for (let r = 3; r < aoa.length; r++) for (let c = 0; c <= lastCol; c++) setStyle(r, c, { font: { sz: 9, name: 'Times New Roman' }, alignment: { horizontal: c >= 3 ? 'right' : 'left' }, border: thin });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DoiSoatPMS');
    XLSX.writeFile(wb, `Doi_Soat_PMS_Minibar.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="flex max-h-[85vh] w-[900px] flex-col rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-red-600">
            <AlertTriangle className="h-5 w-5" /> Bảng Đối Soát Chênh Lệch Bill Minibar ({filtered.length})
          </h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Từ ngày</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded border border-slate-300 px-2 py-1" />
          <span className="text-slate-500">Đến ngày</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded border border-slate-300 px-2 py-1" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} placeholder="Lọc số phòng..." className="rounded border border-slate-300 py-1 pl-7 pr-2" />
          </div>
          <button onClick={handleExport} className="ml-auto flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 font-bold text-white">
            <Download className="h-3.5 w-3.5" /> Xuất Báo Cáo Lệch (Excel)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto rounded border border-slate-200">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Không có chênh lệch nào phù hợp bộ lọc 🎉</p>
          ) : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-700 text-xs font-bold uppercase tracking-wide text-white">
                <tr>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Ngày</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Số Phòng</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Item Minibar</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right">SL App HK</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right">SL PMS PDF</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right">Chênh Lệch</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={idx} className={`transition-colors hover:bg-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{fmtDateDisplay(r.ngay)}</td>
                    <td className="border border-slate-200 px-2 py-1.5 font-semibold">{r.phong}</td>
                    <td className="border border-slate-200 px-2 py-1.5">{r.tenItem}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right">{r.slApp}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right">{r.slPms}</td>
                    <td className={`border border-slate-200 px-2 py-1.5 text-right font-bold ${r.diff > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      {r.diff > 0 ? '+' : ''}{r.diff}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-[11px]">
                      {r.diff > 0 ? '🔴 Thừa trên App HK — chưa khớp PMS' : '🔵 Thiếu trên App HK — có trên PMS nhưng chưa Post'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTab({ thang, catalog, onReloadCatalog, refreshToken }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [savingRows, setSavingRows] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);
  const [pmsRecords, setPmsRecords] = useState(null);
  const [pmsFileName, setPmsFileName] = useState('');
  const [pmsUploading, setPmsUploading] = useState(false);
  const [pmsError, setPmsError] = useState(null);
  const [showPmsModal, setShowPmsModal] = useState(false);
  const [bills, setBills] = useState([]);

  // background = true: làm mới ngầm phía sau (không hiện spinner toàn màn
  // hình, giữ nguyên bảng cũ đang hiện) — dùng khi Daily Bills vừa post 1
  // bill mới, để Bảng Báo Cáo Tổng luôn có số liệu mới nhất mà không làm
  // gián đoạn người đang xem.
  const load = useCallback(async (background) => {
    if (background) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [data, billsData] = await Promise.all([getMinibarSummary(thang), getMinibarBills(thang)]);
      setItems(data);
      setBills(billsData);
    } catch (err) {
      setError(err.message);
    } finally {
      if (background) setRefreshing(false); else setLoading(false);
    }
  }, [thang]);

  useEffect(() => { load(false); }, [load]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (refreshToken) load(true); }, [refreshToken]);
  useEffect(() => { setPmsRecords(null); setPmsFileName(''); }, [thang]);

  const pmsDiscrepancies = useMemo(() => {
    if (!pmsRecords) return [];
    return compareAppVsPMS(bills, pmsRecords);
  }, [bills, pmsRecords]);

  const handleUploadPMS = async (file) => {
    if (!file) return;
    setPmsUploading(true);
    setPmsError(null);
    try {
      const records = await parsePMSPdfFile(file);
      if (records.length === 0) {
        setPmsError('Không đọc được dữ liệu nào từ file PDF này. Kiểm tra lại đúng file "Báo Cáo Buồng Phòng" từ PMS.');
      }
      setPmsRecords(records);
      setPmsFileName(file.name);
    } catch (err) {
      setPmsError('Lỗi khi đọc file PDF: ' + err.message);
    } finally {
      setPmsUploading(false);
    }
  };

  const totals = useMemo(() => {
    const urgentCount = items.filter((it) => Number(it.ChenhLech) !== 0).length;
    return { urgentCount };
  }, [items]);

  const handleFieldChange = (rowIndex, field, value) => {
    setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, [field]: value } : it)));
  };

  const persistRow = async (rowIndex) => {
    const item = items.find((it) => it.rowIndex === rowIndex);
    if (!item) return;
    setSavingRows((s) => ({ ...s, [rowIndex]: true }));
    try {
      await saveMinibarSummaryItem(thang, {
        rowIndex: item.rowIndex, Stt: item.Stt, TenHang: item.TenHang, DVT: item.DVT,
        TonDau: item.TonDau, Nhap: item.Nhap, TonKho: item.TonKho, GhiChu: item.GhiChu,
      });
      // Nạp lại ngầm (không hiện spinner toàn màn hình) để các cột tính toán
      // (Tồn Trên Báo Cáo, Tồn Thực Tế, Chênh Lệch...) cập nhật ngay, không
      // cần người dùng bấm nút reset thủ công.
      await load(true);
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSavingRows((s) => { const c = { ...s }; delete c[rowIndex]; return c; });
    }
  };

  const handleAddCatalogItem = async ({ tenHang, dvt, donGia }) => {
    try {
      await saveMinibarCatalogItem({ Stt: catalog.length + 1, TenHang: tenHang, DVT: dvt, DonGia: donGia });
      setShowAddModal(false);
      await onReloadCatalog();
      await load();
    } catch (err) {
      setError('Lỗi khi thêm Item: ' + err.message);
    }
  };


  const handleExportExcel = () => {
    const [y, m] = thang.split('-').map(Number);
    const grey = 'D9D9D9';
    const thin = { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } };
    const headers = ['STT', 'TÊN MẶT HÀNG', 'ĐVT', 'TỒN ĐẦU', 'NHẬP', 'BILLED', 'NO CHARGE', 'FOC', 'TRANS FO', 'TRANS FB', 'TỒN KHO MB', 'SETUP ROOM', 'TỒN TRÊN BÁO CÁO', 'TỒN THỰC TẾ', 'CHÊNH LỆCH'];
    const aoa = [[`M HOTEL - BÁO CÁO TỔNG MINIBAR - THÁNG ${String(m).padStart(2, '0')}/${y}`], [], headers];
    const dataStart = aoa.length;
    items.forEach((it) => {
      aoa.push([it.Stt, it.TenHang, it.DVT, it.TonDau, it.Nhap, it.Billed, it.NoCharge, it.FOC, it.TransferFO, it.TransferFB, it.TonKho, it.SetupRoom, it.TonSachVo, it.TonThucTe, it.ChenhLech]);
    });
    const dataEnd = aoa.length - 1;
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = headers.length - 1;
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
    ws['!cols'] = headers.map((h, i) => ({ wch: i === 1 ? 28 : 11 }));
    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };
    setStyle(0, 0, { font: { bold: true, sz: 13, name: 'Times New Roman' } });
    for (let c = 0; c <= lastCol; c++) setStyle(2, c, { font: { bold: true, sz: 9, name: 'Times New Roman' }, fill: { fgColor: { rgb: grey } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: thin });
    for (let r = dataStart; r <= dataEnd; r++) {
      for (let c = 0; c <= lastCol; c++) {
        setStyle(r, c, { font: { sz: 9, name: 'Times New Roman' }, alignment: { horizontal: c >= 3 ? 'right' : 'left' }, border: thin });
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Minibar_${thang}`);
    XLSX.writeFile(wb, `Bao_Cao_Minibar_${thang}.xlsx`);
  };

  return (
    <div>
      <style>{hideSpinnerCSS}</style>
      {refreshing && (
        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-400 print:hidden">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang cập nhật số liệu mới nhất...
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]">
          <Plus className="h-3.5 w-3.5" /> Thêm Item Minibar
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1 rounded border border-blue-400 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
            {pmsUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
            Upload Báo Cáo PMS (PDF)
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUploadPMS(e.target.files?.[0])} />
          </label>
          <button onClick={handleExportExcel} className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" /> Export Minibar Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]">
            <Printer className="h-3.5 w-3.5" /> In Báo Cáo A4
          </button>
        </div>
      </div>

      {pmsError && (
        <div className="mb-3 flex items-center justify-between rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700 print:hidden">
          <span>{pmsError}</span><button onClick={() => setPmsError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          <span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
        <button onClick={() => setShowDiscrepancy(true)} className="flex items-center justify-between rounded-xl border border-slate-200 bg-red-50 p-4 text-left shadow-md transition-shadow duration-200 hover:shadow-lg">
          <div>
            <p className="text-xs font-mono uppercase text-slate-500">Chênh Lệch Kiểm Kê</p>
            {totals.urgentCount > 0 ? (
              <p className="mt-1 flex items-center gap-2 text-xl font-bold text-red-600">
                <AlertTriangle className="h-6 w-6" /> Lệch {totals.urgentCount} Mặt Hàng
              </p>
            ) : (
              <p className="mt-1 text-xl font-bold text-emerald-600">Khớp 100%</p>
            )}
            <p className="text-[11px] text-slate-400">Công thức: Tồn Sách Vở − Tồn Thực Tế</p>
          </div>
          <ChevronDown className="h-5 w-5 -rotate-90 text-slate-400" />
        </button>

        {pmsRecords && (
          <button onClick={() => setShowPmsModal(true)} className="flex items-center justify-between rounded-xl border border-slate-200 bg-amber-50 p-4 text-left shadow-md transition-shadow duration-200 hover:shadow-lg">
            <div>
              <p className="text-xs font-mono uppercase text-slate-500">Đối Soát PMS</p>
              {pmsDiscrepancies.length > 0 ? (
                <p className="mt-1 flex items-center gap-2 text-xl font-bold text-red-600">
                  <AlertTriangle className="h-6 w-6" /> Lệch {pmsDiscrepancies.length} Bill
                </p>
              ) : (
                <p className="mt-1 text-xl font-bold text-emerald-600">Khớp 100%</p>
              )}
              <p className="truncate text-[11px] text-slate-400">So với: {pmsFileName}</p>
            </div>
            <ChevronDown className="h-5 w-5 -rotate-90 text-slate-400" />
          </button>
        )}
      </div>

      <div className="max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-auto rounded border border-[#141414] bg-white print:max-h-none print:overflow-visible">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-700 text-xs font-bold uppercase tracking-wide text-white">
            <tr>
              {['STT', 'TÊN HÀNG MINIBAR', 'ĐVT', 'TỒN ĐẦU', 'NHẬP', 'TỒN KHO MB', 'BILLED', 'NO CHARGE', 'FOC', 'TRANS FO', 'TRANS FB', 'SETUP ROOM', 'TỒN TRÊN BÁO CÁO', 'TỒN THỰC TẾ', 'CHÊNH LỆCH', 'GHI CHÚ'].map((h, i) => (
                <th key={h + i} className={`sticky top-0 z-20 border border-white/20 px-2 py-2 text-left shadow-[0_1px_0_0_#141414] ${i === 1 ? 'min-w-[200px]' : ''} ${i === 5 ? 'bg-yellow-200 text-[#141414]' : 'bg-slate-700'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={16} className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /> Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={16} className="py-8 text-center text-slate-400">Chưa có Item nào. Bấm "+ Thêm Item Minibar" để bắt đầu.</td></tr>
            ) : (
              items.map((it, idx) => {
                const mismatched = Number(it.ChenhLech) !== 0;
                return (
                  <tr
                    key={it.rowIndex}
                    className={`transition-colors hover:bg-amber-100 ${savingRows[it.rowIndex] ? 'opacity-50' : mismatched ? 'bg-red-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                  >
                    <td className="border border-[#141414]/30 px-2 py-1">{it.Stt}</td>
                    <td className="min-w-[200px] border border-[#141414]/30 px-2 py-1 font-medium">{it.TenHang}</td>
                    <td className="border border-[#141414]/30 px-2 py-1">{it.DVT}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.TonDau)}</td>
                    <td className="border border-amber-400 bg-amber-50 p-0">
                      <input type="number" data-field="Nhap" value={Number(it.Nhap) === 0 ? '' : it.Nhap}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'Nhap', e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, 'Nhap')}
                        onBlur={() => persistRow(it.rowIndex)}
                        placeholder="0"
                        className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none" />
                    </td>
                    <td className="border-2 border-[#141414] bg-yellow-100 p-0">
                      <input type="number" data-field="TonKho" value={Number(it.TonKho) === 0 ? '' : it.TonKho}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'TonKho', e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, 'TonKho')}
                        onBlur={() => persistRow(it.rowIndex)}
                        placeholder="0"
                        className="w-16 bg-transparent px-2 py-1 text-right text-base font-bold focus:bg-yellow-300 focus:outline-none" />
                    </td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right text-emerald-600">{fmtNumber(it.Billed)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right text-red-500">{fmtNumber(it.NoCharge)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right text-amber-600">{fmtNumber(it.FOC)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.TransferFO)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.TransferFB)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.SetupRoom)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.TonSachVo)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.TonThucTe)}</td>
                    <td className={`border border-[#141414]/30 px-2 py-1 text-right font-bold ${mismatched ? 'text-red-600' : 'text-slate-400'}`}>
                      {mismatched ? (it.ChenhLech > 0 ? '+' : '') + fmtNumber(it.ChenhLech) : '—'}
                    </td>
                    <td className="border border-[#141414]/30 p-0">
                      <input data-field="GhiChu" value={it.GhiChu || ''}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'GhiChu', e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, 'GhiChu')}
                        onBlur={() => persistRow(it.rowIndex)}
                        className="w-28 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && <AddCatalogItemModal onCancel={() => setShowAddModal(false)} onConfirm={handleAddCatalogItem} />}
      {showDiscrepancy && <DiscrepancyModal items={items} onClose={() => setShowDiscrepancy(false)} />}
      {showPmsModal && <PMSReconciliationModal rows={pmsDiscrepancies} onClose={() => setShowPmsModal(false)} />}

    </div>
  );
}

// ==================================================================
// SUB 4A: Ghi Nhận Daily Bills
// ==================================================================
function DailyBillsTab({ thang, catalog, onBillsChanged, refreshToken }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phong, setPhong] = useState('');
  const [ngay, setNgay] = useState(todayISO());
  const [nguoiBaoCao, setNguoiBaoCao] = useState('');
  const [quantities, setQuantities] = useState({});
  const [editingBillId, setEditingBillId] = useState(null);
  const [posting, setPosting] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  // Ô ngày chỉ CẬP NHẬT giá trị đang gõ (draft) — bộ lọc thật sự (fromDate/toDate,
  // cái điều khiển groupedBills) chỉ áp dụng khi bấm nút "Tìm" (hoặc Enter), để
  // tránh tự tra soát khi mới chọn xong 1 trong 2 ô ngày.
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const applyDateFilter = () => { setFromDate(fromDraft); setToDate(toDraft); };
  const clearDateFilter = () => { setFromDraft(''); setToDraft(''); setFromDate(''); setToDate(''); };
  // "Xem Nhanh" — chỉ mở xem trong App, KHÔNG xuất file; tách riêng khỏi nút Xuất Excel.
  const [showMatrixPreview, setShowMatrixPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMinibarBills(thang);
      setBills(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [thang]);

  useEffect(() => { load(); }, [load]);

  // Nạp lại NGẦM (không bật spinner toàn khối) khi có thay đổi từ nơi khác —
  // VD vừa "Post Bill" 1 Bill No Post ở tab Danh Sách Bill No Post, dữ liệu
  // mới cần hiện ngay tại đây mà không làm gián đoạn người đang xem/nhập liệu.
  const loadQuiet = useCallback(async () => {
    try {
      const data = await getMinibarBills(thang);
      setBills(data);
    } catch (err) {
      setError(err.message);
    }
  }, [thang]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (refreshToken) loadQuiet(); }, [refreshToken]);

  const groupedBills = useMemo(() => {
    const map = {};
    bills.forEach((r) => {
      // `order` = rowIndex lớn nhất trong các dòng của Bill này — Bill mới Post
      // luôn có rowIndex (id) lớn hơn Bill cũ, dùng để sắp Bill mới lên ĐẦU danh
      // sách trong cùng 1 Ngày (xem billsByDate bên dưới), tránh nhân viên nhìn
      // nhầm vì Bill mới nhất lại nằm tít dưới cùng.
      if (!map[r.BillId]) map[r.BillId] = { billId: r.BillId, ngay: r.Ngay, phong: r.Phong, tang: r.Tang, nguoiBaoCao: r.NguoiBaoCao, items: [], order: r.rowIndex };
      map[r.BillId].items.push(r);
      if (r.rowIndex > map[r.BillId].order) map[r.BillId].order = r.rowIndex;
    });
    let list = Object.values(map).sort((a, b) => (b.ngay || '').localeCompare(a.ngay || ''));
    if (fromDate) list = list.filter((b) => b.ngay >= fromDate);
    if (toDate) list = list.filter((b) => b.ngay <= toDate);
    return list;
  }, [bills, fromDate, toDate]);

  // Gom các Bill theo từng Ngày để hiện 1 header riêng cho mỗi nhóm Ngày
  // trong Lịch Sử Daily Bills (dễ tra soát hơn khi list nhiều Bill liền nhau).
  // Trong cùng 1 Ngày, Bill nào Post SAU (order/rowIndex lớn hơn) hiện LÊN ĐẦU.
  const billsByDate = useMemo(() => {
    const map = {};
    groupedBills.forEach((b) => {
      if (!map[b.ngay]) map[b.ngay] = [];
      map[b.ngay].push(b);
    });
    return Object.keys(map)
      .sort((a, b) => (b || '').localeCompare(a || ''))
      .map((ngay) => ({ ngay, bills: [...map[ngay]].sort((a, b) => (b.order || 0) - (a.order || 0)) }));
  }, [groupedBills]);

  const seqLabel = (billId, phongVal, ngayVal) => {
    const sameRoomDayIds = [...new Set(bills.filter((r) => r.Phong === phongVal && r.Ngay === ngayVal).map((r) => r.BillId))];
    const idx = sameRoomDayIds.indexOf(billId);
    return idx > -1 ? idx + 1 : 1;
  };

  const setQty = (tenHang, field, value) => {
    setQuantities((prev) => ({ ...prev, [tenHang]: { ...prev[tenHang], [field]: value } }));
  };

  const resetForm = () => {
    setPhong(''); setNgay(todayISO()); setNguoiBaoCao(''); setQuantities({}); setEditingBillId(null);
  };

  const handlePost = async () => {
    if (!phong) { setError('Vui lòng nhập số phòng.'); return; }
    // Tách riêng 2 nhóm: Item có BILL/FOC -> post ngay như trước (minibar_bills);
    // Item chỉ có NO POST -> lưu riêng vào minibar_nopost_bills, CHƯA tính vào
    // Báo Cáo Tổng, chờ xử lý thủ công tại tab "Danh Sách Bill No Post".
    const billItems = [];
    const noPostItems = [];
    catalog.forEach((c) => {
      const q = quantities[c.TenHang] || {};
      const slBill = parseAmount(q.bill);
      const slFOC = parseAmount(q.foc);
      const slNoPost = parseAmount(q.nopost);
      if (slBill > 0 || slFOC > 0) billItems.push({ tenHang: c.TenHang, dvt: c.DVT, donGia: c.DonGia, slBill, slFOC });
      if (slNoPost > 0) noPostItems.push({ tenHang: c.TenHang, dvt: c.DVT, donGia: c.DonGia, slNoPost });
    });

    if (billItems.length === 0 && noPostItems.length === 0) {
      setError('Vui lòng nhập số lượng cho ít nhất 1 Item.');
      return;
    }

    setPosting(true);
    setError(null);
    try {
      if (billItems.length > 0) {
        await saveMinibarBill(thang, { billId: editingBillId, phong, ngay, tang: '', nguoiBaoCao, items: billItems, ghiChu: '' });
      }
      if (noPostItems.length > 0) {
        await saveMinibarNoPostBill(thang, { phong, ngay, tang: '', nguoiBaoCao, items: noPostItems, ghiChu: '' });
      }
      resetForm();
      await load();
      onBillsChanged?.(); // báo cho Bảng Báo Cáo Tổng + Danh Sách Bill No Post tự cập nhật ngầm
    } catch (err) {
      setError('Lỗi khi Post Bill: ' + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleEditBill = (bill) => {
    setEditingBillId(bill.billId);
    setPhong(bill.phong);
    setNgay(bill.ngay);
    setNguoiBaoCao(bill.nguoiBaoCao || '');
    const q = {};
    bill.items.forEach((it) => { q[it.TenHang] = { bill: it.SLBill || '', foc: it.SLFOC || '' }; });
    setQuantities(q);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm('Xoá toàn bộ Bill này?')) return;
    try {
      await deleteMinibarBill(thang, billId);
      setBills((prev) => prev.filter((r) => r.BillId !== billId));
      onBillsChanged?.(); // báo cho Bảng Báo Cáo Tổng tự cập nhật ngầm
    } catch (err) {
      setError('Lỗi khi xoá: ' + err.message);
    }
  };

  // ================================================================
  // Xuất Excel — Ma Trận Ngày × Phòng × Mặt Hàng (đúng mẫu "mini bar.xlsx")
  // ================================================================
  // ⚠️ Số lượng điền vào TỪNG Ô ma trận = SLBill + SLFOC cộng dồn (tổng SỐ
  // LƯỢNG THỰC TẾ đã tiêu dùng của phòng đó trong ngày đó). Riêng 2 cột
  // TOTAL cuối bảng tách RIÊNG: FOC (chỉ SLFOC cộng dồn cả tháng) và BILLED
  // (chỉ SLBill cộng dồn cả tháng) — không còn cột "Thành Tiền".
  const handleExportDailyBillsMatrix = () => {
    if (bills.length === 0) { setError('Chưa có Bill nào trong tháng để xuất.'); return; }

    const { dayGroups, qtyMap, billMap, focMap, focRoomSet } = buildDailyBillsMatrix(bills);

    // Xác định vị trí cột: STT, CODE, TÊN MẶT HÀNG | (từng nhóm Ngày -> từng Phòng) | TOTAL (FOC | BILLED) | Ghi chú | Đơn giá
    const FIXED_LEFT = 3;
    const dayColStart = [];
    let cursor = FIXED_LEFT;
    dayGroups.forEach((g) => { dayColStart.push(cursor); cursor += g.rooms.length; });
    const totalFOCCol = cursor;
    const totalBilledCol = cursor + 1;
    const ghiChuCol = cursor + 2;
    const donGiaCol = cursor + 3;
    const lastCol = donGiaCol;

    const HEADER_ROW = 1; // "Dòng 2" (Ngày / tên cột)
    const SUBHEADER_ROW = 2; // "Dòng 3" (Số Phòng / FOC / BILLED)
    const DATA_START = 3; // "Dòng 4" trở đi

    const [y, m] = thang.split('-').map(Number);
    const LEGEND_ROW = DATA_START + catalog.length; // 1 dòng ghi chú cuối bảng
    const totalRows = LEGEND_ROW + 1;
    const aoa = Array.from({ length: totalRows }, () => Array(lastCol + 1).fill(''));

    aoa[0][0] = `BÁO CÁO SỐ LƯỢNG MINIBAR T ${String(m).padStart(2, '0')}/${y}`;
    aoa[HEADER_ROW][0] = 'STT';
    aoa[HEADER_ROW][1] = 'CODE';
    aoa[HEADER_ROW][2] = 'TÊN MẶT HÀNG';
    dayGroups.forEach((g, idx) => { aoa[HEADER_ROW][dayColStart[idx]] = g.dayNum; });
    aoa[HEADER_ROW][totalFOCCol] = 'TOTAL';
    aoa[SUBHEADER_ROW][totalFOCCol] = 'FOC';
    aoa[SUBHEADER_ROW][totalBilledCol] = 'BILLED';
    aoa[HEADER_ROW][ghiChuCol] = 'Ghi chú';
    aoa[HEADER_ROW][donGiaCol] = 'Đơn giá';
    dayGroups.forEach((g, idx) => {
      g.rooms.forEach((room, ri) => { aoa[SUBHEADER_ROW][dayColStart[idx] + ri] = room; });
    });

    catalog.forEach((c, i) => {
      const r = DATA_START + i;
      aoa[r][0] = i + 1;
      aoa[r][1] = ''; // CODE — App hiện chưa lưu mã sản phẩm riêng cho từng Item Minibar
      aoa[r][2] = c.TenHang;
      dayGroups.forEach((g, idx) => {
        g.rooms.forEach((room, ri) => {
          const qty = qtyMap[`${g.ngay}|${room}|${c.TenHang}`] || 0;
          if (qty > 0) aoa[r][dayColStart[idx] + ri] = qty;
        });
      });
      aoa[r][totalFOCCol] = focMap[c.TenHang] || '';
      aoa[r][totalBilledCol] = billMap[c.TenHang] || '';
      aoa[r][ghiChuCol] = '';
      aoa[r][donGiaCol] = Number(c.DonGia) || '';
    });

    aoa[LEGEND_ROW][0] = 'Ghi chú: Số Phòng được gạch chân màu ĐỎ = Ngày đó phòng này có phát sinh hàng FOC (miễn phí) trong số lượng tiêu dùng.';

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge: Title | STT/CODE/TÊN MẶT HÀNG (dọc 2 dòng) | từng nhóm Ngày (ngang theo số Phòng) | TOTAL (ngang qua FOC+BILLED) | Ghi chú/Đơn giá (dọc 2 dòng) | Ghi chú cuối bảng
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }, { s: { r: LEGEND_ROW, c: 0 }, e: { r: LEGEND_ROW, c: lastCol } }];
    [0, 1, 2].forEach((c) => merges.push({ s: { r: HEADER_ROW, c }, e: { r: SUBHEADER_ROW, c } }));
    dayGroups.forEach((g, idx) => {
      const startC = dayColStart[idx];
      const endC = startC + g.rooms.length - 1;
      if (endC > startC) merges.push({ s: { r: HEADER_ROW, c: startC }, e: { r: HEADER_ROW, c: endC } });
    });
    merges.push({ s: { r: HEADER_ROW, c: totalFOCCol }, e: { r: HEADER_ROW, c: totalBilledCol } });
    [ghiChuCol, donGiaCol].forEach((c) => merges.push({ s: { r: HEADER_ROW, c }, e: { r: SUBHEADER_ROW, c } }));
    ws['!merges'] = merges;

    ws['!cols'] = Array.from({ length: lastCol + 1 }, (_, c) => {
      if (c === 0) return { wch: 5 };
      if (c === 1) return { wch: 11 };
      if (c === 2) return { wch: 24 };
      if (c === totalFOCCol || c === totalBilledCol || c === ghiChuCol || c === donGiaCol) return { wch: 11 };
      return { wch: 6 };
    });

    const thin = { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } };
    const headerFill = { fgColor: { rgb: 'E2E8F0' } };
    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };

    setStyle(0, 0, { font: { bold: true, sz: 14, name: 'Times New Roman' }, alignment: { horizontal: 'center', vertical: 'center' } });

    // Map ngược: cột -> { ngay, room } để biết cột Số Phòng nào cần tô đỏ (có FOC)
    const colToRoom = {};
    dayGroups.forEach((g, idx) => {
      g.rooms.forEach((room, ri) => { colToRoom[dayColStart[idx] + ri] = { ngay: g.ngay, room }; });
    });
    const redBottom = { bottom: { style: 'medium', color: { rgb: 'FF0000' } } };

    for (let c = 0; c <= lastCol; c++) {
      setStyle(HEADER_ROW, c, { font: { bold: true, sz: 10, name: 'Times New Roman' }, fill: headerFill, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: thin });
      const roomInfo = colToRoom[c];
      const hasFOC = roomInfo && focRoomSet.has(`${roomInfo.ngay}|${roomInfo.room}`);
      setStyle(SUBHEADER_ROW, c, {
        font: { bold: true, sz: 10, name: 'Times New Roman', underline: hasFOC, color: hasFOC ? { rgb: 'FF0000' } : undefined },
        fill: headerFill,
        alignment: { horizontal: 'center', vertical: 'center' },
        border: hasFOC ? { ...thin, ...redBottom } : thin,
      });
    }

    for (let r = DATA_START; r < LEGEND_ROW; r++) {
      for (let c = 0; c <= lastCol; c++) {
        const isTenHang = c === 2;
        const isMoney = c === totalFOCCol || c === totalBilledCol || c === donGiaCol;
        setStyle(r, c, {
          font: { sz: 10, name: 'Times New Roman', bold: isTenHang },
          alignment: { horizontal: isTenHang ? 'left' : isMoney ? 'right' : 'center', vertical: 'center' },
          border: thin,
          ...(isMoney ? { numFmt: '#,##0' } : {}),
        });
      }
    }

    setStyle(LEGEND_ROW, 0, { font: { sz: 9, italic: true, name: 'Times New Roman', color: { rgb: 'FF0000' } }, alignment: { horizontal: 'left', vertical: 'center' } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Minibar_${thang}`);
    XLSX.writeFile(wb, `Bao_Cao_So_Luong_Minibar_${thang}.xlsx`);
  };

  return (
    <div>
      <style>{hideSpinnerCSS}</style>
      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---- Left: Form ---- */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-[#141414]">
            <Receipt className="h-4 w-4" /> Ghi Nhận Tiêu Dùng Hằng Ngày Theo Phòng
            {editingBillId && <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Đang sửa Bill {editingBillId}</span>}
          </h3>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Số Phòng (Room)</label>
              <input value={phong} onChange={(e) => setPhong(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="VD: 301" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Chọn Ngày</label>
              <input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-slate-600">Người Báo Cáo</label>
            <input value={nguoiBaoCao} onChange={(e) => setNguoiBaoCao(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="VD: HK Supervisor" />
          </div>

          {/* Nút Post Bill đặt NGAY Ở ĐÂY (song song với "Chọn Item", NGOÀI khung cuộn danh
              sách Item bên dưới) — để luôn nhìn thấy và bấm được ngay, không cần kéo xuống
              cuối danh sách Item mới thấy nút như trước (đặc biệt bất tiện trên màn hình nhỏ). */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">Chọn Item</p>
            <button onClick={handlePost} disabled={posting}
              className="flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-md shadow-red-500/40 hover:bg-red-700 disabled:opacity-50">
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} POST BILL
            </button>
          </div>
          <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
            {catalog.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Chưa có Item Minibar nào — vào tab "Bảng Báo Cáo Tổng" để thêm.</p>
            ) : (
              catalog.map((c) => (
                <div key={c.TenHang} className="flex flex-wrap items-center justify-between gap-y-2 rounded border border-slate-200 p-2.5">
                  <div className="min-w-[110px] pr-1">
                    <p className="text-sm font-semibold text-[#141414]">{c.TenHang}</p>
                    <p className="text-[11px] text-slate-400">{fmtNumber(c.DonGia)} đ / {c.DVT}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <QtyStepper label="BILL" theme="bill" value={quantities[c.TenHang]?.bill} onChange={(v) => setQty(c.TenHang, 'bill', v)} />
                    <QtyStepper label="FOC" theme="foc" value={quantities[c.TenHang]?.foc} onChange={(v) => setQty(c.TenHang, 'foc', v)} />
                    <QtyStepper label="NO POST" theme="nopost" value={quantities[c.TenHang]?.nopost} onChange={(v) => setQty(c.TenHang, 'nopost', v)} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {editingBillId && <button onClick={resetForm} className="rounded border border-[#141414] px-4 py-2 text-sm font-bold">Huỷ Sửa</button>}
            <button onClick={handlePost} disabled={posting} className="flex flex-1 items-center justify-center gap-1.5 rounded bg-red-600 px-4 py-2 text-sm font-extrabold text-white shadow-md shadow-red-500/40 hover:bg-red-700 disabled:opacity-50">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} POST BILL
            </button>
          </div>
        </div>

        {/* ---- Right: History ---- */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase text-[#141414]">Lịch Sử Daily Bills</h3>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowMatrixPreview(true)} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#141414] hover:bg-[#E4E3E0]">
                <Eye className="h-3.5 w-3.5" /> Xem Nhanh
              </button>
              <button onClick={handleExportDailyBillsMatrix} className="flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700">
                <Download className="h-3.5 w-3.5" /> Xuất Báo Cáo Daily Bills (Excel)
              </button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Từ ngày</span>
            <input type="date" value={fromDraft} onChange={(e) => setFromDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyDateFilter()}
              className="rounded border border-slate-300 px-2 py-1" />
            <span className="text-slate-500">Đến ngày</span>
            <input type="date" value={toDraft} onChange={(e) => setToDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyDateFilter()}
              className="rounded border border-slate-300 px-2 py-1" />
            <button onClick={applyDateFilter} className="flex items-center gap-1 rounded bg-[#141414] px-2.5 py-1 font-bold text-white hover:bg-slate-800">
              <Search className="h-3 w-3" /> Tìm
            </button>
            {(fromDate || toDate) && <button onClick={clearDateFilter} className="text-slate-400 underline">Xoá lọc</button>}
          </div>

          <div className="max-h-[460px] space-y-3 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
            ) : groupedBills.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Chưa có Bill nào.</p>
            ) : (
              billsByDate.map(({ ngay, bills: billsOfDay }) => (
                <div key={ngay}>
                  {/* Header nhóm Ngày — tách rõ từng Ngày để dễ tra soát khi list nhiều Bill */}
                  <div className="sticky top-0 z-[5] rounded bg-slate-200 px-3 py-1 text-[11px] font-bold text-slate-800">
                    {fmtDateDisplay(ngay)}
                  </div>
                  <div className="space-y-2 bg-slate-50/60 px-0.5 py-2">
                    {billsOfDay.map((b) => {
                      const totalNoTax = b.items.reduce((s, it) => s + (Number(it.SLBill) || 0) * (Number(it.DonGia) || 0), 0);
                      const totalWithTax = totalNoTax * (1 + VAT_RATE);
                      return (
                        <div key={b.billId} className="rounded border border-[#141414] bg-white p-3">
                          <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="rounded border border-blue-300 bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                              Phòng {b.phong} ({seqLabel(b.billId, b.phong, b.ngay)})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-emerald-600">{fmtNumber(totalWithTax)} đ</span>
                              <button onClick={() => handleEditBill(b)} className="text-slate-400 hover:text-[#141414]"><Edit2 className="h-3.5 w-3.5" /></button>
                              <button onClick={() => handleDeleteBill(b.billId)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                          {/* Chi tiết từng Item — 3 cột riêng: Tên Item | Số lượng | Thành tiền (chưa thuế) */}
                          <div className="space-y-1 text-xs">
                            {b.items.map((it, idx) => {
                              const lineTotal = (Number(it.SLBill) || 0) * (Number(it.DonGia) || 0);
                              return (
                                <div key={idx} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-slate-800">
                                    {it.TenHang}
                                    {it.SLFOC > 0 && <span className="ml-1 text-xs font-medium text-amber-600">(FOC x{it.SLFOC})</span>}
                                  </span>
                                  <span className="w-12 text-right text-lg font-extrabold text-red-600">{it.SLBill > 0 ? `x${it.SLBill}` : '—'}</span>
                                  <span className="w-20 text-right text-slate-500">{fmtNumber(lineTotal)} đ</span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="mt-1 border-t border-slate-100 pt-1 text-[10px] text-slate-400">NV Báo Cáo: {b.nguoiBaoCao || '—'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showMatrixPreview && (
        <DailyBillsMatrixPreviewModal
          bills={bills}
          catalog={catalog}
          thang={thang}
          onClose={() => setShowMatrixPreview(false)}
          onExport={handleExportDailyBillsMatrix}
        />
      )}
    </div>
  );
}

// ==================================================================
// SUB 4C: Danh Sách Bill NO POST — tiêu dùng thực tế nhưng chưa post lên PMS
// ==================================================================
function NoPostBillsTab({ thang, onPosted }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [postingId, setPostingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMinibarNoPostBills(thang);
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [thang]);

  useEffect(() => { load(); }, [load]);

  const groupedBills = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (!map[r.BillId]) map[r.BillId] = { billId: r.BillId, ngay: r.Ngay, phong: r.Phong, tang: r.Tang, nguoiBaoCao: r.NguoiBaoCao, items: [] };
      map[r.BillId].items.push(r);
    });
    return Object.values(map).sort((a, b) => (b.ngay || '').localeCompare(a.ngay || ''));
  }, [rows]);

  // Post Bill thật sự: chuyển SL No Post -> SL Bill, ghi vào minibar_bills (sẽ
  // tính vào Billed của Bảng Báo Cáo Tổng + hiện trong Lịch Sử Daily Bills),
  // rồi xoá dòng No Post tương ứng.
  const handlePostNow = async (bill) => {
    setPostingId(bill.billId);
    setError(null);
    try {
      const items = bill.items.map((it) => ({ tenHang: it.TenHang, dvt: it.DVT, donGia: it.DonGia, slBill: it.SLNoPost, slFOC: 0 }));
      await saveMinibarBill(thang, { billId: null, phong: bill.phong, ngay: bill.ngay, tang: bill.tang, nguoiBaoCao: bill.nguoiBaoCao, items, ghiChu: '' });
      await deleteMinibarNoPostBill(thang, bill.billId);
      setRows((prev) => prev.filter((r) => r.BillId !== bill.billId));
      onPosted?.(); // báo cho Bảng Báo Cáo Tổng + Lịch Sử Daily Bills tự cập nhật ngầm
    } catch (err) {
      setError('Lỗi khi Post Bill: ' + err.message);
    } finally {
      setPostingId(null);
    }
  };

  const handleDiscard = async (billId) => {
    if (!window.confirm('Xoá bỏ Bill No Post này? (Không post lên PMS)')) return;
    try {
      await deleteMinibarNoPostBill(thang, billId);
      setRows((prev) => prev.filter((r) => r.BillId !== billId));
      onPosted?.(); // ⚠️ TRƯỚC ĐÂY thiếu dòng này -> xoá xong nhưng số đếm (huy hiệu đỏ) trên
      // thẻ tab "DANH SÁCH BILL NO POST" không cập nhật, vẫn hiện số cũ dù đã xoá hết.
    } catch (err) {
      setError('Lỗi khi xoá: ' + err.message);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <AlertTriangle className="mr-1 inline h-4 w-4" />
        Đây là các Bill có tiêu dùng Minibar thực tế nhưng <b>CHƯA được tính vào Billed/Bảng Báo Cáo Tổng</b>.
        Bấm <b>Post Bill</b> khi đã post được lên PMS để chuyển chính thức sang Lịch Sử Daily Bills.
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : groupedBills.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400 shadow-md">
          Không có Bill No Post nào đang treo 🎉
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groupedBills.map((b) => {
            const total = b.items.reduce((s, it) => s + (Number(it.SLNoPost) || 0) * (Number(it.DonGia) || 0), 0);
            return (
              <div key={b.billId} className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-3 shadow-md">
                <div className="mb-1.5 flex items-center justify-between border-b border-amber-200 pb-1.5">
                  <span className="rounded border border-amber-400 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Phòng {b.phong}
                  </span>
                  <span className="text-xs text-slate-500">{fmtDateDisplay(b.ngay)}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  {b.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">{it.TenHang} x{it.SLNoPost}</span>
                      <span className="text-slate-500">{fmtNumber((it.SLNoPost || 0) * (it.DonGia || 0))} đ</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1 border-t border-amber-200 pt-1 text-[10px] text-slate-500">NV Báo Cáo: {b.nguoiBaoCao || '—'}</p>
                <p className="mt-0.5 text-xs font-bold text-slate-700">Tổng (chưa thuế): {fmtNumber(total)} đ</p>
                <div className="mt-2 flex gap-1.5">
                  <button onClick={() => handlePostNow(b)} disabled={postingId === b.billId}
                    className="flex flex-1 items-center justify-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {postingId === b.billId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />} POST BILL
                  </button>
                  <button onClick={() => handleDiscard(b.billId)} className="rounded border border-red-300 px-2 py-1.5 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================================================================
// SUB 4B: Set Up Minibar Phòng Khách (Matrix theo Tầng + Bảng F&B/FO)
// ==================================================================
function SetupTab({ thang }) {
  const [matrix, setMatrix] = useState([]);
  const [fbfo, setFbfo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, f] = await Promise.all([getMinibarSetup(), getMinibarFBFO(thang)]);
      setMatrix(m);
      setFbfo(f);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [thang]);

  useEffect(() => { load(); }, [load]);

  const handleMatrixChange = (rowIndex, floor, value) => {
    setMatrix((prev) => prev.map((r) => {
      if (r.rowIndex !== rowIndex) return r;
      const updated = { ...r, [floor]: value };
      updated.Total = FLOORS.reduce((s, f) => s + (Number(updated[f]) || 0), 0);
      return updated;
    }));
  };

  const persistMatrixRow = async (rowIndex) => {
    const row = matrix.find((r) => r.rowIndex === rowIndex);
    if (!row) return;
    setSavingKey(`m-${rowIndex}`);
    try {
      const payload = { rowIndex: row.rowIndex, TenHang: row.TenHang };
      FLOORS.forEach((f) => { payload[f] = Number(row[f]) || 0; });
      await saveMinibarSetupItem(payload);
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const handleFbfoChange = (rowIndex, field, value) => {
    setFbfo((prev) => prev.map((r) => {
      if (r.rowIndex !== rowIndex) return r;
      const updated = { ...r, [field]: value };
      updated.FBTransfer = (Number(updated.FBTonDau) || 0) - (Number(updated.FBTonCuoi) || 0);
      updated.FOTransfer = (Number(updated.FOTonDau) || 0) - (Number(updated.FOTonCuoi) || 0);
      return updated;
    }));
  };

  const persistFbfoRow = async (rowIndex) => {
    const row = fbfo.find((r) => r.rowIndex === rowIndex);
    if (!row) return;
    setSavingKey(`f-${rowIndex}`);
    try {
      await saveMinibarFBFOItem(thang, {
        rowIndex: row.rowIndex, Stt: row.Stt, TenHang: row.TenHang,
        FBTonDau: row.FBTonDau, FBTonCuoi: row.FBTonCuoi,
        FOTonDau: row.FOTonDau, FOTonCuoi: row.FOTonCuoi, GhiChu: row.GhiChu,
      });
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) return <div className="py-16 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <style>{hideSpinnerCSS}</style>
      {error && (
        <div className="flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ---- Matrix Item x Floor ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase text-[#141414]">
          <Layers className="h-4 w-4" /> Ma Trận Setup Theo Tầng
        </h3>
        <div className="max-h-[420px] overflow-auto rounded border border-slate-200 print:max-h-none print:overflow-visible">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-700 text-xs font-bold uppercase tracking-wide text-white">
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[180px] border border-white/20 bg-slate-700 px-2 py-2 text-left">Item</th>
                {FLOORS.map((f) => <th key={f} className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">{f}</th>)}
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((r, idx) => (
                <tr key={r.rowIndex} className={`transition-colors hover:bg-amber-100 ${savingKey === `m-${r.rowIndex}` ? 'opacity-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="sticky left-0 z-10 min-w-[180px] border border-slate-200 bg-white px-2 py-1 font-medium">{r.TenHang}</td>
                  {FLOORS.map((f) => (
                    <td key={f} className="border border-slate-200 p-0">
                      <input type="number" data-field={`floor-${f}`} value={Number(r[f]) === 0 ? '' : r[f]}
                        onChange={(e) => handleMatrixChange(r.rowIndex, f, e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, `floor-${f}`)}
                        onBlur={() => persistMatrixRow(r.rowIndex)}
                        placeholder="0" className="w-14 bg-transparent px-1 py-1 text-center focus:bg-yellow-300 focus:outline-none" />
                    </td>
                  ))}
                  <td className="border border-slate-200 px-2 py-1 text-center font-bold">{fmtNumber(r.Total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- FB / FO Table ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold uppercase text-[#141414]">
          <Coffee className="h-4 w-4" /> Bảng F&amp;B / FO
        </h3>
        <p className="mb-3 text-[11px] text-slate-400">Nhân viên tự cập nhật Tồn Đầu/Tồn Cuối mỗi tháng. Transfer tự tính = Tồn Đầu − Tồn Cuối.</p>
        <div className="max-h-[380px] overflow-auto rounded border border-slate-200 print:max-h-none print:overflow-visible">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-slate-700 text-xs font-bold uppercase tracking-wide text-white">
              <tr>
                <th className="sticky top-0 z-20 min-w-[180px] border border-white/20 bg-slate-700 px-2 py-2 text-left">Item</th>
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">FB Tồn Đầu</th>
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">FB Tồn Cuối</th>
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">FB Transfer</th>
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">FO Tồn Đầu</th>
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">FO Tồn Cuối</th>
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-center">FO Transfer</th>
                <th className="sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-left">Ghi Chú</th>
              </tr>
            </thead>
            <tbody>
              {fbfo.map((r, idx) => (
                <tr key={r.rowIndex} className={`transition-colors hover:bg-amber-100 ${savingKey === `f-${r.rowIndex}` ? 'opacity-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="min-w-[180px] border border-slate-200 px-2 py-1 font-medium">{r.TenHang}</td>
                  {['FBTonDau', 'FBTonCuoi'].map((f) => (
                    <td key={f} className="border border-slate-200 p-0">
                      <input type="number" data-field={f} value={r[f] === '' || r[f] == null || Number(r[f]) === 0 ? '' : r[f]}
                        onChange={(e) => handleFbfoChange(r.rowIndex, f, e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, f)}
                        onBlur={() => persistFbfoRow(r.rowIndex)}
                        className="w-16 bg-transparent px-1 py-1 text-center focus:bg-yellow-300 focus:outline-none" />
                    </td>
                  ))}
                  <td className="border border-slate-200 px-2 py-1 text-center text-base font-bold text-red-600">{r.FBTransfer ? fmtNumber(r.FBTransfer) : ''}</td>
                  {['FOTonDau', 'FOTonCuoi'].map((f) => (
                    <td key={f} className="border border-slate-200 p-0">
                      <input type="number" data-field={f} value={r[f] === '' || r[f] == null || Number(r[f]) === 0 ? '' : r[f]}
                        onChange={(e) => handleFbfoChange(r.rowIndex, f, e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, f)}
                        onBlur={() => persistFbfoRow(r.rowIndex)}
                        className="w-16 bg-transparent px-1 py-1 text-center focus:bg-yellow-300 focus:outline-none" />
                    </td>
                  ))}
                  <td className="border border-slate-200 px-2 py-1 text-center text-base font-bold text-red-600">{r.FOTransfer ? fmtNumber(r.FOTransfer) : ''}</td>
                  <td className="border border-slate-200 p-0">
                    <input data-field="fbfo-ghichu" value={r.GhiChu || ''}
                      onChange={(e) => handleFbfoChange(r.rowIndex, 'GhiChu', e.target.value)}
                      onKeyDown={(e) => gridKeyNav(e, 'fbfo-ghichu')}
                      onBlur={() => persistFbfoRow(r.rowIndex)}
                      className="w-32 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// MAIN: MinibarModule
// ==================================================================
export default function MinibarModule() {
  const { selectedMonth } = useStore();
  const thang = selectedMonth;
  const [activeTab, setActiveTab] = useState('SUMMARY');
  const [catalog, setCatalog] = useState([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Tab nào đã từng mở thì giữ nguyên trong bộ nhớ (không unmount khi chuyển
  // sang tab khác) — chuyển qua lại giữa các tab sẽ tức thời, không phải tải
  // lại dữ liệu từ Google Sheets mỗi lần bấm (nguyên nhân chính gây cảm giác
  // "đọc lâu" khi chuyển từ Daily Bills sang Báo Cáo Tổng).
  const [visitedTabs, setVisitedTabs] = useState({ SUMMARY: true });
  const goToTab = (key) => {
    setActiveTab(key);
    setVisitedTabs((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  // Tăng số này mỗi khi Daily Bills có thay đổi (post/sửa/xoá bill) để báo
  // cho Bảng Báo Cáo Tổng tự làm mới ngầm — không cần đợi người dùng bấm
  // qua tab đó mới thấy số liệu mới nhất.
  const [billsChangedToken, setBillsChangedToken] = useState(0);
  const notifyBillsChanged = () => setBillsChangedToken((t) => t + 1);

  // Số Bill No Post đang treo — hiện làm badge cảnh báo ngay trên thẻ tab,
  // kể cả khi chưa mở tab đó, để không bị quên xử lý.
  const [noPostCount, setNoPostCount] = useState(0);
  const loadNoPostCount = useCallback(async () => {
    try {
      const rows = await getMinibarNoPostBills(thang);
      setNoPostCount(new Set(rows.map((r) => r.BillId)).size);
    } catch {
      // im lặng — không chặn UI nếu lỗi đếm badge (VD bảng minibar_nopost_bills chưa được tạo)
    }
  }, [thang]);
  useEffect(() => { loadNoPostCount(); }, [loadNoPostCount]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (billsChangedToken) loadNoPostCount(); }, [billsChangedToken]);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await getMinibarCatalog();
      setCatalog(data);
    } finally {
      setCatalogLoaded(true);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-white">
            <Coffee className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold text-[#141414]">QUẢN LÝ MINIBAR</h1>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5 print:hidden">
        {[
          { key: 'SUMMARY', label: 'BẢNG BÁO CÁO TỔNG MINIBAR', icon: Coffee },
          { key: 'BILLS', label: 'GHI NHẬN DAILY BILLS', icon: Receipt, activeClass: 'bg-yellow-400 text-[#141414] border-yellow-400', inactiveClass: 'bg-yellow-100 text-[#141414] hover:bg-yellow-200 border-yellow-400' },
          { key: 'SETUP', label: 'SET UP MINIBAR PHÒNG KHÁCH', icon: Layers },
          {
            key: 'NOPOST', label: 'DANH SÁCH BILL NO POST', icon: AlertTriangle,
            activeClass: 'bg-amber-400 text-[#141414] border-amber-500',
            inactiveClass: 'bg-amber-200 text-[#141414] hover:bg-amber-300 border-amber-500',
            badge: noPostCount > 0 ? noPostCount : null,
          },
        ].map(({ key, label, icon: Icon, activeClass, inactiveClass, badge }) => (
          <button key={key} onClick={() => goToTab(key)}
            className={`flex items-center gap-2 rounded border border-[#141414] px-3.5 py-1.5 text-xs font-bold ${
              activeTab === key
                ? (activeClass || 'bg-[#141414] text-white')
                : (inactiveClass || 'bg-white text-[#141414] hover:bg-[#E4E3E0]')
            }`}>
            {key === 'NOPOST' ? <span className="text-sm leading-none">❗</span> : <Icon className="h-4 w-4" />}
            {label}
            {badge != null && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {!catalogLoaded ? (
        <div className="py-16 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {visitedTabs.SUMMARY && (
            <div className={activeTab === 'SUMMARY' ? '' : 'hidden'}>
              <SummaryTab thang={thang} catalog={catalog} onReloadCatalog={loadCatalog} refreshToken={billsChangedToken} />
            </div>
          )}
          {visitedTabs.BILLS && (
            <div className={activeTab === 'BILLS' ? '' : 'hidden'}>
              <DailyBillsTab thang={thang} catalog={catalog} onBillsChanged={notifyBillsChanged} refreshToken={billsChangedToken} />
            </div>
          )}
          {visitedTabs.SETUP && (
            <div className={activeTab === 'SETUP' ? '' : 'hidden'}>
              <SetupTab thang={thang} />
            </div>
          )}
          {visitedTabs.NOPOST && (
            <div className={activeTab === 'NOPOST' ? '' : 'hidden'}>
              <NoPostBillsTab thang={thang} onPosted={notifyBillsChanged} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
