// Tra đơn giá của 1 Item (theo tên) trong bảng DAMAGE_PRICES để tự tính tiền.
import { DAMAGE_PRICES } from '../data/damagePrices';

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/_hk\b/g, '')
    .replace(/[^a-z0-9]/g, '');

// Mỗi dòng giá có thể khớp bằng: tên đầy đủ, hoặc tên tiếng Anh (trước dấu "("), hoặc tên tiếng Việt (trong ngoặc)
const ENTRIES = DAMAGE_PRICES.map((p) => {
  const full = norm(p.ten);
  const eng = norm(p.ten.split('(')[0]);
  const vn = norm((p.ten.match(/\(([^)]*)\)/) || [])[1] || '');
  return { ...p, full, eng, vn };
});
const countEng = ENTRIES.reduce((m, e) => ((m[e.eng] = (m[e.eng] || 0) + 1), m), {});

/** @returns {number|null} đơn giá (đ) hoặc null nếu chưa có trong bảng giá */
export function findUnitPrice(tenHang) {
  const n = norm(tenHang);
  if (n.length < 3) return null;

  // 1) trùng khớp hoàn toàn
  let hit = ENTRIES.find((e) => n === e.full || n === e.eng || (e.vn && n === e.vn));
  if (hit && (n !== hit.eng || countEng[hit.eng] === 1 || n === hit.full)) return hit.don_gia;

  // 2) chứa nhau (tên Item trong Kho thường kèm quy cách: "Shampoo 5L", "Shampoo (Dầu gội) 5L"...)
  hit = ENTRIES.find((e) => {
    const keys = [e.full, countEng[e.eng] === 1 ? e.eng : null, e.vn].filter((k) => k && k.length >= 4);
    return keys.some((k) => n.includes(k) || k.includes(n));
  });
  return hit ? hit.don_gia : null;
}
