import assert from "node:assert/strict";
import test from "node:test";
import { buildDaySchedule } from "./schedule.js";

const a = { id: "a", day: "2026-09-18", order_index: 0, created_at: "a", category: "food", estimated_duration_minutes: 60 };
const b = { id: "b", day: "2026-09-18", order_index: 1, created_at: "b", category: "attraction", estimated_duration_minutes: 90 };
const c = { id: "c", day: "2026-09-18", order_index: 2, created_at: "c", category: "other", estimated_duration_minutes: 30 };

test("travel and duration cascade through ordered stops", () => {
  const legs = [{ from_stop_id: "a", to_stop_id: "b", estimated_minutes: 20, travel_mode: "walking" }, { from_stop_id: "b", to_stop_id: "c", estimated_minutes: 10 }];
  const result = buildDaySchedule([c, a, b], legs, "09:00");
  assert.deepEqual(result.map((stop) => [stop.arrivalTime, stop.departureTime]), [["09:00", "10:00"], ["10:20", "11:50"], ["12:00", "12:30"]]);
  assert.equal(result[1].travelFromPrev.mode, "walking");
});

test("changing day start and a duration recalculates every later time", () => {
  const result = buildDaySchedule([{ ...a, estimated_duration_minutes: 120 }, b], [{ from_stop_id: "a", to_stop_id: "b", estimated_minutes: 15 }], "10:00");
  assert.equal(result[1].arrivalTime, "12:15");
  assert.equal(result[1].departureTime, "13:45");
});
