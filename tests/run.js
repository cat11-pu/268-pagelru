import assert from "node:assert";
import { indexOf, victimIndex } from "../pager.js";
import { step, close } from "../lrucache.js";
import { render } from "../app.js";

const base = {
  budget: 1, capacity: 2,
  state: { cache: [], hits: 0, misses: 0, ledger: [], applied: [] },
  events: [],
  page_error_code: "E_BAD_PAGE", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("indexOf returns a number", () => {
  assert.strictEqual(typeof indexOf(["P1"], "P1"), "number");
});

check("victimIndex returns a number", () => {
  assert.strictEqual(typeof victimIndex(["P1"], 2), "number");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
