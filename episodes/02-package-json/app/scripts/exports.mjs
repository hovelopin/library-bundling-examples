// exports 필드 실험. Node 의 해석기가 package.json 을 어떻게 읽는지 그대로 보여준다.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

console.log("1) subpath        :", require.resolve("@ep2/lib-exports-ok/utils"));
try {
  require.resolve("@ep2/lib-exports-ok/dist/internal.js");
} catch (e) {
  console.log("2) 미등록 경로     :", e.code);
}
console.log("3) require, ok    :", require.resolve("@ep2/lib-exports-ok"));
console.log("4) require, broken:", require.resolve("@ep2/lib-exports-broken"), "← default 가 먼저라 cjs 를 못 고른다");
console.log("5) import, ok     :", import.meta.resolve("@ep2/lib-exports-ok"));
