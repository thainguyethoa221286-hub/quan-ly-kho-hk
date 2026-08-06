import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Download, Printer, RefreshCw, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import {
  getKhoData,
  saveKhoItem,
  deleteKhoItem,
  rolloverMonth,
} from '../../services/googleSheetsService';

// ---------- Helpers ----------
function computeDerived(item) {
  const n = (v) => Number(v) || 0;
  const suDung = (n(item.DauKy) + n(item.Nhap)) - (n(item.Ton) + n(item.Transfer) + n(item.HuHongMat));
  const tongXuat = n(item.Nhap) + n(item.Transfer) + n(item.HuHongMat) + suDung;
  const tongKho = n(item.Ton) + n(item.SetUp);
  const thanhTien = suDung * n(item.Cost);
  return { ...item, SuDung: suDung, TongXuat: tongXuat, TongKho: tongKho, ThanhTien: thanhTien };
}

function nextMonthStr(thang) {
  const [y, m] = thang.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function lastDayOfMonthStr(thang) {
  const [y, m] = thang.split('-').map(Number);
  const last = new Date(y, m, 0);
  return `${String(last.getDate()).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}
function firstDayOfMonthStr(thang) {
  const [y, m] = thang.split('-').map(Number);
  return `01/${String(m).padStart(2, '0')}/${y}`;
}

const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');

const EXCEL_HEADERS = [
  'STT', 'CODE', 'TÊN MẶT HÀNG', 'ĐVT', 'ĐẦU KỲ', 'SET UP', 'NHẬP',
  'TRANFER', 'HƯ HỎNG/ MẤT', 'SỬ DỤNG', 'TỔNG XUẤT', 'TỒN',
  'TỔNG KHO', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'GHI CHÚ',
];
const COL_COUNT = EXCEL_HEADERS.length; // 16

// ---------- New item form ----------
function NewItemRow({ onSave, onCancel, nextStt }) {
  const [form, setForm] = useState({
    Stt: nextStt, MaHang: '', TenHang: '', DVT: '', DauKy: 0, SetUp: 0, Cost: 0,
  });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <tr className="bg-[#FFF9E8]">
      <td className="border border-[#141414]/30 px-2 py-1">
        <input className="w-10 bg-transparent text-xs" value={form.Stt} onChange={set('Stt')} />
      </td>
      <td className="min-w-[280px] border border-[#141414]/30 px-2 py-1">
        <div className="flex gap-1">
          <input className="w-24 bg-transparent text-xs text-slate-500" placeholder="Mã hàng (tuỳ chọn)" value={form.MaHang} onChange={set('MaHang')} />
          <input className="flex-1 bg-transparent text-xs font-medium" placeholder="Tên mặt hàng" value={form.TenHang} onChange={set('TenHang')} />
        </div>
      </td>
      <td className="border border-[#141414]/30 px-2 py-1">
        <input className="w-14 bg-transparent text-xs" placeholder="ĐVT" value={form.DVT} onChange={set('DVT')} />
      </td>
      <td className="border border-[#141414]/30 px-2 py-1">
        <input type="number" className="w-16 bg-transparent text-xs" value={form.DauKy} onChange={set('DauKy')} />
      </td>
      <td className="border border-[#141414]/30 px-2 py-1">
        <input type="number" className="w-16 bg-transparent text-xs" value={form.SetUp} onChange={set('SetUp')} />
      </td>
      <td colSpan={7} className="border border-[#141414]/30 px-2 py-1 text-center text-[10px] text-slate-500">
        Nhập / Transfer / Hư hỏng / Sử dụng / Tổng xuất / Tồn / Tổng kho — sửa sau khi lưu
      </td>
      <td className="border border-[#141414]/30 px-2 py-1" />
      <td className="border border-[#141414]/30 px-2 py-1 whitespace-nowrap">
        <button
          onClick={() => onSave(form)}
          disabled={!form.TenHang}
          className="mr-1 rounded bg-[#141414] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-30"
        >
          Lưu
        </button>
        <button onClick={onCancel} className="rounded border border-[#141414] px-2 py-1 text-[10px]">
          Huỷ
        </button>
      </td>
    </tr>
  );
}

// ---------- Export options modal ----------
function ExportModal({ defaultFrom, defaultTo, onCancel, onConfirm }) {
  const [form, setForm] = useState({
    tuNgay: defaultFrom,
    denNgay: defaultTo,
    occ: '',
    roomNight: '',
    pax: '',
  });
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
      <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-bold">Thông tin xuất báo cáo Excel</h3>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Từ ngày</label>
              <input value={form.tuNgay} onChange={set('tuNgay')} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="dd/mm/yyyy" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Đến ngày</label>
              <input value={form.denNgay} onChange={set('denNgay')} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="dd/mm/yyyy" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">OCC (%)</label>
            <input value={form.occ} onChange={set('occ')} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="VD: 85.91" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Room Night</label>
              <input value={form.roomNight} onChange={set('roomNight')} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="VD: 1323" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Pax</label>
              <input value={form.pax} onChange={set('pax')} className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder="VD: 1364" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border border-[#141414] px-3 py-1.5 text-sm">Huỷ</button>
          <button
            onClick={() => onConfirm(form)}
            className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-sm font-bold text-white"
          >
            <Download className="h-4 w-4" /> Xuất Excel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Main component ----------
export default function StoreModule() {
  const { selectedMonth, setSelectedMonth } = useStore();
  const thang = selectedMonth;
  const setThang = setSelectedMonth;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingRows, setSavingRows] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [rolloverBusy, setRolloverBusy] = useState(false);
  const [confirmRollover, setConfirmRollover] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const loadData = useCallback(async (month) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKhoData(month);
      setItems(data.map(computeDerived));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(thang);
  }, [thang, loadData]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (it) =>
        String(it.TenHang || '').toLowerCase().includes(term) ||
        String(it.MaHang || '').toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const totals = useMemo(() => {
    const sum = (field) => items.reduce((acc, it) => acc + (Number(it[field]) || 0), 0);
    return {
      Nhap: sum('Nhap'),
      Transfer: sum('Transfer'),
      HuHongMat: sum('HuHongMat'),
      SuDung: sum('SuDung'),
      TongXuat: sum('TongXuat'),
      Ton: sum('Ton'),
      TongKho: sum('TongKho'),
      ThanhTien: sum('ThanhTien'),
    };
  }, [items]);

  // ---- Inline edit handlers ----
  const handleFieldChange = (rowIndex, field, value) => {
    setItems((prev) =>
      prev.map((it) => (it.rowIndex === rowIndex ? computeDerived({ ...it, [field]: value }) : it))
    );
  };

  const handleFieldBlur = async (rowIndex) => {
    const item = items.find((it) => it.rowIndex === rowIndex);
    if (!item) return;
    setSavingRows((s) => ({ ...s, [rowIndex]: true }));
    try {
      const saved = await saveKhoItem(thang, item);
      setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, ...saved } : it)));
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
    if (!window.confirm('Xoá mặt hàng này khỏi bảng kho?')) return;
    try {
      await deleteKhoItem(thang, rowIndex);
      setItems((prev) => prev.filter((it) => it.rowIndex !== rowIndex));
    } catch (err) {
      setError('Lỗi khi xoá: ' + err.message);
    }
  };

  const handleAddNew = async (form) => {
    try {
      const saved = await saveKhoItem(thang, computeDerived({ ...form, Nhap: 0, Transfer: 0, HuHongMat: 0, SuDung: 0, Ton: 0, GhiChu: '' }));
      setItems((prev) => [...prev, saved]);
      setShowAddRow(false);
    } catch (err) {
      setError('Lỗi khi thêm mới: ' + err.message);
    }
  };

  const handleRollover = async () => {
    setRolloverBusy(true);
    setError(null);
    try {
      const toThang = nextMonthStr(thang);
      await rolloverMonth(thang, toThang);
      setConfirmRollover(false);
      setThang(toThang);
    } catch (err) {
      setError('Lỗi khi kết chuyển tháng: ' + err.message);
    } finally {
      setRolloverBusy(false);
    }
  };

  // ---- Excel export (khớp mẫu báo cáo thật) ----
  const runExportExcel = (opts) => {
    const [y, m] = thang.split('-').map(Number);
    const grey = 'D9D9D9';
    const yellow = 'FFF2CC';
    const red = 'FF0000';
    const black = '141414';

    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } },
    };

    const aoa = [];
    aoa.push([`CHỐT CÁC MẶT HÀNG CUỐI THÁNG ( TỪ NGÀY ${opts.tuNgay} - ${opts.denNgay} )`]);
    aoa.push([`OCC: ${opts.occ || 0}%       ROOM NIGHT: ${opts.roomNight || 0}       Pax: ${opts.pax || 0}`]);
    const headerRow = [...EXCEL_HEADERS];
    headerRow[4] = `ĐẦU KỲ ${String(m).padStart(2, '0')}/${y}`;
    headerRow[11] = `TỒN ${lastDayOfMonthStr(thang)}`;
    aoa.push(headerRow);
    aoa.push(['DANH MỤC VẬT TƯ KHO HK']);
    const bannerRowIdx = aoa.length - 1;

    const dataStartRow = aoa.length;
    items.forEach((it) => {
      aoa.push([
        it.Stt, it.MaHang, it.TenHang, it.DVT, it.DauKy, it.SetUp, it.Nhap,
        it.Transfer, it.HuHongMat, it.SuDung, it.TongXuat, it.Ton, it.TongKho,
        it.Cost, it.ThanhTien, it.GhiChu,
      ]);
    });
    const dataEndRow = aoa.length - 1;

    const totalRowIdx = aoa.length;
    aoa.push([
      '', '', 'TỔNG CỘNG', '', '', '', totals.Nhap, totals.Transfer,
      totals.HuHongMat, totals.SuDung, totals.TongXuat, totals.Ton, totals.TongKho,
      '', totals.ThanhTien, '',
    ]);

    aoa.push([]);
    aoa.push([]);
    const dateRowIdx = aoa.length;
    aoa.push([`Ngày ...... Tháng ...... Năm ${y}`]);
    const sigTitleRowIdx = aoa.length;
    aoa.push(['THỦ KHO VẬT TƯ', '', '', '', '', 'TRƯỞNG BP BUỒNG PHÒNG', '', '', '', '', 'KẾ TOÁN TRƯỞNG']);
    const sigSubRowIdx = aoa.length;
    aoa.push(['(Ký & ghi rõ họ tên)', '', '', '', '', '(Ký & ghi rõ họ tên)', '', '', '', '', '(Ký & ghi rõ họ tên)']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = COL_COUNT - 1;

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
      { s: { r: bannerRowIdx, c: 0 }, e: { r: bannerRowIdx, c: lastCol } },
      { s: { r: dateRowIdx, c: 0 }, e: { r: dateRowIdx, c: lastCol } },
      { s: { r: sigTitleRowIdx, c: 0 }, e: { r: sigTitleRowIdx, c: 4 } },
      { s: { r: sigTitleRowIdx, c: 5 }, e: { r: sigTitleRowIdx, c: 9 } },
      { s: { r: sigTitleRowIdx, c: 10 }, e: { r: sigTitleRowIdx, c: 15 } },
      { s: { r: sigSubRowIdx, c: 0 }, e: { r: sigSubRowIdx, c: 4 } },
      { s: { r: sigSubRowIdx, c: 5 }, e: { r: sigSubRowIdx, c: 9 } },
      { s: { r: sigSubRowIdx, c: 10 }, e: { r: sigSubRowIdx, c: 15 } },
    ];

    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 7 }, { wch: 10 }, { wch: 8 },
      { wch: 8 }, { wch: 9 }, { wch: 11 }, { wch: 9 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
    ];

    const setCellStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };

    setCellStyle(0, 0, { font: { bold: true, sz: 14, name: 'Times New Roman' }, alignment: { horizontal: 'center', vertical: 'center' } });
    setCellStyle(1, 0, { font: { bold: true, sz: 11, name: 'Times New Roman' }, alignment: { horizontal: 'center' } });

    // Header row — SET UP (c=5) và TỒN (c=11) chữ đỏ
    for (let c = 0; c < COL_COUNT; c++) {
      const isRed = c === 5 || c === 11;
      setCellStyle(2, c, {
        font: { bold: true, sz: 10, color: { rgb: isRed ? red : black }, name: 'Times New Roman' },
        fill: { fgColor: { rgb: grey } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: thinBorder,
      });
    }

    setCellStyle(bannerRowIdx, 0, {
      font: { bold: true, sz: 10, color: { rgb: red }, name: 'Times New Roman' },
      fill: { fgColor: { rgb: yellow } },
      alignment: { horizontal: 'left', vertical: 'center' },
    });

    for (let r = dataStartRow; r <= dataEndRow; r++) {
      for (let c = 0; c < COL_COUNT; c++) {
        const isRed = c === 5 || c === 11;
        const isNum = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(c);
        setCellStyle(r, c, {
          font: { sz: 10, color: { rgb: isRed ? red : black }, name: 'Times New Roman' },
          alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
          border: thinBorder,
          ...(c === 13 || c === 14 ? { numFmt: '#,##0' } : {}),
        });
      }
    }

    for (let c = 0; c < COL_COUNT; c++) {
      setCellStyle(totalRowIdx, c, {
        font: { bold: true, sz: 10, name: 'Times New Roman' },
        fill: { fgColor: { rgb: 'F2F2F2' } },
        border: thinBorder,
        ...(c === 13 || c === 14 ? { numFmt: '#,##0' } : {}),
      });
    }

    [0, 5, 10].forEach((c) => {
      setCellStyle(sigTitleRowIdx, c, { font: { bold: true, sz: 11, name: 'Times New Roman' }, alignment: { horizontal: 'center' } });
      setCellStyle(sigSubRowIdx, c, { font: { italic: true, sz: 9, name: 'Times New Roman' }, alignment: { horizontal: 'center' } });
    });
    setCellStyle(dateRowIdx, 0, { font: { italic: true, sz: 10, name: 'Times New Roman' }, alignment: { horizontal: 'right' } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Kho_${thang}`);
    XLSX.writeFile(wb, `Bao_Cao_Kho_${thang}.xlsx`);
    setShowExportModal(false);
  };

  return (
    <div>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
        }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>

      {/* ---- Toolbar ---- */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hàng hoặc mã hàng..."
            className="w-64 rounded border border-[#141414] bg-white py-1.5 pl-8 pr-3 text-sm focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm mặt hàng
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> Xuất Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]"
          >
            <Printer className="h-3.5 w-3.5" /> In báo cáo
          </button>
          <button
            onClick={() => setConfirmRollover(true)}
            className="flex items-center gap-1 rounded bg-[#10B981] px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Kết chuyển sang tháng sau
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="hidden print:block print:mb-4 print:text-center">
        <div className="text-lg font-bold">M HOTEL</div>
        <div className="text-sm">BỘ PHẬN HOUSEKEEPING — BÁO CÁO KHO & VẬT TƯ — Tháng {thang}</div>
      </div>

      {/* ---- Table ---- */}
      <div className="overflow-x-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#F2F1EE] font-mono uppercase text-[10px] text-[#141414]">
            <tr>
              {['STT', 'Tên mặt hàng', 'ĐVT', 'Đầu kỳ', 'Set up', 'Nhập', 'Transfer',
                'Hư hỏng/mất', 'Sử dụng', 'Tổng xuất', 'Tồn/Cuối kỳ', 'Tổng Kho', 'Ghi chú', ''].map((h, i) => (
                <th
                  key={h + i}
                  className={`border border-[#141414]/30 px-2 py-2 text-left ${i === 1 ? 'min-w-[280px]' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-8 text-center text-slate-400">Chưa có dữ liệu.</td>
              </tr>
            ) : (
              filteredItems.map((it) => (
                <tr key={it.rowIndex} className={savingRows[it.rowIndex] ? 'opacity-50' : ''}>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.Stt}</td>
                  <td className="min-w-[280px] border border-[#141414]/30 px-2 py-1 font-medium" title={it.MaHang ? `Mã: ${it.MaHang}` : undefined}>
                    {it.TenHang}
                  </td>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.DVT}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.DauKy)}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.SetUp)}</td>

                  <td className="border border-[#141414]/30 p-0">
                    <input
                      type="number"
                      value={it.Nhap}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'Nhap', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      type="number"
                      value={it.Transfer}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'Transfer', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right text-slate-500" title="Tự động đồng bộ từ Module Hư Hỏng & Thiệt Hại">
                    {fmtNumber(it.HuHongMat)}
                  </td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold" title="Tự động tính = (Đầu kỳ + Nhập) − (Tồn + Transfer + Hư hỏng/mất)">
                    {fmtNumber(it.SuDung)}
                  </td>

                  <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.TongXuat)}</td>

                  {/* Editable: Ton (nhập tay, kiểm kê thực tế) */}
                  <td className="border border-[#141414]/30 p-0 bg-red-50/40">
                    <input
                      type="number"
                      value={it.Ton}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'Ton', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-16 bg-transparent px-2 py-1 text-right font-semibold text-red-600 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </td>

                  <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.TongKho)}</td>

                  <td className="border border-[#141414]/30 p-0">
                    <input
                      value={it.GhiChu || ''}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'GhiChu', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-32 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
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

            {showAddRow && (
              <NewItemRow
                nextStt={items.length + 1}
                onSave={handleAddNew}
                onCancel={() => setShowAddRow(false)}
              />
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-[#F2F1EE] font-bold">
              <tr>
                <td colSpan={5} className="border border-[#141414]/30 px-2 py-2">TỔNG CỘNG</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.Nhap)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.Transfer)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.HuHongMat)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.SuDung)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.TongXuat)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.Ton)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.TongKho)}</td>
                <td className="border border-[#141414]/30 px-2 py-2" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-10 hidden grid-cols-3 gap-4 text-center text-sm print:grid">
        <div>
          <p className="font-bold">Thủ Kho Vật Tư</p>
          <p className="text-xs text-slate-500">(Ký & ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="font-bold">Trưởng BP Buồng Phòng</p>
          <p className="text-xs text-slate-500">(Ký & ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="font-bold">Kế Toán Trưởng</p>
          <p className="text-xs text-slate-500">(Ký & ghi rõ họ tên)</p>
        </div>
      </div>

      {showExportModal && (
        <ExportModal
          defaultFrom={firstDayOfMonthStr(thang)}
          defaultTo={lastDayOfMonthStr(thang)}
          onCancel={() => setShowExportModal(false)}
          onConfirm={runExportExcel}
        />
      )}

      {confirmRollover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
          <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-base font-bold">Xác nhận kết chuyển tháng</h3>
            <p className="mb-4 text-sm text-slate-600">
              Toàn bộ <strong>Tồn</strong> (số bạn đã nhập tay) của tháng <strong>{thang}</strong> sẽ trở
              thành <strong>Đầu kỳ</strong> của tháng <strong>{nextMonthStr(thang)}</strong>. Các ô Nhập,
              Transfer, Hư hỏng/mất, Sử dụng, Tồn của tháng mới sẽ để <strong>trống</strong> (không phải
              số 0) để bạn nhập liệu nhanh hơn. <strong>Ghi chú</strong> sẽ được giữ nguyên từ tháng cũ.
              Thao tác này không thể hoàn tác.
            </p>
            {rolloverBusy && (
              <p className="mb-3 flex items-center gap-2 rounded bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang kết chuyển dữ liệu sang Google Sheets, vui lòng đợi trong giây lát... (có thể mất
                tới 30-60 giây nếu danh sách nhiều mặt hàng)
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRollover(false)}
                className="rounded border border-[#141414] px-3 py-1.5 text-sm"
                disabled={rolloverBusy}
              >
                Huỷ
              </button>
              <button
                onClick={handleRollover}
                disabled={rolloverBusy}
                className="flex items-center gap-1 rounded bg-[#10B981] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {rolloverBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Xác nhận kết chuyển
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
