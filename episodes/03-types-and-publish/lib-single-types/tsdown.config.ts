import { defineConfig } from "tsdown";

// 산출물은 완전하다(index.d.ts 와 index.d.cts 둘 다 있다). 문제는 package.json 뿐이다:
// types 조건이 하나뿐이라 require 로 들어온 소비자도 ESM 용 index.d.ts 를 받는다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  dts: true,
});
