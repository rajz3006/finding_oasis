import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { runConnector } from "@/lib/connectors/runner";

import { DEFAULT_BUDGET_MS } from "@/lib/cron-dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const deny = await requireUser();
  if (deny) return deny;
  const { name } = await ctx.params;
  return NextResponse.json(await runConnector(decodeURIComponent(name), { deadline: Date.now() + DEFAULT_BUDGET_MS }));
}
