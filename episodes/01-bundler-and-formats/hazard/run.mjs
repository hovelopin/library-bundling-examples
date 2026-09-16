// 한 프로세스 안에서 같은 패키지를 import 와 require 로 동시에 불러온다.
// exports 의 "import" 는 dist/index.js, "require" 는 dist/index.cjs 를 가리키므로
// Node 는 서로 다른 두 파일을 각각 평가한다 — 클래스가 두 벌이 된다.
import { createRequire } from "node:module";
import { DeepEqualError as EsmError } from "@ep1/lib";

const require = createRequire(import.meta.url);
const { DeepEqualError: CjsError } = require("@ep1/lib");

const err = new CjsError("from cjs");
console.log("same class?      ", EsmError === CjsError);
console.log("instanceof esm?  ", err instanceof EsmError);
console.log("instanceof cjs?  ", err instanceof CjsError);

if (EsmError === CjsError) throw new Error("hazard not reproduced");
