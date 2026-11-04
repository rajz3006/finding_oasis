// Create the private evidence bucket (idempotent). Usage: npm run storage:setup
import { createClient } from "@supabase/supabase-js";

async function main() {
  try { process.loadEnvFile(".env"); } catch { /* no .env: use the shell environment */ }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const name = process.env.SUPABASE_EVIDENCE_BUCKET || "evidence";
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: buckets, error: listErr } = await sb.storage.listBuckets();
  if (listErr) throw listErr;
  const existing = buckets?.find((b) => b.name === name);
  if (existing) {
    if (existing.public) {
      const { error } = await sb.storage.updateBucket(name, { public: false });
      if (error) throw error;
      console.log(`Bucket "${name}" existed and was public; made private.`);
    } else console.log(`Bucket "${name}" already exists (private).`);
    return;
  }
  const { error } = await sb.storage.createBucket(name, { public: false, fileSizeLimit: 25 * 1024 * 1024 });
  // Tolerate a create race.
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  console.log(`Created private bucket "${name}".`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
