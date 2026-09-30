/**
 * ============================================================
 *  supabaseMonthLockService.js — Khoá Sổ Tháng (dùng chung mọi module)
 * ============================================================
 */
import { supabase } from './supabaseClient';

const TABLE = 'month_locks';

export async function getMonthLockStatus(thang) {
  const { data, error } = await supabase.from(TABLE).select('locked').eq('thang', thang).maybeSingle();
  if (error) throw new Error(error.message);
  return { thang, locked: data ? data.locked === true : false };
}

export async function setMonthLockStatus(thang, locked) {
  const { error } = await supabase.from(TABLE).upsert({ thang, locked }, { onConflict: 'thang' });
  if (error) throw new Error(error.message);
  return { thang, locked };
}
