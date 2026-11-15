import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, BedDouble, Wine, Shirt, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const MAX_TRIES = 5;
const COOLDOWN_SEC = 30;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [wait, setWait] = useState(0);

  // Sai quá nhiều lần -> tạm khoá nút đăng nhập 30 giây
  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || wait > 0) return;
    if (!email.trim() || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) {
      const n = fails + 1;
      setError(err);
      setPassword('');
      if (n >= MAX_TRIES) { setWait(COOLDOWN_SEC); setFails(0); } else setFails(n);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#141414] text-white">
      {/* ---- Bên trái: thương hiệu (ẩn trên điện thoại) ---- */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{ background: 'radial-gradient(1200px 600px at 10% 0%, #1f3b33 0%, #141414 60%)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded border border-white/30 bg-white/10 text-lg font-black">M</div>
          <div>
            <p className="text-lg font-black tracking-wide">M HOTEL SAIGON</p>
            <p className="font-mono text-[11px] uppercase tracking-widest text-emerald-300/80">Housekeeping Department</p>
          </div>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-black leading-tight" style={{ color: '#fff' }}>Hệ thống quản lý<br />kho, minibar &amp; linen<br /><span className="text-emerald-400">bộ phận Buồng Phòng</span></h1>
          <ul className="mt-8 grid max-w-md grid-cols-2 gap-3 text-sm text-white/80">
            <li className="flex items-center gap-2"><Package className="h-4 w-4 text-emerald-400" /> Kho HK &amp; Vật tư</li>
            <li className="flex items-center gap-2"><Wine className="h-4 w-4 text-emerald-400" /> Minibar &amp; Daily bills</li>
            <li className="flex items-center gap-2"><Shirt className="h-4 w-4 text-emerald-400" /> Giặt ủi &amp; đối soát</li>
            <li className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-emerald-400" /> Báo cáo tháng</li>
          </ul>
        </div>
        <p className="text-xs text-white/40">© M Hotel Saigon — Hệ thống nội bộ, nghiêm cấm sao chép hoặc chia sẻ.</p>
      </div>

      {/* ---- Bên phải: form đăng nhập ---- */}
      <div className="flex w-full items-center justify-center bg-[#E4E3E0] p-6 text-[#141414] lg:w-[480px]">
        <form onSubmit={submit} className="w-full max-w-sm" autoComplete="on">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-[#141414] text-lg font-black text-white">M</div>
            <p className="text-base font-black">M HOTEL SAIGON</p>
          </div>

          <h2 className="text-2xl font-black">Đăng nhập</h2>
          <p className="mb-6 mt-1 text-sm text-slate-600">Dành cho nhân viên được cấp tài khoản.</p>

          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600" htmlFor="login-email">Email</label>
          <div className="relative mb-4">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="login-email" type="email" name="email" autoComplete="username" autoFocus value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="ten@mhotel.vn"
              className="w-full rounded border border-[#141414] bg-white py-3 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>

          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600" htmlFor="login-pass">Mật khẩu</label>
          <div className="relative mb-4">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="login-pass" type={show ? 'text' : 'password'} name="password" autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full rounded border border-[#141414] bg-white py-3 pl-10 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <button type="button" onClick={() => setShow((v) => !v)} tabIndex={-1} title={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 hover:bg-slate-100">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
          {wait > 0 && <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">Nhập sai nhiều lần. Vui lòng đợi {wait} giây rồi thử lại.</p>}

          <button type="submit" disabled={busy || wait > 0}
            className="flex w-full items-center justify-center gap-2 rounded bg-[#141414] py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <p className="mt-6 text-center text-xs text-slate-500">Quên mật khẩu hoặc cần tài khoản mới? Liên hệ Trưởng bộ phận Buồng Phòng.</p>
        </form>
      </div>
    </div>
  );
}
