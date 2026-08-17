# Rastro

Aviso de cookies + escáner de píxeles para la Ley 21.719 (Chile).

App web construida con Next.js 16 (App Router), React 19, TypeScript y Tailwind CSS v4.

## Estructura

- `src/app/page.tsx` — UI del escáner (client component) y vista previa del cartel de cookies.
- `src/app/api/scan/route.ts` — endpoint `POST /api/scan` que descarga una URL y ejecuta el escáner.
- `src/lib/scanner.ts` — lógica pura de detección de rastreadores y cookies (testeable).
- `src/lib/banner.ts` — generación del texto/configuración del cartel de consentimiento.

## Comandos

Los scripts estándar están en `package.json`:

- `pnpm dev` — servidor de desarrollo (http://localhost:3000).
- `pnpm build` — build de producción.
- `pnpm lint` — ESLint.
- `pnpm test` — pruebas con Vitest (`pnpm test:watch` para modo watch).

## Cursor Cloud specific instructions

- Gestor de paquetes: **pnpm** (hay `pnpm-lock.yaml`). El entorno ya trae Node 22 y pnpm 10.
- El endpoint `/api/scan` hace un `fetch` saliente al sitio objetivo, por lo que probarlo requiere egress a Internet. Para una prueba end-to-end usar un sitio con rastreadores conocidos (p. ej. `https://www.mercadolibre.cl`), no un sitio "limpio", que devolverá `trackers: []`.
- `esbuild` (dependencia de Vitest) necesita ejecutar su script de post-install; ya está habilitado vía `pnpm.onlyBuiltDependencies` en `package.json`. Si se agregan dependencias con scripts de build, hay que añadirlas a esa lista (pnpm los bloquea por defecto de forma no interactiva).
- El build usa Turbopack por defecto (Next.js 16); no requiere configuración extra.
