// Polite fetch helpers: timeout via AbortController, one retry-free JSON GET.
export const DEFAULT_TIMEOUT_MS = 20_000;

export function timeoutFetch(base: typeof fetch = fetch, ms = DEFAULT_TIMEOUT_MS): typeof fetch {
  return async (input, init) => {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), ms);
    try {
      return await base(input, { ...init, signal: ac.signal });
    } finally {
      clearTimeout(t);
    }
  };
}

export async function getJson<T = unknown>(
  f: typeof fetch,
  url: string,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await f(url, { headers: { Accept: "application/json", "User-Agent": "eb1a-tracker (local)", ...headers } });
  if (!res.ok) {
    // Surface the API's own explanation (rate limit, validation) when it sends one.
    let detail = "";
    try {
      const j = (await res.json()) as { message?: string };
      if (j?.message) detail = `: ${String(j.message).slice(0, 160)}`;
    } catch {}
    throw new Error(`HTTP ${res.status} for ${new URL(url).host}${detail}`);
  }
  return (await res.json()) as T;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Throttle wait via ctx.pause when present (budget-aware); false means out of time, so stop. */
export async function pauseFor(ctx: { pause?: (ms: number) => Promise<boolean> }, ms: number): Promise<boolean> {
  if (ctx.pause) return ctx.pause(ms);
  await sleep(ms);
  return true;
}

/** Lowercase tag-in-text match used for field scoping. */
export function matchesScope(text: string, tags: string[]): boolean {
  const t = text.toLowerCase();
  return tags.some((tag) => t.includes(tag.toLowerCase()));
}

/** Keywords for scope matching: tags plus common data-field terms. */
export const SCOPE_KEYWORDS = ["data", "analytics", "big data", "ai", "machine learning", "ml", "database", "cloud"];
export function scopeTerms(tags: string[]): string[] {
  return [...new Set([...tags.map((t) => t.toLowerCase()), ...SCOPE_KEYWORDS])];
}
/** Word-ish match so "ai" does not match "email". */
export function matchesTerms(text: string, terms: string[]): boolean {
  const t = text.toLowerCase();
  return terms.some((term) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(t));
}
