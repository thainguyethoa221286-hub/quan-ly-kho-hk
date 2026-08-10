import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Download, Printer, Loader2, X, Plus, RefreshCw, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import { getVPPData, saveVPPItem, deleteVPPItem, rolloverVPPMonth } from '../../services/googleSheetsService';

const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');
const nextMonthStr = (thang) => {
  const [y, m] = thang.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const gridKeyNav = (e, field) => {
  if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();
  const inputs = Array.from(document.querySelectorAll(`input[data-field="${field}"]`));
  const idx = inputs.indexOf(e.target);
  if (idx === -1) return;
  if ((e.key === 'Enter' || e.key === 'ArrowDown') && idx < inputs.length - 1) inputs[idx + 1].focus();
  else if (e.key === 'ArrowUp' && idx > 0) inputs[idx - 1].focus();
};

function AddVPPItemModal({ onCancel, onConfirm }) {
  const [tenHang, setTenHang] = useState('');
  const [dvt, setDvt] = useState('');
  const [dauKy, setDauKy] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!tenHang || !dvt) return;
    setSaving(true);
    try {
      await onConfirm({ tenHang, dvt, dauKy: Number(dauKy) || 0 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:hidden">
      <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold">+ Thêm Mặt Hàng VPP</h3>
          <button onClick={onCancel}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tên mặt hàng</label>
            <input value={tenHang} onChange={(e) => setTenHang(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="VD: Giấy A4" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">ĐVT</label>
            <input value={dvt} onChange={(e) => setDvt(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="VD: Cuốn" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Đầu kỳ (tuỳ chọn)</label>
            <input value={dauKy} onChange={(e) => setDauKy(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-2 text-sm focus:outline-none" placeholder="0" />
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

export default function OfficeSuppliesModule() {
  const { selectedMonth } = useStore();
  const thang = selectedMonth;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingRows, setSavingRows] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [rolloverBusy, setRolloverBusy] = useState(false);
  const [confirmRollover, setConfirmRollover] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getVPPData(thang);
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [thang]);

  useEffect(() => { load(); }, [load]);

  const handleFieldChange = (rowIndex, field, value) => {
    setItems((prev) => prev.map((it) => {
      if (it.rowIndex !== rowIndex) return it;
      const updated = { ...it, [field]: value };
      const dauKy = Number(updated.DauKy) || 0;
      const nhap = Number(updated.Nhap) || 0;
      const cuoiKy = Number(updated.CuoiKy) || 0;
      updated.SuDung = (dauKy + nhap) - cuoiKy;
      return updated;
    }));
  };

  const persistRow = async (rowIndex) => {
    const item = items.find((it) => it.rowIndex === rowIndex);
    if (!item) return;
    setSavingRows((s) => ({ ...s, [rowIndex]: true }));
    try {
      await saveVPPItem(thang, {
        rowIndex: item.rowIndex, Stt: item.Stt, TenHang: item.TenHang, DVT: item.DVT,
        DauKy: item.DauKy, Nhap: item.Nhap, CuoiKy: item.CuoiKy, GhiChu: item.GhiChu,
      });
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSavingRows((s) => { const c = { ...s }; delete c[rowIndex]; return c; });
    }
  };

  const handleAddItem = async ({ tenHang, dvt, dauKy }) => {
    try {
      const saved = await saveVPPItem(thang, { Stt: items.length + 1, TenHang: tenHang, DVT: dvt, DauKy: dauKy, Nhap: '', CuoiKy: '', GhiChu: '' });
      setShowAddModal(false);
      await load();
    } catch (err) {
      setError('Lỗi khi thêm: ' + err.message);
    }
  };

  const handleDelete = async (rowIndex) => {
    if (!window.confirm('Xoá mặt hàng này khỏi danh sách VPP?')) return;
    try {
      await deleteVPPItem(thang, rowIndex);
      setItems((prev) => prev.filter((it) => it.rowIndex !== rowIndex));
    } catch (err) {
      setError('Lỗi khi xoá: ' + err.message);
    }
  };

  const handleRollover = async () => {
    setRolloverBusy(true);
    setError(null);
    try {
      await rolloverVPPMonth(thang, nextMonthStr(thang));
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
    const headers = ['STT', 'TÊN MẶT HÀNG', 'ĐVT', 'ĐẦU KỲ', 'NHẬP', 'CUỐI KỲ', 'SỬ DỤNG', 'GHI CHÚ'];
    const aoa = [[`DANH SÁCH CÁC MẶT HÀNG VPP THÁNG ${String(m).padStart(2, '0')}/${y}`], [], headers];
    const dataStart = aoa.length;
    items.forEach((it) => {
      aoa.push([it.Stt, it.TenHang, it.DVT, it.DauKy, it.Nhap, it.CuoiKy, it.SuDung, it.GhiChu]);
    });
    const dataEnd = aoa.length - 1;
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = headers.length - 1;
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
    ws['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 9 }, { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 22 }];

    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };
    setStyle(0, 0, { font: { bold: true, sz: 13, name: 'Times New Roman' }, alignment: { horizontal: 'center' } });
    for (let c = 0; c <= lastCol; c++) {
      setStyle(2, c, { font: { bold: true, sz: 10, name: 'Times New Roman' }, fill: { fgColor: { rgb: grey } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: thin });
    }
    for (let r = dataStart; r <= dataEnd; r++) {
      for (let c = 0; c <= lastCol; c++) {
        const isCentered = [0, 2, 3, 4, 5, 6].includes(c);
        setStyle(r, c, { font: { sz: 10, name: 'Times New Roman' }, alignment: { horizontal: isCentered ? 'center' : 'left' }, border: thin });
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `VPP_${thang}`);
    XLSX.writeFile(wb, `VPP_${thang}.xlsx`);
  };

  return (
    <div>
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; appearance: textfield; }
        @media print { @page { size: A4 landscape; margin: 10mm; } }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-white">
            <FileText className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold text-[#141414]">VĂN PHÒNG PHẨM (VPP)</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]">
            <Plus className="h-3.5 w-3.5" /> Thêm Mặt Hàng
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" /> Export VPP Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]">
            <Printer className="h-3.5 w-3.5" /> In Báo Cáo
          </button>
          <button onClick={() => setConfirmRollover(true)} className="flex items-center gap-1 rounded bg-[#10B981] px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
            <RefreshCw className="h-3.5 w-3.5" /> Kết Chuyển Tháng Sau
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 print:hidden">
          <span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="max-h-[calc(100vh-160px)] overflow-y-auto overflow-x-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-slate-700 text-xs font-bold uppercase tracking-wide text-white">
            <tr>
              {['STT', 'TÊN VĂN PHÒNG PHẨM', 'ĐVT', 'TỒN ĐẦU', 'NHẬP', 'TỒN CUỐI KỲ', 'XUẤT SỬ DỤNG', 'GHI CHÚ', ''].map((h, i) => (
                <th key={h + i} className={`sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-left shadow-[0_1px_0_0_#141414] ${i === 1 ? 'min-w-[240px]' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /> Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-slate-400">Chưa có mặt hàng nào. Bấm "+ Thêm Mặt Hàng" để bắt đầu.</td></tr>
            ) : (
              items.map((it, idx) => (
                <tr
                  key={it.rowIndex}
                  className={`transition-colors hover:bg-amber-100 ${savingRows[it.rowIndex] ? 'opacity-50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <td className="border border-[#141414]/30 px-2 py-1">{it.Stt}</td>
                  <td className="min-w-[240px] border border-[#141414]/30 px-2 py-1 font-medium">{it.TenHang}</td>
                  <td className="border border-[#141414]/30 px-2 py-1">{it.DVT}</td>

                  <td className="border border-[#141414]/30 p-0">
                    <input type="number" data-field="DauKy" value={it.DauKy === 0 ? '' : it.DauKy}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'DauKy', e.target.value)}
                      onKeyDown={(e) => gridKeyNav(e, 'DauKy')}
                      onBlur={() => persistRow(it.rowIndex)}
                      placeholder="0" className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none" />
                  </td>
                  <td className="border border-[#141414]/30 p-0">
                    <input type="number" data-field="Nhap" value={it.Nhap === 0 ? '' : it.Nhap}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'Nhap', e.target.value)}
                      onKeyDown={(e) => gridKeyNav(e, 'Nhap')}
                      onBlur={() => persistRow(it.rowIndex)}
                      placeholder="0" className="w-16 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none" />
                  </td>
                  <td className="border-2 border-[#141414] bg-yellow-50 p-0">
                    <input type="number" data-field="CuoiKy" value={it.CuoiKy === 0 ? '' : it.CuoiKy}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'CuoiKy', e.target.value)}
                      onKeyDown={(e) => gridKeyNav(e, 'CuoiKy')}
                      onBlur={() => persistRow(it.rowIndex)}
                      placeholder="0" className="w-16 bg-transparent px-2 py-1 text-right font-bold focus:bg-yellow-300 focus:outline-none" />
                  </td>

                  <td className="border border-[#141414]/30 px-2 py-1 text-right font-semibold">{fmtNumber(it.SuDung)}</td>

                  <td className="border border-[#141414]/30 p-0">
                    <input data-field="GhiChu" value={it.GhiChu || ''}
                      onChange={(e) => handleFieldChange(it.rowIndex, 'GhiChu', e.target.value)}
                      onKeyDown={(e) => gridKeyNav(e, 'GhiChu')}
                      onBlur={() => persistRow(it.rowIndex)}
                      className="w-36 bg-transparent px-2 py-1 focus:bg-yellow-300 focus:outline-none" />
                  </td>

                  <td className="border border-[#141414]/30 px-1 py-1 text-center print:hidden">
                    <button onClick={() => handleDelete(it.rowIndex)} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && <AddVPPItemModal onCancel={() => setShowAddModal(false)} onConfirm={handleAddItem} />}

      {confirmRollover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 print:hidden">
          <div className="w-96 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-2 text-base font-bold">Xác nhận kết chuyển tháng</h3>
            <p className="mb-4 text-sm text-slate-600">
              Tồn Cuối Kỳ tháng <strong>{thang}</strong> sẽ trở thành Tồn Đầu tháng <strong>{nextMonthStr(thang)}</strong>.
              Nhập/Tồn Cuối Kỳ tháng mới sẽ để trống chờ nhập lại. Không thể hoàn tác.
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
