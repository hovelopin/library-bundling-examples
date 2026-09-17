// 정적 분석: 코드를 실행하지 않고 글자만 읽어 모듈 그래프와 내보내는 이름을 알아낸다.
// 파서는 tsdown 이 내부에서 쓰는 rolldown 의 것이다. 아래 분석 단계는 어떤 파일도 import 하지 않는다.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAst } from "rolldown/parseAst";

const here = dirname(fileURLToPath(import.meta.url));
const read = (file) => readFileSync(file, "utf8");
const slice = (node, src) => src.slice(node.start, node.end);

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else walk(value, visit);
  }
}

// ESM: import / export 문의 경로와 이름은 항상 글자 그대로라 읽는 순간 확정된다.
function analyzeEsm(file, graph = new Map()) {
  if (graph.has(file)) return graph;
  const deps = [];
  const names = [];
  for (const stmt of parseAst(read(file)).body) {
    if (stmt.type === "ImportDeclaration") deps.push(stmt.source.value);
    if (stmt.type === "ExportNamedDeclaration") {
      if (stmt.source) deps.push(stmt.source.value);
      for (const spec of stmt.specifiers) names.push(spec.exported.name);
      if (stmt.declaration?.id) names.push(stmt.declaration.id.name);
      for (const decl of stmt.declaration?.declarations ?? []) names.push(decl.id.name);
    }
  }
  graph.set(file, { deps: deps.map((d) => join(dirname(file), d)), names });
  for (const dep of graph.get(file).deps) analyzeEsm(dep, graph);
  return graph;
}

// CJS: require 인자와 exports 이름이 글자(리터럴)인지, 실행해야 아는 식인지 가려낸다.
function analyzeCjs(file) {
  const src = read(file);
  const found = [];
  walk(parseAst(src), (node) => {
    if (node.type === "CallExpression" && node.callee.name === "require") {
      const arg = node.arguments[0];
      found.push({ kind: "require", code: slice(arg, src), known: arg.type === "Literal" });
    }
    if (node.type === "MemberExpression" && node.object.name === "exports") {
      found.push({ kind: "exports", code: slice(node.property, src), known: !node.computed });
    }
  });
  return found;
}

// ---------- 1) 읽기만 한다 ----------
const esmEntry = join(here, "esm/main.js");
const graph = analyzeEsm(esmEntry);
console.log("[ESM] esm/main.js 에서 출발. 파일을 하나도 실행하지 않고 읽기만 했다\n");
const printTree = (file, depth = 0) => {
  const { deps, names } = graph.get(file);
  console.log(
    `  ${"  ".repeat(depth)}${relative(join(here, "esm"), file)}  내보내는 이름: [${names.join(", ") || "없음"}]`,
  );
  for (const dep of deps) printTree(dep, depth + 1);
};
printTree(esmEntry);

const cjs = analyzeCjs(join(here, "cjs/index.cjs"));
console.log("\n[CJS] cjs/index.cjs 를 같은 파서로 읽기만 했다\n");
for (const f of cjs) {
  console.log(`  ${f.kind.padEnd(8)} ${f.code}  ${f.known ? "(확정)" : "← 식이라 실행해야 안다"}`);
}

// ---------- 2) 진짜로 실행해 본다 ----------
console.log("\n[확인] ESM 을 실제로 실행하면");
const esmRun = spawnSync("node", [esmEntry], { encoding: "utf8" });
const esmError = esmRun.stderr.match(/Error: (.+)/)?.[1];
console.log(`  ${esmError}  ← 그래프를 먼저 다 읽고, 가장 안쪽 파일부터 실행한다`);

console.log("\n[확인] CJS 는 실행해야 내보내는 이름이 정해진다");
const cjsNames = {};
for (const mode of ["upper", "lower"]) {
  const r = spawnSync(
    "node",
    ["-e", 'console.log(Object.keys(require("./cjs/index.cjs")).join(","))'],
    {
      cwd: here,
      env: { ...process.env, MODE: mode },
      encoding: "utf8",
    },
  );
  cjsNames[mode] = r.stdout.trim();
  console.log(`  MODE=${mode.padEnd(5)} → [${cjsNames[mode]}]`);
}

// ---------- 자체 검증: 결과가 바뀌면 여기서 멈춘다 ----------
const expect = (ok, message) => {
  if (!ok) throw new Error(`기대와 다름: ${message}`);
};
expect(graph.size === 4, "ESM 그래프는 파일 4개");
expect(
  graph.get(join(here, "esm/lib/index.js")).names.join() === "slugify,clamp,VERSION",
  "index.js 내보내기",
);
expect(
  graph.get(join(here, "esm/lib/clamp.js")).names.join() === "clamp,VERSION",
  "clamp.js 내보내기",
);
expect(
  cjs.length === 2 && cjs.every((f) => !f.known),
  "CJS 의 require 인자와 exports 이름은 둘 다 식",
);
expect(esmError === "slugify.js 가 실행됐다!", "ESM 실행 시 가장 안쪽 파일에서 먼저 터짐");
expect(
  cjsNames.upper === "util_upper" && cjsNames.lower === "util_lower",
  "CJS 내보내기가 MODE 에 따라 달라짐",
);
