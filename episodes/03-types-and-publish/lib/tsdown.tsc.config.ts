import { defineConfig } from "tsdown";

// 같은 소스를 TypeScript 컴파일러 API 로 d.ts 생성. 프로젝트 전체를 타입 추론한다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  outDir: "dist-tscgen",
  dts: { generator: "tsc" },
});
