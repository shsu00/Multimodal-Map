// The slider's client-side score must match the planner (Python and C++).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { score } from "../src/rank.ts";
import type { Itinerary } from "../src/types.ts";

const { cases } = JSON.parse(readFileSync(new URL("./score-cases.json", import.meta.url), "utf8"));

test("score matches the planner's fixture exactly", () => {
  for (const c of cases) {
    const it = { total_cost: c.total_cost, duration_s: c.duration_s, transfers: c.transfers } as Itinerary;
    assert.equal(score(it, c.value_of_time_per_hour, c.transfer_penalty), c.score);
  }
});
