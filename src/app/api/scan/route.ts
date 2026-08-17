import { NextRequest, NextResponse } from "next/server";
import { freeScan, scanUrlSchema } from "@/lib/scan";

export const runtime = "nodejs";

const DISCLAIMER =
  "Rastro no es asesoría legal, no garantiza cumplimiento y no cita montos de multa.";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const parsed = scanUrlSchema.safeParse({ url });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "URL inválida", disclaimer: DISCLAIMER },
      { status: 400 },
    );
  }

  try {
    const result = await freeScan(parsed.data.url);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error: "No se pudo escanear esa URL. Revisa que sea pública y responda HTML.",
        disclaimer: DISCLAIMER,
      },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido", disclaimer: DISCLAIMER }, { status: 400 });
  }
  const parsed = scanUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "URL inválida", disclaimer: DISCLAIMER }, { status: 400 });
  }
  try {
    const result = await freeScan(parsed.data.url);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error: "No se pudo escanear esa URL. Revisa que sea pública y responda HTML.",
        disclaimer: DISCLAIMER,
      },
      { status: 502 },
    );
  }
}
