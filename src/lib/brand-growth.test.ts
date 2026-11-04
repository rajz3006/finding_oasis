import { describe, expect, it } from "vitest";
import { engagementKpi, kpiProgress, sparklinePoints, summarizeChannel } from "./brand-growth";

const m = (d: string, followers: number, engagementRate = 0) => ({ date: new Date(d), followers, impressions: followers * 10, engagementRate, inboundCount: 1 });

describe("kpiProgress", () => {
  it("below / on_track / stretch", () => {
    expect(kpiProgress("x", 1000, 2000, 5000)).toMatchObject({ status: "below", pctOfHigh: 20, pctOfLow: 40 });
    expect(kpiProgress("x", 2000, 2000, 5000).status).toBe("on_track");
    expect(kpiProgress("x", 9000, 2000, 5000)).toMatchObject({ status: "stretch", pctOfHigh: 100 });
  });
});

describe("summarizeChannel", () => {
  it("uses latest vs previous regardless of input order", () => {
    const g = summarizeChannel({ id: "1", name: "LI", type: "linkedin" }, [m("2026-03-01", 900), m("2026-01-01", 500), m("2026-02-01", 700)]);
    expect(g.followers).toEqual({ value: 900, delta: 200 });
    expect(g.series).toEqual([500, 700, 900]);
    expect(g.kpi).toMatchObject({ low: 2000, high: 5000 });
  });
  it("single entry has null delta; unknown types have no KPI; empty is zeros", () => {
    expect(summarizeChannel({ id: "1", name: "s", type: "site" }, [m("2026-01-01", 5)])).toMatchObject({ followers: { value: 5, delta: null }, kpi: null });
    expect(summarizeChannel({ id: "1", name: "g", type: "github" }, []).followers).toEqual({ value: 0, delta: null });
  });
});

describe("sparklinePoints", () => {
  it("handles empty, constant and rising series", () => {
    expect(sparklinePoints([])).toBe("");
    expect(sparklinePoints([5, 5], 100, 20, 0)).toBe("0.0,10.0 100.0,10.0");
    expect(sparklinePoints([0, 10], 100, 20, 0)).toBe("0.0,20.0 100.0,0.0");
  });
});

describe("engagementKpi", () => {
  it("only for linkedin with data", () => {
    expect(engagementKpi([])).toBeNull();
    const g = summarizeChannel({ id: "1", name: "LI", type: "linkedin" }, [m("2026-01-01", 10, 3)]);
    expect(engagementKpi([g])).toMatchObject({ value: 3, status: "on_track" });
  });
});
