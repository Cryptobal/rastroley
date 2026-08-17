import { ScanForm } from "@/components/ScanForm";

const DISCLAIMER =
  "Rastro no es asesoría legal, no garantiza cumplimiento de la Ley 21.719 y no cita montos de multa.";

export default function HomePage() {
  return (
    <main>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.1rem 1.25rem",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "1.35rem",
            letterSpacing: "-0.02em",
          }}
        >
          Rastro
        </span>
        <nav style={{ display: "flex", gap: "1rem", fontSize: 14, fontWeight: 600 }}>
          <a href="#scanner">Scanner</a>
          <a href="#planes">Planes</a>
          <a href="/docs/arquitectura">Arquitectura</a>
        </nav>
      </header>

      <section
        style={{
          minHeight: "78vh",
          display: "grid",
          alignContent: "center",
          padding: "2rem 1.25rem 3rem",
          maxWidth: 1100,
          margin: "0 auto",
          position: "relative",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: "8% 0 auto auto",
            width: "min(520px, 48vw)",
            height: "min(420px, 55vh)",
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--sea) 55%, transparent), color-mix(in srgb, var(--sand) 70%, transparent))",
            clipPath: "polygon(18% 0, 100% 12%, 88% 100%, 0 78%)",
            opacity: 0.9,
            animation: "drift 12s ease-in-out infinite alternate",
          }}
        />
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3rem, 9vw, 5.5rem)",
            lineHeight: 0.95,
            margin: "0 0 1rem",
            letterSpacing: "-0.03em",
            position: "relative",
          }}
        >
          Rastro
        </p>
        <h1
          style={{
            fontSize: "clamp(1.25rem, 2.6vw, 1.75rem)",
            fontWeight: 600,
            maxWidth: 560,
            margin: "0 0 0.75rem",
            position: "relative",
          }}
        >
          Aviso de cookies y evidencia de consentimiento para la Ley 21.719 —
          pensado para dueños de tienda, no para abogados.
        </h1>
        <p style={{ maxWidth: 520, margin: "0 0 1.5rem", position: "relative" }}>
          Scanner gratis hoy. El producto Pro es el banner con log server-side: la ley
          fiscaliza evidencia operativa, no políticas bonitas.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", position: "relative" }}>
          <a
            href="#scanner"
            style={{
              background: "var(--ink)",
              color: "#f7f3ea",
              textDecoration: "none",
              padding: "0.9rem 1.2rem",
              fontWeight: 700,
            }}
          >
            Escanear mi sitio
          </a>
          <a
            href="#planes"
            style={{
              border: "1px solid color-mix(in srgb, var(--ink) 35%, transparent)",
              textDecoration: "none",
              padding: "0.9rem 1.2rem",
              fontWeight: 600,
            }}
          >
            Ver planes
          </a>
        </div>
        <p className="disclaimer" style={{ marginTop: "1.5rem", maxWidth: 560, position: "relative" }}>
          {DISCLAIMER}
        </p>
      </section>

      <ScanForm />

      <section id="planes" style={{ padding: "2rem 1.25rem 4rem", maxWidth: 880, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)" }}>
          Planes
        </h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
          <li style={{ borderTop: "1px solid var(--mist)", paddingTop: 16 }}>
            <strong>Informe</strong> — $4.990 one-shot · escaneo ampliado (Fase 3)
          </li>
          <li style={{ borderTop: "1px solid var(--mist)", paddingTop: 16 }}>
            <strong>Pro</strong> — $14.990/mes · banner + evidencia + export CSV
          </li>
          <li style={{ borderTop: "1px solid var(--mist)", paddingTop: 16 }}>
            <strong>Cumplimiento</strong> — ~$34.990/mes · suite (Fase 4)
          </li>
          <li style={{ borderTop: "1px solid var(--mist)", paddingTop: 16 }}>
            <strong>Agencia</strong> — multi-sitio, precio decreciente por sitio
          </li>
        </ul>
        <p className="disclaimer" style={{ marginTop: "1.25rem" }}>
          Cobro por Flow. Nunca marcamos pagado sin confirmación del webhook. {DISCLAIMER}
        </p>
      </section>

      <footer
        style={{
          borderTop: "1px solid var(--mist)",
          padding: "1.5rem 1.25rem 2.5rem",
          maxWidth: 880,
          margin: "0 auto",
        }}
      >
        <p className="disclaimer" style={{ margin: 0 }}>
          {DISCLAIMER} Dominio productivo pendiente (rastro.cl ocupado; candidatos:
          rastrochile.cl / rastropro.cl).
        </p>
      </footer>

      <style>{`
        @keyframes drift {
          from { transform: translate3d(0,0,0) rotate(0deg); }
          to { transform: translate3d(-18px, 12px, 0) rotate(-2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
