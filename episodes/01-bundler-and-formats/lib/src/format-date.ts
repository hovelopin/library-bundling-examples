const pad = (n: number): string => String(n).padStart(2, "0");

/** Date 를 `YYYY-MM-DD` 또는 `YYYY-MM-DD HH:mm` 문자열로 만든다. */
export function formatDate(date: Date, withTime: boolean = false): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const base = `${y}-${m}-${d}`;
  if (!withTime) return base;
  return `${base} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
