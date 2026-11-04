import { describe, expect, it } from "vitest";
import { bearerMatches } from "./cron-auth";
import { selectDue, SCHEDULE } from "./cron-schedule";

describe("bearerMatches", () => {
  it("accepts the exact secret", () => expect(bearerMatches("Bearer s3cret", "s3cret")).toBe(true));
  it("rejects wrong, malformed, missing, and unset-secret cases", () => {
    expect(bearerMatches("Bearer s3cre", "s3cret")).toBe(false);
    expect(bearerMatches("Bearer s3cret2", "s3cret")).toBe(false);
    expect(bearerMatches("s3cret", "s3cret")).toBe(false);
    expect(bearerMatches("bearer s3cret", "s3cret")).toBe(false);
    expect(bearerMatches(null, "s3cret")).toBe(false);
    expect(bearerMatches("Bearer ", "")).toBe(false);
    expect(bearerMatches("Bearer undefined", undefined)).toBe(false);
  });
});

const now = new Date("2026-11-04T07:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe("selectDue", () => {
  it("never-run sources come first", () => {
    expect(selectDue([{ name: "GitHub", lastRun: ago(5) }, { name: "arXiv", lastRun: null }], now)).toEqual(["arXiv", "GitHub"]);
  });
  it("respects cadence, with slack for cron drift", () => {
    const states = [
      { name: "GitHub", lastRun: ago(0.95) }, // daily, ran ~23h ago: due
      { name: "GDELT", lastRun: ago(6.95) }, // weekly: due via slack
      { name: "arXiv", lastRun: ago(3) }, // weekly: not due
      { name: "DOAJ", lastRun: ago(29) }, // monthly: not due
      { name: "NSF Awards", lastRun: ago(31) }, // monthly: due
    ];
    expect(selectDue(states, now).sort()).toEqual(["GDELT", "GitHub", "NSF Awards"]);
  });
  it("retries failed/partial sources the next day, ignores unscheduled sources", () => {
    const states = [
      { name: "arXiv", lastRun: ago(1), needsRetry: true },
      { name: "Crossref", lastRun: ago(1) },
      { name: "ORCID", lastRun: null },
    ];
    expect(selectDue(states, now)).toEqual(["arXiv"]);
  });
  it("orders by how overdue, then name", () => {
    const states = [{ name: "GitHub", lastRun: ago(2) }, { name: "OpenAlex", lastRun: ago(30) }, { name: "Google Alerts", lastRun: ago(2) }];
    expect(selectDue(states, now)).toEqual(["OpenAlex", "GitHub", "Google Alerts"]);
  });
  it("every schedule entry has a valid cadence", () => {
    for (const c of Object.values(SCHEDULE)) expect(c.everyDays).toBeGreaterThan(0);
  });
});
