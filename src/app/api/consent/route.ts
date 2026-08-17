import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIpFromHeaders, hashTruncatedIp } from "@/lib/privacy";

export const runtime = "nodejs";

const bodySchema = z.object({
  siteKey: z.string().min(8).max(64),
  decision: z.enum(["ACCEPT_ALL", "REJECT_ALL", "CUSTOM"]),
  bannerVersion: z.string().min(1).max(32),
  categories: z
    .object({
      analytics: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
  userAgent: z.string().max(512).optional(),
});

/** Stub Fase 0: recibe evidencia; falla en silencio hacia el widget (fail-open). */
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "payload_invalid" }, { status: 400 });
    }

    const site = await prisma.site.findUnique({ where: { siteKey: parsed.data.siteKey } });
    if (!site) {
      // Fail-open: el widget del cliente no debe romperse si la key no existe aún.
      return NextResponse.json({ ok: true, recorded: false, reason: "unknown_site" });
    }

    const ip = clientIpFromHeaders(req.headers);
    await prisma.consentLog.create({
      data: {
        siteId: site.id,
        siteKey: site.siteKey,
        decision: parsed.data.decision,
        bannerVersion: parsed.data.bannerVersion,
        categoriesJson: parsed.data.categories
          ? JSON.stringify(parsed.data.categories)
          : null,
        ipHashTrunc: hashTruncatedIp(ip),
        userAgent: (parsed.data.userAgent || req.headers.get("user-agent") || "").slice(0, 512),
      },
    });

    return NextResponse.json({ ok: true, recorded: true });
  } catch {
    // Fail-open: nunca 5xx ruidoso que rompa el sitio del cliente vía CORS/fetch.
    return NextResponse.json({ ok: true, recorded: false, reason: "server_error" });
  }
}
