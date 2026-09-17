# 1편 측정 결과 (2026-09-16, tsdown 0.23.0 / rolldown 1.2.8 / Node 24.13)

재현: 저장소 루트에서

```bash
pnpm install && pnpm --filter "@ep1/*" build
node episodes/01-bundler-and-formats/app-unbundled/serve.mjs --crawl
node scripts/size.mjs episodes/01-bundler-and-formats/app-esm/dist/main.js episodes/01-bundler-and-formats/app-cjs/dist/main.js
node episodes/01-bundler-and-formats/hazard/run.mjs
pnpm --filter @ep1/static-analysis start
```

## 번들 없이 로드 vs 번들 1개 (app-unbundled, `--crawl`)

| | 요청 수 | 전송 바이트 | 요청 단계(round-trip) |
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

## 정적 분석 (static-analysis/run.mjs)

```
[ESM] esm/main.js 에서 출발. 파일을 하나도 실행하지 않고 읽기만 했다

  main.js  내보내는 이름: [없음]
    lib/index.js  내보내는 이름: [slugify, clamp, VERSION]
      lib/slugify.js  내보내는 이름: [slugify]
      lib/clamp.js  내보내는 이름: [clamp, VERSION]

[CJS] cjs/index.cjs 를 같은 파서로 읽기만 했다

  require  process.env.MODE === "upper" ? "./upper.cjs" : "./lower.cjs"  ← 식이라 실행해야 안다
  exports  "util_" + name  ← 식이라 실행해야 안다

[확인] ESM 을 실제로 실행하면
  slugify.js 가 실행됐다!  ← 그래프를 먼저 다 읽고, 가장 안쪽 파일부터 실행한다

[확인] CJS 는 실행해야 내보내는 이름이 정해진다
  MODE=upper → [util_upper]
  MODE=lower → [util_lower]
```

## ESM only 로 충분한가 (2026-09-16 재검증, Node 24.13 / TypeScript 5.9.3)

`require(esm)` 이후에도 CJS 를 내야 할 이유가 남는지 확인했다. 실험은 임시 패키지로 했고
결과만 남긴다(ESM only 패키지 하나, 그리고 최상위 await 를 가진 패키지 하나를 만들어 소비).

| 실험 | 결과 |
|---|---|
| CJS 에서 ESM only 패키지 require | 성공 |
| 그 패키지에 최상위 await 가 있을 때 | `ERR_REQUIRE_ASYNC_MODULE` |
| 내 코드엔 최상위 await 가 없고 **의존성에만** 있을 때 | `ERR_REQUIRE_ASYNC_MODULE` (그래프 전체에 적용) |
| CJS 에서 동적 import | 성공 |
| `.cts` + `module: node16` 으로 타입 검사 | `TS1471` |
| `.cts` + `module: nodenext` / `node20` | 통과 |

결론: require 로 쓰는 소비자가 있다는 것만으로는 CJS 를 낼 이유가 되지 않는다.
최상위 await(의존성 포함), `module: node16` 소비자, Jest 중 하나라도 해당할 때만 두 포맷을 낸다.

참고한 문서:

- [Node.js 20.19.0 릴리스 노트 — require(esm) 기본 활성화](https://nodejs.org/en/blog/release/v20.19.0)
- [Node.js — End-of-Life 일정](https://nodejs.org/en/about/eol) (Node 20 은 2026-04-30 EOL)
- [require(esm) Backported to Node.js 20 — Socket](https://socket.dev/blog/require-esm-backported-to-node-js-20)
- [Node.js Docs — Modules: Packages](https://nodejs.org/api/packages.html)
- [Jest — ECMAScript Modules](https://jestjs.io/docs/ecmascript-modules)
