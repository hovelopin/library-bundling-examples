// 번들러 없이 라이브러리의 개별 파일을 그대로 가져온다.
// 브라우저는 index.js 를 받은 뒤에야 그 안의 import 5개를 알게 되고, 그제서야 다시 요청한다.
import { slugify } from "../lib/dist-unbundled/index.js";

document.getElementById("out").textContent = slugify("Hello, Library Bundling!");
