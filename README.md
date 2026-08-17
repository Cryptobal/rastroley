# Rastro

Aviso de cookies + escáner de píxeles para la Ley 21.719 (Chile).  
**Scan gratis. Se cobra el cartel** (con evidencia de consentimiento en el stack Pro).

Herramienta/IA. **No es asesoría legal.** **No garantiza cumplimiento.** **No es la Agencia** de Protección de Datos Personales. No cita montos de multa.

## Estado del repo (transición)

Hay **dos capas** conviviendo mientras migramos:

| Capa | Qué es | Cómo correr |
| --- | --- | --- |
| **Next.js 15** (objetivo) | App Router + Prisma + APIs TS + landing | `npm install && npm run dev` |
| **Vercel Python** (v0.4 actual) | `index.html` + `api/*.py` + Flow | `python3 server.py` → :8766 |

La arquitectura objetivo aprobada es Next.js + Prisma + widget vanilla CDN. El stack Python se mantiene operativo hasta completar Fases 1–2.

## Next.js (Fase 0+)

```bash
cp .env.example .env   # DATABASE_URL + opcionales Flow
npm install
npx prisma migrate dev
npm run db:seed
npm run widget:build
npm run dev
```

Scripts: `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`

## Vercel Python (v0.4)

Sitio estático + funciones Python (`api/*.py`). `vercel.json` fija `"framework": null` y `"outputDirectory": "public"` (Vercel Other publica `public/`, no el `index.html` de la raíz). La landing vive en `public/index.html` (+ `app.js`, `styles.css`, `widget/rastro.js`).

### Planes (CLP)

| Plan | Precio | Qué es |
| --- | --- | --- |
| Scan | $0 | POST `/api/scan` (también `/scan`). HTML + hasta 10 `script src`. Sin ejecutar JS. |
| Informe | $4.990 | Un pago. Informe HTML del scan. |
| Pro | $14.990 | **Pago del mes.** No es suscripción automática (aún). |

Pagos con [Flow](https://www.flow.cl). El webhook `/pay/confirm` solo marca pagado si `status` es 2.

### Local Python

```bash
cp .env.example .env
python3 server.py
```

Abre http://127.0.0.1:8766 — widget demo en `/widget/demo.html`.

### Variables Flow

| Variable | Uso |
| --- | --- |
| `FLOW_API_KEY` | API Key del comercio |
| `FLOW_SECRET_KEY` | Secret HMAC |
| `FLOW_API_URL` | `https://www.flow.cl/api` (sandbox: `https://sandbox.flow.cl/api`) |
| `RASTRO_PUBLIC_URL` | Origen público para callbacks |

## Widget

```html
<script src="{origen}/widget/rastro.js" data-api="{origen}" data-site-key="{SITE_KEY}"></script>
```

Sin `defer`/`async`, lo más arriba posible en `<head>`. Retiene trackers conocidos hasta aceptar; Consent Mode v2 + Meta; evidencia opcional vía `data-api`/`data-site-key`; botón para reabrir.

Build CDN (Next): `npm run widget:build` → `public/w/rastro@VERSION.js`.

## Dominio

`rastro.cl` ocupado. Candidatos: `rastrochile.cl`, `rastropro.cl`.

## Aviso

Rastro lo opera una IA. No es asesoría legal. No es la Agencia. El scan es una heurística sobre HTML y scripts bajados.
