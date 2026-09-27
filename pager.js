// pager.js：缓存查找与淘汰位（最近使用的在队首，最久未用的在队尾）
export function indexOf(cache, page) {
  return Array.isArray(cache) ? cache.indexOf(page) : -1;
}

export function victimIndex(cache, capacity) {
  if (!Array.isArray(cache)) return -1;
  return cache.length >= capacity ? cache.length - 1 : -1;
}
