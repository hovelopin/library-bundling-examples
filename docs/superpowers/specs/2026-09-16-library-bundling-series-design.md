# 라이브러리 번들링 시리즈 설계

- 날짜: 2026-09-16
- 블로그: `~/hojin/blog` (`content/posts/`, frontmatter `series`로 묶는 posts 시리즈)
- 예시코드: `~/hojin/tsdown` (이 저장소)

## 목표

번들러 개념이 없는 독자도 따라올 수 있게 시작해서, 라이브러리 번들링에서 실제로 문제가
되는 설정(모듈 포맷, package.json 필드, 타입·검증)까지 한 시리즈로 학습한다.
모든 주장은 이 저장소의 예시코드를 직접 빌드·측정한 수치로 뒷받침한다.

## 시리즈 (3편)

| # | slug | 제목 | 내용 | 측정 |
|---|---|---|---|---|
| 1 | `library-bundling-1-bundler-and-formats` | 번들러는 무엇을 하는가 | 번들러 개념, 앱 vs 라이브러리 번들, CJS/ESM 차이, dual 제공, dual package hazard | 파일 5개 직접 로드 vs 번들 1개 (요청 수·바이트); cjs vs esm 빌드 후 함수 1개 import 시 소비자 번들 크기; `instanceof` 실패 |
| 2 | `library-bundling-2-package-json` | package.json이 계약이다 | `exports`(캡슐화·조건 순서·subpath), `sideEffects`와 tree-shaking(배럴·최상위 부작용·`@__PURE__`), `dependencies`/`peerDependencies`/`devDependencies`(external vs 인라인) | `sideEffects` 유무별 크기; 의존성 인라인 vs external 크기; 잘못된 exports 순서 에러; React 두 벌 재현 |
| 3 | `library-bundling-3-types-and-publish` | 타입과 배포 전 검증 | d.ts 생성, `isolatedDeclarations`, tsdown vs tsc 역할, publint, attw, `npm pack` 스모크, 체크리스트 | d.ts 빌드 시간 tsc vs tsdown; attw 매트릭스 |

이번 세션 범위: 저장소 골격 + 1·2편 예시코드·측정·데모·글. 3편은 다음 세션.

## 예시 저장소 구조

```
tsdown/
  package.json                 # workspace root. devDeps: tsdown, typescript
  pnpm-workspace.yaml          # packages: episodes/*/*
  scripts/size.mjs             # 인자로 받은 파일들의 raw/gzip 바이트를 표로 출력 (stdlib만)
  episodes/
    01-bundler-and-formats/
      lib/                     # 파일 5개짜리 유틸 라이브러리. format: [esm, cjs]
      app-unbundled/           # index.html + <script type="module"> 로 lib 소스 직접 로드
      app-esm/                 # lib의 esm 산출물에서 함수 1개 import → tsdown으로 번들
      app-cjs/                 # lib의 cjs 산출물에서 함수 1개 require → tsdown으로 번들
      hazard/                  # 한 프로세스에서 import + require 동시 로드, instanceof 비교
    02-package-json/
      lib-exports/             # exports 조건 순서 실험 (올바른/틀린 두 설정)
      lib-side-effects/        # 배럴 + 최상위 부작용. sideEffects true/false 비교
      lib-deps/                # 작은 의존성을 인라인 vs external
      app/                     # 위 라이브러리들을 소비하며 크기 측정
  docs/superpowers/specs/      # 이 문서
  library-bundling.md          # 초기 학습 노트 (참고용, 그대로 둠)
```

- 소비자 앱 번들링도 tsdown(rolldown)으로 한다. vite 등 추가 도구 없음.
- 측정은 `node:fs`, `node:zlib`, `performance.now()`만 쓴다.
- 각 episode 폴더는 `pnpm build && pnpm measure` 한 번으로 글의 표를 재현할 수 있어야 한다.

## 블로그 산출물

- 글: `content/posts/library-bundling-1-bundler-and-formats.mdx`, `…-2-package-json.mdx`
  - frontmatter: `series: "라이브러리 번들링"`, `seriesOrder`, `tags`, `author: "hovelopin"`, `draft: true`
  - `~다체`, 도입부 5단, h2 번호 없음, 마무리 grep 검증
  - 예시코드 경로와 실행 명령을 글에 명시하고, 측정값은 표로 싣는다
- 데모 (`src/components/demos/`, `CanvasDemo`/`twoLanes` 재사용, `mdx-components.tsx` 등록)
  - 1편: `ModuleGraphDemo` (파일 5개 워터폴 vs 번들 1개), `TreeShakeDemo` (esm은 함수 1개만, cjs는 모듈 전체)
  - 2편: `SideEffectsDemo` (sideEffects 유무별 번들 크기 막대), `DuplicateReactDemo` (peer 미설정 시 React 두 벌)
- 완료 조건: blog `pnpm check` 통과, 글 grep 검증 비어 있음, 데모 수치 = 실제 측정값
- 커버 이미지는 별도 단계(`blog-cover-image` 스킬)

## 하지 않는 것

- 영어판(`.en.mdx`) — 만들지 않는다
- 3편 본문·예시코드 — 다음 세션
- size-limit·CI 설정 — 글에서 언급만
