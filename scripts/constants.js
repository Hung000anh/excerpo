// scripts/constants.js
export const SOURCES = [
  SourceSangtacviet,
];

export function getSource(url) {
  return SOURCES.find(s => s.pattern.test(url)) || null;
}
