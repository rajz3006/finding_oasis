import { describe, expect, it } from "vitest";
import { isAllowedEmail, isPublicPath, resolveAuthMode, safeNext } from "./auth-core";

const full = { url: "https://x.supabase.co", anonKey: "k", allowedEmail: "Me@Example.com" };

describe("isAllowedEmail", () => {
  it("matches case-insensitively and trims", () => {
    expect(isAllowedEmail(" me@example.COM ", "Me@Example.com")).toBe(true);
  });
  it("rejects others and empties", () => {
    expect(isAllowedEmail("other@example.com", "me@example.com")).toBe(false);
    expect(isAllowedEmail("", "")).toBe(false);
    expect(isAllowedEmail(undefined, "me@example.com")).toBe(false);
    expect(isAllowedEmail("me@example.com", undefined)).toBe(false);
    expect(isAllowedEmail("me@example.com.evil.io", "me@example.com")).toBe(false);
  });
});

describe("resolveAuthMode", () => {
  it("enforces when all set, normalizing the email", () => {
    const m = resolveAuthMode({ NODE_ENV: "production", ...full });
    expect(m).toMatchObject({ mode: "enforce", config: { allowedEmail: "me@example.com" } });
  });
  it("fails closed in production when anything is missing", () => {
    expect(resolveAuthMode({ NODE_ENV: "production" })).toEqual({ mode: "misconfigured", missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "ALLOWED_EMAIL"] });
    expect(resolveAuthMode({ NODE_ENV: "production", ...full, allowedEmail: " " })).toMatchObject({ mode: "misconfigured", missing: ["ALLOWED_EMAIL"] });
  });
  it("opens only in dev with nothing configured", () => {
    expect(resolveAuthMode({ NODE_ENV: "development" })).toEqual({ mode: "open-dev" });
    expect(resolveAuthMode({ NODE_ENV: "development", url: "https://x" })).toMatchObject({ mode: "misconfigured" });
  });
});

describe("paths", () => {
  it("safeNext blocks open redirects", () => {
    expect(safeNext("/pipeline?a=1")).toBe("/pipeline?a=1");
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "", null, undefined]) expect(safeNext(bad)).toBe("/");
  });
  it("public paths are only login and callback", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/callback")).toBe(true);
    expect(isPublicPath("/api/sources")).toBe(false);
    expect(isPublicPath("/login/x")).toBe(false);
  });
});
