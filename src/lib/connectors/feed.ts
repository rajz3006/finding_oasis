// Tiny dependency-free Atom/RSS reader (regex based; fine for well-formed feeds).
export interface FeedEntry {
  title: string;
  link: string;
  id: string;
  summary: string;
  published: string;
}

const unesc = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? unesc(m[1]).replace(/\s+/g, " ").trim() : "";
};

export function parseFeed(xml: string): FeedEntry[] {
  const blocks = xml.match(/<(entry|item)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  return blocks.map((b) => {
    const href = b.match(/<link[^>]*?\shref="([^"]+)"[^>]*?(?:rel="alternate")?[^>]*\/?>/i)?.[1];
    return {
      title: tag(b, "title"),
      link: unesc(href ?? tag(b, "link")),
      id: tag(b, "id") || tag(b, "guid"),
      summary: tag(b, "summary") || tag(b, "description") || tag(b, "content"),
      published: tag(b, "published") || tag(b, "pubDate") || tag(b, "updated"),
    };
  });
}

export async function getText(f: typeof fetch, url: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await f(url, { headers: { "User-Agent": "eb1a-tracker (local)", ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${new URL(url).host}`);
  return res.text();
}
