import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { runConnector } from "@/lib/connectors/runner";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const deny = await requireUser();
  if (deny) return deny;
  const { name } = await ctx.params;
  return NextResponse.json(await runConnector(decodeURIComponent(name)));
}
