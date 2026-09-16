import { defineConfig } from "tsdown";

// 기준선. d.ts 없이 JS 만 번들한다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  outDir: "dist-nodts",
  dts: false,
});
