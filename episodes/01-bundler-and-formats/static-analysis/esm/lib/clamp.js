/* oxlint-disable no-unreachable -- 실행되면 바로 터지도록 첫 줄에서 일부러 throw 한다 */
throw new Error("clamp.js 가 실행됐다!");
export function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
export const VERSION = "1.0.0";
