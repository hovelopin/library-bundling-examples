// 에피소드 폴더를 정적으로 서빙한다.
//   node serve.mjs          → http://localhost:4173/app-unbundled/ 에서 요청 로그를 본다
//   node serve.mjs --crawl  → 브라우저가 할 일을 흉내 내 요청 수·바이트를 세고 종료한다
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname, posix } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".cjs": "text/javascript" };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const file = join(ROOT, url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname);
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[posix.extname(file)] ?? "application/octet-stream",
    });
    res.end(body);
    console.log(`GET ${url.pathname} ${body.length}B`);
  } catch {
    res.writeHead(404).end();
  }
});

// ESM 의 정적 import/export ... from "..." 만 따라간다 (브라우저의 모듈 그래프 탐색과 같다).
const IMPORT_RE = /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']/g;

async function crawl(base, entry) {
  let level = [entry];
  const seen = new Set();
  const rows = [];
  for (let depth = 0; level.length > 0; depth++) {
    const next = [];
    // 같은 레벨은 브라우저가 병렬로 요청한다. 다음 레벨은 이 레벨을 파싱한 뒤에야 알 수 있다.
    await Promise.all(
      level.map(async (path) => {
        if (seen.has(path)) return;
        seen.add(path);
        const res = await fetch(base + path);
        const text = await res.text();
        rows.push({ depth, path, bytes: Buffer.byteLength(text) });
        for (const m of text.matchAll(IMPORT_RE)) next.push(posix.join(posix.dirname(path), m[1]));
      }),
    );
    level = next;
  }
  return rows;
}

const sum = (rows) => rows.reduce((n, r) => n + r.bytes, 0);
const depth = (rows) => Math.max(...rows.map((r) => r.depth)) + 1;

server.listen(4173, async () => {
  const base = "http://localhost:4173";
  if (!process.argv.includes("--crawl")) {
    console.log(`${base}/app-unbundled/  (Ctrl+C 로 종료)`);
    return;
  }
  const unbundled = await crawl(base, "/app-unbundled/main.js");
  const bundled = await crawl(base, "/app-unbundled/main-bundled.js");
  console.table(unbundled);
  console.log(
    `unbundled: ${unbundled.length} requests, ${sum(unbundled)} bytes, ${depth(unbundled)} round-trips`,
  );

  console.table(bundled);
  console.log(
    `bundled:   ${bundled.length} requests, ${sum(bundled)} bytes, ${depth(bundled)} round-trips`,
  );
  server.close();
});
