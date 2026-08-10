import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Coffee, Download, Printer, Loader2, X, AlertTriangle, Plus, RefreshCw,
  Layers, Receipt, ChevronDown, Edit2, Trash2, FileUp, Search,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import { parsePMSPdfFile } from '../../services/pmsPdfParser';
import {
  getMinibarCatalog, saveMinibarCatalogItem,
  getMinibarSetup, saveMinibarSetupItem,
  getMinibarFBFO, saveMinibarFBFOItem,
  getMinibarBills, saveMinibarBill, deleteMinibarBill,
  getMinibarSummary, saveMinibarSummaryItem, rolloverMinibarMonth,
} from '../../services/googleSheetsService';

const FLOORS = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9'];
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
    const key = `${r.Ngay}|${r.Phong}|${r.TenHang}`;
    appMap[key] = (appMap[key] || 0) + (Number(r.SLBill) || 0);
  });
  const pmsMap = {};
  pmsRecords.forEach((r) => {
    const key = `${r.ngay}|${r.phong}|${r.tenItem}`;
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

function SummaryTab({ thang, catalog, onReloadCatalog }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingRows, setSavingRows] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDiscrepancy, setShowDiscrepancy] = useState(false);
  const [rolloverBusy, setRolloverBusy] = useState(false);
  const [confirmRollover, setConfirmRollover] = useState(false);
  const [pmsRecords, setPmsRecords] = useState(null);
  const [pmsFileName, setPmsFileName] = useState('');
  const [pmsUploading, setPmsUploading] = useState(false);
  const [pmsError, setPmsError] = useState(null);
  const [showPmsModal, setShowPmsModal] = useState(false);
  const [bills, setBills] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, billsData] = await Promise.all([getMinibarSummary(thang), getMinibarBills(thang)]);
      setItems(data);
      setBills(billsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [thang]);

  useEffect(() => { load(); }, [load]);
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
    const setupTotal = items.reduce((s, it) => s + (Number(it.SetupRoom) || 0), 0);
    const urgentCount = items.filter((it) => Number(it.ChenhLech) !== 0).length;
    return { setupTotal, urgentCount };
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

  const handleRollover = async () => {
    setRolloverBusy(true);
    setError(null);
    try {
      await rolloverMinibarMonth(thang, nextMonthStr(thang));
      setConfirmRollover(false);
      await load();
    } catch (err) {
      setError('Lỗi khi kết chuyển: ' + err.message);
    } finally {
      setRolloverBusy(false);
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
          <button onClick={() => setConfirmRollover(true)} className="flex items-center gap-1 rounded bg-[#10B981] px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
            <RefreshCw className="h-3.5 w-3.5" /> Kết Chuyển Tháng Sau
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

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
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

        <div className="rounded-xl border border-slate-200 bg-blue-50 p-4 shadow-md transition-shadow duration-200 hover:shadow-lg">
          <p className="text-xs font-mono uppercase text-slate-500">Tồn Khay Setup Phòng</p>
          <p className="mt-1 text-2xl font-bold text-[#141414]">{fmtNumber(totals.setupTotal)} <span className="text-sm font-normal text-slate-400">mục</span></p>
          <p className="text-[11px] text-slate-400">Lấy tự động từ Sub 4B + FB Tồn Đầu</p>
        </div>
      </div>

      <div className="max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-700 text-xs font-bold uppercase tracking-wide text-white">
            <tr>
              {['STT', 'TÊN HÀNG MINIBAR', 'ĐVT', 'TỒN ĐẦU', 'NHẬP', 'BILLED', 'NO CHARGE', 'FOC', 'TRANS FO', 'TRANS FB', 'TỒN KHO MB', 'SETUP ROOM', 'TỒN TRÊN BÁO CÁO', 'TỒN THỰC TẾ', 'CHÊNH LỆCH', 'GHI CHÚ'].map((h, i) => (
                <th key={h + i} className={`sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-left shadow-[0_1px_0_0_#141414] ${i === 1 ? 'min-w-[200px]' : ''}`}>{h}</th>
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
                      <input type="number" data-field="Nhap" value={it.Nhap === 0 ? '' : it.Nhap}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'Nhap', e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, 'Nhap')}
                        onBlur={() => persistRow(it.rowIndex)}
                        placeholder="0"
                        className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none" />
                    </td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right text-emerald-600">{fmtNumber(it.Billed)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right text-red-500">{fmtNumber(it.NoCharge)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right text-amber-600">{fmtNumber(it.FOC)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.TransferFO)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.TransferFB)}</td>
                    <td className="border-2 border-[#141414] bg-yellow-50 p-0">
                      <input type="number" data-field="TonKho" value={it.TonKho === 0 ? '' : it.TonKho}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'TonKho', e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, 'TonKho')}
                        onBlur={() => persistRow(it.rowIndex)}
                        placeholder="0"
                        className="w-16 bg-transparent px-2 py-1 text-right text-base font-bold focus:bg-yellow-300 focus:outline-none" />
                    </td>
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

      {confirmRollover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
          <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-base font-bold">Xác nhận kết chuyển tháng</h3>
            <p className="mb-4 text-sm text-slate-600">
              Tồn Thực Tế tháng <strong>{thang}</strong> sẽ trở thành Tồn Đầu tháng <strong>{nextMonthStr(thang)}</strong>.
              Nhập/Tồn Kho MB tháng mới sẽ để trống chờ nhập lại. Không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmRollover(false)} disabled={rolloverBusy} className="rounded border border-[#141414] px-3 py-1.5 text-sm">Huỷ</button>
              <button onClick={handleRollover} disabled={rolloverBusy} className="flex items-center gap-1 rounded bg-[#10B981] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">
                {rolloverBusy && <Loader2 className="h-4 w-4 animate-spin" />} Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================================================================
// SUB 4A: Ghi Nhận Daily Bills
// ==================================================================
function DailyBillsTab({ thang, catalog }) {
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

  const groupedBills = useMemo(() => {
    const map = {};
    bills.forEach((r) => {
      if (!map[r.BillId]) map[r.BillId] = { billId: r.BillId, ngay: r.Ngay, phong: r.Phong, tang: r.Tang, nguoiBaoCao: r.NguoiBaoCao, items: [] };
      map[r.BillId].items.push(r);
    });
    let list = Object.values(map).sort((a, b) => (b.ngay || '').localeCompare(a.ngay || ''));
    if (fromDate) list = list.filter((b) => b.ngay >= fromDate);
    if (toDate) list = list.filter((b) => b.ngay <= toDate);
    return list;
  }, [bills, fromDate, toDate]);

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
    const items = catalog
      .map((c) => {
        const q = quantities[c.TenHang] || {};
        const slBill = parseAmount(q.bill);
        const slFOC = parseAmount(q.foc);
        if (slBill === 0 && slFOC === 0) return null;
        return { tenHang: c.TenHang, dvt: c.DVT, donGia: c.DonGia, slBill, slFOC };
      })
      .filter(Boolean);

    if (items.length === 0) { setError('Vui lòng nhập số lượng cho ít nhất 1 Item.'); return; }

    setPosting(true);
    setError(null);
    try {
      await saveMinibarBill(thang, { billId: editingBillId, phong, ngay, tang: '', nguoiBaoCao, items, ghiChu: '' });
      resetForm();
      await load();
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
    } catch (err) {
      setError('Lỗi khi xoá: ' + err.message);
    }
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

          <p className="mb-2 text-xs font-semibold text-slate-600">Chọn Item</p>
          <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
            {catalog.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Chưa có Item Minibar nào — vào tab "Bảng Báo Cáo Tổng" để thêm.</p>
            ) : (
              catalog.map((c) => (
                <div key={c.TenHang} className="flex items-center justify-between rounded border border-slate-200 p-2.5">
                  <div>
                    <p className="text-sm font-semibold text-[#141414]">{c.TenHang}</p>
                    <p className="text-[11px] text-slate-400">{fmtNumber(c.DonGia)} đ / {c.DVT}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <label className="mb-0.5 block text-center text-[9px] font-bold text-blue-500">BILL</label>
                      <input type="number" value={quantities[c.TenHang]?.bill ?? ''} onChange={(e) => setQty(c.TenHang, 'bill', e.target.value)}
                        className="w-14 rounded border-2 border-blue-300 bg-blue-50 px-1.5 py-1 text-center text-sm focus:outline-none" placeholder="0" />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-center text-[9px] font-bold text-amber-600">FOC</label>
                      <input type="number" value={quantities[c.TenHang]?.foc ?? ''} onChange={(e) => setQty(c.TenHang, 'foc', e.target.value)}
                        className="w-14 rounded border-2 border-amber-300 bg-amber-50 px-1.5 py-1 text-center text-sm focus:outline-none" placeholder="0" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {editingBillId && <button onClick={resetForm} className="rounded border border-[#141414] px-4 py-2 text-sm font-bold">Huỷ Sửa</button>}
            <button onClick={handlePost} disabled={posting} className="flex flex-1 items-center justify-center gap-1.5 rounded bg-[#141414] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} POST BILL
            </button>
          </div>
        </div>

        {/* ---- Right: History ---- */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
          <h3 className="mb-3 text-sm font-bold uppercase text-[#141414]">Lịch Sử Daily Bills</h3>
          <div className="mb-3 flex items-center gap-2 text-xs">
            <span className="text-slate-500">Từ ngày</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded border border-slate-300 px-2 py-1" />
            <span className="text-slate-500">Đến ngày</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded border border-slate-300 px-2 py-1" />
            {(fromDate || toDate) && <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-slate-400 underline">Xoá lọc</button>}
          </div>

          <div className="max-h-[460px] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
            ) : groupedBills.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Chưa có Bill nào.</p>
            ) : (
              groupedBills.map((b) => {
                const total = b.items.reduce((s, it) => s + (Number(it.SLBill) || 0) * (Number(it.DonGia) || 0), 0);
                return (
                  <div key={b.billId} className="rounded border border-[#141414] bg-white p-3">
                    <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-[#141414] px-2 py-0.5 text-xs font-bold text-white">
                          Phòng {b.phong} ({seqLabel(b.billId, b.phong, b.ngay)})
                        </span>
                        <span className="text-xs text-slate-500">{fmtDateDisplay(b.ngay)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-emerald-600">{fmtNumber(total)} đ</span>
                        <button onClick={() => handleEditBill(b)} className="text-slate-400 hover:text-[#141414]"><Edit2 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeleteBill(b.billId)} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="space-y-0.5 text-xs">
                      {b.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span>{it.TenHang} {it.SLBill > 0 && `x${it.SLBill}`} {it.SLFOC > 0 && <span className="text-amber-600">(FOC x{it.SLFOC})</span>}</span>
                          <span className="text-slate-500">{fmtNumber((it.SLBill || 0) * (it.DonGia || 0))} đ</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 border-t border-slate-100 pt-1 text-[10px] text-slate-400">NV Báo Cáo: {b.nguoiBaoCao || '—'}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
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
        <div className="max-h-[420px] overflow-auto rounded border border-slate-200">
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
                      <input type="number" data-field={`floor-${f}`} value={r[f] === 0 ? '' : r[f]}
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
        <div className="max-h-[380px] overflow-auto rounded border border-slate-200">
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
                      <input type="number" data-field={f} value={r[f] === 0 ? '' : r[f]}
                        onChange={(e) => handleFbfoChange(r.rowIndex, f, e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, f)}
                        onBlur={() => persistFbfoRow(r.rowIndex)}
                        placeholder="0" className="w-16 bg-transparent px-1 py-1 text-center focus:bg-yellow-300 focus:outline-none" />
                    </td>
                  ))}
                  <td className="border border-slate-200 px-2 py-1 text-center font-bold">{fmtNumber(r.FBTransfer)}</td>
                  {['FOTonDau', 'FOTonCuoi'].map((f) => (
                    <td key={f} className="border border-slate-200 p-0">
                      <input type="number" data-field={f} value={r[f] === 0 ? '' : r[f]}
                        onChange={(e) => handleFbfoChange(r.rowIndex, f, e.target.value)}
                        onKeyDown={(e) => gridKeyNav(e, f)}
                        onBlur={() => persistFbfoRow(r.rowIndex)}
                        placeholder="0" className="w-16 bg-transparent px-1 py-1 text-center focus:bg-yellow-300 focus:outline-none" />
                    </td>
                  ))}
                  <td className="border border-slate-200 px-2 py-1 text-center font-bold">{fmtNumber(r.FOTransfer)}</td>
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
          { key: 'BILLS', label: 'GHI NHẬN DAILY BILLS', icon: Receipt },
          { key: 'SETUP', label: 'SET UP MINIBAR PHÒNG KHÁCH', icon: Layers },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 rounded border border-[#141414] px-3.5 py-1.5 text-xs font-bold ${activeTab === key ? 'bg-[#141414] text-white' : 'bg-white text-[#141414] hover:bg-[#E4E3E0]'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {!catalogLoaded ? (
        <div className="py-16 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
      ) : (
        <>
          {activeTab === 'SUMMARY' && <SummaryTab thang={thang} catalog={catalog} onReloadCatalog={loadCatalog} />}
          {activeTab === 'BILLS' && <DailyBillsTab thang={thang} catalog={catalog} />}
          {activeTab === 'SETUP' && <SetupTab thang={thang} />}
        </>
      )}
    </div>
  );
}
