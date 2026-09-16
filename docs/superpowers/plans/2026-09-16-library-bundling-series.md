# 라이브러리 번들링 시리즈 (1·2편) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 예시 저장소(`~/hojin/tsdown`)를 만들어 실제 측정값을 뽑고, 그 수치로 블로그(`~/hojin/blog`) 1·2편 글과 데모 4개를 완성한다.

**Architecture:** pnpm workspace 하나에 편별 `episodes/NN-*/` 폴더. 라이브러리·소비자 앱 모두 tsdown으로 빌드하고 `scripts/size.mjs`(stdlib)로 크기를 잰다. 블로그 글은 그 수치를 표로 싣고, `CanvasDemo` 기반 데모가 같은 수치를 시각화한다.

**Tech Stack:** Node 24, pnpm 8, tsdown 0.23, TypeScript 5; 블로그는 Next.js 16 + MDX, 데모는 기존 `src/components/demos/canvas-demo.tsx`

**Spec:** `docs/superpowers/specs/2026-09-16-library-bundling-series-design.md`

## Global Constraints

- 외부 의존성은 root devDeps `tsdown`, `typescript` 만. 측정은 `node:fs`, `node:zlib`, `performance.now()`
- 소비자 앱 번들링도 tsdown. vite 추가 금지
- 각 episode 는 `pnpm -r --filter "./episodes/0N-*/**" build` + `node scripts/size.mjs ...` 로 글의 표를 재현 가능해야 함
- 블로그 글: `~다체`, 도입부 5단, h2 번호·`—` 부연 금지, `draft: true`, `series: "라이브러리 번들링"`, `author: "hovelopin"`
- 데모: `"use client"`, `CanvasDemo` 재사용, `mdx-components.tsx` 등록, 수치는 실제 측정값과 일치
- 완료 검증: blog 에서 `pnpm check` 통과, `grep -nE "습니다|합니다|입니다|했어요|하죠|네요|거든요|까요|하세요|이에요|예요"` 결과 없음

---

### Task 1: workspace 골격 + 측정 스크립트

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `scripts/size.mjs`

**Produces:** `node scripts/size.mjs <file...>` → 파일별 `raw` / `gzip` 바이트 표 (stdout). 이후 모든 Task가 이 명령으로 측정한다.

- [ ] **Step 1: root 파일 작성**

```json
// package.json
{
  "name": "library-bundling-examples",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "size": "node scripts/size.mjs"
  },
  "devDependencies": { "tsdown": "^0.23.0", "typescript": "^5" },
  "engines": { "node": ">=24" },
  "packageManager": "pnpm@8.15.6"
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - "episodes/*/*"
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "isolatedDeclarations": true, "declaration": true,
    "skipLibCheck": true, "noEmit": true
  }
}
```

`.gitignore`: `node_modules`, `dist`

- [ ] **Step 2: size.mjs 작성 (테스트 겸 self-check 포함)**

```js
// scripts/size.mjs — 인자로 받은 파일들의 raw/gzip 바이트를 표로 찍는다.
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { relative } from "node:path";

export function measure(file) {
  const raw = statSync(file).size;
  const gzip = gzipSync(readFileSync(file), { level: 9 }).length;
  return { file: relative(process.cwd(), file), raw, gzip };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  // self-check: 빈 파일은 gzip 해도 20바이트 헤더만 남는다
  const r = measure(new URL(import.meta.url).pathname);
  if (!(r.raw > 0 && r.gzip > 0 && r.gzip < r.raw)) throw new Error("size.mjs self-check failed");
  console.log("usage: node scripts/size.mjs <file...>");
} else {
  console.table(files.map(measure));
}
```

- [ ] **Step 3: 설치 및 self-check**

Run: `pnpm install && node scripts/size.mjs`
Expected: `usage:` 한 줄, 에러 없음

- [ ] **Step 4: Commit** — `chore: workspace 골격과 size 측정 스크립트`

---

### Task 2: 1편 예시 — lib + 번들 없는 앱 (요청 수 측정)

**Files:**
- Create: `episodes/01-bundler-and-formats/lib/{package.json,tsconfig.json,tsdown.config.ts,src/index.ts,src/format-date.ts,src/slugify.ts,src/clamp.ts,src/debounce.ts,src/deep-equal.ts}`
- Create: `episodes/01-bundler-and-formats/app-unbundled/{package.json,index.html,main.js,serve.mjs}`

**Produces:** `@ep1/lib` 가 `dist/index.js`(esm)·`dist/index.cjs`(cjs) 를 내고, 5개 함수 export. `app-unbundled` 의 `serve.mjs` 가 정적 서버를 띄우며 **요청 로그 개수와 총 전송 바이트**를 stdout에 남긴다.

- [ ] **Step 1: lib 작성** — 각 파일은 10~20줄짜리 진짜 동작하는 유틸. `src/index.ts` 는 배럴(`export * from "./format-date"` …). `deep-equal.ts` 는 `export class DeepEqualError extends Error {}` 도 export (Task 4 hazard 용).

```ts
// tsdown.config.ts
import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  platform: "neutral",
  dts: true,
  sourcemap: false,
  minify: false,
});
```

package.json: `name: "@ep1/lib"`, `type: "module"`, `exports: { ".": { types, import: "./dist/index.js", require: "./dist/index.cjs" } }`, `scripts.build: "tsdown"`, `sideEffects: false`.

- [ ] **Step 2: 빌드·측정**

Run: `pnpm --filter @ep1/lib build && node scripts/size.mjs episodes/01-bundler-and-formats/lib/dist/index.js episodes/01-bundler-and-formats/lib/dist/index.cjs`
Expected: 두 파일 모두 존재, 표 출력. 수치를 `episodes/01-bundler-and-formats/RESULTS.md` 에 기록.

- [ ] **Step 3: app-unbundled 작성** — `main.js` 가 `../lib/src/*.ts` 대신 **트랜스파일된 개별 파일**을 import 해야 브라우저에서 동작한다. 그래서 lib 에 `build:unbundled` 스크립트로 `tsdown --unbundle -d dist-unbundled --format esm` 을 추가하고, `main.js` 는 `../lib/dist-unbundled/index.js` 를 import 한다. `serve.mjs` 는 `node:http` 로 정적 파일을 서빙하며 요청마다 `console.log(method, url, bytes)` 하고 SIGINT 시 `요청 N개 / 총 M바이트` 요약을 찍는다.

- [ ] **Step 4: 실행·측정** — `node serve.mjs` 후 `curl` 로 `index.html`→`main.js`→모듈들을 흉내 내기 어렵다. 대신 `serve.mjs` 에 `--crawl` 옵션: 시작점 `main.js` 를 읽어 `import` 문을 정규식으로 따라가며 재귀 요청해 개수·바이트를 센다(브라우저가 하는 일을 그대로 흉내). 번들 버전은 `dist/index.js` 하나를 같은 방식으로 세어 비교.

Run: `node episodes/01-bundler-and-formats/app-unbundled/serve.mjs --crawl`
Expected: `unbundled: N requests, M bytes` / `bundled: 1 request, K bytes`. RESULTS.md 에 기록.

- [ ] **Step 5: Commit** — `feat(ep1): lib와 번들 없는 앱, 요청 수 측정`

---

### Task 3: 1편 예시 — cjs vs esm 소비자 번들 크기

**Files:**
- Create: `episodes/01-bundler-and-formats/app-esm/{package.json,tsdown.config.ts,src/main.ts}`
- Create: `episodes/01-bundler-and-formats/app-cjs/{package.json,tsdown.config.ts,src/main.ts}`

**Produces:** 두 앱 모두 `import { slugify } from "@ep1/lib"` 한 줄만 쓴다. `app-cjs` 는 tsdown 설정에서 `resolve.conditionNames`(또는 alias)로 `require` 조건을 강제해 cjs 산출물을 소비한다. 각 `dist/main.js` 크기 비교.

- [ ] **Step 1: 두 앱 작성** — `package.json` 에 `"@ep1/lib": "workspace:*"`. app-cjs 의 config: `tsdown` 이 조건을 고르는 옵션 이름을 `node_modules/tsdown/dist/*.d.ts` 에서 확인하고 적용(확인 전 추측 금지). 안 되면 `src/main.ts` 에서 `import { slugify } from "@ep1/lib/dist/index.cjs"` 로 직접 경로 지정(exports 에 `./dist/*` 추가).

- [ ] **Step 2: 빌드·측정**

Run: `pnpm --filter "@ep1/app-*" build && node scripts/size.mjs episodes/01-bundler-and-formats/app-esm/dist/main.js episodes/01-bundler-and-formats/app-cjs/dist/main.js`
Expected: esm 쪽이 눈에 띄게 작다(함수 1개만 포함). cjs 쪽 산출물을 열어 5개 함수가 모두 들어있는지 눈으로 확인하고 RESULTS.md 에 기록.

- [ ] **Step 3: Commit** — `feat(ep1): cjs vs esm 소비자 번들 크기 비교`

---

### Task 4: 1편 예시 — dual package hazard 재현

**Files:**
- Create: `episodes/01-bundler-and-formats/hazard/{package.json,run.mjs}`

- [ ] **Step 1: run.mjs 작성**

```js
import { createRequire } from "node:module";
import { DeepEqualError as EsmError, deepEqual } from "@ep1/lib";
const require = createRequire(import.meta.url);
const { DeepEqualError: CjsError } = require("@ep1/lib");

const err = new CjsError("from cjs");
console.log("same class?      ", EsmError === CjsError);      // false
console.log("instanceof esm?  ", err instanceof EsmError);    // false
console.log("instanceof cjs?  ", err instanceof CjsError);    // true
if (EsmError === CjsError) throw new Error("hazard not reproduced");
```

- [ ] **Step 2: 실행**

Run: `node episodes/01-bundler-and-formats/hazard/run.mjs`
Expected: `false / false / true`. 출력을 RESULTS.md 에 기록.

- [ ] **Step 3: Commit** — `feat(ep1): dual package hazard 재현`

---

### Task 5: 2편 예시 — exports 조건 순서

**Files:**
- Create: `episodes/02-package-json/lib-exports/{package.json,tsdown.config.ts,src/index.ts,src/utils.ts}`
- Create: `episodes/02-package-json/app/{package.json,tsconfig.json,src/exports-ok.ts,src/exports-broken.ts}`

**Produces:** lib-exports 는 `.` 과 `./utils` subpath, 그리고 `./internal/*` 은 exports 에 없음. app 에서 (a) `@ep2/lib-exports/utils` import 성공, (b) `@ep2/lib-exports/dist/internal.js` import 시 에러 메시지 캡처, (c) `types` 조건을 `default` 뒤로 옮긴 복제본(`lib-exports-broken`, package.json 만 다름)에서 `tsc --noEmit` 이 내는 에러 캡처.

- [ ] **Step 1: 작성·빌드**
- [ ] **Step 2: 실행해 세 결과 캡처** — Run: `node -e "import('@ep2/lib-exports/dist/internal.js')"` (app 폴더에서) → `ERR_PACKAGE_PATH_NOT_EXPORTED`. `pnpm --filter @ep2/app typecheck` → broken 쪽 에러 텍스트. RESULTS.md 기록.
- [ ] **Step 3: Commit** — `feat(ep2): exports 조건 순서 실험`

---

### Task 6: 2편 예시 — sideEffects 와 tree-shaking

**Files:**
- Create: `episodes/02-package-json/lib-side-effects/{package.json,tsdown.config.ts,src/index.ts,src/a.ts,src/b.ts,src/c.ts,src/register.ts}`
- Create: `episodes/02-package-json/app/src/side-effects.ts`, `episodes/02-package-json/app/tsdown.config.ts`

**Produces:** `register.ts` 는 최상위에서 `globalThis.__registry = [...]` 를 만드는 부작용 모듈. `index.ts` 배럴이 a,b,c,register 를 re-export. app 은 `import { a } from "@ep2/lib-side-effects"` 만. lib 의 `sideEffects` 를 (1) 미설정 (2) `false` (3) `["./dist/register.js"]` 세 가지로 바꿔 app 번들 크기 측정. 세 설정은 `pnpm build` 를 세 번 돌리는 대신 lib 를 `lib-side-effects-{unset,false,list}` 세 폴더로 복제해 한 번에 측정한다.

- [ ] **Step 1: 작성·빌드·측정** — Run: `node scripts/size.mjs episodes/02-package-json/app/dist/side-effects-*.js`. 각 산출물에 `__registry` 문자열이 있는지 `grep -c __registry` 로 확인. RESULTS.md 기록.
- [ ] **Step 2: Commit** — `feat(ep2): sideEffects 세 설정별 번들 크기`

---

### Task 7: 2편 예시 — dependencies 인라인 vs external, React 두 벌

**Files:**
- Create: `episodes/02-package-json/lib-deps-inline/`, `episodes/02-package-json/lib-deps-external/` (같은 소스, tsdown `deps.neverBundle`/`external` 설정만 다름. 의존성은 `@ep2/tiny-dep` 워크스페이스 패키지 — 200줄 정도 되는 자체 유틸)
- Create: `episodes/02-package-json/app/src/deps-inline.ts`, `deps-external.ts`
- Create: `episodes/02-package-json/duplicate-react/{package.json,run.mjs}` — `react` 를 `dependencies` 로 둔 lib 와 앱이 서로 다른 버전을 요구하게 만들어 `pnpm install` 후 `node_modules` 안 react 복사본 개수를 `find … -name react -path "*node_modules*" -maxdepth …` 로 센다. peerDependencies 로 바꾼 뒤 다시 세어 1개가 됨을 보인다.

- [ ] **Step 1: 인라인 vs external 빌드·측정** — RESULTS.md 기록. external 쪽 app 번들에도 tiny-dep 이 들어가므로 최종 크기는 비슷하지만, **lib dist 크기**와 **앱에서 tiny-dep 을 이미 쓰고 있을 때 중복 여부**가 차이라는 점을 측정으로 보인다(app 에 tiny-dep 직접 import 한 줄 추가한 변형 포함).
- [ ] **Step 2: React 두 벌 재현** — Run: `node run.mjs` → `react copies: 2` / peer 로 바꾼 뒤 `1`. RESULTS.md 기록.
- [ ] **Step 3: Commit** — `feat(ep2): 의존성 인라인 vs external, React 중복 재현`

---

### Task 8: 데모 4개 (blog)

**Files:**
- Create: `src/components/demos/module-graph-demo.tsx`, `tree-shake-demo.tsx`, `side-effects-demo.tsx`, `duplicate-react-demo.tsx`
- Modify: `src/components/mdx-components.tsx` (import + 등록 4줄)

**Consumes:** `CanvasDemo`, `DrawArgs`, `twoLanes` from `@/components/demos/canvas-demo`; 수치는 `episodes/*/RESULTS.md`

- `ModuleGraphDemo`: `twoLanes` 두 레인. 왼쪽 "번들 없음": 요청 N개가 순차 워터폴로 떨어지는 막대, 오른쪽 "번들": 막대 1개. 하단에 `N requests · M bytes` vs `1 request · K bytes`
- `TreeShakeDemo`: 위/아래 두 줄. 각 줄에 모듈 5개 상자. ESM 줄은 `slugify` 만 남고 나머지가 흐려지며 오른쪽 크기 숫자가 줄어든다. CJS 줄은 전부 남는다.
- `SideEffectsDemo`: `TypeCostDemo` 와 같은 구조의 수평 막대 3개(미설정 / false / 배열)
- `DuplicateReactDemo`: 앱 상자 안에 lib 상자, `dependencies` 일 때 react 상자가 두 곳에 생기고 `peerDependencies` 로 바뀌면 하나로 합쳐지는 애니메이션(duration 절반 지점에서 전환)

- [ ] **Step 1: 4개 작성 + 등록**
- [ ] **Step 2: 검증** — Run(blog): `pnpm lint && pnpm typecheck`. Expected: 에러 0
- [ ] **Step 3: Commit(blog)** — `feat: 라이브러리 번들링 시리즈 데모 4개`

---

### Task 9: 1편 글

**Files:**
- Create: `content/posts/library-bundling-1-bundler-and-formats.mdx`

frontmatter: title `"번들러는 무엇을 하는가"`, description(평서체 한 문장), date `"2026-09-16"`, tags `["bundling", "tsdown", "esm", "commonjs", "library"]`, author, series, seriesOrder 1, draft true.

섹션(h2, 번호 없음):
1. 도입부 5단 (묻기 → 상황 → 오해 "빌드하면 끝" → 진짜 원인 "산출물이 남의 빌드 입력" → 명제)
2. `모듈을 하나로 합치기` — 파일 5개 직접 로드 실험, `<ModuleGraphDemo />`, RESULTS 표
3. `앱 번들과 라이브러리 번들` — 왜 다른가(소비자 수만큼 곱해지는 실수, 배포 형태=계약)
4. `CommonJS` — `require`/`module.exports`, 동기, 동적, 값 복사
5. `ESM` — `import`/`export`, 정적 구조, 라이브 바인딩, 그래서 tree-shaking 가능
6. `함수 하나만 가져왔을 때` — cjs/esm 소비자 번들 크기 표, `<TreeShakeDemo />`
7. `둘 다 제공하기` — tsdown `format: ["esm","cjs"]`, exports 에 import/require (2편 예고)
8. `같은 라이브러리가 두 개가 되는 순간` — hazard 실행 결과, 대응 4가지
9. `정리` + 예시코드 저장소 경로·재현 명령

- [ ] **Step 1: 작성**
- [ ] **Step 2: grep 검증** — 결과 비어야 함
- [ ] **Step 3: `pnpm build`(blog) 로 렌더 확인**
- [ ] **Step 4: Commit(blog)** — `feat: 라이브러리 번들링 1편`

---

### Task 10: 2편 글

**Files:**
- Create: `content/posts/library-bundling-2-package-json.mdx`

frontmatter: title `"package.json이 계약이다"`, seriesOrder 2, 나머지 1편과 동일 규칙.

섹션:
1. 도입부 5단 (오해 "package.json은 메타데이터" → 진짜 "소비자 번들러가 읽는 실행 계약")
2. `exports 필드` — 캡슐화 실험(`ERR_PACKAGE_PATH_NOT_EXPORTED`), subpath, 조건 순서와 `types` 맨 위 (tsc 에러 캡처)
3. `sideEffects` — 부작용이란 무엇인가, 배럴 파일, 세 설정 측정 표, `<SideEffectsDemo />`, `@__PURE__`
4. `의존성은 어디에 두는가` — 세 필드 표, external 이 기본인 이유, 인라인 vs external 측정
5. `React가 두 벌이 되는 이유` — 재현 결과, `<DuplicateReactDemo />`, peerDependencies
6. `files 와 나머지 필드` — files, main/types 폴백 (짧게)
7. `정리` + 재현 명령 + 3편 예고

- [ ] **Step 1~4:** Task 9 와 동일 검증·커밋 — `feat: 라이브러리 번들링 2편`

---

### Task 11: 최종 검증

- [ ] Run(blog): `pnpm check` → 통과
- [ ] Run(tsdown): `pnpm build` 처음부터 → 통과, RESULTS.md 수치와 글 표·데모 상수 대조
- [ ] 두 저장소 `git status` 깨끗한지 확인
