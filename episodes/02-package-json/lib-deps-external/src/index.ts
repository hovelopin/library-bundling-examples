import { Emitter } from "@ep2/tiny-dep";

type StoreEvents<T> = { change: T };

/** tiny-dep 의 Emitter 위에 얹은 아주 작은 스토어. */
export function createStore<T>(initial: T): {
  get: () => T;
  set: (next: T) => void;
  subscribe: (fn: (v: T) => void) => () => void;
} {
  let value = initial;
  const emitter = new Emitter<StoreEvents<T>>();
  return {
    get: () => value,
    set: (next) => {
      value = next;
      emitter.emit("change", next);
    },
    subscribe: (fn) => emitter.on("change", fn),
  };
}
