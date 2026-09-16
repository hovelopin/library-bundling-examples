import { defineConfig } from "tsdown";

// dependencies 에 있는 패키지를 산출물 안으로 끌어넣는다(인라인).
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  dts: true,
  deps: { alwaysBundle: ["@ep2/tiny-dep"], onlyBundle: false },
});
