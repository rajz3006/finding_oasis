import { NextResponse } from "next/server";
import { listSources } from "@/lib/data/sources";
import { sourceHealth } from "@/lib/connectors/runner";

export const dynamic = "force-dynamic";

export async function GET() {
  const sources = await listSources();
  return NextResponse.json(sources.map((s) => ({ id: s.id, name: s.name, access: s.access, lastRun: s.lastRun, ...sourceHealth(s) })));
}
