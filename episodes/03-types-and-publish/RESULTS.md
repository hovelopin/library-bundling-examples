# 3편 측정 결과 (2026-09-16, tsdown 0.23.0 / rolldown-plugin-dts 0.28.5 / TypeScript 5.9.3 / attw 0.18.5 / publint 0.3.24 / Node 24.13)

재현: 저장소 루트에서

```bash
pnpm install && pnpm -r --filter "@ep3/*" build
pnpm --filter @ep3/lib bench
pnpm --filter "@ep3/lib*" attw
pnpm --filter "@ep3/lib*" publint
pnpm --filter @ep3/smoke start
```

## d.ts 생성 시간 (lib, 생성 모듈 1,000개 · 각 3회 중앙값)

| 방법 | 중앙값 | 비고 |
|---|---|---|
| tsc --emitDeclarationOnly | 698 ms | 타입 검사 + 파일별 d.ts 1,000개 |
| tsdown (generator: tsc) | 1,655 ms | JS 번들 + TS API 로 d.ts + d.ts 번들 |
| tsdown (generator: oxc) | 1,041 ms | JS 번들 + 파일 단위 d.ts + d.ts 번들 |
| tsdown (dts 없음, 기준선) | 177 ms | JS 번들만 |
| tsc --noEmit (참고) | 533 ms | 타입 검사만 |

기준선을 빼면 tsdown 안에서 d.ts 비용은 tsc 생성기 1,478 ms, oxc 생성기 864 ms.

## attw 매트릭스

| 패키지 | node10 | node16 (from CJS) | node16 (from ESM) | bundler |
|---|---|---|---|---|
| `lib` (types 를 import/require 분기 안에 각각) | 🟢 | 🟢 (CJS) | 🟢 (ESM) | 🟢 |
| `lib-single-types` (types 하나를 맨 위에) | 🟢 | 👺 Masquerading as ESM | 🟢 (ESM) | 🟢 |
| `lib-broken-types` (exports 에 types 없음, d.cts 없음) | 🟢 | ❌ No types | 🟢 (ESM) | 🟢 |
| 1편 `@ep1/lib` (main/types 폴백 없음) | 💀 Resolution failed | 🟢 (CJS) | 🟢 (ESM) | 🟢 |

## publint

- `lib`: All good!
- `lib-single-types`: `pkg.exports["."].types types is interpreted as ESM when resolving with the "require" condition. … Consider splitting out two "types" conditions for "import" and "require", and use the .cts extension`
- `lib-broken-types`: `pkg.exports["."].require types is not exported. …`
- 1편 `@ep1/lib`: `The package does not specify the "engines.node" field.`

## 타입 누수 (lib-type-leak)

`dist/index.d.ts` 첫 줄:

```ts
import { Emitter } from "@ep2/tiny-dep";
```

tiny-dep 은 devDependencies 에만 있으므로 소비자에게는 설치되지 않는다.

## npm pack 스모크 (smoke/run.mjs)

```
@ep3/lib
  ✔ import  ✔ require  ✔ tsc bundler  ✔ tsc node16 esm  ✔ tsc node16 cjs

@ep3/lib-broken-types
  ✔ import  ✔ require  ✔ tsc bundler  ✔ tsc node16 esm
  ✘ tsc node16 cjs   check.cts(1,21): error TS7016: Could not find a declaration file for module '@ep3/lib-broken-types'

@ep3/lib-type-leak
  ✔ import
  ✘ tsc bundler      check.ts(2,28): error TS7006: Parameter 'm' implicitly has an 'any' type.
                     node_modules/@ep3/lib-type-leak/dist/index.d.ts(1,25): error TS2307: Cannot find module '@ep2/tiny-dep' or its corresponding type declarations.
  ✘ tsc node16 esm   (같은 에러)
```

## files 필드 (lib, `npm pack --dry-run`)

| | total files | unpacked |
|---|---|---|
| `"files": ["dist"]` | 5 | 1.7 MB |
| files 없음 | 12 | 1.8 MB (gen.mjs, bench.mjs, tsconfig*, tsdown.*.config.ts 가 딸려 들어감. src/gen 은 .gitignore 라 빠짐 — npm 은 files 가 없으면 .gitignore 를 대신 읽는다) |
