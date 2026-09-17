/* oxlint-disable no-unreachable -- 실행되면 바로 터지도록 첫 줄에서 일부러 throw 한다 */
// 실행되면 바로 터진다. 분석기는 이 파일을 실행하지 않고 읽기만 한다.
throw new Error("main.js 가 실행됐다!");
import { slugify } from "./lib/index.js";

console.log(slugify("Hello"));
