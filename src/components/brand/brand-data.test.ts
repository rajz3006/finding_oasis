import { describe, expect, it } from "vitest";
import { deltas, pillarBalance, sparkPoints } from "./brand-data";

const pt = (followers: number, engagementRate = 1) => ({ date: new Date(), followers, impressions: 0, engagementRate, inboundCount: 0 });

describe("brand-data", () => {
  it("computes latest-vs-previous deltas", () => {
    expect(deltas([pt(10)])).toBeNull();
    expect(deltas([pt(10, 1), pt(25, 2.5)])).toMatchObject({ followers: 15, engagementRate: 1.5 });
  });
  it("sparkline needs 2 points", () => {
    expect(sparkPoints([1])).toBe("");
    expect(sparkPoints([1, 2, 3]).split(" ")).toHaveLength(3);
  });
  it("pillar balance reports missing buckets", () => {
    expect(pillarBalance(["Data architecture craft"]).missing).toContain("Opinion");
  });
});
