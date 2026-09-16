# 1편 측정 결과 (2026-09-16, tsdown 0.23.0 / rolldown 1.2.8 / Node 24.13)

재현: 저장소 루트에서

```bash
pnpm install && pnpm --filter "@ep1/*" build
node episodes/01-bundler-and-formats/app-unbundled/serve.mjs --crawl
node scripts/size.mjs episodes/01-bundler-and-formats/app-esm/dist/main.js episodes/01-bundler-and-formats/app-cjs/dist/main.js
node episodes/01-bundler-and-formats/hazard/run.mjs
```

## 번들 없이 로드 vs 번들 1개 (app-unbundled, `--crawl`)

| | 요청 수 | 전송 바이트 | 왕복(round-trip) |
|---|---|---|---|
| 번들 없음 (`main.js` → `index.js` → 파일 5개) | 7 | 2,768 | 3 |
| 번들 (`main-bundled.js` → `dist/index.js`) | 2 | 2,290 | 2 |

깊이별: depth0 `main.js` 345B → depth1 `index.js` 302B → depth2 `format-date.js` 427B, `slugify.js` 293B, `clamp.js` 262B, `debounce.js` 335B, `deep-equal.js` 804B

## 라이브러리 산출물 (lib/dist)

| 파일 | raw | gzip |
|---|---|---|
| `index.js` (ESM) | 2,081 | 1,131 |
| `index.cjs` (CJS) | 2,262 | 1,200 |

## 함수 1개만 import 했을 때 소비자 번들 (app-esm / app-cjs)

| 소비한 산출물 | 앱 번들 raw | gzip | 포함된 함수 |
|---|---|---|---|
| ESM `index.js` | 364 | 312 | `slugify` 1개 |
| CJS `index.cjs` | 2,450 | 1,314 | 5개 전부 + `DeepEqualError` + `__commonJSMin` 런타임 |

raw 기준 6.7배.

## dual package hazard (hazard/run.mjs)

```
same class?       false
instanceof esm?   false
instanceof cjs?   true
```
