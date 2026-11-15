/**
 * ============================================================
 *  supabaseClient.js — Kết nối tới Supabase (bản thử nghiệm)
 * ============================================================
 *  Project URL + anon key ở đây là loại "public" — được thiết kế để
 *  nhúng thẳng vào code frontend (giống cơ chế APPS_SCRIPT_URL hiện tại),
 *  không phải bí mật cần giấu. Việc ai được SỬA dữ liệu vẫn do mật khẩu
 *  "Chế Độ Quản Lý" trong app kiểm soát như trước.
 * ============================================================
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tppaiyzolzkafcgejzgg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NTS9OddWtTz0t4WLp_1Fdg_SHzqAZaD';

// Phiên đăng nhập chỉ lưu theo TAB trình duyệt (sessionStorage): đóng tab / đóng trình duyệt là tự đăng xuất,
// lần sau mở lại App sẽ phải đăng nhập lại. (Tải lại trang F5 trong cùng tab thì vẫn giữ đăng nhập.)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
