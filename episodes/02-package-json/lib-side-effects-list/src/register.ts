// 진짜 부작용: 모듈이 평가되는 순간 전역에 무언가를 등록한다.
// 플러그인 등록, 폴리필, CSS import 가 전부 이런 모양이다.
type Registry = { plugins: string[] };
const g = globalThis as unknown as { __registry?: Registry };
g.__registry ??= { plugins: [] };
g.__registry.plugins.push("side-effects-lib");

export const registry: Registry = g.__registry;
