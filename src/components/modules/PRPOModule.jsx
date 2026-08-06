import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ShoppingCart, Download, Printer, Loader2, X, AlertTriangle, Plus, Search, ChevronDown, EyeOff } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import {
  getKhoData,
  getPRPOData,
  savePRPOItem,
  setPRPOHidden,
  addNewItemFull,
} from '../../services/googleSheetsService';

const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');

// ---------- Modal: Thêm Mặt Hàng PR (chọn từ danh mục Kho Store, hoặc tạo mới) ----------
function AddItemModal({ storeItems, existingNames, onCancel, onConfirm, onCreateNew }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [newDvt, setNewDvt] = useState('');
  const [creating, setCreating] = useState(false);

  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return storeItems.filter((it) => {
      if (existingNames.has(it.TenHang)) return false;
      if (!term) return true;
      return String(it.TenHang || '').toLowerCase().includes(term);
    });
  }, [storeItems, existingNames, search]);

  const exactMatchExists = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return storeItems.some((it) => String(it.TenHang || '').toLowerCase() === term);
  }, [storeItems, search]);

  const toggle = (tenHang) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tenHang)) next.delete(tenHang);
      else next.add(tenHang);
      return next;
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await onCreateNew(search.trim(), newDvt.trim());
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
      <div className="flex max-h-[80vh] w-[480px] flex-col rounded-lg bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-bold">Thêm Mặt Hàng PR</h3>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên mặt hàng trong Kho, hoặc gõ tên mới..."
            className="w-full rounded border border-slate-300 py-1.5 pl-8 pr-3 text-sm focus:outline-none"
          />
        </div>

        {/* Tạo mặt hàng hoàn toàn mới nếu gõ tên chưa từng có trong Kho */}
        {search.trim() && !exactMatchExists && (
          <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-3">
            <p className="mb-2 text-xs text-amber-700">
              "<strong>{search.trim()}</strong>" chưa có trong Kho. Bạn có thể tạo mặt hàng mới — hệ
              thống sẽ tự thêm vào cả Module 01 (Kho) và danh sách PR-PO này.
            </p>
            <div className="flex gap-2">
              <input
                value={newDvt}
                onChange={(e) => setNewDvt(e.target.value)}
                placeholder="ĐVT (VD: cái, hộp...)"
                className="flex-1 rounded border border-amber-300 px-2 py-1.5 text-sm focus:outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newDvt.trim()}
                className="flex items-center gap-1 whitespace-nowrap rounded bg-amber-600 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Tạo mặt hàng mới
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto rounded border border-slate-200">
          {available.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-400">
              {storeItems.length === 0 ? 'Chưa có mặt hàng nào trong Kho.' : 'Không còn mặt hàng phù hợp (đã có trong danh sách hoặc không khớp tìm kiếm).'}
            </p>
          ) : (
            available.map((it) => (
              <label
                key={it.TenHang}
                className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selected.has(it.TenHang)}
                  onChange={() => toggle(it.TenHang)}
                  className="h-4 w-4"
                />
                <span className="flex-1">{it.TenHang}</span>
                <span className="text-xs text-slate-400">{it.DVT}</span>
                <span className="w-16 text-right text-xs text-slate-500">Tồn: {fmtNumber(it.Ton)}</span>
              </label>
            ))
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border border-[#141414] px-3 py-1.5 text-sm">Huỷ</button>
          <button
            onClick={() => onConfirm(storeItems.filter((it) => selected.has(it.TenHang)))}
            disabled={selected.size === 0}
            className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-sm font-bold text-white disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Thêm {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Popover: Mặt hàng đã ẩn (khôi phục lại) ----------
function HiddenItemsPanel({ hiddenItems, onRestore, onClose }) {
  return (
    <div className="absolute right-0 top-full z-30 mt-1 w-80 max-h-72 overflow-y-auto rounded border border-slate-300 bg-white shadow-xl print:hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <p className="text-xs font-bold text-slate-600">Mặt hàng đã ẩn</p>
        <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
      </div>
      {hiddenItems.length === 0 ? (
        <p className="p-4 text-center text-sm text-slate-400">Không có mặt hàng nào đang ẩn.</p>
      ) : (
        hiddenItems.map((it) => (
          <div key={it.rowIndex} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-sm last:border-0">
            <span className="flex-1 text-slate-500 line-through">{it.TenHang}</span>
            <button
              onClick={() => onRestore(it.rowIndex)}
              className="ml-2 whitespace-nowrap rounded border border-[#141414] px-2 py-1 text-[11px] font-bold hover:bg-[#E4E3E0]"
            >
              Khôi phục
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default function PRPOModule() {
  const { selectedMonth } = useStore();
  const thang = selectedMonth;

  const [items, setItems] = useState([]);
  const [storeItems, setStoreItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingRows, setSavingRows] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUrgentList, setShowUrgentList] = useState(false);
  const [showHiddenPanel, setShowHiddenPanel] = useState(false);
  const urgentRef = useRef(null);

  const loadData = useCallback(async (month) => {
    setLoading(true);
    setError(null);
    try {
      const [prpoData, storeData] = await Promise.all([getPRPOData(month), getKhoData(month)]);
      setItems(prpoData);
      setStoreItems(storeData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(thang);
  }, [thang, loadData]);

  // Đóng popover "Mặt Hàng Mua Khẩn" khi bấm ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (urgentRef.current && !urgentRef.current.contains(e.target)) setShowUrgentList(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visibleItems = useMemo(() => items.filter((it) => !it.Hidden), [items]);
  const hiddenItems = useMemo(() => items.filter((it) => it.Hidden), [items]);

  const totals = useMemo(() => {
    const sumDeXuat = visibleItems.reduce((acc, it) => acc + (Number(it.DeXuatMua) || 0), 0);
    const urgentItems = visibleItems.filter((it) => (Number(it.StockInHand) || 0) <= 0);
    return { sumDeXuat, urgentItems };
  }, [visibleItems]);

  const existingNames = useMemo(() => new Set(items.map((it) => it.TenHang)), [items]);

  const handleFieldChange = (rowIndex, field, value) => {
    setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, [field]: value } : it)));
  };

  const persistRow = async (rowIndex) => {
    const item = items.find((it) => it.rowIndex === rowIndex);
    if (!item) return;
    setSavingRows((s) => ({ ...s, [rowIndex]: true }));
    try {
      await savePRPOItem(thang, {
        rowIndex: item.rowIndex,
        Stt: item.Stt,
        TenHang: item.TenHang,
        DVT: item.DVT,
        StockMax: item.StockMax,
        GhiChu: item.GhiChu,
      });
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

  // Sửa StockMax -> Đề Xuất Mua hiển thị cần tính lại ngay trên UI
  const handleStockMaxChange = (rowIndex, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.rowIndex !== rowIndex) return it;
        const stockMax = Number(value) || 0;
        const stockInHand = Number(it.StockInHand) || 0;
        return { ...it, StockMax: value, DeXuatMua: Math.max(stockMax - stockInHand, 0) };
      })
    );
  };

  /** Điều hướng phím trong lưới: Enter/ArrowDown xuống dòng dưới, ArrowUp lên dòng
   * trên — luôn preventDefault để không bị input[type=number] tự trừ/cộng giá trị. */
  const handleGridKeyDown = (e, field) => {
    if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const inputs = Array.from(document.querySelectorAll(`input[data-field="${field}"]`));
    const idx = inputs.indexOf(e.target);
    if (idx === -1) return;
    if ((e.key === 'Enter' || e.key === 'ArrowDown') && idx < inputs.length - 1) {
      inputs[idx + 1].focus();
      inputs[idx + 1].select?.();
    } else if (e.key === 'ArrowUp' && idx > 0) {
      inputs[idx - 1].focus();
      inputs[idx - 1].select?.();
    }
  };

  const handleAddItems = async (picked) => {
    setShowAddModal(false);
    try {
      const nextSttStart = items.length + 1;
      for (let i = 0; i < picked.length; i++) {
        const it = picked[i];
        // eslint-disable-next-line no-await-in-loop
        await savePRPOItem(thang, { Stt: nextSttStart + i, TenHang: it.TenHang, DVT: it.DVT, StockMax: 0, GhiChu: '' });
      }
      await loadData(thang);
    } catch (err) {
      setError('Lỗi khi thêm mặt hàng: ' + err.message);
    }
  };

  // Tạo mặt hàng hoàn toàn mới — tự thêm vào cả Module 01 (Kho) và Module 02 (PR-PO)
  const handleCreateNewItem = async (tenHang, dvt) => {
    if (!tenHang || !dvt) return;
    try {
      await addNewItemFull(thang, tenHang, dvt);
      setShowAddModal(false);
      await loadData(thang);
    } catch (err) {
      setError('Lỗi khi tạo mặt hàng mới: ' + err.message);
    }
  };

  // "Xoá" ở giao diện = ẨN, không xoá dòng thật trên Sheet (tránh lệch dữ liệu
  // giữa Module 01 và Module 02). Có thể khôi phục lại qua bảng "Mặt hàng đã ẩn".
  const handleHideRow = async (rowIndex) => {
    try {
      await setPRPOHidden(thang, rowIndex, true);
      setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, Hidden: true } : it)));
    } catch (err) {
      setError('Lỗi khi ẩn mặt hàng: ' + err.message);
    }
  };

  const handleRestoreRow = async (rowIndex) => {
    try {
      await setPRPOHidden(thang, rowIndex, false);
      setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, Hidden: false } : it)));
    } catch (err) {
      setError('Lỗi khi khôi phục mặt hàng: ' + err.message);
    }
  };

  // ---- Excel export ----
  const handleExportExcel = () => {
    const [y, m] = thang.split('-').map(Number);
    const grey = 'D9D9D9';
    const black = '141414';
    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
      left: { style: 'thin', color: { rgb: 'CCCCCC' } },
      right: { style: 'thin', color: { rgb: 'CCCCCC' } },
    };

    const headers = ['STT', 'ITEM', 'UNIT', 'STOCK IN HAND', 'STOCK MAX', 'ĐỀ XUẤT MUA', 'NOTED'];
    const aoa = [];
    aoa.push([`M HOTEL - PHIẾU ĐỀ XUẤT MUA HÀNG VẬT TƯ (PR-PO) - THÁNG ${String(m).padStart(2, '0')}/${y}`]);
    aoa.push([]);
    aoa.push(headers);
    const dataStartRow = aoa.length;
    visibleItems.forEach((it) => {
      aoa.push([it.Stt, it.TenHang, it.DVT, it.StockInHand, it.StockMax, it.DeXuatMua, it.GhiChu]);
    });
    const dataEndRow = aoa.length - 1;
    const totalRowIdx = aoa.length;
    aoa.push(['', 'TỔNG CỘNG', '', '', '', totals.sumDeXuat, '']);
    aoa.push([]);
    aoa.push([]);
    const sigTitleRowIdx = aoa.length;
    aoa.push(['Người đề xuất', '', '', 'Trưởng BP Buồng Phòng', '', '', 'Bộ phận Mua hàng/Kế toán']);
    const sigSubRowIdx = aoa.length;
    aoa.push(['(Ký & ghi rõ họ tên)', '', '', '(Ký & ghi rõ họ tên)', '', '', '(Ký & ghi rõ họ tên)']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = headers.length - 1;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: sigTitleRowIdx, c: 0 }, e: { r: sigTitleRowIdx, c: 2 } },
      { s: { r: sigTitleRowIdx, c: 3 }, e: { r: sigTitleRowIdx, c: 4 } },
      { s: { r: sigTitleRowIdx, c: 5 }, e: { r: sigTitleRowIdx, c: 6 } },
      { s: { r: sigSubRowIdx, c: 0 }, e: { r: sigSubRowIdx, c: 2 } },
      { s: { r: sigSubRowIdx, c: 3 }, e: { r: sigSubRowIdx, c: 4 } },
      { s: { r: sigSubRowIdx, c: 5 }, e: { r: sigSubRowIdx, c: 6 } },
    ];
    ws['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 22 }];

    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };

    setStyle(0, 0, { font: { bold: true, sz: 13, name: 'Times New Roman' }, alignment: { horizontal: 'center' } });
    for (let c = 0; c < headers.length; c++) {
      setStyle(2, c, {
        font: { bold: true, sz: 10, color: { rgb: black }, name: 'Times New Roman' },
        fill: { fgColor: { rgb: grey } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: thinBorder,
      });
    }
    for (let r = dataStartRow; r <= dataEndRow; r++) {
      for (let c = 0; c < headers.length; c++) {
        const isNum = [3, 4, 5].includes(c);
        setStyle(r, c, {
          font: { sz: 10, name: 'Times New Roman' },
          alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
          border: thinBorder,
        });
      }
    }
    for (let c = 0; c < headers.length; c++) {
      setStyle(totalRowIdx, c, { font: { bold: true, sz: 10, name: 'Times New Roman' }, fill: { fgColor: { rgb: 'F2F2F2' } }, border: thinBorder });
    }
    [0, 3, 5].forEach((c) => {
      setStyle(sigTitleRowIdx, c, { font: { bold: true, sz: 11, name: 'Times New Roman' }, alignment: { horizontal: 'center' } });
      setStyle(sigSubRowIdx, c, { font: { italic: true, sz: 9, name: 'Times New Roman' }, alignment: { horizontal: 'center' } });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `PRPO_${thang}`);
    XLSX.writeFile(wb, `PR-PO_${thang}.xlsx`);
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

      {/* ---- Header ---- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-white">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#141414]">ĐỀ XUẤT MUA HÀNG PR-PO</h1>
            <p className="text-xs text-slate-500">
              Công thức: <span className="font-mono font-semibold">ĐỀ XUẤT MUA = STOCK MAX − STOCK IN HAND</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm Mặt Hàng PR
          </button>
          <div className="relative">
            <button
              onClick={() => setShowHiddenPanel((s) => !s)}
              className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]"
            >
              Mặt Hàng Đã Ẩn {hiddenItems.length > 0 ? `(${hiddenItems.length})` : ''}
            </button>
            {showHiddenPanel && (
              <HiddenItemsPanel
                hiddenItems={hiddenItems}
                onRestore={handleRestoreRow}
                onClose={() => setShowHiddenPanel(false)}
              />
            )}
          </div>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> Export PR-PO Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]"
          >
            <Printer className="h-3.5 w-3.5" /> In Phiếu PR-PO
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
          <p className="text-xs font-mono uppercase text-slate-500">Tổng SL Đề Xuất Mua</p>
          <p className="mt-1 text-2xl font-bold text-[#141414]">{fmtNumber(totals.sumDeXuat)} <span className="text-sm font-normal text-slate-400">sản phẩm</span></p>
        </div>

        {/* Thẻ Mặt Hàng Mua Khẩn — bấm để xổ danh sách */}
        <div ref={urgentRef} className="relative">
          <button
            onClick={() => setShowUrgentList((s) => !s)}
            className="flex w-full items-center justify-between rounded border border-[#141414] bg-white p-4 text-left hover:bg-red-50/40"
          >
            <div>
              <p className="flex items-center gap-1 text-xs font-mono uppercase text-slate-500">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Mặt Hàng Mua Khẩn
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {totals.urgentItems.length} <span className="text-sm font-normal text-slate-400">mục (hết tồn kho)</span>
              </p>
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showUrgentList ? 'rotate-180' : ''}`} />
          </button>

          {showUrgentList && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded border border-red-300 bg-white shadow-xl">
              {totals.urgentItems.length === 0 ? (
                <p className="p-3 text-center text-sm text-slate-400">Không có mặt hàng nào hết tồn kho 🎉</p>
              ) : (
                totals.urgentItems.map((it) => (
                  <div key={it.rowIndex} className="flex items-center justify-between border-b border-red-100 px-3 py-2 text-sm last:border-0">
                    <span className="font-medium text-[#141414]">{it.TenHang}</span>
                    <span className="text-xs font-bold text-red-600">Tồn: 0 {it.DVT}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ---- Print header ---- */}
      <div className="hidden print:block print:mb-4 print:text-center">
        <div className="text-lg font-bold">M HOTEL</div>
        <div className="text-sm">PHIẾU ĐỀ XUẤT MUA HÀNG VẬT TƯ (PR-PO) — Tháng {thang}</div>
      </div>

      {/* ---- Table ---- */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto overflow-x-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#F2F1EE] font-mono uppercase text-[10px] text-[#141414]">
            <tr>
              {['STT', 'ITEM', 'UNIT', 'STOCK IN HAND', 'STOCK MAX', 'ĐỀ XUẤT MUA', 'NOTED', ''].map((h, i) => (
                <th key={h + i} className={`sticky top-0 z-20 border border-[#141414]/30 bg-[#F2F1EE] px-2 py-2 text-left shadow-[0_1px_0_0_#141414] ${i === 1 ? 'min-w-[260px]' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                </td>
              </tr>
            ) : visibleItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  Chưa có mặt hàng đề xuất. Bấm "+ Thêm Mặt Hàng PR" để chọn mặt hàng từ Kho.
                </td>
              </tr>
            ) : (
              visibleItems.map((it) => {
                const isUrgent = (Number(it.StockInHand) || 0) <= 0;
                return (
                  <tr key={it.rowIndex} className={savingRows[it.rowIndex] ? 'opacity-50' : isUrgent ? 'bg-red-50/50' : ''}>
                    <td className="border border-[#141414]/30 px-2 py-1">{it.Stt}</td>
                    <td className="min-w-[260px] border border-[#141414]/30 px-2 py-1 font-medium">{it.TenHang}</td>
                    <td className="border border-[#141414]/30 px-2 py-1">{it.DVT}</td>

                    <td className={`border border-[#141414]/30 px-2 py-1 text-right ${isUrgent ? 'font-bold text-red-600' : ''}`}>
                      {fmtNumber(it.StockInHand)}
                    </td>

                    {/* Editable: StockMax */}
                    <td className="border border-[#141414]/30 p-0">
                      <input
                        type="number"
                        data-field="StockMax"
                        value={it.StockMax}
                        onChange={(e) => handleStockMaxChange(it.rowIndex, e.target.value)}
                        onKeyDown={(e) => handleGridKeyDown(e, 'StockMax')}
                        onBlur={() => persistRow(it.rowIndex)}
                        className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>

                    <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.DeXuatMua)}</td>

                    {/* Editable: GhiChu */}
                    <td className="border border-[#141414]/30 p-0">
                      <input
                        data-field="GhiChu"
                        value={it.GhiChu || ''}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'GhiChu', e.target.value)}
                        onKeyDown={(e) => handleGridKeyDown(e, 'GhiChu')}
                        onBlur={() => persistRow(it.rowIndex)}
                        className="w-32 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>

                    <td className="border border-[#141414]/30 px-1 py-1 text-center print:hidden">
                      <button
                        onClick={() => handleHideRow(it.rowIndex)}
                        title="Ẩn mặt hàng này khỏi danh sách (không xoá dữ liệu, có thể khôi phục lại)"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {visibleItems.length > 0 && (
            <tfoot className="bg-[#F2F1EE] font-bold">
              <tr>
                <td colSpan={5} className="border border-[#141414]/30 px-2 py-2">TỔNG CỘNG</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.sumDeXuat)}</td>
                <td className="border border-[#141414]/30 px-2 py-2" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Print-only signature block */}
      <div className="mt-10 hidden grid-cols-3 gap-4 text-center text-sm print:grid">
        <div>
          <p className="font-bold">Người đề xuất</p>
          <p className="text-xs text-slate-500">(Ký & ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="font-bold">Trưởng BP Buồng Phòng</p>
          <p className="text-xs text-slate-500">(Ký & ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="font-bold">Bộ phận Mua hàng/Kế toán</p>
          <p className="text-xs text-slate-500">(Ký & ghi rõ họ tên)</p>
        </div>
      </div>

      {showAddModal && (
        <AddItemModal
          storeItems={storeItems}
          existingNames={existingNames}
          onCancel={() => setShowAddModal(false)}
          onConfirm={handleAddItems}
          onCreateNew={handleCreateNewItem}
        />
      )}
    </div>
  );
}
