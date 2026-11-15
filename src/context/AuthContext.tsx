import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

// Đăng nhập thật bằng Supabase Auth. Nhân viên chỉ gõ ID (VD: hoa.hk) + mật khẩu, KHÔNG cần email thật:
// App tự ghép ID thành "<id>@mhotel.vn" (email nội bộ, không gửi thư) để Supabase nhận diện. Phiên đăng nhập được trình duyệt
// ghi nhớ, nên nhân viên không phải gõ lại mỗi lần mở App; bấm "Đăng xuất" để thoát.
/** Tên miền nội bộ gắn sau ID. Khi tạo tài khoản trên Supabase, email = <ID>@mhotel.vn */
export const ID_DOMAIN = 'mhotel.vn';
export const idToEmail = (id: string) => {
  const t = id.trim().toLowerCase();
  return t.includes('@') ? t : `${t}@${ID_DOMAIN}`;
};
export const emailToId = (email?: string | null) => (email || '').replace(`@${ID_DOMAIN}`, '');

/** Họ tên + chức danh của người đang đăng nhập (lấy từ bảng nhan_vien trong Supabase) */
export interface StaffProfile { hoTen: string; chucDanh: string }

interface AuthContextType {
  session: Session | null;
  profile: StaffProfile | null;
  loading: boolean;
  signIn: (id: string, password: string) => Promise<string | null>; // trả về thông báo lỗi (null = thành công)
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function viError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'ID hoặc mật khẩu không đúng.';
  if (m.includes('email not confirmed')) return 'Tài khoản chưa được kích hoạt. Vui lòng liên hệ Trưởng bộ phận.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  return 'Không đăng nhập được. Vui lòng thử lại.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StaffProfile | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  // Mỗi lần đăng nhập: đọc họ tên + chức danh của chính tài khoản đó (không có bảng/không có dòng -> chỉ hiện ID)
  const email = session?.user?.email;
  useEffect(() => {
    if (!email) { setProfile(null); return undefined; }
    let alive = true;
    supabase.from('nhan_vien').select('ho_ten, chuc_danh').eq('id', emailToId(email)).maybeSingle()
      .then(({ data }) => { if (alive) setProfile(data ? { hoTen: data.ho_ten || '', chucDanh: data.chuc_danh || '' } : null); });
    return () => { alive = false; };
  }, [email]);

  const signIn = async (id: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: idToEmail(id), password });
    return error ? viError(error.message) : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Tải lại trang để xoá sạch dữ liệu đang giữ trong bộ nhớ của người trước
    window.location.reload();
  };

  return <AuthContext.Provider value={{ session, profile, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}

/** Chỉ cho vào App khi đã đăng nhập. Chưa đăng nhập -> hiện màn hình đăng nhập (App chưa được tải). */
export const AuthGate: React.FC<{ login: React.ReactNode; children: React.ReactNode }> = ({ login, children }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
      </div>
    );
  }
  return <>{session ? <>{children}<IdleGuard /></> : login}</>;
};

// ---- Tự đăng xuất sau 30 phút không thao tác (báo trước 60 giây, bấm "Tiếp tục" để ở lại) ----
const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 60 * 1000;

function IdleGuard() {
  const { signOut } = useAuth();
  const lastRef = useRef(Date.now());
  const warnRef = useRef(false);
  const [left, setLeft] = useState<number | null>(null); // số giây còn lại khi đang cảnh báo

  useEffect(() => {
    const bump = () => { if (!warnRef.current) lastRef.current = Date.now(); };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const tick = () => {
      const idle = Date.now() - lastRef.current;
      if (idle >= IDLE_MS) { signOut(); return; }
      if (idle >= IDLE_MS - WARN_MS) { warnRef.current = true; setLeft(Math.ceil((IDLE_MS - idle) / 1000)); }
      else { warnRef.current = false; setLeft(null); }
    };
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [signOut]);

  if (left === null) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-base font-bold text-[#141414]">Bạn còn đang làm việc không?</h3>
        <p className="mb-4 text-sm text-slate-600">Đã lâu không thao tác. Hệ thống sẽ tự đăng xuất sau <b className="text-red-600">{left}</b> giây để bảo mật.</p>
        <button
          autoFocus
          onClick={() => { lastRef.current = Date.now(); warnRef.current = false; setLeft(null); }}
          className="w-full rounded bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-700"
        >
          Tiếp tục làm việc
        </button>
      </div>
    </div>
  );
}
