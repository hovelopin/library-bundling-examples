// 라이브러리에서 함수 하나만 쓴다. 최종 번들에 나머지 4개가 딸려오는지가 관심사다.
import { slugify } from "@ep1/lib";

console.log(slugify("Hello, Library Bundling!"));
