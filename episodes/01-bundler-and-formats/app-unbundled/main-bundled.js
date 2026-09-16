// 같은 코드를 번들된 산출물 하나에서 가져온다. 비교용.
import { slugify } from "../lib/dist/index.js";

document.getElementById("out").textContent = slugify("Hello, Library Bundling!");
