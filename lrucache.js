// lrucache.js：按访问预算处理并留账
import { indexOf, victimIndex } from "./pager.js";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function checkCapacity(spec) {
  if (!Number.isInteger(spec.capacity) || spec.capacity <= 0) {
    fail(spec.capacity_error_code || "E_BAD_CAPACITY", "容量必须是正整数");
  }
}

function checkEvents(spec, events) {
  const pageCode = spec.page_error_code || "E_BAD_PAGE";
  const eventCode = spec.event_error_code || "E_BAD_EVENT";
  for (const event of events) {
    if (!event || typeof event !== "object" || event.kind !== "access") {
      fail(eventCode, "事件必须是 access 类型");
    }
    if (typeof event.page !== "string" || event.page.length === 0) {
      fail(pageCode, "页名不能为空");
    }
  }
}

function access(state, page, capacity) {
  const spot = indexOf(state.cache, page);
  if (spot >= 0) {
    state.cache.splice(spot, 1);
    state.cache.unshift(page);
    state.hits += 1;
    return;
  }
  const victim = victimIndex(state.cache, capacity);
  if (victim >= 0) state.cache.splice(victim, 1);
  state.cache.unshift(page);
  state.misses += 1;
}

function fork(source) {
  return {
    cache: source.cache.slice(),
    hits: source.hits,
    misses: source.misses,
    ledger: source.ledger.slice(),
    applied: source.applied.slice()
  };
}

export function step(spec) {
  checkCapacity(spec);
  const events = spec.events || [];
  checkEvents(spec, events);
  const state = fork(spec.state);
  let budget = spec.budget;
  let served = 0;
  let judged = 0;
  const judged_bound = state.ledger.length + events.length;
  while (budget > 0 && state.ledger.length > 0) {
    access(state, state.ledger.shift(), spec.capacity);
    budget -= 1;
    judged += 1;
  }
  for (const event of events) {
    const key = event.id;
    if (key !== undefined && state.applied.indexOf(key) >= 0) continue;
    if (budget > 0) {
      access(state, event.page, spec.capacity);
      budget -= 1;
      served += 1;
      judged += 1;
    } else {
      state.ledger.push(event.page);
    }
    if (key !== undefined) state.applied.push(key);
  }
  return { state: state, served: served, ledger_before: state.ledger.length,
           ledger: state.ledger.slice(), judged: judged, judged_bound: judged_bound };
}

export function close(spec) {
  const state = fork(spec.state);
  let catchup = 0;
  while (state.ledger.length > 0) {
    access(state, state.ledger.shift(), spec.capacity);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
