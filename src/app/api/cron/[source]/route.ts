import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/cron-auth";
import { SCHEDULE } from "@/lib/cron-schedule";
import { dispatchDue, DEFAULT_BUDGET_MS } from "@/lib/cron-dispatch";
import { runConnector } from "@/lib/connectors/runner";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Hobby limit. Pro can raise this (up to 300s, or more with Fluid Compute); also raise DEFAULT_BUDGET_MS.
export const maxDuration = 60;

// /api/cron/dispatch runs whatever is due; /api/cron/<Source name> runs one source (per-source schedules on Pro).
// Bearer auth here; the middleware matcher skips /api/cron/*.
export async function GET(req: Request, ctx: { params: Promise<{ source: string }> }) {
  if (!bearerMatches(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const source = decodeURIComponent((await ctx.params).source);
  if (source === "dispatch") return NextResponse.json(await dispatchDue());
  if (!(source in SCHEDULE)) return NextResponse.json({ error: "unknown source" }, { status: 404 });
  await ensureSeeded();
  return NextResponse.json(await runConnector(source, { deadline: Date.now() + DEFAULT_BUDGET_MS }));
}
