import Link from "next/link";

export default function ArquitecturaPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          Rastro
        </Link>
      </p>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Arquitectura (Fase 0)</h1>
      <ul>
        <li>Next.js 15 App Router + TypeScript: sitio, panel futuro y API</li>
        <li>Prisma + Prisma Postgres</li>
        <li>Widget vanilla JS en CDN inmutable (`/w/rastro@0.4.0.js`)</li>
        <li>Auth.js v5 y Flow: schema listo; cobro en Fase 2</li>
        <li>Fail-open en el widget; minimización de IP en ConsentLog</li>
      </ul>
      <p className="disclaimer">
        Rastro no es asesoría legal, no garantiza cumplimiento y no cita montos de multa.
      </p>
      <p>
        Detalle en el repo: <code>docs/arquitectura.md</code>, <code>docs/seo-map.md</code>,{" "}
        <code>docs/retencion-consentimiento.md</code>.
      </p>
    </main>
  );
}
