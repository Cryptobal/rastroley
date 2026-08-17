"use client";

import { useState } from "react";
import type { ScanResult } from "@/lib/scanner";
import { buildBannerConfig, renderBannerText } from "@/lib/banner";

const CATEGORY_STYLES: Record<string, string> = {
  analytics: "bg-blue-100 text-blue-800",
  marketing: "bg-purple-100 text-purple-800",
  functional: "bg-green-100 text-green-800",
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error inesperado");
      } else {
        setResult(data as ScanResult);
      }
    } catch {
      setError("Error de red al escanear");
    } finally {
      setLoading(false);
    }
  }

  const siteName = result ? new URL(result.url).hostname : "";
  const bannerText = result
    ? renderBannerText(buildBannerConfig(result, siteName))
    : "";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Rastro</h1>
        <p className="mt-2 text-gray-600">
          Escáner de cookies y píxeles para la Ley 21.719 (Chile). Scan gratis.
        </p>
      </header>

      <form onSubmit={handleScan} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ejemplo.cl"
          aria-label="URL del sitio a escanear"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={loading || url.trim() === ""}
          className="rounded-lg bg-black px-6 py-3 font-medium text-white disabled:opacity-40"
        >
          {loading ? "Escaneando…" : "Escanear gratis"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-red-50 px-4 py-3 text-red-700">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-10 space-y-8">
          <div>
            <h2 className="mb-3 text-xl font-semibold">
              Tecnologías detectadas ({result.trackers.length})
            </h2>
            {result.trackers.length === 0 ? (
              <p className="text-gray-600">
                No se detectaron rastreadores de terceros conocidos.
              </p>
            ) : (
              <ul className="space-y-2">
                {result.trackers.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${CATEGORY_STYLES[t.category]}`}
                    >
                      {t.category}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold">
              Cookies de la respuesta ({result.cookies.length})
            </h2>
            {result.cookies.length === 0 ? (
              <p className="text-gray-600">Sin cookies en las cabeceras HTTP.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.cookies.map((c) => (
                  <span
                    key={c.name}
                    className="rounded bg-gray-100 px-2 py-1 font-mono text-sm"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-xl font-semibold">Vista previa del cartel</h2>
            <div
              className={`rounded-xl border-2 p-5 ${
                result.requiresConsent
                  ? "border-amber-300 bg-amber-50"
                  : "border-green-300 bg-green-50"
              }`}
            >
              <p className="text-sm text-gray-800">{bannerText}</p>
              <div className="mt-4 flex gap-2">
                <button className="rounded bg-black px-4 py-2 text-sm text-white">
                  Aceptar
                </button>
                <button className="rounded border border-gray-400 px-4 py-2 text-sm">
                  Rechazar
                </button>
                <button className="rounded border border-gray-400 px-4 py-2 text-sm">
                  Configurar
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {result.requiresConsent
                ? "Este sitio requiere consentimiento previo. Se cobra el cartel."
                : "No se detectaron finalidades que requieran consentimiento."}
            </p>
          </div>
        </section>
      )}

      <footer className="mt-16 text-center text-xs text-gray-400">
        No es asesoría legal. Lo opera una IA. No es la Agencia.
      </footer>
    </main>
  );
}
