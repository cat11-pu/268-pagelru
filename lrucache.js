// lrucache.js：按访问预算处理 LRU 页缓存，预算用尽的访问压账，收尾时还清
import { indexOf, victimIndex } from "./pager.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function pageErrorCode(spec) {
  return (spec && spec.page_error_code) || "E_BAD_PAGE";
}

function eventErrorCode(spec) {
  return (spec && spec.event_error_code) || "E_BAD_EVENT";
}

function validate(spec) {
  if (!spec || !Number.isInteger(spec.capacity) || spec.capacity <= 0) {
    fail("E_BAD_CAPACITY", "capacity must be a positive integer");
  }
  const events = spec.events || [];
  if (!Array.isArray(events)) {
    fail(eventErrorCode(spec), "events must be an array");
  }
  for (const event of events) {
    if (!event || event.kind !== "access") {
      fail(eventErrorCode(spec), "unsupported event");
    }
    if (typeof event.page !== "string" || event.page === "") {
      fail(pageErrorCode(spec), "page must be a non-empty string");
    }
  }
}

function cloneState(state) {
  const source = state || {};
  return {
    cache: Array.isArray(source.cache) ? source.cache.slice() : [],
    hits: Number(source.hits) > 0 ? Number(source.hits) : 0,
    misses: Number(source.misses) > 0 ? Number(source.misses) : 0,
    ledger: Array.isArray(source.ledger) ? source.ledger.slice() : [],
    applied: Array.isArray(source.applied) ? source.applied.slice() : []
  };
}

function budgetOf(spec) {
  const value = Number(spec.budget);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function touch(state, page, capacity) {
  const at = indexOf(state.cache, page);
  if (at >= 0) {
    state.cache.splice(at, 1);
    state.cache.unshift(page);
    state.hits += 1;
    return;
  }
  const victim = victimIndex(state.cache, capacity);
  if (victim >= 0) {
    state.cache.splice(victim, 1);
  }
  state.cache.unshift(page);
  state.misses += 1;
}

export function step(spec) {
  validate(spec);
  const capacity = spec.capacity;
  const state = cloneState(spec.state);
  const events = Array.isArray(spec.events) ? spec.events : [];
  let budget = budgetOf(spec);
  let served = 0;
  let judged = 0;

  // 上一轮压在账上的访问先还，按入账顺序逐个处理
  while (budget > 0 && state.ledger.length > 0) {
    touch(state, state.ledger.shift(), capacity);
    budget -= 1;
    served += 1;
  }

  // 再处理本批事件；已判定过的事件跨轮不重复处理
  for (const event of events) {
    if (state.applied.includes(event.id)) continue;
    state.applied.push(event.id);
    judged += 1;
    if (budget > 0) {
      touch(state, event.page, capacity);
      budget -= 1;
      served += 1;
    } else {
      state.ledger.push(event.page);
    }
  }

  return {
    state,
    served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.slice(),
    judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  validate(spec);
  const capacity = spec.capacity;
  const state = cloneState(spec.state);
  let catchup = 0;

  while (state.ledger.length > 0) {
    touch(state, state.ledger.shift(), capacity);
    catchup += 1;
  }

  return { state, catchup };
}
