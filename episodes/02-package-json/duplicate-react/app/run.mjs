// 앱은 react 19 를 쓴다. 라이브러리가 react 를 dependencies 에 두면 자기 버전(18)을
// 따로 설치해 붙잡고, peerDependencies 에 두면 앱의 react 를 그대로 쓴다.
import React from "react";
import * as dep from "@ep2/lib-react-dep";
import * as peer from "@ep2/lib-react-peer";

console.log("app react            :", React.version);
console.log("lib (dependencies)   :", dep.version, "same instance?", dep.react === React);
console.log("lib (peerDependencies):", peer.version, "same instance?", peer.react === React);
