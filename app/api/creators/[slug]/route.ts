// GET /api/creators/[slug] — página pública (sin sesión; solo datos públicos)
import { NextResponse } from "next/server";
import { getCreatorPageBySlug } from "@/app/services/db/creatorPages";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  try {
    const { slug } = await ctx.params;
    const page = getCreatorPageBySlug(decodeURIComponent(slug));
    if (!page) return NextResponse.json({ ok: false, reason: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, page });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
