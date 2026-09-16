import { resolve } from "node:path";
import { defineConfig } from "tsdown";

// app-esm 과 같은 소비자 앱. 단 하나 다른 점: "@ep1/lib" 를 exports 의 "require" 분기가
// 가리키는 파일(dist/index.cjs)로 직접 잇는다. 라이브러리가 CJS 만 배포했을 때
// 소비자 번들이 어떻게 되는지를 보기 위한 설정이다.
export default defineConfig({
  entry: ["src/main.ts"],
  format: "esm",
  platform: "browser",
  dts: false,
  deps: { alwaysBundle: [/.*/], onlyBundle: false },
  alias: { "@ep1/lib": resolve(import.meta.dirname, "../lib/dist/index.cjs") },
});
