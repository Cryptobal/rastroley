"""Pagos Flow.cl: HMAC-SHA256, create / confirm / return / status.

Pro es un pago del mes (un shot), no una suscripción recurrente.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any

JSON_TYPE = "application/json; charset=utf-8"
DISCLAIMER = (
    "Herramienta/IA. No es asesoría legal. "
    "No es la Agencia de Protección de Datos Personales."
)

PLANS: dict[str, dict[str, Any]] = {
    "informe": {
        "id": "informe",
        "amount": 4990,
        "subject": "Rastro Informe (un pago)",
        "label": "Informe",
    },
    "pro": {
        "id": "pro",
        "amount": 14990,
        "subject": "Rastro Pro (pago del mes)",
        "label": "Pro — pago del mes",
    },
}

FLOW_PAID_STATUS = 2


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def flow_api_url() -> str:
    return _env("FLOW_API_URL", "https://www.flow.cl/api").rstrip("/")


def flow_keys() -> tuple[str, str]:
    return _env("FLOW_API_KEY"), _env("FLOW_SECRET_KEY")


def sign_params(params: dict[str, Any], secret: str) -> str:
    """Firma Flow: ordenar claves, concatenar name+value, HMAC-SHA256 hex en s."""
    parts: list[str] = []
    for key in sorted(params.keys()):
        if key == "s":
            continue
        parts.append(f"{key}{params[key]}")
    to_sign = "".join(parts)
    return hmac.new(
        secret.encode("utf-8"),
        to_sign.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def public_base(headers: dict[str, str] | None = None) -> str:
    explicit = _env("RASTRO_PUBLIC_URL").rstrip("/")
    if explicit:
        return explicit
    headers = {str(k).lower(): str(v) for k, v in (headers or {}).items()}
    host = headers.get("x-forwarded-host") or headers.get("host") or ""
    proto = headers.get("x-forwarded-proto") or ""
    if host:
        if not proto:
            proto = "https" if "vercel" in host or host.endswith(".cl") else "http"
        return f"{proto}://{host.split(',')[0].strip()}".rstrip("/")
    vercel = _env("VERCEL_URL")
    if vercel:
        return f"https://{vercel}"
    return "http://127.0.0.1:8766"


def _parse_body(raw: bytes) -> dict[str, Any]:
    text = (raw or b"").decode("utf-8", errors="replace").strip()
    if not text:
        return {}
    if text[0] in "{[":
        data = json.loads(text)
        return data if isinstance(data, dict) else {}
    qs = urllib.parse.parse_qs(text, keep_blank_values=True)
    return {k: (v[0] if v else "") for k, v in qs.items()}


def _json(status: int, payload: dict) -> tuple[int, str, bytes]:
    payload.setdefault("disclaimer", DISCLAIMER)
    return status, JSON_TYPE, json.dumps(payload, ensure_ascii=False).encode("utf-8")


def _flow_request(method: str, path: str, params: dict[str, Any]) -> dict[str, Any]:
    api_key, secret = flow_keys()
    if not api_key or not secret:
        raise RuntimeError(
            "Faltan FLOW_API_KEY y FLOW_SECRET_KEY. Configúralas en Vercel o en .env."
        )
    body = {k: str(v) for k, v in params.items() if v is not None and k != "s"}
    body["apiKey"] = api_key
    body["s"] = sign_params(body, secret)
    url = f"{flow_api_url()}{path}"
    ctx = ssl.create_default_context()
    if method == "GET":
        req = urllib.request.Request(
            url + "?" + urllib.parse.urlencode(body),
            method="GET",
            headers={"User-Agent": "RastroBot/1.0"},
        )
    else:
        req = urllib.request.Request(
            url,
            data=urllib.parse.urlencode(body).encode("utf-8"),
            method="POST",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "RastroBot/1.0",
            },
        )
    try:
        with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            parsed = {"message": raw or str(e)}
        raise RuntimeError(parsed.get("message") or parsed.get("info") or f"Flow HTTP {e.code}") from e
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError as e:
        raise RuntimeError("Flow devolvió una respuesta no JSON.") from e


def get_status(token: str) -> dict[str, Any]:
    return _flow_request("GET", "/payment/getStatus", {"token": token})


def is_paid(status_payload: dict[str, Any]) -> bool:
    try:
        return int(status_payload.get("status") or 0) == FLOW_PAID_STATUS
    except (TypeError, ValueError):
        return False


def handle_create(method: str, query: dict[str, str], body: bytes, headers: dict[str, str]) -> tuple[int, str, bytes]:
    method = method.upper()
    if method == "OPTIONS":
        return 204, "text/plain", b""
    if method != "POST":
        return _json(405, {"ok": False, "error": "Usa POST."})
    try:
        data = _parse_body(body)
    except json.JSONDecodeError:
        return _json(400, {"ok": False, "error": "JSON inválido."})
    plan_id = str(data.get("plan") or query.get("plan") or "").strip().lower()
    email = str(data.get("email") or query.get("email") or "").strip()
    plan = PLANS.get(plan_id)
    if not plan:
        return _json(400, {"ok": False, "error": "Plan inválido. Usa informe o pro."})
    if "@" not in email or "." not in email.split("@")[-1]:
        return _json(400, {"ok": False, "error": "Indica un email válido para Flow."})
    base = public_base(headers)
    commerce = f"rastro-{plan_id}-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    optional = {
        "plan": plan_id,
        "kind": "pago_del_mes" if plan_id == "pro" else "one_shot",
        "recurring": False,
    }
    try:
        created = _flow_request(
            "POST",
            "/payment/create",
            {
                "commerceOrder": commerce,
                "subject": plan["subject"],
                "currency": "CLP",
                "amount": plan["amount"],
                "email": email,
                "urlConfirmation": f"{base}/pay/confirm",
                "urlReturn": f"{base}/pay/return",
                "optional": json.dumps(optional, ensure_ascii=False),
            },
        )
    except RuntimeError as e:
        return _json(503, {"ok": False, "error": str(e)})
    token = created.get("token") or ""
    pay_url = created.get("url") or ""
    if token and pay_url and "token=" not in pay_url:
        pay_url = f"{pay_url}?token={urllib.parse.quote(token)}"
    if not pay_url or not token:
        return _json(502, {"ok": False, "error": "Flow no devolvió url/token.", "raw": created})
    return _json(
        200,
        {
            "ok": True,
            "url": pay_url,
            "token": token,
            "flowOrder": created.get("flowOrder"),
            "plan": plan_id,
            "amount": plan["amount"],
            "subject": plan["subject"],
            "recurring": False,
        },
    )


def handle_confirm(method: str, query: dict[str, str], body: bytes, headers: dict[str, str]) -> tuple[int, str, bytes]:
    """Webhook de Flow: token → getStatus. Pagado solo si status == 2."""
    method = method.upper()
    if method == "OPTIONS":
        return 204, "text/plain", b""
    token = ""
    try:
        data = _parse_body(body)
        token = str(data.get("token") or "")
    except json.JSONDecodeError:
        token = ""
    token = token or query.get("token") or ""
    if not token:
        return _json(400, {"ok": False, "error": "Falta token."})
    try:
        st = get_status(token)
    except RuntimeError as e:
        return _json(502, {"ok": False, "error": str(e)})
    paid = is_paid(st)
    return _json(
        200,
        {
            "ok": True,
            "paid": paid,
            "status": st.get("status"),
            "commerceOrder": st.get("commerceOrder"),
            "received": True,
        },
    )


def handle_return(method: str, query: dict[str, str], body: bytes, headers: dict[str, str]) -> tuple[int, str, bytes]:
    token = query.get("token") or ""
    if not token:
        try:
            token = str(_parse_body(body).get("token") or "")
        except json.JSONDecodeError:
            token = ""
    loc = "/?pago=1"
    if token:
        loc += "&token=" + urllib.parse.quote(token)
    html = (
        "<!doctype html><meta charset='utf-8'><title>Rastro</title>"
        f"<meta http-equiv='refresh' content='0;url={loc}'>"
        f"<p>Volviendo a Rastro… <a href='{loc}'>continuar</a></p>"
    )
    return 302, f"text/html; charset=utf-8; location={loc}", html.encode("utf-8")


def handle_status(method: str, query: dict[str, str], body: bytes, headers: dict[str, str]) -> tuple[int, str, bytes]:
    method = method.upper()
    if method == "OPTIONS":
        return 204, "text/plain", b""
    token = query.get("token") or ""
    if not token and method == "POST":
        try:
            token = str(_parse_body(body).get("token") or "")
        except json.JSONDecodeError:
            token = ""
    if not token:
        return _json(400, {"ok": False, "error": "Falta token."})
    try:
        st = get_status(token)
    except RuntimeError as e:
        return _json(502, {"ok": False, "error": str(e)})
    paid = is_paid(st)
    return _json(
        200,
        {
            "ok": True,
            "paid": paid,
            "status": st.get("status"),
            "commerceOrder": st.get("commerceOrder"),
            "subject": st.get("subject"),
            "amount": st.get("amount"),
            "payer": (st.get("payer") or {}).get("email") if isinstance(st.get("payer"), dict) else None,
        },
    )


def location_from_content_type(content_type: str) -> str | None:
    if "; location=" in content_type:
        return content_type.split("; location=", 1)[1]
    return None
