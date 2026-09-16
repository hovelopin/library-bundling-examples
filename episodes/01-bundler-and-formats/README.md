# 1편 · 번들러는 무엇을 하는가

번들러가 파일을 합치면 무엇이 달라지는지, CommonJS 와 ESM 이 소비자 번들에 어떤 차이를 남기는지, 두 포맷을 같이 배포하면 어떤 함정이 있는지 본다.

## 폴더

| 폴더 | 역할 |
|---|---|
| `lib/` | 함수 5개짜리 유틸 라이브러리. `dist/`(esm+cjs 번들)와 `dist-unbundled/`(파일 그대로) 두 가지로 낸다 |
| `app-unbundled/` | 번들 없이 `<script type="module">` 로 lib 를 쓰는 페이지 + 요청을 세는 정적 서버 |
| `app-esm/` | lib 의 ESM 산출물에서 `slugify` 하나만 import 하는 소비자 앱 |
| `app-cjs/` | 같은 앱. `alias` 로 lib 의 CJS 산출물을 집어오게 한 것 |
| `hazard/` | 한 프로세스에서 import 와 require 로 같은 lib 를 불러 `instanceof` 가 깨지는 것을 재현 |

## 실행

```bash
# 저장소 루트에서
pnpm install
pnpm --filter "@ep1/*" build
```

### 번들 없이 로드하면 요청이 몇 번인가

```bash
node episodes/01-bundler-and-formats/app-unbundled/serve.mjs --crawl
```

`depth` 열이 "그 파일을 알아내기까지 몇 단계를 거쳤는가"다. 번들 없음은 요청 7번·3단계, 번들은 요청 2번·2단계가 나와야 한다. 단계가 하나 늘 때마다 서버를 한 번 더 다녀오므로, 출력의 round-trips 가 그 횟수다.

브라우저로 직접 보고 싶으면 `--crawl` 없이 띄우고 `http://localhost:4173/app-unbundled/` 를 연 뒤 DevTools 의 Network 탭을 보자. 터미널에도 요청 로그가 찍힌다.

### 함수 하나만 가져왔을 때 소비자 번들 크기

```bash
node scripts/size.mjs episodes/01-bundler-and-formats/app-{esm,cjs}/dist/main.js
cat episodes/01-bundler-and-formats/app-cjs/dist/main.js   # 5개 함수가 전부 들어있는지 눈으로 확인
```

ESM 쪽은 `slugify` 만, CJS 쪽은 `__commonJSMin` 헬퍼로 감싼 모듈 전체가 들어 있다.

### dual package hazard

```bash
node episodes/01-bundler-and-formats/hazard/run.mjs
```

`same class? false` 가 나오면 재현된 것이다. `lib/dist/index.js` 와 `index.cjs` 가 서로 다른 파일로 각각 평가되기 때문이다.

## 바꿔가며 볼 것

- `lib/tsdown.config.ts` 의 `format` 을 `["esm"]` 로 줄이면 `hazard/run.mjs` 가 어떻게 되는지
- `lib/src/index.ts` 배럴에 최상위 `console.log` 를 하나 넣고 `app-esm` 을 다시 빌드하면 tree-shaking 이 어떻게 달라지는지 (2편의 주제)

측정값은 [`RESULTS.md`](RESULTS.md) 에 있다.
