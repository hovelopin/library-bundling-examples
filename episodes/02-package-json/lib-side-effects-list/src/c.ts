function compile(pattern: string): RegExp {
  return new RegExp(pattern, "u");
}
const WORD: RegExp = compile("\\p{L}+");

export function c(s: string): string[] {
  return s.match(new RegExp(WORD.source, "gu")) ?? [];
}
