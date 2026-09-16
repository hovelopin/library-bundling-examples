// 최상위에서 함수를 "호출"해 값을 만든다. 번들러는 이 호출이 순수한지 알 수 없다.
function buildTable(): number[] {
  return Array.from({ length: 256 }, (_, i) => (i * 31) % 257);
}
const TABLE: number[] = buildTable();

export function b(x: number): number {
  return TABLE[x & 255];
}
