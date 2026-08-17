# Rastro

Aviso de cookies + escáner de píxeles para la Ley 21.719 (Chile).  
Scan gratis. Se cobra el cartel con evidencia de consentimiento.

**No es asesoría legal. No garantiza cumplimiento. No cita montos de multa.**

## Stack (Fase 0)
- Next.js 15 App Router + TypeScript
- Prisma + Prisma Postgres
- Widget vanilla JS (`widget/rastro.js` → `public/w/`)

## Desarrollo

```bash
cp .env.example .env   # configurar DATABASE_URL
npm install
npx prisma migrate dev
npm run db:seed
npm run widget:build
npm run dev
```

Scripts útiles: `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`

## Dominio
`rastro.cl` está ocupado. Candidatos: `rastrochile.cl`, `rastropro.cl`.
