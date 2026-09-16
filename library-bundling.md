# 라이브러리 번들링 학습 노트

---

# 1. 왜 라이브러리 번들링을 잘해야 하는가

## 1.1 라이브러리 코드는 "내 빌드"가 아니라 "남의 빌드"에 들어간다

애플리케이션 번들링은 결과물이 나 하나로 끝난다. 실패해도 내 앱만 느려진다.
라이브러리는 다르다. 내가 만든 `dist/`는 **모든 소비자의 번들러 입력**이 된다.

- 소비자 A: Next.js(웹팩/Turbopack) + React Server Components
- 소비자 B: Vite + 브라우저 전용 SPA
- 소비자 C: Node.js 서버, CJS `require()`
- 소비자 D: Cloudflare Workers 같은 엣지 런타임
- 소비자 E: Jest/Vitest 테스트 환경
- 소비자 F: 번들러 없이 `<script type="module">`로 CDN 직접 로드

내 산출물 하나의 실수가 이 조합의 수만큼 곱해져 터진다. **실수 비용이 사용자 수에 비례해 증폭되는 것**이 애플리케이션 빌드와의 근본적 차이다.

## 1.2 배포 형태(distribution shape)는 공개 API의 일부다

우리는 보통 "공개 API = export한 함수 시그니처"라고 생각하지만, 실제 소비자가 의존하는 계약은 훨씬 넓다.

| 계약 요소 | 바꾸면 생기는 일 |
|---|---|
| `exports` 필드의 서브패스 | `import x from 'lib/utils'` 하던 코드가 전부 깨짐 |
| ESM/CJS 제공 여부 | `require()` 쓰던 프로젝트가 통째로 못 씀 |
| 타입 선언 위치·형태 | 빌드가 타입 에러로 실패 |
| `sideEffects` 표기 | tree-shaking 결과가 달라져 번들 크기 급증 또는 부작용 유실 |
| default export vs named export | import 문 전부 수정 필요 |

즉 **번들링 설정 변경은 대부분 semver상 breaking change 후보**다. 나중에 고치기 어렵기 때문에 처음에 제대로 정해야 한다.

## 1.3 성능 예산을 소비자 대신 내가 쓰고 있다

소비자 앱의 번들 크기 예산은 유한하다. 라이브러리가 tree-shaking이 안 되게 만들어져 있으면:

- 소비자가 함수 하나만 import 해도 전체 라이브러리가 딸려 들어간다
- 쓰지도 않는 `lodash`, `moment` 같은 무거운 의존성이 함께 끌려온다
- 소비자는 원인을 추적하기 어렵고, 결국 "이 라이브러리 무겁다"는 평판만 남는다

라이브러리 저자가 산출물 구조에서 저지른 실수를 **소비자는 거의 우회할 수 없다.** 번들러 설정으로 남의 패키지 내부를 고치는 건 매우 어렵다.

## 1.4 DX(개발자 경험)가 곧 채택률이다

설치 직후 30초 안에 일어나는 일이 라이브러리의 인상을 결정한다.

- 자동완성이 뜨는가 (타입 선언이 올바르게 해석되는가)
- `import` 한 줄이 에러 없이 동작하는가
- 에러가 났을 때 소스맵으로 원본 코드가 보이는가
- 문서 예제를 복붙하면 실제로 실행되는가

`"The requested module does not provide an export named 'default'"`, `ERR_REQUIRE_ESM`, `Cannot find module ... or its corresponding type declarations` — 이런 첫인상 에러 대부분은 코드 로직이 아니라 **번들링 설정의 산물**이다.

## 1.5 생태계가 파편화되어 있어 "기본값"이 존재하지 않는다

ESM 전환은 아직 진행 중이고, Node·브라우저·엣지·각종 번들러가 모듈 해석 규칙을 조금씩 다르게 구현한다.
"그냥 tsc로 컴파일해서 올리면 되지 않나"가 통하지 않는 이유가 여기 있다. 어떤 조합을 지원하고 어떤 조합을 포기할지는 **의식적인 설계 결정**이어야 하며, 그 결정을 실현하는 수단이 번들링이다.

## 1.6 되돌리기 비용이 비대칭적이다

배포된 버전은 회수할 수 없다. npm unpublish는 사실상 막혀 있고, 이미 lockfile에 박힌 버전은 계속 설치된다.
잘못된 산출물은 메이저 버전을 올려 새 계약을 만들고, 소비자에게 마이그레이션을 요구하는 방법으로만 고칠 수 있다. **앞단 설계 비용 << 뒷단 수습 비용.**

---

# 2. 잘하려면 어떤 부분을 고려해야 하는가

## 2.1 지원 범위를 먼저 문서로 확정한다

코드를 짜기 전에 대상부터 적는다. 모든 걸 지원하려 들면 설정이 무한히 복잡해진다.

- **런타임**: Node 몇 버전 이상? 브라우저 범위? 엣지 런타임 포함?
- **모듈 포맷**: ESM only / ESM + CJS dual / CJS only
- **소비 방식**: 번들러 경유만? 번들러 없이 CDN 직접 로드도?
- **프레임워크 제약**: RSC(`'use client'`), React Native, Electron 등

여기서 "ESM only"를 선택하면 설정의 절반이 사라진다. 신규 라이브러리이고 Node 20+ 대상이라면 **ESM only가 가장 게으르고 합리적인 기본값**이다. 반대로 기존 사용자 기반이 CJS라면 dual을 감수해야 한다.

## 2.2 모듈 포맷과 dual package hazard

ESM과 CJS를 동시에 제공하면 **같은 모듈이 두 번 로드될 수 있다.**

```
앱 → import 'lib'      → lib/dist/index.js   (ESM 인스턴스)
앱 → require('lib')    → lib/dist/index.cjs  (CJS 인스턴스)
```

두 인스턴스는 별개의 모듈 스코프를 갖는다. 그래서:

- 모듈 레벨 싱글턴(캐시, 레지스트리, 전역 설정)이 두 벌 생긴다
- `instanceof` 체크가 실패한다 (클래스가 서로 다른 객체)
- 심볼·에러 클래스 비교가 깨진다

대응 전략:

1. **상태를 갖지 않는 설계** — 순수 함수 위주면 hazard의 실질 피해가 없다
2. **상태는 얇은 CJS 코어 하나로 몰고** ESM 래퍼가 그것을 참조하게 한다
3. 정 안 되면 `globalThis` 기반 싱글턴 레지스트리를 쓴다 (최후 수단)
4. 애초에 ESM only로 간다 (가장 확실)

## 2.3 `package.json` — 실제 계약이 적히는 곳

번들러 설정보다 이 파일이 더 중요하다.

```jsonc
{
  "name": "my-lib",
  "type": "module",              // 소스/산출물의 기본 해석 방식
  "files": ["dist"],             // 배포 tarball에 들어갈 것만 (중요: 용량·보안)
  "sideEffects": false,          // tree-shaking 힌트. CSS import 있으면 배열로
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",   // 반드시 맨 위
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js",
      "require": "./dist/utils.cjs"
    },
    "./package.json": "./package.json"  // 툴링이 자주 찾는다
  },
  "main": "./dist/index.cjs",    // exports 미지원 구형 툴 폴백
  "types": "./dist/index.d.ts"   // 구형 TS 폴백
}
```

핵심 포인트:

- **`exports`는 캡슐화 장치다.** 여기 없는 경로는 소비자가 import 할 수 없다. 내부 파일에 의존하는 것을 막아 리팩터링 자유도를 지킨다.
- **조건(condition) 순서가 의미를 갖는다.** 위에서부터 먼저 매칭되는 것이 선택되므로 `types`는 항상 먼저, `default`는 항상 마지막.
- **`files`를 빠뜨리면** 소스·테스트·`.env` 같은 것까지 배포될 수 있다.
- 조건 키: `types`, `import`, `require`, `node`, `browser`, `worker`, `development`, `production`, `default`.

## 2.4 조건부 진입점 (플랫폼 분기)

같은 기능이 Node와 브라우저에서 구현이 달라야 할 때:

```jsonc
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "workerd": "./dist/index.edge.js",
    "browser": "./dist/index.browser.js",
    "node": {
      "import": "./dist/index.node.js",
      "require": "./dist/index.node.cjs"
    },
    "default": "./dist/index.browser.js"
  }
}
```

주의: 분기마다 타입도 갈라져야 하는지 확인해야 하고, 분기가 늘수록 테스트해야 할 매트릭스가 곱셈으로 늘어난다. **꼭 필요할 때만 쪼갠다.**

## 2.5 타입 선언(d.ts) — 별도의 빌드 산출물이다

- **타입도 모듈 포맷을 탄다.** CJS 산출물에는 `.d.cts`, ESM 산출물에는 `.d.ts`가 필요할 수 있다. 하나의 `.d.ts`를 양쪽에 물리면 `moduleResolution: node16` 사용자에게서 에러가 난다.
- **의존성 타입 누수**: `devDependencies`에 있는 패키지의 타입이 public d.ts에 등장하면 소비자 쪽에서 해석 실패한다. 그 의존성은 `dependencies`로 올리거나 타입을 인라인해야 한다.
- **번들링 vs 비번들링**: `rollup-plugin-dts`류로 d.ts를 하나로 합칠지, 파일별로 둘지 결정. 합치면 이름 충돌 처리가 필요하고, 안 합치면 파일 수가 많아진다.
- **`isolatedDeclarations`** (TS 5.5+): 모든 export에 명시적 타입 표기를 강제하는 대신, d.ts 생성이 타입 체커 없이 가능해져 **빌드가 극적으로 빨라진다.** tsdown/oxc 계열이 이걸 활용한다.
- 자동 검증: **`arethetypeswrong`(attw)** 을 CI에 넣으면 조건별 타입 해석 문제를 기계적으로 잡아준다.

## 2.6 의존성 전략 — 무엇을 번들에 넣고 무엇을 밖에 둘 것인가

| 분류 | 의미 | 번들 포함 여부 |
|---|---|---|
| `dependencies` | 런타임에 필요, 패키지 매니저가 설치 | **external (미포함)** 이 기본 |
| `peerDependencies` | 소비자가 이미 갖고 있어야 함 (react 등) | 절대 번들에 넣지 않는다 |
| `devDependencies` | 빌드·테스트용 | 산출물에 흔적이 없어야 함 |
| 내부 유틸 / 작은 헬퍼 | 아주 작고 버전 노출이 무의미 | 번들에 인라인 검토 가능 |

원칙:

- **React, Vue 같은 것은 반드시 `peerDependencies` + external.** 번들에 넣으면 소비자 앱에 두 벌의 React가 생기고 훅이 즉시 깨진다.
- 의존성을 인라인(번들에 포함)하면 소비자의 중복 제거 기회를 뺏는다. 반대로 external로 두면 의존성 트리가 커진다. 기본값은 external, 예외적으로 인라인.
- **의존성 개수 자체가 비용**이다. 설치 시간, 공급망 위험, 버전 충돌. 몇 줄로 대체 가능한 의존성은 추가하지 않는다.

## 2.7 Tree-shaking이 실제로 되게 만들기

`sideEffects: false`를 적는 것만으로는 부족하다.

**부작용을 없앤다**
- 모듈 최상위에서 `console.log`, 전역 레지스트리 등록, 프로토타입 패치 같은 걸 하지 않는다
- 최상위 코드는 선언만 하고 실행은 함수 호출 시점으로 미룬다

**배럴 파일(`index.ts`에서 전부 re-export)의 함정**
- 번들러가 잘 털어내면 문제없지만, CJS로 내려가는 순간 혹은 번들러가 부작용을 확신 못 하면 전체가 포함된다
- 서브패스 export(`lib/utils`)를 함께 제공하면 소비자에게 탈출구가 생긴다

**트랜스파일 다운레벨이 tree-shaking을 죽인다**
- TS `class`를 ES5로 내리면 IIFE가 생기고 순수하다고 판단되지 않는다
- `enum`은 IIFE를 만든다 → `const enum`이나 union 타입 사용 고려
- 타깃을 너무 낮게 잡지 않는 것이 크기에도 유리하다

**`/* @__PURE__ */` 어노테이션**
- 최상위 함수 호출 결과를 상수에 담는 패턴에 붙이면 미사용 시 제거 가능해진다

## 2.8 컴파일 타깃과 폴리필

- **라이브러리는 폴리필을 포함하지 않는다.** 폴리필은 애플리케이션의 책임이다. 라이브러리가 core-js를 끌어오면 소비자 번들에 중복으로 들어간다.
- 문법 타깃(`target`)은 지원 런타임 중 가장 낮은 것에 맞춘다. 불필요하게 낮추면 코드가 커지고 tree-shaking이 나빠진다.
- 필요한 런타임 API가 있으면 폴리필하지 말고 **문서에 요구사항으로 적거나, 런타임 감지 후 명확한 에러를 던진다.**

## 2.9 번들 vs 비번들(bundleless)

| | 번들 (하나로 합침) | 비번들 (파일별 변환) |
|---|---|---|
| 소비자 tree-shaking | 번들러가 잘 해주면 OK | 파일 단위라 잘 됨 |
| 디버깅 | 소스맵 의존 | 파일 구조가 소스와 1:1 |
| 서브패스 export | 진입점별로 설정 필요 | 자연스러움 |
| 산출물 파일 수 | 적음 | 많음 |
| 적합 | 앱/브라우저 배포용, 진입점이 적은 라이브러리 | 유틸 모음, 대형 라이브러리 |

**minify는 보통 하지 않는다.** 소비자 번들러가 어차피 다시 minify하고, minify된 코드는 디버깅과 소스맵 품질을 떨어뜨린다. 예외: CDN 직접 로드용 IIFE/UMD 빌드.

## 2.10 소스맵과 디버깅 경험

- `sourcemap: true`로 `.js.map`을 함께 배포한다. `files`에 포함되는지 확인.
- 소스 자체를 맵에 인라인할지(`sourcesContent`) 결정 — 켜면 디버깅이 편하고 패키지 용량이 커진다.
- 소비자 번들러가 라이브러리 소스맵을 이어 붙일 수 있어야 스택 트레이스가 원본 줄 번호를 가리킨다.

## 2.11 프레임워크 특수 요구사항

- **RSC**: `'use client'` / `'use server'` 지시어는 **파일 최상단에 보존되어야 한다.** 번들러가 파일을 합치면 지시어가 사라지거나 잘못된 파일에 붙는다. 클라이언트 컴포넌트는 별도 진입점으로 분리하는 것이 안전하다.
- **CSS**: 라이브러리가 CSS를 import하면 `sideEffects`를 `["*.css"]` 형태로 명시해야 스타일이 사라지지 않는다. CSS를 별도 파일로 배포하고 소비자가 직접 import 하게 하는 편이 호환성이 좋다.
- **워커 / wasm 에셋**: 상대 경로가 소비자 번들에서 유지되는지 확인 필요.

## 2.12 산출물 검증 — 여기서 대부분의 사고를 막는다

빌드가 성공하는 것과 산출물이 올바른 것은 별개다. 다음을 CI에 넣는다.

1. **`publint`** — `package.json` 필드, 포맷 불일치, 잘못된 exports 자동 검사
2. **`arethetypeswrong`** — 조건별 타입 해석 매트릭스 검사
3. **`npm pack` 후 실제 설치 테스트(smoke test)** — tarball을 만들어 임시 프로젝트에서 실제로 import/require 해본다. 가장 확실한 검증.
4. **사이즈 리밋** (`size-limit` 등) — 번들 크기 회귀를 PR 단계에서 막는다
5. **소비 매트릭스 테스트** — Vite / webpack / Node ESM / Node CJS / tsc(node16, bundler) 각각에서 최소 예제가 빌드되는지

> 경험칙: **산출물을 직접 열어본다.** `dist/index.js`를 한 번 눈으로 읽으면 devDependency가 딸려 들어왔는지, 의도치 않은 폴리필이 붙었는지 바로 보인다.

## 2.13 릴리즈와 버전 관리

- **Changesets** 등으로 변경 내역과 semver 범프를 자동화
- 번들링 설정 변경은 breaking일 수 있음을 인지하고 메이저를 아낌없이 올린다
- `npm publish --provenance`로 공급망 신뢰성 확보
- `publishConfig.access`, 태그(`next`, `beta`) 전략 정리
- **prepublishOnly 훅으로 빌드+검증을 강제**해 "빌드 안 하고 배포" 사고를 차단

## 2.14 빌드 속도와 개발자 루프

라이브러리 저자 본인의 DX도 품질에 영향을 준다.

- watch 모드에서 즉시 반영되는가
- 모노레포라면 패키지 간 참조가 소스 직접 참조인가, 빌드 산출물 참조인가 (전자가 루프가 빠르다)
- d.ts 생성이 병목인 경우가 많다 → `isolatedDeclarations` 활용
- **Rust 기반 툴체인**(Rolldown/oxc 기반의 tsdown, esbuild 등)이 tsc 대비 수십 배 빠르다. 다만 타입 체크는 별도로 `tsc --noEmit`으로 돌려야 한다 (빠른 트랜스파일러는 타입을 검사하지 않고 지우기만 한다).

---

# 3. 요약 체크리스트

배포 전에 이 목록을 훑는다.

- [ ] 지원 런타임·모듈 포맷을 문서에 명시했다
- [ ] `exports` 필드로 공개 경로를 정의했고 `types`가 각 조건의 맨 위에 있다
- [ ] `files`로 배포 범위를 좁혔고 `npm pack --dry-run`으로 내용을 확인했다
- [ ] `sideEffects`를 정확히 표기했다 (CSS가 있으면 배열로)
- [ ] peer 의존성과 런타임 의존성이 번들에 인라인되지 않았다
- [ ] devDependency의 타입이 public d.ts에 새지 않았다
- [ ] 폴리필을 포함하지 않았다
- [ ] 소스맵을 배포하고 `files`에 포함시켰다
- [ ] `publint` + `attw`가 통과한다
- [ ] `npm pack` 결과물로 ESM/CJS/타입 스모크 테스트를 돌렸다
- [ ] 번들 크기를 측정하고 기준선을 CI에 걸었다

---

## 더 파볼 만한 주제

- Node.js 공식 문서의 `exports`/조건부 export 명세
- `arethetypeswrong` 문제 유형 목록 (각 항목이 곧 실전 사례집)
- Rolldown / tsdown 의 라이브러리 빌드 기본값이 왜 그렇게 설정되어 있는지 읽어보기
- 유명 라이브러리(zod, hono, radix-ui 등)의 `package.json`을 직접 열어 비교해보기
