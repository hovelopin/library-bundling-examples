// 인자로 받은 파일들의 raw/gzip 바이트를 표로 찍는다. 외부 의존성 없음.
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { relative } from "node:path";

export function measure(file) {
  const raw = statSync(file).size;
  const gzip = gzipSync(readFileSync(file), { level: 9 }).length;
  return { file: relative(process.cwd(), file), raw, gzip };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  // self-check: 이 파일 자체를 재서 gzip 이 raw 보다 작아야 한다
  const r = measure(new URL(import.meta.url).pathname);
  if (!(r.raw > 0 && r.gzip > 0 && r.gzip < r.raw)) throw new Error("size.mjs self-check failed");
  console.log("usage: node scripts/size.mjs <file...>");
} else {
  console.table(files.map(measure));
}
