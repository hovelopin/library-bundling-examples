import { defineConfig } from "tsdown";

// 파일별로 내보낸다(unbundle). sideEffects 는 "어느 파일이 부작용을 갖는가"를 파일 단위로
// 선언하는 필드라, 파일 구조가 살아 있어야 실험이 의미를 가진다.
export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  unbundle: true,
  dts: false,
});
