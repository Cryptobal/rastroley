"""Orquesta el scan HTTP y devuelve JSON."""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import parse_qs

from lib.rastro_engine import DISCLAIMER, scan_url

JSON_TYPE = "application/json; charset=utf-8"


def _parse_body(raw: bytes) -> dict[str, Any]:
    text = (raw or b"").decode("utf-8", errors="replace").strip()
    if not text:
        return {}
    if text[0] in "{[":
        data = json.loads(text)
        return data if isinstance(data, dict) else {}
    qs = parse_qs(text, keep_blank_values=True)
    return {k: (v[0] if v else "") for k, v in qs.items()}


def handle_scan(method: str, query: dict[str, str], body: bytes) -> tuple[int, str, bytes]:
    method = (method or "GET").upper()
    if method == "OPTIONS":
        return 204, "text/plain", b""
    if method != "POST":
        payload = {
            "ok": False,
            "error": "Usa POST con {\"url\": \"https://...\"}.",
            "disclaimer": DISCLAIMER,
        }
        return 405, JSON_TYPE, json.dumps(payload, ensure_ascii=False).encode("utf-8")
    try:
        data = _parse_body(body)
    except json.JSONDecodeError:
        err = {"ok": False, "error": "JSON inválido.", "disclaimer": DISCLAIMER}
        return 400, JSON_TYPE, json.dumps(err, ensure_ascii=False).encode("utf-8")
    url = str(data.get("url") or query.get("url") or "").strip()
    if not url:
        err = {"ok": False, "error": "Falta el campo url.", "disclaimer": DISCLAIMER}
        return 400, JSON_TYPE, json.dumps(err, ensure_ascii=False).encode("utf-8")
    try:
        result = scan_url(url)
    except ValueError as e:
        err = {"ok": False, "error": str(e), "disclaimer": DISCLAIMER}
        return 400, JSON_TYPE, json.dumps(err, ensure_ascii=False).encode("utf-8")
    except Exception:
        err = {
            "ok": False,
            "error": "No se pudo completar el scan.",
            "disclaimer": DISCLAIMER,
        }
        return 502, JSON_TYPE, json.dumps(err, ensure_ascii=False).encode("utf-8")
    return 200, JSON_TYPE, json.dumps(result, ensure_ascii=False).encode("utf-8")
