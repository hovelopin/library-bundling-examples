import { defineConfig } from "tsdown";

// 기본값. dependencies 는 external 로 남기고 import 문만 산출물에 남는다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
});
