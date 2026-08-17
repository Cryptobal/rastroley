"""Informe HTML a partir de un scan JSON. GET ?ejemplo=1 o POST {scan}."""

from __future__ import annotations

import html
import json
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qs

JSON_TYPE = "application/json; charset=utf-8"
HTML_TYPE = "text/html; charset=utf-8"
DISCLAIMER = (
    "Herramienta/IA. No es asesoría legal. "
    "No es la Agencia de Protección de Datos Personales."
)


def example_scan() -> dict[str, Any]:
    return {
        "ok": True,
        "url": "https://ejemplo.rastro.cl/",
        "requested_url": "https://ejemplo.rastro.cl/",
        "score": 67,
        "example": True,
        "trackers": [
            {
                "id": "gtm",
                "name": "Google Tag Manager",
                "penalty": 8,
                "hits": ["googletagmanager.com"],
                "sources": ["html"],
            },
            {
                "id": "meta",
                "name": "Meta Pixel (Facebook)",
                "penalty": 15,
                "hits": ["connect.facebook.net"],
                "sources": ["html"],
            },
            {
                "id": "hotjar",
                "name": "Hotjar",
                "penalty": 10,
                "hits": ["static.hotjar.com"],
                "sources": ["html"],
            },
        ],
        "tracker_count": 3,
        "banner_detected": False,
        "scripts_attempted": 3,
        "scripts_ok": 0,
        "scripts_limit": 10,
        "js_executed": False,
        "user_agent": "RastroBot/1.0 (+scan; Ley 21.719; no JS)",
        "disclaimer": DISCLAIMER,
        "notes": [
            "Informe de ejemplo. No corresponde a un sitio real.",
            DISCLAIMER,
        ],
    }


def render_informe(scan: dict[str, Any]) -> str:
    url = html.escape(str(scan.get("url") or scan.get("requested_url") or "—"))
    score = int(scan.get("score") if scan.get("score") is not None else 0)
    trackers = scan.get("trackers") or []
    if not isinstance(trackers, list):
        trackers = []
    when = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    rows = []
    for t in trackers:
        if not isinstance(t, dict):
            continue
        hits = ", ".join(html.escape(str(h)) for h in (t.get("hits") or [])[:6])
        rows.append(
            "<tr>"
            f"<td>{html.escape(str(t.get('name') or t.get('id') or ''))}</td>"
            f"<td>−{html.escape(str(t.get('penalty') or ''))}</td>"
            f"<td><code>{hits}</code></td>"
            "</tr>"
        )
    if not rows:
        rows.append("<tr><td colspan='3'>No se detectaron trackers conocidos en el HTML/scripts bajados.</td></tr>")
    notes = scan.get("notes") or []
    notes_html = "".join(f"<li>{html.escape(str(n))}</li>" for n in notes)
    banner = "Sí (indicio en HTML)" if scan.get("banner_detected") else "No evidente en el HTML estático"
    example_badge = "<p class='badge'>Ejemplo</p>" if scan.get("example") else ""
    return f"""<!doctype html>
<html lang="es-CL">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Informe Rastro — {url}</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{ font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; color: #14211c; background: #f4f1e8; }}
    header {{ background: #14211c; color: #eef6c9; padding: 1.4rem 1.2rem; }}
    main {{ max-width: 820px; margin: 0 auto; padding: 1.2rem; }}
    .score {{ font-size: 3rem; font-weight: 700; }}
    table {{ width: 100%; border-collapse: collapse; background: #fff; }}
    th, td {{ text-align: left; padding: .6rem .7rem; border-bottom: 1px solid #ddd; vertical-align: top; }}
    .disc {{ background: #fff3c4; padding: .9rem 1rem; border: 1px solid #e6d48a; }}
    .badge {{ display: inline-block; background: #e3f06a; color: #14211c; padding: .15rem .5rem; font-weight: 700; }}
    code {{ font-size: .85em; word-break: break-all; }}
    footer {{ padding: 1.2rem; font-size: .85rem; color: #44554c; }}
  </style>
</head>
<body>
  <header>
    <p>Rastro · Ley 21.719</p>
    <h1>Informe de píxeles</h1>
    {example_badge}
    <p>{url}</p>
    <p>{when}</p>
  </header>
  <main>
    <p class="disc"><strong>Aviso:</strong> {html.escape(DISCLAIMER)} El puntaje es una heurística estática (sin ejecutar JS) y no certifica cumplimiento.</p>
    <p class="score">{score}/100</p>
    <p>Trackers conocidos: {len(trackers)} · Aviso de cookies: {html.escape(banner)} · Scripts revisados: {html.escape(str(scan.get('scripts_ok') or 0))}/{html.escape(str(scan.get('scripts_limit') or 10))} · JS ejecutado: no</p>
    <h2>Hallazgos</h2>
    <table>
      <thead><tr><th>Servicio</th><th>Peso</th><th>Señales</th></tr></thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
    <h2>Notas</h2>
    <ul>{notes_html}</ul>
    <h2>Qué hacer con el cartel</h2>
    <p>El scan es gratis. El producto cobrado es el aviso (una línea, sin defer/async) y este informe. Pro es un <strong>pago del mes</strong>, no una suscripción que se renueva sola.</p>
    <pre>&lt;script src="ORIGIN/widget/rastro.js"&gt;&lt;/script&gt;</pre>
  </main>
  <footer>{html.escape(DISCLAIMER)}</footer>
</body>
</html>
"""


def _parse_body(raw: bytes) -> dict[str, Any]:
    text = (raw or b"").decode("utf-8", errors="replace").strip()
    if not text:
        return {}
    if text[0] in "{[":
        data = json.loads(text)
        return data if isinstance(data, dict) else {}
    qs = parse_qs(text, keep_blank_values=True)
    return {k: (v[0] if v else "") for k, v in qs.items()}


def handle_informe(method: str, query: dict[str, str], body: bytes) -> tuple[int, str, bytes]:
    method = (method or "GET").upper()
    if method == "OPTIONS":
        return 204, "text/plain", b""
    if method == "GET" and str(query.get("ejemplo") or query.get("example") or "") in {"1", "true", "si", "sí"}:
        html_out = render_informe(example_scan())
        return 200, HTML_TYPE, html_out.encode("utf-8")
    if method == "GET":
        msg = {
            "ok": False,
            "error": "GET /api/informe?ejemplo=1 o POST {\"scan\": {...}}.",
            "disclaimer": DISCLAIMER,
        }
        return 400, JSON_TYPE, json.dumps(msg, ensure_ascii=False).encode("utf-8")
    if method != "POST":
        return 405, JSON_TYPE, json.dumps({"ok": False, "error": "Método no permitido."}, ensure_ascii=False).encode("utf-8")
    try:
        data = _parse_body(body)
    except json.JSONDecodeError:
        return 400, JSON_TYPE, json.dumps({"ok": False, "error": "JSON inválido."}, ensure_ascii=False).encode("utf-8")
    scan = data.get("scan") if isinstance(data.get("scan"), dict) else data
    if not isinstance(scan, dict) or not scan:
        return 400, JSON_TYPE, json.dumps({"ok": False, "error": "Falta el objeto scan."}, ensure_ascii=False).encode("utf-8")
    return 200, HTML_TYPE, render_informe(scan).encode("utf-8")
