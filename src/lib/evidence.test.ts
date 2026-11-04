import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ev-"));
process.env.EVIDENCE_DIR = tmp;

const ev = await import("./evidence");

const file = (name: string, size = 5) => new File([new Uint8Array(size)], name);

function mockClient() {
  const store = new Map<string, Buffer>();
  const api = {
    upload: vi.fn(async (k: string, d: Buffer) => (store.set(k, d), { error: null })),
    remove: vi.fn(async (ks: string[]) => (ks.forEach((k) => store.delete(k)), { error: null })),
    download: vi.fn(async (k: string) => (store.has(k) ? { data: new Blob([new Uint8Array(store.get(k)!)]), error: null } : { data: null, error: { message: "nf" } })),
    createSignedUrl: vi.fn(async (k: string) => ({ data: { signedUrl: `https://sb.test/sign/${k}?t=1` }, error: null })),
  };
  const from = vi.fn(() => api);
  return { client: { storage: { from } } as never, api, from, store };
}

const clear = () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_EVIDENCE_BUCKET;
  ev.__setSupabaseClient(null);
};
beforeEach(clear);
afterEach(clear);

describe("keys", () => {
  it("sanitizes names and prefixes subdir + random id", () => {
    expect(ev.safeName("../../etc/pass wd?.pdf")).toBe("pass_wd_.pdf");
    expect(ev.safeName("...")).toBe("file");
    expect(ev.makeKey("p1", "a b.pdf")).toMatch(/^p1\/[0-9a-f]{8}-a_b\.pdf$/);
    expect(ev.makeKey("../x", "f.txt").startsWith("x/")).toBe(true);
  });
  it("rejects traversal and malformed keys", () => {
    for (const k of ["../a", "a/../../b", "/abs", "a//b", "a\\b", "a/./b", "", "a\0b"]) expect(() => ev.assertSafeKey(k)).toThrow();
    expect(() => ev.resolveEvidencePath("../outside")).toThrow();
    expect(ev.assertSafeKey("p/ab12-x.pdf")).toBe("p/ab12-x.pdf");
  });
  it("serves only safe types inline", () => {
    expect(ev.isInline("a.pdf")).toBe(true);
    expect(ev.isInline("a.svg")).toBe(false);
    expect(ev.isInline("a.html")).toBe(false);
  });
});

describe("driver selection + local driver", () => {
  it("is local without both env vars", () => {
    expect(ev.isHosted()).toBe(false);
    process.env.SUPABASE_URL = "https://x.supabase.co";
    expect(ev.isHosted()).toBe(false);
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    expect(ev.isHosted()).toBe(true);
    expect(ev.maxUploadBytes()).toBe(ev.MAX_HOSTED_BYTES);
  });
  it("saves, reads, serves, deletes locally", async () => {
    const key = await ev.saveEvidenceFile(file("a.pdf"), "p1");
    expect(fs.existsSync(path.join(tmp, key))).toBe(true);
    expect((await ev.readEvidenceFile(key))?.length).toBe(5);
    expect(await ev.readEvidenceFile(key, 2)).toBeNull();
    const r = await ev.serveEvidence(key);
    expect(r.kind).toBe("buffer");
    await ev.deleteEvidenceFile(key);
    expect(await ev.readEvidenceFile(key)).toBeNull();
    await expect(ev.deleteEvidenceFile("../x")).rejects.toThrow();
    expect(await ev.readEvidenceFile("../../etc/passwd")).toBeNull();
  });
  it("enforces local size limit", async () => {
    await expect(ev.saveEvidenceFile(file("big.bin", ev.MAX_LOCAL_BYTES + 1))).rejects.toThrow(/too large/);
  });
});

describe("supabase driver (mocked)", () => {
  it("uploads to the configured private bucket", async () => {
    process.env.SUPABASE_URL = "https://x.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    process.env.SUPABASE_EVIDENCE_BUCKET = "ev2";
    const m = mockClient();
    ev.__setSupabaseClient(m.client);
    const key = await ev.saveEvidenceFile(file("a.pdf"), "p1");
    expect(m.from).toHaveBeenCalledWith("ev2");
    expect(m.api.upload).toHaveBeenCalledWith(key, expect.any(Buffer), { contentType: "application/pdf", upsert: false });
    expect((await ev.readEvidenceFile(key))?.length).toBe(5);
    expect(fs.existsSync(path.join(tmp, key))).toBe(false);
    await ev.deleteEvidenceFile(key);
    expect(m.api.remove).toHaveBeenCalledWith([key]);
  });
  it("defaults bucket to 'evidence'", async () => {
    process.env.SUPABASE_URL = "u";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    const m = mockClient();
    ev.__setSupabaseClient(m.client);
    await ev.saveEvidenceFile(file("a.txt"));
    expect(m.from).toHaveBeenCalledWith("evidence");
  });
  it("enforces the 4MB hosted limit before touching storage", async () => {
    process.env.SUPABASE_URL = "u";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    const m = mockClient();
    ev.__setSupabaseClient(m.client);
    await expect(ev.saveEvidenceFile(file("a.pdf", ev.MAX_HOSTED_BYTES + 1))).rejects.toThrow(/max 4MB/);
    expect(m.api.upload).not.toHaveBeenCalled();
  });
  it("signs 60s URLs; forces download for non-inline types; rejects bad keys", async () => {
    process.env.SUPABASE_URL = "u";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    const m = mockClient();
    ev.__setSupabaseClient(m.client);
    const r = await ev.serveEvidence("p/ab-a.pdf");
    expect(r).toEqual({ kind: "redirect", url: "https://sb.test/sign/p/ab-a.pdf?t=1" });
    expect(m.api.createSignedUrl).toHaveBeenCalledWith("p/ab-a.pdf", 60, undefined);
    await ev.serveEvidence("p/ab-a.svg");
    expect(m.api.createSignedUrl).toHaveBeenLastCalledWith("p/ab-a.svg", 60, { download: "ab-a.svg" });
    await expect(ev.serveEvidence("../x")).rejects.toThrow();
  });
  it("surfaces upload errors", async () => {
    process.env.SUPABASE_URL = "u";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "k";
    const m = mockClient();
    m.api.upload.mockResolvedValueOnce({ error: { message: "boom" } } as never);
    ev.__setSupabaseClient(m.client);
    await expect(ev.saveEvidenceFile(file("a.pdf"))).rejects.toThrow(/boom/);
  });
});
