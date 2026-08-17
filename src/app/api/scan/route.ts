import { NextResponse } from "next/server";
import { buildScanResult } from "@/lib/scanner";

export const runtime = "nodejs";

function normalizeUrl(raw: string): string | null {
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (typeof body.url !== "string" || body.url.trim() === "") {
    return NextResponse.json({ error: "Debe indicar una URL" }, { status: 400 });
  }

  const url = normalizeUrl(body.url.trim());
  if (!url) {
    return NextResponse.json({ error: "URL no válida" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "RastroBot/1.0 (+https://rastro.cl)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);

    const html = await response.text();
    const setCookie = response.headers.getSetCookie?.() ?? [];
    const result = buildScanResult(url, html, setCookie);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "No se pudo acceder al sitio indicado" },
      { status: 502 },
    );
  }
}
