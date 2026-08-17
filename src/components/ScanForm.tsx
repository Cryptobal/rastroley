"use client";

import { FormEvent, useState } from "react";

type Finding = { id: string; label: string; scripts: string[] };
type ScanResult = {
  url: string;
  scannedAt: string;
  scripts: string[];
  findings: Finding[];
  note: string;
  disclaimer: string;
  error?: string;
};

export function ScanForm() {
  const [url, setUrl] = useState("https://");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as ScanResult & { error?: string };
      if (!res.ok) {
        setError(data.error || "No se pudo escanear");
      } else {
        setResult(data);
      }
    } catch {
      setError("Error de red al escanear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="scanner" style={{ padding: "4rem 1.25rem 5rem", maxWidth: 880, margin: "0 auto" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
          margin: "0 0 0.5rem",
        }}
      >
        Scanner gratis
      </h2>
      <p style={{ marginTop: 0, marginBottom: "1.25rem", maxWidth: 540 }}>
        Pegá la URL de tu tienda. Revisamos el HTML y los <code>script src</code> — sin ejecutar
        JavaScript.
      </p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tutienda.cl"
          aria-label="URL a escanear"
          style={{
            flex: "1 1 260px",
            padding: "0.85rem 1rem",
            border: "1px solid color-mix(in srgb, var(--ink) 25%, transparent)",
            background: "#fffdf8",
            font: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.85rem 1.2rem",
            border: 0,
            background: "var(--sea-deep)",
            color: "#f7f3ea",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "Escaneando…" : "Escanear"}
        </button>
      </form>
      {error ? (
        <p role="alert" style={{ color: "var(--alert)", marginTop: "1rem" }}>
          {error}
        </p>
      ) : null}
      {result ? (
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong>{result.findings.length}</strong> posibles trackers ·{" "}
            {result.scripts.length} scripts
          </p>
          {result.findings.length === 0 ? (
            <p>No detectamos proveedores conocidos en el HTML estático.</p>
          ) : (
            <ul style={{ paddingLeft: "1.1rem" }}>
              {result.findings.map((f) => (
                <li key={f.id} style={{ marginBottom: 8 }}>
                  <strong>{f.label}</strong>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>{f.scripts.join(", ")}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="disclaimer" style={{ marginTop: "1rem" }}>
            {result.note} {result.disclaimer}
          </p>
        </div>
      ) : null}
    </section>
  );
}
