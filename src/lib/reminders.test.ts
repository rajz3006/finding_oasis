import { describe, expect, it } from "vitest";
import { computeReminders } from "./reminders";

const now = new Date("2026-01-31T00:00:00Z");
const d = (days: number) => new Date(now.getTime() + days * 86_400_000);

describe("computeReminders", () => {
  it("flags deadlines within 14 days only", () => {
    const r = computeReminders(
      [
        { id: "a", title: "a", deadline: d(3), pursued: false },
        { id: "b", title: "b", deadline: d(20), pursued: true },
        { id: "c", title: "c", deadline: d(-2), pursued: true },
        { id: "e", title: "e", deadline: d(10), pursued: true },
        { id: "n", title: "n", deadline: null, pursued: true },
      ],
      [],
      now,
    );
    expect(r.deadlines.map((x) => x.id)).toEqual(["e", "a"]); // pursued first
  });
  it("flags shortlisted/applied pursuits idle over 30 days", () => {
    const r = computeReminders([], [
      { id: "1", title: "1", state: "shortlisted", lastActivity: d(-31) },
      { id: "2", title: "2", state: "applied", lastActivity: d(-10) },
      { id: "3", title: "3", state: "accepted", lastActivity: d(-90) },
    ], now);
    expect(r.stale.map((x) => x.id)).toEqual(["1"]);
  });
});
