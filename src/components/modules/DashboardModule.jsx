import React, { useState, useMemo } from 'react';
import {
  BarChart3, Download, Printer, Eye, X, Loader2, Lock, Unlock,
  AlertTriangle, Package, ShoppingCart, Coffee, FileText,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useStore } from '../../context/StoreContext';
import { getKhoData } from '../../services/googleSheetsService';
import { getPRPOData } from '../../services/googleSheetsService';
import { getDamageData } from '../../services/googleSheetsService';
import { getMinibarSummary } from '../../services/googleSheetsService';
import { getVPPData } from '../../services/googleSheetsService';

const fmtNumber = (v) => (Number(v) || 0).toLocaleString('vi-VN');

// ---------- Cấu hình 5 phân hệ báo cáo ----------
const REPORTS = [
  {
    key: 'STORE',
    title: 'Kho HK & Vật Tư',
    icon: Package,
    pastel: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700',
    fetch: getKhoData,
    columns: [
      { key: 'Stt', label: 'STT' },
      { key: 'TenHang', label: 'Tên mặt hàng' },
      { key: 'DVT', label: 'ĐVT' },
      { key: 'DauKy', label: 'Đầu kỳ', num: true },
      { key: 'Nhap', label: 'Nhập', num: true },
      { key: 'SuDung', label: 'Sử dụng', num: true },
      { key: 'Ton', label: 'Tồn/Cuối kỳ', num: true },
      { key: 'TongKho', label: 'Tổng kho', num: true },
    ],
  },
  {
    key: 'PRPO',
    title: 'Đề Xuất Mua Hàng PR-PO',
    icon: ShoppingCart,
    pastel: 'bg-violet-50 border-violet-200',
    iconBg: 'bg-violet-100 text-violet-700',
    fetch: async (thang) => (await getPRPOData(thang)).filter((it) => !it.Hidden),
    columns: [
      { key: 'Stt', label: 'STT' },
      { key: 'TenHang', label: 'Item' },
      { key: 'DVT', label: 'ĐVT' },
      { key: 'StockInHand', label: 'Stock In Hand', num: true },
      { key: 'StockMax', label: 'Stock Max', num: true },
      { key: 'DeXuatMua', label: 'Đề Xuất Mua', num: true },
    ],
  },
  {
    key: 'DAMAGE',
    title: 'Báo Cáo Hư Hỏng / FOC',
    icon: AlertTriangle,
    pastel: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-100 text-red-700',
    fetch: getDamageData,
    columns: [
      { key: 'Stt', label: 'STT' },
      { key: 'Ngay', label: 'Ngày' },
      { key: 'TenHang', label: 'Item' },
      { key: 'ViTri', label: 'Vị trí' },
      { key: 'SL', label: 'SL', num: true },
      { key: 'ThuKhach', label: 'Thu Khách', num: true },
      { key: 'FOCCost', label: 'FOC Cost', num: true },
      { key: 'NguoiBaoCao', label: 'Phê Duyệt Bởi' },
    ],
  },
  {
    key: 'MINIBAR',
    title: 'Minibar',
    icon: Coffee,
    pastel: 'bg-amber-50 border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700',
    fetch: getMinibarSummary,
    columns: [
      { key: 'Stt', label: 'STT' },
      { key: 'TenHang', label: 'Tên hàng' },
      { key: 'DVT', label: 'ĐVT' },
      { key: 'Billed', label: 'Billed', num: true },
      { key: 'FOC', label: 'FOC', num: true },
      { key: 'NoCharge', label: 'No Charge', num: true },
      { key: 'TonThucTe', label: 'Tồn Thực Tế', num: true },
      { key: 'ChenhLech', label: 'Chênh Lệch', num: true },
    ],
  },
  {
    key: 'VPP',
    title: 'Văn Phòng Phẩm (VPP)',
    icon: FileText,
    pastel: 'bg-emerald-50 border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700',
    fetch: getVPPData,
    columns: [
      { key: 'Stt', label: 'STT' },
      { key: 'TenHang', label: 'Tên mặt hàng' },
      { key: 'DVT', label: 'ĐVT' },
      { key: 'DauKy', label: 'Đầu kỳ', num: true },
      { key: 'Nhap', label: 'Nhập', num: true },
      { key: 'CuoiKy', label: 'Cuối kỳ', num: true },
      { key: 'SuDung', label: 'Sử dụng', num: true },
    ],
  },
];

// ---------- Modal Xem Nhanh / In A4 ----------
function PreviewModal({ report, thang, autoPrint, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    report.fetch(thang).then((data) => {
      if (cancelled) return;
      setRows(data);
      if (autoPrint) setTimeout(() => window.print(), 300);
    }).catch((err) => setError(err.message));
    return () => { cancelled = true; };
  }, [report, thang, autoPrint]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } body * { visibility: hidden; } #dash-preview, #dash-preview * { visibility: visible; } #dash-preview { position: fixed; top: 0; left: 0; width: 100%; } }`}</style>
      <div id="dash-preview" className="flex max-h-[85vh] w-[900px] flex-col rounded-lg bg-white p-5 shadow-xl print:max-h-none print:w-full print:shadow-none">
        <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
          <h3 className="text-base font-bold">{report.title} — Tháng {thang}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="mb-2 hidden text-center print:block">
          <p className="text-lg font-bold">M HOTEL — {report.title.toUpperCase()}</p>
          <p className="text-sm">Tháng {thang}</p>
        </div>

        {error ? (
          <p className="py-8 text-center text-sm text-red-500">{error}</p>
        ) : !rows ? (
          <div className="py-12 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu trong tháng này.</p>
        ) : (
          <div className="flex-1 overflow-y-auto rounded border border-slate-200">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-[#F2F1EE] font-mono uppercase text-[10px]">
                <tr>
                  {report.columns.map((c) => (
                    <th key={c.key} className={`border border-slate-300 px-2 py-1.5 ${c.num ? 'text-right' : 'text-left'}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={idx}>
                    {report.columns.map((c) => (
                      <td key={c.key} className={`border border-slate-200 px-2 py-1 ${c.num ? 'text-right' : 'text-left'}`}>
                        {c.num ? fmtNumber(r[c.key]) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Xuất Excel đơn giản cho 1 phân hệ ----------
async function exportReportExcel(report, thang) {
  const rows = await report.fetch(thang);
  const grey = 'D9D9D9';
  const thin = { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } };
  const headers = report.columns.map((c) => c.label);
  const aoa = [[`M HOTEL — ${report.title.toUpperCase()} — THÁNG ${thang}`], [], headers];
  rows.forEach((r) => aoa.push(report.columns.map((c) => r[c.key])));
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const lastCol = headers.length - 1;
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
  ws['!cols'] = report.columns.map((c) => ({ wch: c.key === 'TenHang' ? 28 : 12 }));
  const setStyle = (r, c, style) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' };
    ws[ref].s = { ...(ws[ref].s || {}), ...style };
  };
  setStyle(0, 0, { font: { bold: true, sz: 13, name: 'Times New Roman' } });
  for (let c = 0; c <= lastCol; c++) setStyle(2, c, { font: { bold: true, sz: 9, name: 'Times New Roman' }, fill: { fgColor: { rgb: grey } }, alignment: { horizontal: 'center', wrapText: true }, border: thin });
  for (let r = 3; r < aoa.length; r++) for (let c = 0; c <= lastCol; c++) setStyle(r, c, { font: { sz: 9, name: 'Times New Roman' }, alignment: { horizontal: report.columns[c].num ? 'right' : 'left' }, border: thin });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, report.key);
  XLSX.writeFile(wb, `${report.title.replace(/\s+/g, '_')}_${thang}.xlsx`);
}

// ---------- Master Workbook Excel: gộp cả 5 phân hệ vào 1 file nhiều sheet ----------
async function exportMasterWorkbook(thang) {
  const wb = XLSX.utils.book_new();
  const grey = 'D9D9D9';
  const thin = { top: { style: 'thin', color: { rgb: 'CCCCCC' } }, bottom: { style: 'thin', color: { rgb: 'CCCCCC' } }, left: { style: 'thin', color: { rgb: 'CCCCCC' } }, right: { style: 'thin', color: { rgb: 'CCCCCC' } } };

  for (const report of REPORTS) {
    const rows = await report.fetch(thang);
    const headers = report.columns.map((c) => c.label);
    const aoa = [[`M HOTEL — ${report.title.toUpperCase()} — THÁNG ${thang}`], [], headers];
    rows.forEach((r) => aoa.push(report.columns.map((c) => r[c.key])));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const lastCol = headers.length - 1;
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } }];
    ws['!cols'] = report.columns.map((c) => ({ wch: c.key === 'TenHang' ? 28 : 12 }));
    const setStyle = (r, c, style) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) ws[ref] = { t: 's', v: '' };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };
    setStyle(0, 0, { font: { bold: true, sz: 13, name: 'Times New Roman' } });
    for (let c = 0; c <= lastCol; c++) setStyle(2, c, { font: { bold: true, sz: 9, name: 'Times New Roman' }, fill: { fgColor: { rgb: grey } }, alignment: { horizontal: 'center', wrapText: true }, border: thin });
    for (let r = 3; r < aoa.length; r++) for (let c = 0; c <= lastCol; c++) setStyle(r, c, { font: { sz: 9, name: 'Times New Roman' }, alignment: { horizontal: report.columns[c].num ? 'right' : 'left' }, border: thin });
    XLSX.utils.book_append_sheet(wb, ws, report.key);
  }

  XLSX.writeFile(wb, `Master_Workbook_HK_${thang}.xlsx`);
}

// ---------- Main Component ----------
export default function DashboardModule() {
  const { selectedMonth, isMonthLocked, toggleLockMonth } = useStore();
  const thang = selectedMonth;

  const [previewReport, setPreviewReport] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [focCost, setFocCost] = useState(null);
  const [minibarDiscrepancy, setMinibarDiscrepancy] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [masterExporting, setMasterExporting] = useState(false);
  const [exportingKey, setExportingKey] = useState(null);

  React.useEffect(() => {
    let cancelled = false;
    setKpiLoading(true);
    Promise.all([getDamageData(thang), getMinibarSummary(thang)]).then(([damage, minibar]) => {
      if (cancelled) return;
      setFocCost(damage.reduce((s, d) => s + (Number(d.FOCCost) || 0), 0));
      setMinibarDiscrepancy(minibar.filter((m) => Number(m.ChenhLech) !== 0).length);
      setKpiLoading(false);
    }).catch(() => setKpiLoading(false));
    return () => { cancelled = true; };
  }, [thang]);

  const handleExport = async (report) => {
    setExportingKey(report.key);
    try {
      await exportReportExcel(report, thang);
    } finally {
      setExportingKey(null);
    }
  };

  const handlePrint = (report) => {
    setAutoPrint(true);
    setPreviewReport(report);
  };

  const handleMasterExport = async () => {
    setMasterExporting(true);
    try {
      await exportMasterWorkbook(thang);
    } finally {
      setMasterExporting(false);
    }
  };

  return (
    <div>
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>

      {/* ---- Banner Header ---- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#141414]">BÁO CÁO TỔNG HỢP THÁNG & DASHBOARD MANAGEMENT</h1>
          </div>
          <span className="rounded-lg bg-emerald-600 px-4 py-2 text-lg font-bold text-white shadow">{thang}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleMasterExport} disabled={masterExporting} className="flex items-center gap-1 rounded bg-[#141414] px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            {masterExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Master Workbook Excel
          </button>
          <button onClick={() => toggleLockMonth(thang)} className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold text-white ${isMonthLocked ? 'bg-red-500 hover:bg-red-600' : 'bg-[#10B981] hover:bg-emerald-700'}`}>
            {isMonthLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {isMonthLocked ? 'Đã Khoá Sổ' : 'Phê Duyệt & Khoá Số Liệu Tháng'}
          </button>
        </div>
      </div>

      {/* ---- 2 KPI Cards ---- */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 print:hidden">
        <div className="rounded-xl border border-slate-200 bg-red-50 p-4 shadow-md transition-shadow duration-200 hover:shadow-lg">
          <p className="text-xs font-mono uppercase text-slate-500">Chi Phí Hư Hỏng FOC</p>
          {kpiLoading ? (
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-red-600">{fmtNumber(focCost)} đ</p>
          )}
          <p className="text-[11px] text-slate-400">Tổng Chi Phí Thiệt Hại FOC — Module 03</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-amber-50 p-4 shadow-md transition-shadow duration-200 hover:shadow-lg">
          <p className="text-xs font-mono uppercase text-slate-500">Discrepancy Minibar</p>
          {kpiLoading ? (
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-slate-400" />
          ) : minibarDiscrepancy > 0 ? (
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-red-600">
              <AlertTriangle className="h-6 w-6" /> Lệch {minibarDiscrepancy} Mặt Hàng
            </p>
          ) : (
            <p className="mt-1 text-2xl font-bold text-emerald-600">Khớp 100%</p>
          )}
          <p className="text-[11px] text-slate-400">Chênh lệch kiểm kê — Module 04</p>
        </div>
      </div>

      {/* ---- Report List ---- */}
      <h2 className="mb-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-500 print:hidden">Report List</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:hidden">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <div key={report.key} className={`rounded-xl border p-4 shadow-md transition-shadow duration-200 hover:shadow-lg ${report.pastel}`}>
              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${report.iconBg}`}><Icon className="h-4 w-4" /></div>
                <p className="text-sm font-bold text-[#141414]">{report.title}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => { setAutoPrint(false); setPreviewReport(report); }} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-[#E4E3E0]">
                  <Eye className="h-3.5 w-3.5" /> Xem Nhanh
                </button>
                <button onClick={() => handleExport(report)} disabled={exportingKey === report.key} className="flex items-center gap-1 rounded bg-[#141414] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50">
                  {exportingKey === report.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Excel
                </button>
                <button onClick={() => handlePrint(report)} className="flex items-center gap-1 rounded border border-[#141414] bg-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-[#E4E3E0]">
                  <Printer className="h-3.5 w-3.5" /> In A4
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewReport && (
        <PreviewModal
          report={previewReport}
          thang={thang}
          autoPrint={autoPrint}
          onClose={() => { setPreviewReport(null); setAutoPrint(false); }}
        />
      )}
    </div>
  );
}
