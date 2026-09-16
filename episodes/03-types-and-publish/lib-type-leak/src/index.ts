import { Emitter } from "@ep2/tiny-dep";

type BusEvents = { message: string };

/** 반환 타입에 devDependency 의 타입이 그대로 노출된다. */
export function createBus(): Emitter<BusEvents> {
  return new Emitter<BusEvents>();
}
