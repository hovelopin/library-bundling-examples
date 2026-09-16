import { createStore } from "@ep2/lib-deps-external";

const store = createStore(0);
store.subscribe((v) => console.log(v));
store.set(1);
