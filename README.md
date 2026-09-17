# library-bundling-examples

블로그 시리즈 **"라이브러리 번들링"** 의 예시 코드와 측정 스크립트. 글에 나오는 모든 수치는 여기서 다시 뽑을 수 있다.

| 편 | 폴더 | 다루는 것 |
|---|---|---|
| 1 | [`episodes/01-bundler-and-formats`](episodes/01-bundler-and-formats) | 번들 유무에 따른 요청 수, CommonJS vs ESM 정적 분석과 소비자 번들 크기, dual package hazard |
| 2 | [`episodes/02-package-json`](episodes/02-package-json) | exports 조건 해석, sideEffects 4가지 설정, 의존성 인라인 vs external, React 두 벌 |
| 3 | [`episodes/03-types-and-publish`](episodes/03-types-and-publish) | d.ts 생성 시간, attw/publint, 타입 누수, npm pack 스모크 테스트 |

## 요구 사항

- Node 24 이상 (`engines`), pnpm 8
- 도구는 tsdown · typescript 두 개뿐이다. 3편만 publint · @arethetypeswrong/cli 를 추가로 쓴다.
- 측정 스크립트는 전부 Node 표준 라이브러리로만 되어 있다.

## 한 번에 전부 돌리기

```bash
pnpm install
pnpm build            # 모든 에피소드 빌드
pnpm size <파일...>   # 파일의 raw / gzip 바이트를 표로 찍는다
```

각 에피소드 폴더의 `README.md` 가 무엇을 실행하고 무엇을 봐야 하는지 설명하고, `RESULTS.md` 가 글에 실린 수치를 그대로 갖고 있다.

## 구조

```
scripts/size.mjs      # 공통 측정 도구
episodes/<편>/<패키지>  # 편마다 라이브러리 몇 개 + 소비자 앱 하나
episodes/<편>/README.md
episodes/<편>/RESULTS.md
docs/superpowers/     # 시리즈 설계 스펙과 구현 계획
```

패키지 이름은 `@ep1/*`, `@ep2/*`, `@ep3/*` 로 편별로 붙어 있어서 `pnpm --filter "@ep2/*" build` 처럼 편 단위로 다룰 수 있다.
