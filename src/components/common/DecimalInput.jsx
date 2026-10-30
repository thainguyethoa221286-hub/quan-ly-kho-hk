import { useState } from 'react';

/**
 * Ô nhập SỐ THỰC (cho phép 0.5, 0.7, 1.5 ... và cả dấu phẩy 0,5).
 *
 * Vì sao không dùng <input type="number" value={Number(v)===0 ? '' : v}>:
 * khi gõ "0" thì React thấy giá trị = 0 và xoá trắng ô -> không bao giờ gõ
 * được "0.5". Ở đây ô giữ "bản nháp" (chuỗi đang gõ) trong lúc đang focus,
 * chỉ ẩn số 0 khi KHÔNG còn đang gõ.
 *
 * onChange nhận về object có dạng { target: { value: '0.5' } } nên dùng được
 * y hệt onChange={(e)=>handle(..., e.target.value)} cũ.
 */
export default function DecimalInput({ value, onChange, onFocus, onBlur, hideZero = true, allowNegative = false, ...rest }) {
  const [draft, setDraft] = useState(null);

  const isEmpty = value === null || value === undefined || value === '';
  const external = isEmpty || (hideZero && Number(value) === 0) ? '' : String(value);
  const shown = draft !== null ? draft : external;

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      onFocus={(e) => {
        setDraft(external);
        if (onFocus) onFocus(e);
      }}
      onChange={(e) => {
        const v = e.target.value.replace(',', '.');
        const re = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
        if (v !== '' && !re.test(v)) return; // chỉ cho số + 1 dấu chấm (và dấu trừ nếu allowNegative)
        setDraft(v);
        if (onChange) onChange({ target: { value: v } });
      }}
      onBlur={(e) => {
        setDraft(null);
        if (onBlur) onBlur(e);
      }}
    />
  );
}
