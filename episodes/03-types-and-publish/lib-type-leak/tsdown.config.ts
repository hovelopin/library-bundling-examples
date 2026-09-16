import { defineConfig } from "tsdown";

// tiny-dep 은 devDependencies 에만 있다. JS 산출물에는 인라인되지만
// d.ts 에는 import { Emitter } from "@ep2/tiny-dep" 가 남는다 — 소비자는 그 패키지가 없다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  deps: {
    alwaysBundle: ["@ep2/tiny-dep"],
    onlyBundle: false,
    // d.ts 에서는 번들하지 않는다 — tsc 로 d.ts 를 내면 항상 이 상태다.
    dts: { neverBundle: ["@ep2/tiny-dep"] },
  },
});
