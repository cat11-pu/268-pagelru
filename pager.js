// pager.js：缓存查找与淘汰位（基线：一律说不在、给零）
export function indexOf(cache, page) {
  return -1;
}

export function victimIndex(cache, capacity) {
  return 0;
}
