import { describe, expect, it } from "vitest";
import { parseDate, parseIntArray, parseJson, parseStringArray, serializeIntArray, toIsoDate } from "./json";
import { safeName } from "./evidence";

describe("json helpers", () => {
  it("parses with fallback", () => {
    expect(parseJson("{bad", { a: 1 })).toEqual({ a: 1 });
    expect(parseStringArray('["a","b"]')).toEqual(["a", "b"]);
    expect(parseStringArray(null)).toEqual([]);
  });
  it("round-trips int arrays sorted and deduped", () => {
    expect(parseIntArray(serializeIntArray([6, 4, 6]))).toEqual([4, 6]);
  });
  it("handles dates", () => {
    expect(parseDate("nope")).toBeNull();
    expect(toIsoDate(parseDate("2026-11-04"))).toBe("2026-11-04");
  });
});

describe("safeName", () => {
  it("strips paths and unsafe chars", () => {
    expect(safeName("../../etc/passwd")).toBe("passwd");
    expect(safeName("my résumé (1).pdf")).toMatch(/^[\w.\-]+$/);
  });
});
