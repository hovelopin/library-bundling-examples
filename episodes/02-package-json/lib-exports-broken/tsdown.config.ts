import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/utils.ts", "src/internal.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  dts: true,
});
