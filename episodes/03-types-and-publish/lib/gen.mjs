// 타이밍 실험용 소스 생성기. src/gen/ 아래에 모듈 N개를 만든다.
// 각 모듈은 인터페이스 하나와 명시적 반환 타입을 가진 함수 넷을 내보낸다(isolatedDeclarations 호환).
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const N = Number(process.argv[2] ?? 1000);
const root = dirname(fileURLToPath(import.meta.url));
const dir = join(root, "src", "gen");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const exportsIndex = [];
for (let i = 0; i < N; i++) {
  const id = String(i).padStart(3, "0");
  writeFileSync(
    join(dir, `mod-${id}.ts`),
    `export interface Record${id} {
  id: number;
  name: string;
  tags: string[];
  score: number;
}

export function make${id}(name: string, score: number = 0): Record${id} {
  return { id: ${i}, name, tags: [], score };
}

export function tag${id}(r: Record${id}, ...tags: string[]): Record${id} {
  return { ...r, tags: [...r.tags, ...tags] };
}

export function rank${id}(rs: Record${id}[]): Record${id}[] {
  return [...rs].sort((a, b) => b.score - a.score);
}

export function describe${id}(r: Record${id}): string {
  return \`#\${r.id} \${r.name} [\${r.tags.join(", ")}] \${r.score}\`;
}
`,
  );
  exportsIndex.push(`export * from "./gen/mod-${id}";`);
}
writeFileSync(
  join(root, "src", "index.ts"),
  `// gen.mjs 가 만든다. 직접 고치지 말 것.\n${exportsIndex.join("\n")}\n`,
);
console.log(`generated ${N} modules → src/gen`);
