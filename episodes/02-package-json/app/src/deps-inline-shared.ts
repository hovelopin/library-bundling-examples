// 앱도 tiny-dep 을 직접 쓴다. 라이브러리가 인라인했다면 같은 코드가 두 벌 들어간다.
import { createStore } from "@ep2/lib-deps-inline";
import { Emitter } from "@ep2/tiny-dep";

const store = createStore(0);
store.subscribe((v) => console.log(v));
store.set(1);

const bus = new Emitter<{ tick: number }>();
bus.on("tick", (n) => console.log(n));
bus.emit("tick", 1);
