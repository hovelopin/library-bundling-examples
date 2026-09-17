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
| `static-analysis/` | 실행하면 터지는 ESM 파일과, 실행해야 이름이 정해지는 CJS 파일을 번들러의 파서로 읽기만 해서 비교 |

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

### 정적 분석: 읽기만 해서 무엇을 알 수 있나

```bash
pnpm --filter @ep1/static-analysis start
```

`esm/` 의 파일은 전부 첫 줄에서 에러를 던진다. 실행되면 무조건 터지는 코드다. 분석기는 tsdown 이 내부에서 쓰는 rolldown 의 파서(`rolldown/parseAst`)로 이 파일들을 **읽기만** 하고, 파일 연결 관계(모듈 그래프)와 각 파일이 내보내는 이름을 전부 찾아낸다. import / export 의 경로와 이름이 항상 글자 그대로 적혀 있어서 가능한 일이다.

`cjs/index.cjs` 는 같은 파서로 읽어도 알 수 없다. require 인자와 exports 이름이 식으로 되어 있어서, 실행해야 무엇을 불러오고 무엇을 내보내는지 정해진다. 마지막에 MODE 환경변수를 바꿔 실행해 보면 내보내는 이름이 실제로 달라진다.

번들러가 ESM 에서만 안심하고 tree-shaking 하는 이유가 이것이다. 위의 cjs vs esm 소비자 번들 크기 차이도 여기서 나온다.

실행하면 ESM 이 `main.js` 가 아니라 `slugify.js` 에서 먼저 터지는 것도 볼 수 있다. ESM 은 실행 전에 그래프를 먼저 다 읽고, 가장 안쪽 파일부터 실행하기 때문이다.

`run.mjs` 끝에 기대 결과를 확인하는 코드가 있어서, 결과가 달라지면 에러로 끝난다.

## 바꿔가며 볼 것

- `lib/tsdown.config.ts` 의 `format` 을 `["esm"]` 로 줄이면 `hazard/run.mjs` 가 어떻게 되는지
- `static-analysis/esm/lib/clamp.js` 의 `export const VERSION` 을 `export const VERSION = globalThis.v` 처럼 바꿔도 내보내는 이름은 그대로 읽힌다. 값이 아니라 **이름**이 글자로 적혀 있기만 하면 된다
- `static-analysis/cjs/index.cjs` 의 require 인자를 `"./upper.cjs"` 같은 문자열 하나로 바꾸면 분석기가 require 를 (확정) 으로 표시한다. 그래도 exports 이름은 여전히 계산식이라 알 수 없다. 이렇게 바꾸면 run.mjs 끝의 검증이 `기대와 다름` 에러를 내는데, 결과가 달라졌다는 뜻이니 정상이다
- `lib/src/index.ts` 배럴에 최상위 `console.log` 를 하나 넣고 `app-esm` 을 다시 빌드하면 tree-shaking 이 어떻게 달라지는지 (2편의 주제)

측정값은 [`RESULTS.md`](RESULTS.md) 에 있다.
