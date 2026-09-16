// 배포 전 스모크 테스트. 워크스페이스 링크가 아니라 "npm publish 했을 때 소비자가 받는 것"을 재현한다.
//   1. npm pack 으로 tarball 을 만들고
//   2. 빈 프로젝트에 설치한 뒤
//   3. import / require / tsc 세 가지가 되는지 본다.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TSC = resolve(here, "../../../node_modules/.bin/tsc");
const LIBS = [
  {
    dir: "../lib",
    name: "@ep3/lib",
    esm: "import { make000 } from '@ep3/lib'; console.log(make000('x').id)",
    cjs: "console.log(require('@ep3/lib').make000('x').id)",
    ts: "import { make000 } from '@ep3/lib';\nconst r: number = make000('x').id;\n",
  },
  {
    dir: "../lib-broken-types",
    name: "@ep3/lib-broken-types",
    esm: "import { add } from '@ep3/lib-broken-types'; console.log(add(1,2))",
    cjs: "console.log(require('@ep3/lib-broken-types').add(1,2))",
    ts: "import { add } from '@ep3/lib-broken-types';\nconst n: number = add(1, 2);\n",
  },
  {
    dir: "../lib-type-leak",
    name: "@ep3/lib-type-leak",
    esm: "import { createBus } from '@ep3/lib-type-leak'; console.log(typeof createBus().on)",
    cjs: null,
    ts: "import { createBus } from '@ep3/lib-type-leak';\ncreateBus().on('message', (m) => m.length);\n",
  },
];

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return {
    ok: r.status === 0,
    out: (r.stdout + r.stderr).trim().split("\n").slice(0, 3).join(" | "),
  };
}

for (const lib of LIBS) {
  const libDir = resolve(here, lib.dir);
  const tmp = join(here, "tmp", lib.name.replace("/", "__"));
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  execFileSync("npm", ["pack", "--pack-destination", tmp, "--silent"], {
    cwd: libDir,
    stdio: "ignore",
  });
  const tgz = readdirSync(tmp).find((f) => f.endsWith(".tgz"));
  writeFileSync(
    join(tmp, "package.json"),
    JSON.stringify({ name: "consumer", private: true, type: "module" }),
  );
  execFileSync("npm", ["install", "--silent", "--no-audit", "--no-fund", `./${tgz}`], {
    cwd: tmp,
    stdio: "ignore",
  });

  const results = {};
  results.import = run("node", ["--input-type=module", "-e", lib.esm], tmp);
  if (lib.cjs) results.require = run("node", ["-e", lib.cjs], tmp);
  // 소비자가 흔히 쓰는 두 해석 방식으로 타입을 검사한다.
  writeFileSync(join(tmp, "check.ts"), lib.ts);
  const tsc = (label, file, mr) =>
    (results[label] = run(
      TSC,
      [
        "--noEmit",
        "--strict",
        "--module",
        mr === "node16" ? "node16" : "esnext",
        "--moduleResolution",
        mr,
        file,
      ],
      tmp,
    ));
  tsc("tsc bundler", "check.ts", "bundler");
  tsc("tsc node16 esm", "check.ts", "node16");
  if (lib.cjs) {
    // .cts 는 node16 해석에서 CommonJS 로 취급된다 — require 조건의 타입을 검사한다.
    writeFileSync(join(tmp, "check.cts"), lib.ts);
    tsc("tsc node16 cjs", "check.cts", "node16");
  }

  console.log(`\n${lib.name}`);
  for (const [k, v] of Object.entries(results))
    console.log(`  ${v.ok ? "✔" : "✘"} ${k.padEnd(15)} ${v.ok ? "" : v.out}`);
}
