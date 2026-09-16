import { defineConfig } from "tsdown";

// isolatedDeclarations 가 켜져 있으면 tsdown 은 기본으로 oxc 생성기를 고른다.
// 타입 검사 없이 파일 단위로 d.ts 를 뽑는다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  dts: { generator: "oxc" },
});
