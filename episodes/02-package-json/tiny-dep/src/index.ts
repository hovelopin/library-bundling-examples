// 작은 이벤트 이미터. "라이브러리가 의존하는 라이브러리" 역할.
export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    (this.listeners[event] ??= new Set()).add(fn);
    return () => this.off(event, fn);
  }

  once<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    const off = this.on(event, (p) => {
      off();
      fn(p);
    });
    return off;
  }

  off<K extends keyof Events>(event: K, fn: Listener<Events[K]>): void {
    this.listeners[event]?.delete(fn);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const fn of this.listeners[event] ?? []) fn(payload);
  }

  listenerCount(event: keyof Events): number {
    return this.listeners[event]?.size ?? 0;
  }

  clear(): void {
    this.listeners = {};
  }
}

/** 두 이미터를 이어 붙인다. from 의 모든 이벤트를 to 로 흘려보낸다. */
export function pipe<E extends Record<string, unknown>>(from: Emitter<E>, to: Emitter<E>, events: (keyof E)[]): () => void {
  const offs = events.map((ev) => from.on(ev, (p) => to.emit(ev, p)));
  return () => offs.forEach((off) => off());
}
