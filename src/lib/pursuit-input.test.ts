import { describe, expect, it } from "vitest";
import { parseBrand, parseIndependenceInput, parseProofs, suggestProofs } from "./pursuit-input";

describe("pursuit-input", () => {
  it("parseBrand clamps and treats blank as null", () => {
    expect(parseBrand("")).toBeNull();
    expect(parseBrand("abc")).toBeNull();
    expect(parseBrand("150")).toBe(100);
    expect(parseBrand("-5")).toBe(0);
    expect(parseBrand("42.6")).toBe(43);
    expect(parseBrand(null)).toBeNull();
  });
  it("independence defaults to mixed", () => {
    expect(parseIndependenceInput("independent")).toBe("independent");
    expect(parseIndependenceInput("bogus")).toBe("mixed");
  });
  it("parseProofs reads checkboxes", () => {
    const fd = new FormData();
    fd.set("completionProof", "on");
    expect(parseProofs(fd)).toEqual({ invitation: false, completion: true, thirdParty: false });
  });
  it("suggestProofs matches evidence", () => {
    expect(suggestProofs([{ label: "Invitation email", checklistItem: null }, { label: "x", checklistItem: "Agenda/program showing you presented" }])).toEqual({ invitation: true, completion: true, thirdParty: false });
    expect(suggestProofs([])).toEqual({ invitation: false, completion: false, thirdParty: false });
  });
});
