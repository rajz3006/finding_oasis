// Hosted (Supabase) uploads are capped at 4MB (Vercel body limit 4.5MB); local dev allows 25MB.
const hosted = !!((process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ["@prisma/client"],
  experimental: { serverActions: { bodySizeLimit: hosted ? "4.4mb" : "26mb" } },
};
