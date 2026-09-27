// pager.js：缓存查找与淘汰位
export function indexOf(cache, page) {
  for (let spot = 0; spot < cache.length; spot += 1) {
    if (cache[spot] === page) return spot;
  }
  return -1;
}

export function victimIndex(cache, capacity) {
  if (cache.length < capacity) return -1;
  return cache.length - 1;
}
