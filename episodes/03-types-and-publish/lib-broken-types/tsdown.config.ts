import { defineConfig } from "tsdown";

// 산출물 자체는 정상이다. package.json 의 exports 에 types 조건이 없고,
// build 스크립트가 index.d.cts 를 지운다 — "타입은 ESM 것만 있는" 흔한 배포 상태를 재현한다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  dts: true,
});
