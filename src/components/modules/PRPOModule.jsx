import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, RefreshCw, Download, Printer, Loader2, X, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import {
  getPRPOData,
  savePRPOItem,
  deletePRPOItem,
  recalcPRPO,
} from '../../services/googleSheetsService';

const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');

export default function PRPOModule() {
  const { selectedMonth } = useStore();
  const thang = selectedMonth;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingRows, setSavingRows] = useState({});
  const [recalcBusy, setRecalcBusy] = useState(false);

  const loadData = useCallback(async (month) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPRPOData(month);
      setItems(data);
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
    const sumDeXuat = items.reduce((acc, it) => acc + (Number(it.DeXuatMua) || 0), 0);
    const sumQty = items.reduce((acc, it) => acc + (Number(it.QTY) || 0), 0);
    const urgentCount = items.filter((it) => (Number(it.StockInHand) || 0) <= 0).length;
    return { sumDeXuat, sumQty, urgentCount };
  }, [items]);

  const handleFieldChange = (rowIndex, field, value) => {
    setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, [field]: value } : it)));
  };

  const handleFieldBlur = async (rowIndex) => {
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
        QTY: item.QTY,
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

  // Khi sửa StockMax, đề xuất mua (hiển thị) cũng cần tính lại ngay trên UI
  const handleStockMaxChange = (rowIndex, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.rowIndex !== rowIndex) return it;
        const stockMax = Number(value) || 0;
        const stockInHand = Number(it.StockInHand) || 0;
        const deXuatMua = Math.max(stockMax - stockInHand, 0);
        return { ...it, StockMax: value, DeXuatMua: deXuatMua };
      })
    );
  };

  const handleRecalc = async () => {
    setRecalcBusy(true);
    setError(null);
    try {
      await recalcPRPO(thang);
      await loadData(thang);
    } catch (err) {
      setError('Lỗi khi tính lại PR: ' + err.message);
    } finally {
      setRecalcBusy(false);
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

    const headers = ['STT', 'ITEM', 'UNIT', 'QTY', 'STOCK IN HAND', 'STOCK MAX', 'ĐỀ XUẤT MUA', 'NOTED'];
    const aoa = [];
    aoa.push([`M HOTEL - PHIẾU ĐỀ XUẤT MUA HÀNG VẬT TƯ (PR-PO) - THÁNG ${String(m).padStart(2, '0')}/${y}`]);
    aoa.push([]);
    aoa.push(headers);
    const dataStartRow = aoa.length;
    items.forEach((it) => {
      aoa.push([it.Stt, it.TenHang, it.DVT, it.QTY, it.StockInHand, it.StockMax, it.DeXuatMua, it.GhiChu]);
    });
    const dataEndRow = aoa.length - 1;
    const totalRowIdx = aoa.length;
    aoa.push(['', 'TỔNG CỘNG', '', totals.sumQty, '', '', totals.sumDeXuat, '']);
    aoa.push([]);
    aoa.push([]);
    const sigTitleRowIdx = aoa.length;
    aoa.push(['Người đề xuất', '', '', 'Trưởng BP Buồng Phòng', '', '', 'Bộ phận Mua hàng/Kế toán', '']);
    const sigSubRowIdx = aoa.length;
    aoa.push(['(Ký & ghi rõ họ tên)', '', '', '(Ký & ghi rõ họ tên)', '', '', '(Ký & ghi rõ họ tên)', '']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = headers.length - 1;
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
      { s: { r: sigTitleRowIdx, c: 0 }, e: { r: sigTitleRowIdx, c: 2 } },
      { s: { r: sigTitleRowIdx, c: 3 }, e: { r: sigTitleRowIdx, c: 5 } },
      { s: { r: sigTitleRowIdx, c: 6 }, e: { r: sigTitleRowIdx, c: 7 } },
      { s: { r: sigSubRowIdx, c: 0 }, e: { r: sigSubRowIdx, c: 2 } },
      { s: { r: sigSubRowIdx, c: 3 }, e: { r: sigSubRowIdx, c: 5 } },
      { s: { r: sigSubRowIdx, c: 6 }, e: { r: sigSubRowIdx, c: 7 } },
    ];
    ws['!cols'] = [
      { wch: 5 }, { wch: 32 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
    ];

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
        const isNum = [3, 4, 5, 6].includes(c);
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
    [0, 3, 6].forEach((c) => {
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
              Tự động đề xuất vật tư cần mua dựa trên định mức tồn kho tối đa & tồn thực tế. Công thức:{' '}
              <span className="font-mono font-semibold">ĐỀ XUẤT MUA = STOCK MAX − STOCK IN HAND</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRecalc}
            disabled={recalcBusy}
            className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0] disabled:opacity-50"
          >
            {recalcBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Tự Động Tính Lại PR
          </button>
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
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3 print:hidden">
        <div className="rounded border border-[#141414] bg-white p-4">
          <p className="text-xs font-mono uppercase text-slate-500">Tổng SL Đề Xuất PR</p>
          <p className="mt-1 text-2xl font-bold text-[#141414]">{fmtNumber(totals.sumDeXuat)} <span className="text-sm font-normal text-slate-400">sản phẩm</span></p>
        </div>
        <div className="rounded border border-[#141414] bg-white p-4">
          <p className="text-xs font-mono uppercase text-slate-500">Tổng SL QTY Đã Duyệt</p>
          <p className="mt-1 text-2xl font-bold text-[#141414]">{fmtNumber(totals.sumQty)} <span className="text-sm font-normal text-slate-400">sản phẩm</span></p>
        </div>
        <div className="rounded border border-[#141414] bg-white p-4">
          <p className="flex items-center gap-1 text-xs font-mono uppercase text-slate-500">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> Mặt Hàng Mua Khẩn
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">{totals.urgentCount} <span className="text-sm font-normal text-slate-400">mục (hết tồn kho)</span></p>
        </div>
      </div>

      {/* ---- Print header ---- */}
      <div className="hidden print:block print:mb-4 print:text-center">
        <div className="text-lg font-bold">M HOTEL</div>
        <div className="text-sm">PHIẾU ĐỀ XUẤT MUA HÀNG VẬT TƯ (PR-PO) — Tháng {thang}</div>
      </div>

      {/* ---- Table ---- */}
      <div className="overflow-x-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#F2F1EE] font-mono uppercase text-[10px] text-[#141414]">
            <tr>
              {['STT', 'ITEM', 'UNIT', 'QTY', 'STOCK IN HAND', 'STOCK MAX', 'ĐỀ XUẤT MUA', 'NOTED', ''].map((h, i) => (
                <th key={h + i} className={`border border-[#141414]/30 px-2 py-2 text-left ${i === 1 ? 'min-w-[260px]' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Chưa có mặt hàng. Vào Module 01 (Kho & Vật Tư) để thêm mặt hàng trước.
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const isUrgent = (Number(it.StockInHand) || 0) <= 0;
                return (
                  <tr key={it.rowIndex} className={savingRows[it.rowIndex] ? 'opacity-50' : isUrgent ? 'bg-red-50/50' : ''}>
                    <td className="border border-[#141414]/30 px-2 py-1">{it.Stt}</td>
                    <td className="min-w-[260px] border border-[#141414]/30 px-2 py-1 font-medium">{it.TenHang}</td>
                    <td className="border border-[#141414]/30 px-2 py-1">{it.DVT}</td>

                    {/* Editable: QTY */}
                    <td className="border border-[#141414]/30 p-0">
                      <input
                        type="number"
                        value={it.QTY}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'QTY', e.target.value)}
                        onBlur={() => handleFieldBlur(it.rowIndex)}
                        className="w-16 bg-transparent px-2 py-1 text-right font-semibold focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>

                    <td className={`border border-[#141414]/30 px-2 py-1 text-right ${isUrgent ? 'font-bold text-red-600' : ''}`}>
                      {fmtNumber(it.StockInHand)}
                    </td>

                    {/* Editable: StockMax */}
                    <td className="border border-[#141414]/30 p-0">
                      <input
                        type="number"
                        value={it.StockMax}
                        onChange={(e) => handleStockMaxChange(it.rowIndex, e.target.value)}
                        onBlur={() => handleFieldBlur(it.rowIndex)}
                        className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>

                    <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.DeXuatMua)}</td>

                    {/* Editable: GhiChu */}
                    <td className="border border-[#141414]/30 p-0">
                      <input
                        value={it.GhiChu || ''}
                        onChange={(e) => handleFieldChange(it.rowIndex, 'GhiChu', e.target.value)}
                        onBlur={() => handleFieldBlur(it.rowIndex)}
                        className="w-32 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      />
                    </td>

                    <td className="border border-[#141414]/30 px-1 py-1 text-center print:hidden">
                      <button
                        onClick={async () => {
                          if (!window.confirm('Xoá mặt hàng này khỏi danh sách PR-PO?')) return;
                          try {
                            await deletePRPOItem(thang, it.rowIndex);
                            setItems((prev) => prev.filter((x) => x.rowIndex !== it.rowIndex));
                          } catch (err) {
                            setError('Lỗi khi xoá: ' + err.message);
                          }
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-[#F2F1EE] font-bold">
              <tr>
                <td colSpan={3} className="border border-[#141414]/30 px-2 py-2">TỔNG CỘNG</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.sumQty)}</td>
                <td className="border border-[#141414]/30 px-2 py-2" />
                <td className="border border-[#141414]/30 px-2 py-2" />
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
    </div>
  );
}
