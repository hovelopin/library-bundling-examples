import { basename } from "node:path";
import { defineConfig } from "tsdown";

// 실험마다 진입점 하나. 진입점끼리 청크를 공유하면 크기 비교가 흐려지므로
// 각 진입점을 독립된 빌드로 돌려 dist/<이름>.js 하나에 전부 담는다.
const ENTRIES = [
  "src/side-effects-unset.ts",
  "src/side-effects-false.ts",
  "src/side-effects-list.ts",
  "src/side-effects-partial.ts",
  "src/deps-inline.ts",
  "src/deps-external.ts",
  "src/deps-inline-shared.ts",
  "src/deps-external-shared.ts",
];

export default defineConfig(
  ENTRIES.map((entry) => ({
    entry: [entry],
    outDir: `dist/${basename(entry, ".ts")}`,
    format: "esm" as const,
    platform: "browser" as const,
    dts: false,
    clean: false,
    deps: { alwaysBundle: [/.*/], onlyBundle: false as const },
  })),
);
