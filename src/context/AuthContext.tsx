import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

// Đăng nhập thật bằng Supabase Auth (email + mật khẩu). Phiên đăng nhập được trình duyệt
// ghi nhớ, nên nhân viên không phải gõ lại mỗi lần mở App; bấm "Đăng xuất" để thoát.
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>; // trả về thông báo lỗi (null = thành công)
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function viError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email hoặc mật khẩu không đúng.';
  if (m.includes('email not confirmed')) return 'Tài khoản chưa được kích hoạt. Vui lòng liên hệ Trưởng bộ phận.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  return 'Không đăng nhập được. Vui lòng thử lại.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? viError(error.message) : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Tải lại trang để xoá sạch dữ liệu đang giữ trong bộ nhớ của người trước
    window.location.reload();
  };

  return <AuthContext.Provider value={{ session, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
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
  return <>{session ? children : login}</>;
};
