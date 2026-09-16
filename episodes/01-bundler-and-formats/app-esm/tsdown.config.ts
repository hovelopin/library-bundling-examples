import { defineConfig } from "tsdown";

// 소비자 앱. 의존성을 전부 번들에 넣는다(앱 번들의 기본 자세).
export default defineConfig({
  entry: ["src/main.ts"],
  format: "esm",
  platform: "browser",
  dts: false,
  deps: { alwaysBundle: [/.*/], onlyBundle: false },
});
