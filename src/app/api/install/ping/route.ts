import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  siteKey: z.string().min(8).max(64),
});

/** Ping de instalación del widget (verificación automática del panel). */
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const site = await prisma.site.findUnique({ where: { siteKey: parsed.data.siteKey } });
    if (!site) return NextResponse.json({ ok: true, verified: false });

    const now = new Date();
    await prisma.site.update({
      where: { id: site.id },
      data: {
        lastPingAt: now,
        installVerifiedAt: site.installVerifiedAt ?? now,
      },
    });
    return NextResponse.json({ ok: true, verified: true });
  } catch {
    return NextResponse.json({ ok: true, verified: false });
  }
}
