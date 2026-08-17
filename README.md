# Rastro

Aviso de cookies + escáner de píxeles para la Ley 21.719 (Chile). **Scan gratis. Se cobra el cartel.**

Herramienta/IA. **No es asesoría legal.** **No es la Agencia** de Protección de Datos Personales.

Esto es un sitio estático en Vercel con funciones Python (`api/*.py`). **No** es una app Python de un solo entrypoint: `vercel.json` fija `"framework": null` para que el CLI no pida un archivo Python principal.

## Planes (CLP)

| Plan | Precio | Qué es |
| --- | --- | --- |
| Scan | $0 | POST `/api/scan` (también `/scan`). HTML público + hasta 10 `script src`. User-Agent `RastroBot`. Sin ejecutar JS. JSON. |
| Informe | $4.990 | Un pago. Informe HTML del scan. |
| Pro | $14.990 | **Pago del mes.** No es suscripción automática ni cobro recurrente. |

Pagos con [Flow](https://www.flow.cl). El webhook `/pay/confirm` recibe `token`, llama `payment/getStatus` y **solo considera pagado si `status` es 2**. El retorno redirige a `/?pago=1&token=`.

## Correr en local

Solo stdlib de Python 3.10+ (sin `requirements.txt` en el deploy).

```bash
cp .env.example .env   # opcional; las claves Flow pueden ir vacías
python3 server.py
```

Abre [http://127.0.0.1:8766](http://127.0.0.1:8766).

- Scan: formulario en la landing, o `POST /api/scan` y `POST /scan` con `{"url":"https://…"}`.
- Informe de ejemplo: [http://127.0.0.1:8766/api/informe?ejemplo=1](http://127.0.0.1:8766/api/informe?ejemplo=1)
- Widget demo: [http://127.0.0.1:8766/widget/demo.html](http://127.0.0.1:8766/widget/demo.html)
- `server.py` está en `.vercelignore`: sirve para local, no se sube a Vercel.

## Variables de entorno (Vercel y `.env` local)

Copia `.env.example`. **Nunca** subas `.env`, claves Flow ni `orders.json`.

```
FLOW_API_KEY=
FLOW_SECRET_KEY=
FLOW_API_URL=https://www.flow.cl/api
RASTRO_PUBLIC_URL=
```

| Variable | Uso |
| --- | --- |
| `FLOW_API_KEY` | API Key del comercio Flow |
| `FLOW_SECRET_KEY` | Secret para firmar: ordenar params, concatenar `nombre+valor`, HMAC-SHA256 hex en `s` |
| `FLOW_API_URL` | Por defecto `https://www.flow.cl/api` (sandbox: `https://sandbox.flow.cl/api`) |
| `RASTRO_PUBLIC_URL` | Origen público (`https://tudominio.cl`) para `urlConfirmation` y `urlReturn` de Flow |

En Vercel: Project → Settings → Environment Variables. Sin `RASTRO_PUBLIC_URL`, se intenta `VERCEL_URL` o el header `Host`.

## Deploy en Vercel

1. Importa este repo. Framework: **Other** / ninguno (`framework: null`).
2. Configura las cuatro variables de arriba.
3. Output: estático en la raíz (`index.html`, `app.js`, `styles.css`, `widget/`) + serverless en `api/`.

Rutas (`vercel.json`):

- `POST /scan` → `/api/scan`
- `/pay/create|confirm|return|status` → `/api/pay/…`
- `/informe` → `/api/informe`
- `*.py`, `.env*`, `/lib` → 404
- `/widget/rastro.js` → CORS `*`, GET/HEAD/OPTIONS, cache 300, `nosniff`

## Widget

Una línea, **sin** `defer` ni `async`, lo más arriba posible en `<head>`:

```html
<script src="{origen}/widget/rastro.js"></script>
```

La landing copia el snippet con el **origen actual** (`location.origin`). Shadow DOM con Aceptar/Rechazar. Trackers conocidos se retienen hasta aceptar. Consentimiento: `localStorage.rastro_consent`.

## Scan (qué hace y qué no)

- GET del HTML público.
- Descarga hasta 10 `script src`.
- Detecta GTM, GA/gtag, Meta, TikTok, Hotjar, Clarity, LinkedIn, X, HubSpot, Intercom, Crisp, Zendesk, DoubleClick, YouTube, Cloudflare Insights.
- Puntaje desde 100. No ejecuta JavaScript. No es una auditoría legal ni un sello de la Agencia.

## Árbol relevante

```
api/scan.py api/informe.py api/pay/*.py   ← wrappers Vercel
lib/scan.py lib/rastro_engine.py
lib/flow_pay.py lib/informe.py
index.html app.js styles.css
widget/rastro.js widget/demo.html
vercel.json .env.example
server.py                                 ← solo local
```

## Aviso

Rastro lo opera una IA. No es asesoría legal. No es la Agencia. El scan es una heurística sobre HTML y scripts bajados.
