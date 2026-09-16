// d.ts 를 만드는 세 가지 방법의 소요 시간을 잰다. 각 3회, 중앙값.
//   tsc --emitDeclarationOnly : 프로젝트 전체 타입 검사 + d.ts
//   tsdown (generator: tsc)   : JS 번들 + TS API 로 d.ts
//   tsdown (generator: oxc)   : JS 번들 + 파일 단위 d.ts (isolatedDeclarations)
//   tsdown (dts 없음)         : 기준선. JS 번들만. 위 둘에서 이걸 빼면 d.ts 비용이다.
//   tsc --noEmit              : 참고용. 타입 검사만.
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { rmSync } from "node:fs";

const BIN = "../../../node_modules/.bin/";
const RUNS = 3;
const CASES = [
  {
    name: "tsc --emitDeclarationOnly",
    cmd: BIN + "tsc",
    args: ["-p", "tsconfig.emit.json"],
    clean: "dist-tsc",
  },
  {
    name: "tsdown (generator: tsc)",
    cmd: BIN + "tsdown",
    args: ["-c", "tsdown.tsc.config.ts"],
    clean: "dist-tscgen",
  },
  {
    name: "tsdown (generator: oxc)",
    cmd: BIN + "tsdown",
    args: ["-c", "tsdown.oxc.config.ts"],
    clean: "dist",
  },
  {
    name: "tsdown (dts 없음, 기준선)",
    cmd: BIN + "tsdown",
    args: ["-c", "tsdown.nodts.config.ts"],
    clean: "dist-nodts",
  },
  { name: "tsc --noEmit (참고)", cmd: BIN + "tsc", args: ["--noEmit"], clean: null },
];

const median = (xs) => xs.toSorted((a, b) => a - b)[Math.floor(xs.length / 2)];
const rows = [];
for (const c of CASES) {
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    if (c.clean) rmSync(c.clean, { recursive: true, force: true });
    const t0 = performance.now();
    execFileSync(c.cmd, c.args, { stdio: "ignore" });
    times.push(Math.round(performance.now() - t0));
  }
  rows.push({ case: c.name, "median ms": median(times), runs: times.join(" / ") });
}
console.table(rows);
