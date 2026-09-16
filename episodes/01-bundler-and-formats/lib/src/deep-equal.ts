/** deepEqual 이 다룰 수 없는 값(순환 참조 등)을 만났을 때 던진다. */
export class DeepEqualError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepEqualError";
  }
}

/** 두 값을 구조적으로 비교한다. 순환 참조는 DeepEqualError. */
export function deepEqual(a: unknown, b: unknown, seen: WeakSet<object> = new WeakSet()): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (seen.has(a)) throw new DeepEqualError("circular reference");
  seen.add(a);
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], seen));
}
