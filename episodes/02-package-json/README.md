# 2편 · package.json이 계약이다

`exports`, `sideEffects`, `dependencies` 세 필드의 값을 바꿔가며 소비자 번들이 어떻게 달라지는지 잰다.

## 폴더

| 폴더 | 역할 |
|---|---|
| `lib-exports-ok/` | `.` 과 `./utils` 서브패스를 연 라이브러리. `dist/internal.js` 는 일부러 exports 에 없다 |
| `lib-exports-broken/` | 소스는 같고 exports 의 조건 순서만 `default` 를 맨 위로 둔 것 |
| `lib-side-effects-{unset,false,partial,list}/` | 같은 소스. `sideEffects` 값만 미설정 / `false` / `["./dist/register.js"]` / `["./dist/register.js", "./dist/index.js"]` |
| `tiny-dep/` | "라이브러리가 의존하는 라이브러리" 역할의 작은 이벤트 이미터 |
| `lib-deps-inline/`, `lib-deps-external/` | tiny-dep 을 산출물에 넣은 것 / import 문으로 남긴 것 |
| `app/` | 위 라이브러리들을 소비하는 앱. 실험마다 진입점 하나씩, 각각 독립 빌드 |
| `duplicate-react/` | react 를 `dependencies` 에 둔 lib 와 `peerDependencies` 에 둔 lib 를 react 19 앱에 설치 |

## 실행

```bash
pnpm install
pnpm -r --filter "@ep2/*" build
```

### exports 가 경로를 어떻게 해석하는가

```bash
cd episodes/02-package-json/app && node scripts/exports.mjs
```

2번 줄이 `ERR_PACKAGE_PATH_NOT_EXPORTED`, 4번 줄이 `.cjs` 가 아니라 `.js` 로 풀리면 재현된 것이다.

### sideEffects 값별 소비자 번들

```bash
node scripts/size.mjs episodes/02-package-json/app/dist/side-effects-*/*.js
grep -c __registry episodes/02-package-json/app/dist/side-effects-*/*.js   # 등록 코드가 남았는지
grep -c buildTable  episodes/02-package-json/app/dist/side-effects-*/*.js  # b.ts 의 최상위 호출이 남았는지
```

`false` 와 `partial` 에서 `__registry` 가 0 이면 부작용이 사라진 것이다. `list` 만 남는다.

### 의존성 인라인 vs external

```bash
node scripts/size.mjs episodes/02-package-json/lib-deps-{inline,external}/dist/index.js
node scripts/size.mjs episodes/02-package-json/app/dist/deps-*/*.js
grep -c "listenerCount(" episodes/02-package-json/app/dist/deps-*-shared/*.js   # Emitter 가 몇 벌인지
```

`deps-inline-shared` 에만 `listenerCount(` 가 2번 나온다.

### React 두 벌

```bash
cd episodes/02-package-json/duplicate-react/app && node run.mjs
ls ../../../../node_modules/.pnpm | grep '^react@'
```

## 바꿔가며 볼 것

- `lib-side-effects-list/src/index.ts` 에서 `register` 재수출을 지우고 소비자가 `import "@ep2/lib-side-effects-list/register"` 로 직접 가져오게 바꿔보자(exports 에 `./register` 추가). 배럴을 목록에 넣지 않아도 되는지 확인한다.
- `duplicate-react/lib-react-dep/package.json` 의 react 버전을 `19.2.4` 로 바꾸면 인스턴스가 하나가 되는지(pnpm 이 같은 버전을 공유하는지) 확인해보자. 버전이 같아도 `dependencies` 에 두는 것이 왜 위험한지 생각해볼 거리다.

측정값은 [`RESULTS.md`](RESULTS.md) 에 있다.
