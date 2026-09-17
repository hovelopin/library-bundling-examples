// require 는 문법이 아니라 함수라서 인자에 식을 넣을 수 있다.
const impl = require(process.env.MODE === "upper" ? "./upper.cjs" : "./lower.cjs");

// exports 에 붙는 이름도 실행 중에 계산된다.
for (const name of Object.keys(impl)) {
  exports["util_" + name] = impl[name];
}
