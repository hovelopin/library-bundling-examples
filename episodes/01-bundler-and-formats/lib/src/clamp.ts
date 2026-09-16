/** 값을 [min, max] 범위 안으로 자른다. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) throw new RangeError(`clamp: min(${min}) > max(${max})`);
  return Math.min(Math.max(value, min), max);
}
