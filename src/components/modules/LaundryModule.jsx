import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shirt, Eye, Download, Loader2, X, Save, FileUp, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import DecimalInput from '../common/DecimalInput';
import { fmtDateVN } from '../../utils/dateFormat';
import { buildStandardSheet } from '../../services/excelService';
import {
  getLinenCatalog, getLinenMonthly, getLinenDaily, saveLinenDay, saveLinenMonthly,
  saveLinenCatalogItem, computeLinenSummary, normLinenName, VAT_RATE,
} from '../../services/supabaseLinenService';
import { parseLaundryFile } from '../../services/laundryFileParser';
import { downloadLinenStatement } from '../../services/linenStatementExport';

const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');
const TABS = [
  { id: 'SUMMARY', label: 'BÁO CÁO TỔNG HỢP LINEN' },
  { id: 'DAILY', label: 'NHẬP LIỆU DAILY LAUNDRY' },
  { id: 'RECON', label: 'ĐỐI SOÁT VỚI NHÀ GIẶT' },
];

// Các loại linen khách sạn không dùng: chỉ ẨN khỏi màn hình nhập liệu/báo cáo để khỏi nhầm
// (không xoá khỏi danh mục; file Excel xuất ra vẫn đầy đủ như mẫu).
const HIDDEN_ITEMS = ['baomennho', 'drapnho'];
const isHiddenRow = (r) => HIDDEN_ITEMS.includes(normLinenName(r.TenHang));

const pad2 = (n) => String(n).padStart(2, '0');
const daysInMonth = (thang) => {
  const [y, m] = thang.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
/** Ngày mặc định của form daily: hôm nay nếu thuộc tháng đang chọn, ngược lại ngày 1 của tháng */
const defaultDay = (thang) => {
  const d = new Date();
  const today = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return today.startsWith(thang) ? today : `${thang}-01`;
};

// ====================================================================
// TAB 1 — BÁO CÁO TỔNG HỢP LINEN
// ====================================================================
function SummaryTab({ thang, summary, dailyRows, canEdit, onMonthlyChange, onMonthlySave, onPriceChange, onPriceSave, savingKey }) {
  const totals = useMemo(() => {
    const sum = (f) => summary.reduce((a, r) => a + (Number(r[f]) || 0), 0);
    const tien = sum('ThanhTien');
    const vat = Math.round(tien * VAT_RATE);
    return { RWNoDK: sum('RWNoDK'), RWSach: sum('RWSach'), RWNoCuoi: sum('RWNoCuoi'), NoDK: sum('NoDK'), TongDo: sum('TongDo'), TongSach: sum('TongSach'), RW: sum('RW'), NoCuoi: sum('NoCuoi'), SlTinhTien: sum('SlTinhTien'), tien, vat, tong: tien + vat };
  }, [summary]);

  const shownRows = useMemo(() => summary.filter((r) => !isHiddenRow(r)), [summary]);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState(null);

  // Xuất file GIỐNG HỆT mẫu "Bảng kê chi tiết giặt ủi" (xem linenStatementExport.js)
  const handleExport = async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const { notInTemplate, rwNotInTemplate } = await downloadLinenStatement({ thang, summary, dailyRows });
      const msgs = [];
      if (notInTemplate.length > 0) msgs.push(`${notInTemplate.join(', ')} chưa có dòng trong mẫu bảng kê nên không được xuất ra file.`);
      if (rwNotInTemplate && rwNotInTemplate.length > 0) msgs.push(`Bảng Rewash trong mẫu không có dòng cho: ${rwNotInTemplate.join(', ')} nên số Rewash của các loại này không được xuất ra file.`);
      if (msgs.length) setExportMsg('Lưu ý: ' + msgs.join(' '));
    } catch (err) {
      setExportMsg('Lỗi khi xuất Excel: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const th = 'sticky top-0 z-20 border border-white/20 bg-slate-700 px-2 py-2 text-left shadow-[0_1px_0_0_#141414]';
  const tdNum = 'border border-[#141414]/30 px-2 py-1 text-right';
  const inputCls = 'w-20 bg-transparent px-2 py-1 text-right focus:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-xs text-slate-500">
          Nợ cuối kỳ = Nợ đầu kỳ + Giao giặt (Dơ) − Nhận về (Sạch). Cột RW = tổng RW Dơ của tháng (lấy từ bảng Rewash, không tính tiền). Số Dơ/Sạch/RW lấy tự động từ tab Nhập Liệu Daily.
        </p>
        <button onClick={handleExport} disabled={exporting} className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Xuất Bảng Kê Chi Tiết Giặt Ủi (Excel)
        </button>
      </div>
      {exportMsg && <p className="mb-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700">{exportMsg}</p>}

      <div className="max-h-[calc(100vh-260px)] overflow-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="text-xs font-bold uppercase tracking-wide text-white">
            <tr>
              {['STT', 'TÊN LOẠI LINEN', 'ĐVT', 'NỢ ĐẦU KỲ', 'GIAO GIẶT (DƠ)', 'NHẬN VỀ (SẠCH)', 'NỢ RW', 'NỢ CUỐI KỲ', 'SL TÍNH TIỀN', 'ĐƠN GIÁ', 'THÀNH TIỀN'].map((h, i) => (
                <th key={h} className={`${th} ${i === 7 ? '!bg-yellow-200 !text-[#141414]' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((r, idx) => (
              <tr key={r.TenHang} className={`hover:bg-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${savingKey === r.TenHang ? 'opacity-50' : ''}`}>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{idx + 1}</td>
                <td className="min-w-[160px] border border-[#141414]/30 px-2 py-1 font-medium">{r.TenHang}</td>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{r.DVT}</td>
                <td className="border border-[#141414]/30 bg-yellow-50 p-0">
                  <DecimalInput allowNegative value={r.NoDK} disabled={!canEdit} placeholder="0"
                    onChange={(e) => onMonthlyChange(r.TenHang, 'no_dk', e.target.value)}
                    onBlur={() => onMonthlySave(r.TenHang, { NoDK: r.NoDK })} className={inputCls} />
                </td>
                <td className={tdNum}>{fmtNumber(r.TongDo)}</td>
                <td className={tdNum}>{fmtNumber(r.TongSach)}</td>
                <td className={`${tdNum} ${r.RWNoCuoi < 0 ? 'text-red-600' : ''}`} title="Nợ RW = Nợ đầu kỳ RW + RW Dơ − RW Sạch (hàng giặt lại còn bên nhà giặt), lấy từ bảng Rewash bên dưới.">{fmtNumber(r.RWNoCuoi)}</td>
                <td className={`border border-[#141414] bg-yellow-100 px-2 py-1 text-right font-bold ${r.NoCuoi < 0 ? 'text-red-600' : ''}`}>{fmtNumber(r.NoCuoi)}</td>
                <td className="border border-[#141414]/30 p-0" title={r.HeSo !== 1 ? `Để trống = tự tính: Tổng Sạch × ${r.HeSo}` : 'Để trống = tự tính: Tổng Sạch (Rewash không tính tiền)'}>
                  <DecimalInput hideZero={false} value={r.SlOverride === null ? '' : r.SlOverride} disabled={!canEdit}
                    placeholder={String(r.SlAuto)}
                    onChange={(e) => onMonthlyChange(r.TenHang, 'sl_tinh_tien', e.target.value === '' ? null : e.target.value)}
                    onBlur={() => onMonthlySave(r.TenHang, { SlTinhTien: r.SlOverride === null ? '' : r.SlOverride })} className={inputCls} />
                </td>
                <td className="border border-[#141414]/30 p-0">
                  <DecimalInput value={r.DonGia} disabled={!canEdit} placeholder="0"
                    onChange={(e) => onPriceChange(r.TenHang, e.target.value)}
                    onBlur={() => onPriceSave(r.TenHang)} className={`${inputCls} w-24`} />
                </td>
                <td className={`${tdNum} font-semibold`}>{fmtNumber(r.ThanhTien)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={3} className="border border-[#141414]/30 px-2 py-2 text-right">TỔNG CỘNG (CHƯA VAT)</td>
              <td className={tdNum}>{fmtNumber(totals.NoDK)}</td>
              <td className={tdNum}>{fmtNumber(totals.TongDo)}</td>
              <td className={tdNum}>{fmtNumber(totals.TongSach)}</td>
              <td className={tdNum}>{fmtNumber(totals.RWNoCuoi)}</td>
              <td className={tdNum}>{fmtNumber(totals.NoCuoi)}</td>
              <td className={tdNum}>{fmtNumber(totals.SlTinhTien)}</td>
              <td className={tdNum}></td>
              <td className={tdNum}>{fmtNumber(totals.tien)}</td>
            </tr>
            <tr className="bg-slate-50 font-semibold">
              <td colSpan={10} className="border border-[#141414]/30 px-2 py-1.5 text-right">VAT {VAT_RATE * 100}%</td>
              <td className={tdNum}>{fmtNumber(totals.vat)}</td>
            </tr>
            <tr className="bg-emerald-50 font-bold text-emerald-800">
              <td colSpan={10} className="border border-[#141414]/30 px-2 py-2 text-right">TỔNG THANH TOÁN</td>
              <td className={tdNum}>{fmtNumber(totals.tong)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ---------- BẢNG 2: REWASH (GIẶT LẠI) ---------- */}
      <h3 className="mb-1 mt-5 text-xs font-bold uppercase tracking-wider text-slate-600">Bảng Rewash (hàng giặt lại — không tính tiền)</h3>
      <div className="overflow-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-xs">
          <thead className="text-xs font-bold uppercase tracking-wide text-white">
            <tr>
              {['STT', 'TÊN LOẠI LINEN', 'ĐVT', 'NỢ ĐẦU KỲ RW', 'RW DƠ (GỬI GIẶT LẠI)', 'RW SẠCH (NHẬN LẠI)', 'NỢ RW CUỐI KỲ'].map((h, i) => (
                <th key={h} className={`${th} !static ${i === 6 ? '!bg-yellow-200 !text-[#141414]' : i === 4 ? '!bg-amber-600' : ''}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((r, idx) => (
              <tr key={r.TenHang} className={`hover:bg-amber-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{idx + 1}</td>
                <td className="min-w-[160px] border border-[#141414]/30 px-2 py-1 font-medium">{r.TenHang}</td>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{r.DVT}</td>
                <td className="border border-[#141414]/30 bg-yellow-50 p-0">
                  <DecimalInput allowNegative value={r.RWNoDK} disabled={!canEdit} placeholder="0"
                    onChange={(e) => onMonthlyChange(r.TenHang, 'rw_no_dk', e.target.value)}
                    onBlur={() => onMonthlySave(r.TenHang, { RWNoDK: r.RWNoDK })} className={inputCls} />
                </td>
                <td className={tdNum}>{fmtNumber(r.RW)}</td>
                <td className={tdNum}>{fmtNumber(r.RWSach)}</td>
                <td className={`border border-[#141414] bg-yellow-100 px-2 py-1 text-right font-bold ${r.RWNoCuoi < 0 ? 'text-red-600' : ''}`}>{fmtNumber(r.RWNoCuoi)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={3} className="border border-[#141414]/30 px-2 py-2 text-right">TỔNG CỘNG</td>
              <td className={tdNum}>{fmtNumber(totals.RWNoDK)}</td>
              <td className={tdNum}>{fmtNumber(totals.RW)}</td>
              <td className={tdNum}>{fmtNumber(totals.RWSach)}</td>
              <td className={tdNum}>{fmtNumber(totals.RWNoCuoi)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Nợ RW cuối kỳ = Nợ đầu kỳ RW + RW Dơ − RW Sạch. Rewash KHÔNG tính tiền và không ảnh hưởng số lượng tính tiền ở bảng trên (SL tính tiền = Sạch).</p>
    </div>
  );
}

// ====================================================================
// XEM NHANH BẢNG KÊ CẢ THÁNG (cửa sổ nổi, không cần tải file)
// ====================================================================
function QuickView({ thang, items, dailyRows, onPickDay, onClose }) {
  const [y, m] = thang.split('-').map(Number);
  const dim = daysInMonth(thang);
  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const weekday = (d) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][new Date(y, m - 1, d).getDay()];

  const dayMap = useMemo(() => {
    const mp = {};
    dailyRows.forEach((r) => {
      const d = Number(String(r.ngay).slice(8, 10));
      (mp[r.ten_hang] ||= {})[d] = { do: Number(r.do_sl) || 0, sach: Number(r.sach_sl) || 0, rw: Number(r.rw_sl) || 0, rws: Number(r.rw_sach_sl) || 0 };
    });
    return mp;
  }, [dailyRows]);

  const cell = (v) => (v ? fmtNumber(v) : '');
  const base = 'border border-[#141414]/30 px-1.5 py-0.5 text-right text-[11px]';
  const stickyName = 'sticky left-0 z-10 min-w-[120px] border border-[#141414]/30 bg-white px-2 py-0.5 text-left text-[11px] font-semibold';

  const Head = ({ noLabel }) => (
    <thead className="text-[10px] font-bold uppercase text-white">
      <tr>
        <th className="sticky left-0 z-20 border border-white/20 bg-slate-700 px-2 py-1 text-left" colSpan={2}>MẶT HÀNG</th>
        <th className="border border-white/20 bg-slate-700 px-1.5 py-1">{noLabel}</th>
        {days.map((d) => (
          <th key={d} className="min-w-[30px] cursor-pointer border border-white/20 bg-slate-700 px-1 py-1 hover:bg-amber-600" title={`Mở ngày ${d} để nhập`} onClick={() => onPickDay(`${thang}-${pad2(d)}`)}>
            <div className="font-normal opacity-80">{weekday(d)}</div>{d}
          </th>
        ))}
        <th className="border border-white/20 bg-slate-700 px-1.5 py-1">TỔNG</th>
        <th className="border border-white/20 bg-yellow-200 px-1.5 py-1 text-[#141414]">NỢ</th>
      </tr>
    </thead>
  );

  // kind: 'main' (Dơ/Sạch) hoặc 'rw' (Rewash Dơ/Sạch)
  const Block = ({ kind }) => (
    <table className="border-collapse">
      <Head noLabel={kind === 'main' ? 'NỢ ĐK' : 'NỢ ĐK RW'} />
      <tbody>
        {items.map((r) => {
          const dm = dayMap[r.TenHang] || {};
          const kD = kind === 'main' ? 'do' : 'rw';
          const kS = kind === 'main' ? 'sach' : 'rws';
          const tD = kind === 'main' ? r.TongDo : r.RW;
          const tS = kind === 'main' ? r.TongSach : r.RWSach;
          const noDK = kind === 'main' ? r.NoDK : r.RWNoDK;
          const no = kind === 'main' ? r.NoCuoi : r.RWNoCuoi;
          return (
            <React.Fragment key={r.TenHang}>
              <tr>
                <td rowSpan={2} className={stickyName}>{r.TenHang}</td>
                <td className="border border-[#141414]/30 bg-red-50 px-1 text-center text-[10px] font-bold text-red-700">DƠ</td>
                <td rowSpan={2} className={`${base} bg-yellow-50 font-semibold`}>{cell(noDK) || (noDK === 0 ? '0' : '')}</td>
                {days.map((d) => <td key={d} className={`${base} bg-red-50/40`}>{cell(dm[d]?.[kD])}</td>)}
                <td className={`${base} font-semibold`}>{fmtNumber(tD)}</td>
                <td rowSpan={2} className={`${base} bg-yellow-100 font-bold ${no < 0 ? 'text-red-600' : ''}`}>{fmtNumber(no)}</td>
              </tr>
              <tr>
                <td className="border border-[#141414]/30 bg-emerald-50 px-1 text-center text-[10px] font-bold text-emerald-700">SẠCH</td>
                {days.map((d) => <td key={d} className={`${base} bg-emerald-50/40`}>{cell(dm[d]?.[kS])}</td>)}
                <td className={`${base} font-semibold`}>{fmtNumber(tS)}</td>
              </tr>
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2" onClick={onClose}>
      <div className="max-h-[94vh] w-full max-w-[98vw] overflow-auto rounded border border-[#141414] bg-white p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky left-0 mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold">XEM NHANH BẢNG KÊ GIẶT ỦI THÁNG {pad2(m)}/{y}</h2>
          <button onClick={onClose} className="flex items-center gap-1 rounded border border-[#141414] px-3 py-1 text-xs font-bold hover:bg-[#E4E3E0]"><X className="h-3.5 w-3.5" /> Đóng</button>
        </div>
        <p className="mb-2 text-[11px] text-slate-500">Bấm vào số ngày ở đầu cột để mở đúng ngày đó nhập liệu. Ô trống = chưa có số liệu.</p>
        <div className="overflow-x-auto"><Block kind="main" /></div>
        <h3 className="mb-1 mt-4 text-xs font-bold uppercase text-slate-600">Bảng Rewash (hàng giặt lại)</h3>
        <div className="overflow-x-auto"><Block kind="rw" /></div>
      </div>
    </div>
  );
}

// ====================================================================
// TAB 2 — NHẬP LIỆU DAILY LAUNDRY
// ====================================================================
function DailyTab({ thang, catalog, dailyRows, summary, canEdit, onSaved }) {
  const [ngay, setNgay] = useState(() => defaultDay(thang));
  const [vals, setVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [showView, setShowView] = useState(false);

  // đổi tháng làm việc -> đưa ngày về trong tháng đó
  useEffect(() => { setNgay(defaultDay(thang)); }, [thang]);

  // nạp số liệu đã lưu của ngày đang chọn
  useEffect(() => {
    const v = {};
    dailyRows.filter((r) => r.ngay === ngay).forEach((r) => { v[r.ten_hang] = { Do: r.do_sl, Sach: r.sach_sl, RW: r.rw_sl, RWSach: r.rw_sach_sl }; });
    setVals(v);
    setMsg(null);
  }, [ngay, dailyRows]);

  const inMonth = ngay.startsWith(thang);
  const enteredSet = useMemo(() => new Set(dailyRows.map((r) => r.ngay)), [dailyRows]);
  const hiddenNames = useMemo(() => new Set(summary.filter(isHiddenRow).map((r) => r.TenHang)), [summary]);
  const shownCatalog = useMemo(() => catalog.filter((c) => !hiddenNames.has(c.TenHang)), [catalog, hiddenNames]);
  const noCuoiMap = useMemo(() => Object.fromEntries(summary.map((s) => [s.TenHang, s.NoCuoi])), [summary]);

  const setVal = (ten, field, value) => setVals((p) => ({ ...p, [ten]: { ...(p[ten] || {}), [field]: value } }));

  const dayTotals = useMemo(() => ({
    Do: catalog.reduce((a, c) => a + (Number(vals[c.TenHang]?.Do) || 0), 0),
    Sach: catalog.reduce((a, c) => a + (Number(vals[c.TenHang]?.Sach) || 0), 0),
    RW: catalog.reduce((a, c) => a + (Number(vals[c.TenHang]?.RW) || 0), 0),
    RWSach: catalog.reduce((a, c) => a + (Number(vals[c.TenHang]?.RWSach) || 0), 0),
  }), [catalog, vals]);
  const rwNoMap = useMemo(() => Object.fromEntries(summary.map((s) => [s.TenHang, s.RWNoCuoi])), [summary]);

  const handleSave = async () => {
    if (!inMonth) return;
    setSaving(true);
    setMsg(null);
    try {
      const existing = new Set(dailyRows.filter((r) => r.ngay === ngay).map((r) => r.ten_hang));
      const entries = catalog
        .filter((c) => existing.has(c.TenHang) || vals[c.TenHang]?.Do || vals[c.TenHang]?.Sach || vals[c.TenHang]?.RW || vals[c.TenHang]?.RWSach)
        .map((c) => ({ TenHang: c.TenHang, Do: vals[c.TenHang]?.Do, Sach: vals[c.TenHang]?.Sach, RW: vals[c.TenHang]?.RW, RWSach: vals[c.TenHang]?.RWSach }));
      if (entries.length === 0) {
        setMsg({ type: 'warn', text: 'Chưa nhập số liệu nào cho ngày này.' });
      } else {
        await saveLinenDay(thang, ngay, entries);
        await onSaved();
        setMsg({ type: 'ok', text: `Đã lưu số liệu ngày ${fmtDateVN(ngay)} (${entries.length} loại linen).` });
      }
    } catch (err) {
      setMsg({ type: 'err', text: 'Lỗi khi lưu: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right focus:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-60';
  const [y, m] = thang.split('-').map(Number);

  // Nút lưu + thông báo đặt thêm ngay tại bảng Rewash (khỏi phải kéo lên đầu trang)
  const rwSaveBar = (
    <div className="flex flex-wrap items-center gap-3">
      <button onClick={handleSave} disabled={!canEdit || saving || !inMonth}
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu số liệu ngày {fmtDateVN(ngay)}
      </button>
      {msg && (
        <span className={`rounded px-3 py-1.5 text-xs font-medium ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : msg.type === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</span>
      )}
    </div>
  );

  return (
    <div>
      {/* ---------- THANH CÔNG CỤ: chọn ngày + xem nhanh + lưu (gom trong 1 card) ---------- */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Ngày phát sinh</label>
            <input type="date" value={ngay} min={`${thang}-01`} max={`${thang}-${pad2(daysInMonth(thang))}`} onChange={(e) => setNgay(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <p className="pb-2 text-sm font-bold text-slate-800">Ngày {fmtDateVN(ngay)}</p>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <p className="text-xs text-slate-500">
              Tổng ngày: Dơ <strong className="text-slate-800">{fmtNumber(dayTotals.Do)}</strong> · Sạch <strong className="text-slate-800">{fmtNumber(dayTotals.Sach)}</strong> · RW Dơ <strong className="text-slate-800">{fmtNumber(dayTotals.RW)}</strong> · RW Sạch <strong className="text-slate-800">{fmtNumber(dayTotals.RWSach)}</strong>
            </p>
            <button onClick={() => setShowView(true)}
              className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 transition-all hover:bg-sky-100">
              <Eye className="h-4 w-4" /> Xem nhanh báo cáo tháng
            </button>
            <button onClick={handleSave} disabled={!canEdit || saving || !inMonth}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu số liệu ngày
            </button>
          </div>
        </div>

        {!inMonth && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">Ngày đang chọn không thuộc tháng {pad2(m)}/{y}. Chọn ngày trong tháng làm việc để nhập.</p>}
        {msg && (
          <p className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : msg.type === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-slate-500">Chọn nhanh ngày:</span>
          {Array.from({ length: daysInMonth(thang) }, (_, i) => i + 1).map((d) => {
            const full = `${thang}-${pad2(d)}`;
            const selected = full === ngay;
            const entered = enteredSet.has(full);
            return (
              <button key={d} onClick={() => setNgay(full)} title={entered ? `Ngày ${d}: đã có số liệu` : `Ngày ${d}: chưa nhập`}
                className={`relative rounded-md px-2.5 py-1 text-xs font-medium transition-all ${selected ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {pad2(d)}
                {entered && <span className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${selected ? 'bg-white' : 'bg-emerald-500'}`} />}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> chấm xanh = ngày đã có số liệu
        </p>
      </div>

      <div className="max-h-[calc(100vh-340px)] overflow-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="text-xs font-bold uppercase tracking-wide text-white">
            <tr>
              <th className="sticky top-0 border border-white/20 bg-slate-700 px-2 py-2 text-left">STT</th>
              <th className="sticky top-0 border border-white/20 bg-slate-700 px-2 py-2 text-left">TÊN LOẠI LINEN</th>
              <th className="sticky top-0 border border-white/20 bg-slate-700 px-2 py-2 text-center">ĐVT</th>
              <th className="sticky top-0 border border-white/20 bg-red-700 px-2 py-2 text-right">DƠ — GIAO GIẶT</th>
              <th className="sticky top-0 border border-white/20 bg-emerald-700 px-2 py-2 text-right">SẠCH — NHẬN VỀ</th>
              <th className="sticky top-0 border border-white/20 bg-slate-700 px-2 py-2 text-right">NỢ HIỆN TẠI</th>
            </tr>
          </thead>
          <tbody>
            {shownCatalog.map((c, idx) => (
              <tr key={c.TenHang} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-[#141414]/30 px-2 py-1 font-medium">{c.TenHang}</td>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{c.DVT}</td>
                <td className="border border-[#141414]/30 bg-red-50 px-2 py-1 text-right">
                  <DecimalInput value={vals[c.TenHang]?.Do} onChange={(e) => setVal(c.TenHang, 'Do', e.target.value)} disabled={!canEdit || !inMonth} placeholder="0" className={inputCls} />
                </td>
                <td className="border border-[#141414]/30 bg-emerald-50 px-2 py-1 text-right">
                  <DecimalInput value={vals[c.TenHang]?.Sach} onChange={(e) => setVal(c.TenHang, 'Sach', e.target.value)} disabled={!canEdit || !inMonth} placeholder="0" className={inputCls} />
                </td>
                <td className={`border border-[#141414]/30 px-2 py-1 text-right font-semibold ${(noCuoiMap[c.TenHang] || 0) < 0 ? 'text-red-600' : ''}`}>{fmtNumber(noCuoiMap[c.TenHang])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Nợ hiện tại = Nợ đầu kỳ + tổng Dơ − tổng Sạch của cả tháng (số đang nằm bên nhà giặt).</p>

      {/* ---------- BẢNG 2: REWASH DƠ / SẠCH ---------- */}
      <div className="mb-2 mt-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Bảng Rewash (hàng giặt lại) — Dơ / Sạch</h3>
        {rwSaveBar}
      </div>
      <div className="overflow-auto rounded border border-[#141414] bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="text-xs font-bold uppercase tracking-wide text-white">
            <tr>
              <th className="border border-white/20 bg-slate-700 px-2 py-2 text-left">STT</th>
              <th className="border border-white/20 bg-slate-700 px-2 py-2 text-left">TÊN LOẠI LINEN</th>
              <th className="border border-white/20 bg-slate-700 px-2 py-2 text-center">ĐVT</th>
              <th className="border border-white/20 bg-red-700 px-2 py-2 text-right">RW DƠ — GỬI GIẶT LẠI</th>
              <th className="border border-white/20 bg-emerald-700 px-2 py-2 text-right">RW SẠCH — NHẬN LẠI</th>
              <th className="border border-white/20 bg-slate-700 px-2 py-2 text-right">NỢ RW HIỆN TẠI</th>
            </tr>
          </thead>
          <tbody>
            {shownCatalog.map((c, idx) => (
              <tr key={c.TenHang} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-[#141414]/30 px-2 py-1 font-medium">{c.TenHang}</td>
                <td className="border border-[#141414]/30 px-2 py-1 text-center">{c.DVT}</td>
                <td className="border border-[#141414]/30 bg-red-50 px-2 py-1 text-right">
                  <DecimalInput value={vals[c.TenHang]?.RW} onChange={(e) => setVal(c.TenHang, 'RW', e.target.value)} disabled={!canEdit || !inMonth} placeholder="0" className={inputCls} />
                </td>
                <td className="border border-[#141414]/30 bg-emerald-50 px-2 py-1 text-right">
                  <DecimalInput value={vals[c.TenHang]?.RWSach} onChange={(e) => setVal(c.TenHang, 'RWSach', e.target.value)} disabled={!canEdit || !inMonth} placeholder="0" className={inputCls} />
                </td>
                <td className={`border border-[#141414]/30 px-2 py-1 text-right font-semibold ${(rwNoMap[c.TenHang] || 0) < 0 ? 'text-red-600' : ''}`}>{fmtNumber(rwNoMap[c.TenHang])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3">{rwSaveBar}</div>
      {showView && (
        <QuickView thang={thang} items={summary.filter((r) => !isHiddenRow(r))} dailyRows={dailyRows}
          onPickDay={(d) => { setNgay(d); setShowView(false); }} onClose={() => setShowView(false)} />
      )}
      <p className="mt-2 text-[11px] text-slate-400">Nợ RW hiện tại = Nợ đầu kỳ RW + tổng RW Dơ − tổng RW Sạch (hàng giặt lại còn bên nhà giặt). Bấm "Lưu số liệu ngày" để lưu cả 2 bảng. RW không tính tiền và không làm đổi Nợ của bảng Dơ/Sạch.</p>
    </div>
  );
}

// ====================================================================
// TAB 3 — ĐỐI SOÁT VỚI NHÀ GIẶT
// ====================================================================
function reconcile(summary, records) {
  const app = {};
  summary.forEach((s) => { app[normLinenName(s.TenHang)] = { ten: s.TenHang, do: s.TongDo, sach: s.TongSach }; });
  const laundry = {};
  records.forEach((r) => {
    const k = normLinenName(r.TenHang);
    const t = (laundry[k] ||= { ten: r.TenHang, do: 0, sach: 0 });
    t.do += Number(r.Do) || 0;
    t.sach += Number(r.Sach) || 0;
  });
  const keys = [...summary.map((s) => normLinenName(s.TenHang)), ...Object.keys(laundry).filter((k) => !app[k])];
  return keys.map((k, i) => {
    const a = app[k] || { ten: laundry[k].ten, do: 0, sach: 0, missingInApp: true };
    const l = laundry[k] || { do: 0, sach: 0, missing: true };
    const dDo = a.do - l.do;
    const dSach = a.sach - l.sach;
    const parts = [];
    if (dDo !== 0) parts.push(`Giao: App ${dDo > 0 ? 'thừa' : 'thiếu'} ${Math.abs(dDo)}`);
    if (dSach !== 0) parts.push(`Nhận: App ${dSach > 0 ? 'thừa' : 'thiếu'} ${Math.abs(dSach)}`);
    return {
      stt: i + 1, ten: a.ten, appDo: a.do, lgDo: l.do, dDo, appSach: a.sach, lgSach: l.sach, dSach,
      ok: dDo === 0 && dSach === 0, text: parts.join(' · '),
      note: a.missingInApp ? 'Không có trong danh mục App' : l.missing ? 'Nhà giặt không có dòng này' : '',
    };
  });
}

function ReconTab({ thang, catalog, summary }) {
  const [records, setRecords] = useState(null);
  const [fileName, setFileName] = useState('');
  const [experimental, setExperimental] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [onlyDiff, setOnlyDiff] = useState(false);

  const rows = useMemo(() => (records ? reconcile(summary, records) : []), [summary, records]);
  const diffCount = rows.filter((r) => !r.ok).length;
  const shown = onlyDiff ? rows.filter((r) => !r.ok) : rows;

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await parseLaundryFile(file, catalog.map((c) => c.TenHang));
      if (res.records.length === 0) {
        setError('Không đọc được dữ liệu nào từ file này. Kiểm tra lại đúng file "Bảng kê chi tiết giặt ủi" của nhà giặt (Excel) hoặc báo mình để chỉnh theo mẫu file.');
        setRecords(null);
      } else {
        setRecords(res.records);
        setFileName(file.name);
        setExperimental(res.experimental);
      }
    } catch (err) {
      setError('Lỗi đọc file: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleExport = () => {
    const [y, m] = thang.split('-').map(Number);
    const body = shown.map((r) => [r.stt, r.ten, r.appDo, r.lgDo, r.dDo, r.appSach, r.lgSach, r.dSach, r.ok ? 'Khớp số lượng' : `Lệch — ${r.text}`]);
    const { ws } = buildStandardSheet({
      title: `BÁO CÁO ĐỐI SOÁT LINEN VỚI NHÀ GIẶT THÁNG ${pad2(m)}/${y}`,
      subtitles: [`File nhà giặt: ${fileName}`],
      headers: ['STT', 'TÊN LOẠI LINEN', 'GIAO (DƠ) SL APP HK', 'GIAO (DƠ) SL NHÀ GIẶT', 'GIAO CHÊNH LỆCH', 'NHẬN (SẠCH) SL APP HK', 'NHẬN (SẠCH) SL NHÀ GIẶT', 'NHẬN CHÊNH LỆCH', 'TRẠNG THÁI'],
      colTypes: ['center', 'text', 'num', 'num', 'num', 'num', 'num', 'num', 'text'],
      rows: body,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DOI_SOAT_LINEN');
    XLSX.writeFile(wb, `Doi_Soat_Linen_${thang}.xlsx`);
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1 rounded border border-blue-400 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
          Upload Báo Cáo Nhà Giặt (PDF/Excel)
          <input type="file" accept=".xlsx,.xls,.csv,application/pdf" className="hidden"
            onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {records && (
          <>
            <button onClick={handleExport} className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
              <Download className="h-3.5 w-3.5" /> Xuất Báo Cáo Đối Soát Excel
            </button>
            <label className="flex cursor-pointer items-center gap-1 text-xs">
              <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} /> Chỉ hiện dòng lệch
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {!records ? (
        <div className="rounded border border-dashed border-slate-400 bg-white py-12 text-center text-sm text-slate-500">
          Upload file "Bảng kê chi tiết giặt ủi" của nhà giặt để so sánh với số liệu đã nhập trên App tháng {thang}.
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={`rounded-xl border p-3 shadow ${diffCount === 0 ? 'border-emerald-300 bg-emerald-50' : 'border-red-300 bg-red-50'}`}>
              <p className="text-xs font-mono uppercase text-slate-500">Kết quả đối soát</p>
              {diffCount === 0 ? (
                <p className="mt-1 flex items-center gap-2 text-xl font-bold text-emerald-600"><CheckCircle2 className="h-5 w-5" /> Khớp 100%</p>
              ) : (
                <p className="mt-1 flex items-center gap-2 text-xl font-bold text-red-600"><AlertTriangle className="h-5 w-5" /> Lệch {diffCount} / {rows.length} loại linen</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow">
              <p className="text-xs font-mono uppercase text-slate-500">File đang so sánh</p>
              <p className="mt-1 truncate text-sm font-semibold">{fileName}</p>
              {experimental && <p className="text-[11px] text-amber-600">Đọc PDF ở mức thử nghiệm — vui lòng kiểm tra lại cột "SL Nhà Giặt".</p>}
            </div>
          </div>

          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-600">Bảng Đối Soát Chênh Lệch Linen</h3>
          <div className="max-h-[calc(100vh-380px)] overflow-auto rounded border border-[#141414] bg-white">
            <table className="w-full border-collapse text-xs">
              <thead className="text-xs font-bold uppercase text-white">
                <tr>
                  <th rowSpan={2} className="sticky top-0 border border-white/20 bg-slate-700 px-2 py-2">STT</th>
                  <th rowSpan={2} className="sticky top-0 border border-white/20 bg-slate-700 px-2 py-2 text-left">TÊN LOẠI LINEN</th>
                  <th colSpan={3} className="sticky top-0 border border-white/20 bg-red-700 px-2 py-1 text-center">GIAO GIẶT (DƠ)</th>
                  <th colSpan={3} className="sticky top-0 border border-white/20 bg-emerald-700 px-2 py-1 text-center">NHẬN VỀ (SẠCH)</th>
                  <th rowSpan={2} className="sticky top-0 border border-white/20 bg-slate-700 px-2 py-2 text-left">TRẠNG THÁI</th>
                </tr>
                <tr>
                  {['SL APP HK', 'SL NHÀ GIẶT', 'CHÊNH LỆCH', 'SL APP HK', 'SL NHÀ GIẶT', 'CHÊNH LỆCH'].map((h, i) => (
                    <th key={h + i} className={`sticky top-7 border border-white/20 px-2 py-1 text-right ${i < 3 ? 'bg-red-600' : 'bg-emerald-600'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.ten + r.stt} className={r.ok ? 'bg-white' : 'bg-red-50'}>
                    <td className="border border-[#141414]/30 px-2 py-1 text-center">{r.stt}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 font-medium">{r.ten}{r.note && <span className="ml-1 text-[10px] text-amber-600">({r.note})</span>}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(r.appDo)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(r.lgDo)}</td>
                    <td className={`border border-[#141414]/30 px-2 py-1 text-right font-bold ${r.dDo !== 0 ? 'text-red-600' : ''}`}>{r.dDo > 0 ? '+' : ''}{fmtNumber(r.dDo)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(r.appSach)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1 text-right">{fmtNumber(r.lgSach)}</td>
                    <td className={`border border-[#141414]/30 px-2 py-1 text-right font-bold ${r.dSach !== 0 ? 'text-red-600' : ''}`}>{r.dSach > 0 ? '+' : ''}{fmtNumber(r.dSach)}</td>
                    <td className="border border-[#141414]/30 px-2 py-1">
                      {r.ok ? <span className="font-semibold text-emerald-700">🟢 Khớp số lượng</span> : <span className="font-semibold text-red-600">🔴 {r.text}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Chênh lệch = SL App HK − SL Nhà Giặt. Dương: App ghi nhiều hơn nhà giặt (thừa); Âm: App ghi ít hơn (thiếu).</p>
        </>
      )}
    </div>
  );
}

// ====================================================================
// MODULE CHÍNH
// ====================================================================
export default function LaundryModule() {
  const { selectedMonth, canEdit } = useStore();
  const thang = selectedMonth;

  const [tab, setTab] = useState('SUMMARY');
  const [catalog, setCatalog] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, m, d] = await Promise.all([getLinenCatalog(), getLinenMonthly(thang), getLinenDaily(thang)]);
      setCatalog(c);
      setMonthly(m);
      setDaily(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [thang]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => computeLinenSummary(catalog, monthly, daily), [catalog, monthly, daily]);

  // ---- sửa số liệu tháng (Nợ ĐK, RW, Hư hỏng, SL tính tiền) ----
  const handleMonthlyChange = (tenHang, col, value) => {
    setMonthly((prev) => {
      const exists = prev.some((r) => r.ten_hang === tenHang);
      const next = exists ? prev : [...prev, { thang, ten_hang: tenHang }];
      return next.map((r) => (r.ten_hang === tenHang ? { ...r, [col]: value } : r));
    });
  };
  const handleMonthlySave = async (tenHang, fields) => {
    setSavingKey(tenHang);
    try {
      await saveLinenMonthly(thang, tenHang, fields);
    } catch (err) {
      setError('Lỗi khi lưu: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  // ---- sửa đơn giá (lưu ở danh mục, dùng chung các tháng) ----
  const handlePriceChange = (tenHang, value) => {
    setCatalog((prev) => prev.map((c) => (c.TenHang === tenHang ? { ...c, DonGia: value } : c)));
  };
  const handlePriceSave = async (tenHang) => {
    const item = catalog.find((c) => c.TenHang === tenHang);
    if (!item) return;
    setSavingKey(tenHang);
    try {
      await saveLinenCatalogItem(item);
    } catch (err) {
      setError('Lỗi khi lưu đơn giá: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  const reloadDaily = async () => setDaily(await getLinenDaily(thang));

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-white"><Shirt className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-bold text-[#141414]">QUẢN LÝ HÀNG LINEN (LAUNDRY)</h1>
            <p className="text-xs text-slate-500">Theo dõi giao – nhận giặt ủi, nợ hàng bên nhà giặt, thành tiền và đối soát bảng kê</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-3 py-1.5 text-xs font-bold hover:bg-[#E4E3E0]">
          <RefreshCw className="h-3.5 w-3.5" /> Tải lại
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1 border-b border-[#141414]">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-bold ${tab === t.id ? 'bg-[#141414] text-white' : 'bg-white text-[#141414] hover:bg-[#E4E3E0]'} border border-b-0 border-[#141414]`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 flex items-center justify-between rounded border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span><button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /> Đang tải...</div>
      ) : tab === 'SUMMARY' ? (
        <SummaryTab thang={thang} summary={summary} dailyRows={daily} canEdit={canEdit} savingKey={savingKey}
          onMonthlyChange={handleMonthlyChange} onMonthlySave={handleMonthlySave}
          onPriceChange={handlePriceChange} onPriceSave={handlePriceSave} />
      ) : tab === 'DAILY' ? (
        <DailyTab thang={thang} catalog={catalog} dailyRows={daily} summary={summary} canEdit={canEdit} onSaved={reloadDaily} />
      ) : (
        <ReconTab thang={thang} catalog={catalog} summary={summary} />
      )}
    </div>
  );
}
