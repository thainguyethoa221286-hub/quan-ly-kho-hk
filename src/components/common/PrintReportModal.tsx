import React from 'react';
import { X, Printer, Download } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  orientation?: 'portrait' | 'landscape';
  children: React.ReactNode;
  onExportExcel?: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  orientation = 'landscape',
  children,
  onExportExcel
}) => {
  const { selectedMonth, userProfile } = useStore();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#141414]/70 p-4 overflow-y-auto">
      <div className="bg-[#F2F1EE] border border-[#141414] w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl text-[#141414] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#F2F1EE] border-b border-[#141414] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#141414] text-[#E4E3E0]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#141414] flex items-center gap-2">
                {title}
                <span className="text-[10px] font-mono px-2 py-0.5 uppercase bg-[#E4E3E0] text-[#141414] border border-[#141414]">
                  A4 {orientation === 'landscape' ? 'NGANG' : 'DỌC'}
                </span>
              </h2>
              <p className="text-xs text-slate-700">{subtitle} - Kỳ báo cáo: {selectedMonth}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportExcel && (
              <button
                onClick={onExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#E4E3E0] text-[#141414] text-xs font-mono font-bold border border-[#141414] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Xuất Excel</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#141414] hover:bg-slate-800 text-white text-xs font-mono font-bold border border-[#141414] transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay (Print A4)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#141414] hover:bg-[#E4E3E0] border border-[#141414] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Printable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#E4E3E0] font-sans print-container">
          {/* Printable Document Paper Card */}
          <div className={`mx-auto bg-white text-slate-900 p-8 border border-[#141414] shadow-xl text-xs leading-relaxed ${
            orientation === 'landscape' ? 'max-w-5xl' : 'max-w-3xl'
          }`}>
            
            {/* Standard Hotel Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-sm tracking-wide text-slate-900 uppercase">
                  GRAND PALACE HOTEL & RESORT 5★
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  Bộ Phận Buồng Phòng & Quản Lý Kho Vật Tư (Housekeeping & Store Dept)
                </p>
                <p className="text-[10px] text-slate-500">
                  Địa chỉ: 188 Boulevard Resort, TP. Nha Trang | Hotline: (0258) 388 999
                </p>
              </div>

              <div className="text-right text-[11px] text-slate-600">
                <p className="font-semibold text-slate-900">Mẫu Số: HK-ST-{selectedMonth.replace('-', '')}</p>
                <p>Kỳ Báo Cáo: {selectedMonth}</p>
                <p className="text-[10px] text-slate-500">In lúc: {new Date().toLocaleString('vi-VN')}</p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="text-center mb-6">
              <h1 className="font-black text-lg text-slate-900 uppercase tracking-tight">
                {title}
              </h1>
              <p className="text-xs text-slate-600 italic mt-0.5">
                {subtitle}
              </p>
            </div>

            {/* Children Table / Data Content */}
            <div className="mb-8">
              {children}
            </div>

            {/* Signature Block */}
            <div className="mt-12 pt-4 border-t border-slate-300">
              <div className="flex items-center justify-between text-center font-medium text-slate-800 text-xs">
                <div>
                  <p className="font-bold">Người Lập Báo Cáo</p>
                  <p className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold">{userProfile.name}</p>
                </div>

                <div>
                  <p className="font-bold">Thủ Kho Vật Tư</p>
                  <p className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold">Nguyễn Văn Nam</p>
                </div>

                <div>
                  <p className="font-bold">Trưởng BP Buồng Phòng</p>
                  <p className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold">Trần Thị Mỹ Hoa</p>
                </div>

                <div>
                  <p className="font-bold">Kế Toán Trưởng Duyệt</p>
                  <p className="text-[10px] text-slate-500 italic">(Ký & ghi rõ họ tên)</p>
                  <div className="h-16"></div>
                  <p className="font-semibold">Lê Thị Thu Hương</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
