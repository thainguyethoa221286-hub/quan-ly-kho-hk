import { useState, useCallback, useRef } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

// ==================================================================
// Hook dùng chung thay cho window.confirm() — vì hộp thoại mặc định của
// trình duyệt (window.confirm) luôn hiện ở GÓC TRÊN cửa sổ (do Chrome kiểm
// soát vị trí, web không chỉnh được), gây khó thấy/dễ bấm nhầm. Hook này
// hiện 1 modal TỰ VẼ, nằm CHÍNH GIỮA TRANG, dùng chung cho mọi nút Xoá
// trong toàn bộ App.
//
// Cách dùng trong 1 component:
//   const { confirm, ConfirmDialog } = useConfirm();
//   ...
//   const handleDelete = async () => {
//     if (!(await confirm('Xoá dòng này?'))) return;
//     ...xoá...
//   };
//   return (<div>...{ConfirmDialog}</div>);
// ==================================================================
export function useConfirm() {
  const [message, setMessage] = useState(null);
  const [opts, setOpts] = useState({});
  const resolveRef = useRef(null);

  // opts (không bắt buộc): { title: 'Xác nhận', okText: 'Xoá', danger: true }  — mặc định giữ kiểu Xoá màu đỏ như cũ
  const confirm = useCallback((msg, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setOpts(options);
      setMessage(msg);
    });
  }, []);

  const answer = (result) => {
    setMessage(null);
    if (resolveRef.current) resolveRef.current(result);
    resolveRef.current = null;
  };

  const ConfirmDialog = message !== null ? (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-2xl">
        <div className={`mb-3 flex items-center gap-2 ${opts.danger === false ? 'text-slate-800' : 'text-red-600'}`}>
          {opts.danger === false ? <HelpCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <h3 className="text-sm font-bold">{opts.title || 'Xác nhận'}</h3>
        </div>
        <p className="mb-5 whitespace-pre-line text-sm text-slate-700">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => answer(false)}
            className="rounded border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Huỷ
          </button>
          <button
            onClick={() => answer(true)}
            className={`rounded px-4 py-1.5 text-sm font-bold text-white ${opts.danger === false ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {opts.okText || 'Xoá'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialog };
}
