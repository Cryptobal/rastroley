# Arquitectura Rastro (Fase 0)

## Stack
- Next.js 15 App Router + TypeScript + Tailwind (marketing, panel futuro, API)
- Prisma + Prisma Postgres (Neon-compatible; instancia creada vía Prisma Postgres)
- Widget vanilla JS en `/widget`, build a `/public/w/rastro@VERSION.js` (CDN inmutable)
- Auth.js v5 y Flow: stubs en schema; implementación en Fase 2

## Evidencia de consentimiento
`ConsentLog`: siteKey, timestamp, decisión, versión de banner, IP truncada+hasheada, UA.
Retención documentada en `RetentionPolicy` / `CONSENT_RETENTION_DAYS`.

## Fail-safe
El widget es fail-open: errores de config/API no rompen el sitio del cliente.

## Disclaimers
En sitio, API e informes: no es asesoría legal, no garantiza cumplimiento, sin montos de multa.

## Dominio
`rastro.cl` ocupado. Candidatos: `rastrochile.cl`, `rastropro.cl`.
