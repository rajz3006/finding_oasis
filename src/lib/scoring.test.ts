import { describe, expect, it } from "vitest";
import { scoreVenue } from "./scoring";

describe("scoreVenue", () => {
  it("matches seed venues by name, ignoring case/punctuation/parentheticals", () => {
    expect(scoreVenue({ name: "ieee access" })).toMatchObject({ qualityTier: "T2", matched: true, avoidFlag: false });
    expect(scoreVenue({ name: "IEEE Transactions on Knowledge and Data Engineering" }).qualityTier).toBe("T1");
  });
  it("matches by homepage host when unique", () => {
    expect(scoreVenue({ name: "Something else", homepage: "https://www.infoq.com/articles" }).qualityTier).toBe("T3");
  });
  it("does not match shared hosts loosely", () => {
    expect(scoreVenue({ name: "Random", homepage: "https://github.com/foo/bar" }).matched).toBe(false);
  });
  it("unmatched is unrated", () => {
    expect(scoreVenue({ name: "Journal of Nothing" })).toEqual({ qualityTier: "unrated", avoidFlag: false, matched: false });
  });
  it("flags avoid-list names and hosts", () => {
    expect(scoreVenue({ name: "Hacker Noon" }).avoidFlag).toBe(true);
    expect(scoreVenue({ name: "Applied Sciences", homepage: "https://www.mdpi.com/journal/applsci" }).avoidFlag).toBe(true);
    expect(scoreVenue({ name: "Predatory Open Access Review" }).avoidFlag).toBe(true);
  });
});
