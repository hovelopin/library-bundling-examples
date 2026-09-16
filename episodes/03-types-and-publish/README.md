# 3편 · 타입과 배포 전 검증

d.ts 를 어떻게 만들고, 배포하기 전에 무엇을 기계적으로 검사할 수 있는지 본다. 이 편만 publint 와 @arethetypeswrong/cli(attw) 를 추가로 쓴다.

## 폴더

| 폴더 | 역할 |
|---|---|
| `lib/` | 올바르게 배포된 라이브러리. `gen.mjs` 가 모듈 1,000개를 만들고 `bench.mjs` 가 d.ts 생성 시간을 잰다 |
| `lib-single-types/` | 산출물은 완전한데 exports 의 `types` 조건이 하나뿐인 것 (1·2편 초고의 형태) |
| `lib-broken-types/` | exports 에 `types` 가 없고 `index.d.cts` 를 지운 것 |
| `lib-type-leak/` | devDependency 의 타입이 public d.ts 에 남는 것 |
| `smoke/` | `npm pack` → 빈 프로젝트에 설치 → import / require / tsc 로 확인하는 스모크 테스트 |

## 실행

```bash
pnpm install
pnpm -r --filter "@ep3/*" build       # lib 는 build 전에 gen.mjs 로 src/gen 을 만든다
```

### d.ts 생성 시간

```bash
pnpm --filter @ep3/lib bench
```

`tsdown (dts 없음)` 이 기준선이다. 나머지 tsdown 행에서 이 값을 빼면 d.ts 생성에 든 시간이다. 모듈 수를 바꿔보려면 `node gen.mjs 300` 처럼 인자를 주고 다시 재면 된다.

### attw / publint

```bash
pnpm --filter "@ep3/lib*" attw
pnpm --filter "@ep3/lib*" publint
```

`lib` 만 🌟 가 나와야 한다. `lib-single-types` 는 `node16 (from CJS)` 에서 👺, `lib-broken-types` 는 같은 칸에서 ❌ 가 나온다.

1편 라이브러리에도 돌려보자.

```bash
cd episodes/01-bundler-and-formats/lib && ../../03-types-and-publish/lib/node_modules/.bin/attw --pack .
```

`node10` 행이 💀 다. `main` 과 `types` 폴백이 없어서다.

### 타입 누수

```bash
head -1 episodes/03-types-and-publish/lib-type-leak/dist/index.d.ts
```

`import { Emitter } from "@ep2/tiny-dep"` 한 줄이 남아 있다. 소비자에게는 이 패키지가 없다.

### 스모크 테스트

```bash
pnpm --filter @ep3/smoke start
```

세 라이브러리를 각각 `npm pack` 해서 `smoke/tmp/` 아래 빈 프로젝트에 설치한 뒤 import / require / tsc(bundler, node16 esm, node16 cjs) 를 돌린다. `lib` 는 전부 ✔, `lib-broken-types` 는 `tsc node16 cjs` 에서 ✘, `lib-type-leak` 는 tsc 전부 ✘ 가 나와야 한다.

### files 필드

```bash
cd episodes/03-types-and-publish/lib && npm pack --dry-run
```

`total files: 5` 다. `package.json` 에서 `files` 를 지우고 다시 돌리면 설정 파일과 스크립트가 딸려 들어간다.

## 바꿔가며 볼 것

- `lib/tsconfig.json` 에서 `isolatedDeclarations` 를 끄고 `pnpm build` 를 하면 tsdown 이 어느 생성기를 고르는지(로그에 나온다), 시간이 어떻게 달라지는지
- `lib-type-leak/tsdown.config.ts` 의 `dts.neverBundle` 을 지우면 d.ts 에 `Emitter` 선언이 인라인되어 스모크가 통과한다 — tsdown 이 기본으로 막아주는 문제라는 뜻이다
- `lib/src/gen/mod-000.ts` 의 함수 하나에서 반환 타입을 지우고 `pnpm build` 를 하면 isolatedDeclarations 가 어떤 에러를 내는지

측정값은 [`RESULTS.md`](RESULTS.md) 에 있다.
