import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByEpic, inDateRange, overviewColumnFor } from "./overview";

const base = { status: "todo" as const, assignee_id: null, created_at: "2026-10-05T15:00:00Z", completed_at: null };

test("overview: columns", () => {
  assert.equal(overviewColumnFor(base), "unassigned");
  assert.equal(overviewColumnFor({ ...base, assignee_id: "a" }), "assigned");
  assert.equal(overviewColumnFor({ ...base, status: "blocked", assignee_id: "a" }), "assigned");
  assert.equal(overviewColumnFor({ ...base, status: "done", completed_at: "2026-10-09T15:00:00Z" }), "done");
});

test("overview: date range uses created for open tasks, closed for done ones", () => {
  assert.ok(inDateRange(base, "", ""));
  assert.ok(inDateRange(base, "2026-10-05", "2026-10-05"));
  assert.ok(!inDateRange(base, "2026-10-06", ""));
  const done = { ...base, status: "done" as const, completed_at: "2026-10-20T15:00:00Z" };
  assert.ok(inDateRange(done, "2026-10-15", ""));
  assert.ok(!inDateRange(done, "", "2026-10-10"));
  // 01:30 UTC on the 6th is still the 5th in Buenos Aires.
  assert.ok(inDateRange({ ...base, created_at: "2026-10-06T01:30:00Z" }, "", "2026-10-05"));
});

test("overview: group by epic, in epic order, empty epics dropped", () => {
  const epics = [{ id: "e1", title: "Uno" }, { id: "e2", title: "Dos" }, { id: "e3", title: "Tres" }];
  const groups = groupByEpic([{ epic_id: "e3" }, { epic_id: "e1" }, { epic_id: "e3" }], epics);
  assert.deepEqual(groups.map((g) => [g.epic.id, g.tasks.length]), [["e1", 1], ["e3", 2]]);
});
