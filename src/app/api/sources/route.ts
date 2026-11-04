import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listSources } from "@/lib/data/sources";
import { sourceHealth } from "@/lib/connectors/runner";

export const dynamic = "force-dynamic";

export async function GET() {
  const deny = await requireUser();
  if (deny) return deny;
  const sources = await listSources();
  return NextResponse.json(sources.map((s) => ({ id: s.id, name: s.name, access: s.access, lastRun: s.lastRun, ...sourceHealth(s) })));
}
