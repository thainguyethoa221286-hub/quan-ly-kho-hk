import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Trash2, Download, Printer, RefreshCw, Loader2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getKhoData,
  saveKhoItem,
  deleteKhoItem,
  rolloverMonth,
} from '../../services/googleSheetsService';

// ---------- Helpers ----------
const EDITABLE_FIELDS = ['Nhap', 'Transfer', 'SuDung', 'Cost', 'GhiChu'];
const NUM_FIELDS = ['DauKy', 'SetUp', 'Nhap', 'Transfer', 'HuHongMat', 'SuDung', 'TongXuat', 'CuoiKy', 'Cost', 'ThanhTien'];

function computeDerived(item) {
  const n = (v) => Number(v) || 0;
  const tongXuat = n(item.Nhap) + n(item.Transfer) + n(item.HuHongMat) + n(item.SuDung);
  const cuoiKy = n(item.DauKy) + n(item.SetUp) + n(item.Nhap) - tongXuat;
  const thanhTien = n(item.SuDung) * n(item.Cost);
  return { ...item, TongXuat: tongXuat, CuoiKy: cuoiKy, ThanhTien: thanhTien };
}

function nextMonthStr(thang) {
  const [y, m] = thang.split('-').map(Number);
  const d = new Date(y, m, 1); // m is already next month index (0-based trick)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonthStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');

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
      <td className="border border-[#141414]/30 px-2 py-1">
        <input className="w-20 bg-transparent text-xs" placeholder="Mã hàng" value={form.MaHang} onChange={set('MaHang')} />
      </td>
      <td className="border border-[#141414]/30 px-2 py-1">
        <input className="w-full bg-transparent text-xs" placeholder="Tên mặt hàng" value={form.TenHang} onChange={set('TenHang')} />
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
      <td colSpan={4} className="border border-[#141414]/30 px-2 py-1 text-center text-[10px] text-slate-500">
        Nhập / Transfer / Hư hỏng / Sử dụng — sửa sau khi lưu
      </td>
      <td className="border border-[#141414]/30 px-2 py-1" />
      <td className="border border-[#141414]/30 px-2 py-1" />
      <td className="border border-[#141414]/30 px-2 py-1">
        <input type="number" className="w-20 bg-transparent text-xs" value={form.Cost} onChange={set('Cost')} />
      </td>
      <td className="border border-[#141414]/30 px-2 py-1" />
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

// ---------- Main component ----------
export default function StoreModule() {
  const [thang, setThang] = useState(currentMonthStr());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingRows, setSavingRows] = useState({}); // rowIndex -> true
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [rolloverBusy, setRolloverBusy] = useState(false);
  const [confirmRollover, setConfirmRollover] = useState(false);

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
      const saved = await saveKhoItem(thang, computeDerived({ ...form, Nhap: 0, Transfer: 0, HuHongMat: 0, SuDung: 0, GhiChu: '' }));
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

  // ---- Excel export ----
  const handleExportExcel = () => {
    const header = [
      ['M HOTEL SAIGON'],
      ['BỘ PHẬN HOUSEKEEPING — BÁO CÁO KHO & VẬT TƯ'],
      [`Tháng: ${thang}`],
      [],
      [
        'STT', 'Mã hàng', 'Tên mặt hàng', 'ĐVT', 'Đầu kỳ', 'Set up', 'Nhập',
        'Transfer', 'Hư hỏng/mất', 'Sử dụng', 'Tổng xuất', 'Cuối kỳ',
        'Đơn giá', 'Thành tiền', 'Ghi chú',
      ],
    ];

    const dataRows = items.map((it) => [
      it.Stt, it.MaHang, it.TenHang, it.DVT, it.DauKy, it.SetUp, it.Nhap,
      it.Transfer, it.HuHongMat, it.SuDung, it.TongXuat, it.CuoiKy,
      it.Cost, it.ThanhTien, it.GhiChu,
    ]);

    const totalRow = [
      '', '', 'TỔNG CỘNG', '', '', '', totals.Nhap, totals.Transfer,
      totals.HuHongMat, totals.SuDung, totals.TongXuat, '', '', totals.ThanhTien, '',
    ];

    const signatureRows = [
      [],
      [],
      ['Thủ kho', '', '', '', '', 'Trưởng bộ phận HK', '', '', '', '', 'Kế toán'],
      ['(Ký, ghi rõ họ tên)', '', '', '', '', '(Ký, ghi rõ họ tên)', '', '', '', '', '(Ký, ghi rõ họ tên)'],
    ];

    const aoa = [...header, ...dataRows, totalRow, ...signatureRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge title rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 14 } },
    ];

    // Column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 9 }, { wch: 8 },
      { wch: 8 }, { wch: 9 }, { wch: 11 }, { wch: 9 }, { wch: 10 }, { wch: 9 },
      { wch: 12 }, { wch: 14 }, { wch: 18 },
    ];

    // Currency format for Cost (col N=index12) and ThanhTien (col O=index13)
    const dataStartRow = header.length; // 0-indexed row where data begins
    for (let i = 0; i < dataRows.length; i++) {
      const r = dataStartRow + i;
      ['M', 'N'].forEach((colLetter, ci) => {
        const colIdx = 12 + ci; // Cost=12, ThanhTien=13
        const cellRef = XLSX.utils.encode_cell({ r, c: colIdx });
        if (ws[cellRef]) ws[cellRef].z = '#,##0';
      });
    }
    // Format totals row currency cells too
    const totalRowIdx = dataStartRow + dataRows.length;
    [6, 7, 8, 9, 10, 13].forEach((c) => {
      const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c });
      if (ws[cellRef]) ws[cellRef].z = '#,##0';
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Kho_${thang}`);
    XLSX.writeFile(wb, `Bao_Cao_Kho_${thang}.xlsx`);
  };

  return (
    <div>
      {/* Print-only CSS */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
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
            onClick={handleExportExcel}
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

      {/* ---- Print header (only visible when printing) ---- */}
      <div className="hidden print:block print:mb-4 print:text-center">
        <div className="text-lg font-bold">M HOTEL SAIGON</div>
        <div className="text-sm">BỘ PHẬN HOUSEKEEPING — BÁO CÁO KHO & VẬT TƯ — Tháng {thang}</div>
      </div>

      {/* ---- Table ---- */}
      <div className="overflow-x-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-[#F2F1EE] font-mono uppercase text-[10px] text-[#141414]">
            <tr>
              {['STT', 'Mã hàng', 'Tên mặt hàng', 'ĐVT', 'Đầu kỳ', 'Set up', 'Nhập', 'Transfer',
                'Hư hỏng/mất', 'Sử dụng', 'Tổng xuất', 'Cuối kỳ', 'Đơn giá', 'Thành tiền', 'Ghi chú', ''].map((h) => (
                <th key={h} className="border border-[#141414]/30 px-2 py-2 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={16} className="py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Đang tải dữ liệu...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-8 text-center text-slate-400">Chưa có dữ liệu.</td>
              </tr>
            ) : (
              filteredItems.map((it) => (
                <tr key={it.rowIndex} className={savingRows[it.rowIndex] ? 'opacity-50' : ''}>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.Stt}</td>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.MaHang}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 font-medium">{it.TenHang}</td>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.DVT}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.DauKy)}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.SetUp)}</td>

                  {/* Editable: Nhap */}
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      type="number"
                      value={it.Nhap}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'Nhap', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-50 focus:outline-none"
                    />
                  </td>
                  {/* Editable: Transfer */}
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      type="number"
                      value={it.Transfer}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'Transfer', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-50 focus:outline-none"
                    />
                  </td>
                  {/* Read-only: HuHongMat (đồng bộ tự động từ Module Hư Hỏng sau này) */}
                  <td className="border border-[#141414]/30 px-2 py-1 text-right text-slate-500" title="Tự động đồng bộ từ Module Hư Hỏng & Thiệt Hại">
                    {fmtNumber(it.HuHongMat)}
                  </td>
                  {/* Editable: SuDung */}
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      type="number"
                      value={it.SuDung}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'SuDung', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-50 focus:outline-none"
                    />
                  </td>

                  <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.TongXuat)}</td>
                  <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.CuoiKy)}</td>

                  {/* Editable: Cost */}
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      type="number"
                      value={it.Cost}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'Cost', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-20 bg-transparent px-2 py-1 text-right focus:bg-yellow-50 focus:outline-none"
                    />
                  </td>

                  <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(it.ThanhTien)}</td>

                  {/* Editable: GhiChu */}
                  <td className="border border-[#141414]/30 p-0">
                    <input
                      value={it.GhiChu || ''}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'GhiChu', e.target.value)}
                      onBlur={() => handleFieldBlur(it.rowIndex)}
                      className="w-32 bg-transparent px-2 py-1 focus:bg-yellow-50 focus:outline-none"
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
                <td colSpan={6} className="border border-[#141414]/30 px-2 py-2">TỔNG CỘNG</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.Nhap)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.Transfer)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.HuHongMat)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.SuDung)}</td>
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.TongXuat)}</td>
                <td className="border border-[#141414]/30 px-2 py-2" />
                <td className="border border-[#141414]/30 px-2 py-2" />
                <td className="border border-[#141414]/30 px-2 py-2 text-right">{fmtNumber(totals.ThanhTien)}</td>
                <td className="border border-[#141414]/30 px-2 py-2" colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Print-only signature block */}
      <div className="mt-10 hidden grid-cols-3 gap-4 text-center text-sm print:grid">
        <div>
          <p className="font-bold">Thủ kho</p>
          <p className="text-xs text-slate-500">(Ký, ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="font-bold">Trưởng bộ phận HK</p>
          <p className="text-xs text-slate-500">(Ký, ghi rõ họ tên)</p>
        </div>
        <div>
          <p className="font-bold">Kế toán</p>
          <p className="text-xs text-slate-500">(Ký, ghi rõ họ tên)</p>
        </div>
      </div>

      {/* ---- Rollover confirm modal ---- */}
      {confirmRollover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
          <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-base font-bold">Xác nhận kết chuyển tháng</h3>
            <p className="mb-4 text-sm text-slate-600">
              Toàn bộ <strong>Cuối kỳ</strong> của tháng <strong>{thang}</strong> sẽ trở thành{' '}
              <strong>Đầu kỳ</strong> của tháng <strong>{nextMonthStr(thang)}</strong>. Các cột Nhập,
              Transfer, Hư hỏng/mất, Sử dụng của tháng mới sẽ được reset về 0. Thao tác này không
              thể hoàn tác.
            </p>
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
