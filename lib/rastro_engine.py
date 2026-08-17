"""Detección estática de píxeles/trackers. No ejecuta JavaScript."""

from __future__ import annotations

import html as html_lib
import ipaddress
import json
import re
import socket
import ssl
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Iterable

USER_AGENT = "RastroBot/1.0 (+scan; Ley 21.719; no JS)"
MAX_HTML_BYTES = 2_000_000
MAX_SCRIPT_BYTES = 500_000
MAX_SCRIPTS = 10
HTML_TIMEOUT = 12
SCRIPT_TIMEOUT = 6
DISCLAIMER = (
    "Herramienta/IA. No es asesoría legal. "
    "No es la Agencia de Protección de Datos Personales."
)

TRACKERS: list[dict] = [
    {
        "id": "gtm",
        "name": "Google Tag Manager",
        "penalty": 8,
        "patterns": [
            r"googletagmanager\.com",
            r"gtm\.js",
            r"\bGTM-[A-Z0-9]+\b",
        ],
    },
    {
        "id": "ga",
        "name": "Google Analytics / gtag",
        "penalty": 10,
        "patterns": [
            r"google-analytics\.com",
            r"googletagmanager\.com/gtag",
            r"gtag/js",
            r"\bga\('create'",
            r"\bG-[A-Z0-9]+\b",
            r"\bUA-\d+-\d+\b",
        ],
    },
    {
        "id": "meta",
        "name": "Meta Pixel (Facebook)",
        "penalty": 15,
        "patterns": [
            r"connect\.facebook\.net",
            r"fbevents\.js",
            r"facebook\.com/tr",
            r"fbq\s*\(",
        ],
    },
    {
        "id": "tiktok",
        "name": "TikTok Pixel",
        "penalty": 15,
        "patterns": [
            r"analytics\.tiktok\.com",
            r"tiktok-embed",
            r"\bttq\s*\.",
        ],
    },
    {
        "id": "hotjar",
        "name": "Hotjar",
        "penalty": 10,
        "patterns": [
            r"static\.hotjar\.com",
            r"hotjar\.com",
            r"\bhj\s*\(",
        ],
    },
    {
        "id": "clarity",
        "name": "Microsoft Clarity",
        "penalty": 10,
        "patterns": [
            r"clarity\.ms",
            r"clarity\.js",
        ],
    },
    {
        "id": "linkedin",
        "name": "LinkedIn Insight",
        "penalty": 8,
        "patterns": [
            r"snap\.licdn\.com",
            r"linkedin\.com/px",
            r"Insight\.min\.js",
            r"_linkedin_partner_id",
        ],
    },
    {
        "id": "x",
        "name": "X (Twitter) Pixel",
        "penalty": 8,
        "patterns": [
            r"static\.ads-twitter\.com",
            r"analytics\.twitter\.com",
            r"platform\.twitter\.com/oct\.js",
            r"\btwq\s*\(",
        ],
    },
    {
        "id": "hubspot",
        "name": "HubSpot",
        "penalty": 8,
        "patterns": [
            r"js\.hs-scripts\.com",
            r"js\.hs-analytics\.net",
            r"js\.hscollectedforms\.net",
            r"js\.hubspot\.com",
        ],
    },
    {
        "id": "intercom",
        "name": "Intercom",
        "penalty": 6,
        "patterns": [
            r"widget\.intercom\.io",
            r"js\.intercomcdn\.com",
            r"\bIntercom\s*\(",
        ],
    },
    {
        "id": "crisp",
        "name": "Crisp",
        "penalty": 6,
        "patterns": [
            r"client\.crisp\.chat",
            r"crisp\.chat",
        ],
    },
    {
        "id": "zendesk",
        "name": "Zendesk",
        "penalty": 6,
        "patterns": [
            r"static\.zdassets\.com",
            r"ekr\.zdassets\.com",
            r"zendesk\.com",
        ],
    },
    {
        "id": "doubleclick",
        "name": "DoubleClick / Ads",
        "penalty": 12,
        "patterns": [
            r"doubleclick\.net",
            r"googlesyndication\.com",
            r"googleadservices\.com",
        ],
    },
    {
        "id": "youtube",
        "name": "YouTube embed / API",
        "penalty": 5,
        "patterns": [
            r"youtube\.com/iframe_api",
            r"youtube\.com/embed",
            r"youtube-nocookie\.com",
            r"youtu\.be/",
        ],
    },
    {
        "id": "cloudflare_insights",
        "name": "Cloudflare Web Analytics / Insights",
        "penalty": 4,
        "patterns": [
            r"static\.cloudflareinsights\.com",
            r"cloudflareinsights",
            r"beacon\.min\.js",
        ],
    },
]

BANNER_HINTS = [
    r"cookiebot",
    r"onetrust",
    r"cookiefirst",
    r"iubenda",
    r"cookieyes",
    r"osano",
    r"didomi",
    r"quantcast",
    r"rastro_consent",
    r"widget/rastro\.js",
    r"aviso de cookies",
    r"aceptar cookies",
    r"gestionar cookies",
]

_COMPILED = [
    {**t, "rx": [re.compile(p, re.I) for p in t["patterns"]]} for t in TRACKERS
]
_BANNER_RX = [re.compile(p, re.I) for p in BANNER_HINTS]


class _ScriptSrcParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.srcs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "script":
            return
        ad = {k.lower(): v for k, v in attrs}
        src = ad.get("src")
        if src:
            self.srcs.append(src.strip())


def _is_private_host(host: str) -> bool:
    host = host.strip("[]").lower()
    if host in {"localhost", "0.0.0.0"}:
        return True
    try:
        ip = ipaddress.ip_address(host)
        return bool(
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        )
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(host, None)
    except OSError:
        return False
    for info in infos:
        ip_s = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_s)
        except ValueError:
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return True
    return False


def normalize_url(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        raise ValueError("Falta la URL.")
    if "://" not in raw:
        raw = "https://" + raw
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Solo se aceptan URLs http(s).")
    if not parsed.netloc:
        raise ValueError("URL inválida.")
    if _is_private_host(parsed.hostname or ""):
        raise ValueError("No se escanean hosts privados ni localhost.")
    return parsed.geturl()


class _GuardedRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        parsed = urllib.parse.urlparse(newurl)
        if parsed.scheme not in {"http", "https"} or _is_private_host(parsed.hostname or ""):
            raise ValueError("Redirección a un host no permitido.")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _opener() -> urllib.request.OpenerDirector:
    ctx = ssl.create_default_context()
    https = urllib.request.HTTPSHandler(context=ctx)
    return urllib.request.build_opener(https, _GuardedRedirect)


def fetch_bytes(url: str, timeout: float, limit: int) -> tuple[str, bytes, str]:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Esquema no permitido.")
    if _is_private_host(parsed.hostname or ""):
        raise ValueError("Host no permitido.")
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/javascript,text/javascript,text/plain,*/*;q=0.8",
            "Accept-Language": "es-CL,es;q=0.9,en;q=0.8",
        },
        method="GET",
    )
    opener = _opener()
    with opener.open(req, timeout=timeout) as resp:
        final = resp.geturl()
        final_p = urllib.parse.urlparse(final)
        if final_p.scheme not in {"http", "https"} or _is_private_host(final_p.hostname or ""):
            raise ValueError("Redirección a un host no permitido.")
        ctype = resp.headers.get("Content-Type") or ""
        chunks: list[bytes] = []
        total = 0
        while True:
            piece = resp.read(64_000)
            if not piece:
                break
            total += len(piece)
            if total > limit:
                chunks.append(piece[: max(0, limit - (total - len(piece)))])
                break
            chunks.append(piece)
        return final, b"".join(chunks), ctype


def extract_script_srcs(html: str, base: str) -> list[str]:
    parser = _ScriptSrcParser()
    try:
        parser.feed(html)
        parser.close()
    except Exception:
        parser.srcs = re.findall(
            r"<script[^>]+src=['\"]([^'\"]+)['\"]", html, flags=re.I
        )
    out: list[str] = []
    seen: set[str] = set()
    for src in parser.srcs:
        abs_url = urllib.parse.urljoin(base, html_lib.unescape(src))
        if abs_url in seen:
            continue
        seen.add(abs_url)
        p = urllib.parse.urlparse(abs_url)
        if p.scheme in {"http", "https"}:
            out.append(abs_url)
    return out


def _hits_in(text: str, compiled: list[re.Pattern[str]]) -> list[str]:
    found: list[str] = []
    for rx in compiled:
        m = rx.search(text)
        if m:
            snippet = m.group(0)
            if snippet not in found:
                found.append(snippet[:120])
    return found


def analyze_texts(
    url: str,
    html: str,
    script_blobs: Iterable[tuple[str, str]],
    *,
    scripts_attempted: int = 0,
    scripts_ok: int = 0,
    error: str | None = None,
) -> dict:
    blobs = [("html", html)] + list(script_blobs)
    combined = "\n".join(t for _, t in blobs)
    trackers: list[dict] = []
    score = 100
    for spec in _COMPILED:
        hits: list[str] = []
        sources: list[str] = []
        for origin, text in blobs:
            local = _hits_in(text, spec["rx"])
            if local:
                for h in local:
                    if h not in hits:
                        hits.append(h)
                if origin not in sources:
                    sources.append(origin)
        if hits:
            score -= int(spec["penalty"])
            trackers.append(
                {
                    "id": spec["id"],
                    "name": spec["name"],
                    "penalty": spec["penalty"],
                    "hits": hits[:8],
                    "sources": sources[:12],
                }
            )
    score = max(0, min(100, score))
    banner = bool(_hits_in(html, _BANNER_RX))
    notes = [
        "No se ejecuta JavaScript: solo HTML público y hasta 10 archivos script src.",
        f"User-Agent: {USER_AGENT}",
        DISCLAIMER,
    ]
    if banner:
        notes.append(
            "Se detectó un posible aviso/CMP de cookies en el HTML. "
            "Eso no equivale a consentimiento válido."
        )
    else:
        notes.append(
            "No se vio un aviso de cookies obvio en el HTML estático. "
            "Si hay trackers, conviene un cartel antes de cargar píxeles."
        )
    if error:
        notes.append(error)
    return {
        "ok": error is None,
        "url": url,
        "score": score,
        "trackers": trackers,
        "tracker_count": len(trackers),
        "banner_detected": banner,
        "scripts_attempted": scripts_attempted,
        "scripts_ok": scripts_ok,
        "scripts_limit": MAX_SCRIPTS,
        "js_executed": False,
        "user_agent": USER_AGENT,
        "disclaimer": DISCLAIMER,
        "notes": notes,
    }


def scan_url(url: str, max_scripts: int = MAX_SCRIPTS) -> dict:
    target = normalize_url(url)
    try:
        final, raw, _ctype = fetch_bytes(target, HTML_TIMEOUT, MAX_HTML_BYTES)
    except urllib.error.HTTPError as e:
        raise ValueError(f"El sitio respondió HTTP {e.code}.") from e
    except urllib.error.URLError as e:
        raise ValueError(f"No se pudo abrir el sitio: {e.reason}.") from e
    except TimeoutError as e:
        raise ValueError("Tiempo de espera agotado al pedir el HTML.") from e
    html = raw.decode("utf-8", errors="replace")
    srcs = extract_script_srcs(html, final)[: max(0, int(max_scripts))]
    blobs: list[tuple[str, str]] = []
    ok = 0
    for src in srcs:
        try:
            _u, data, _c = fetch_bytes(src, SCRIPT_TIMEOUT, MAX_SCRIPT_BYTES)
            blobs.append((src, data.decode("utf-8", errors="replace")))
            ok += 1
        except Exception:
            continue
    result = analyze_texts(
        final,
        html,
        blobs,
        scripts_attempted=len(srcs),
        scripts_ok=ok,
    )
    result["requested_url"] = target
    result["script_srcs"] = srcs
    return result


def example_scan() -> dict:
    html = """
    <html><head>
      <script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>
      <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
      <script src="https://static.hotjar.com/c/hotjar-1.js"></script>
    </head><body>ejemplo</body></html>
    """
    result = analyze_texts(
        "https://ejemplo.rastro.cl/",
        html,
        [],
        scripts_attempted=3,
        scripts_ok=0,
    )
    result["requested_url"] = result["url"]
    result["example"] = True
    result["script_srcs"] = [
        "https://www.googletagmanager.com/gtm.js?id=GTM-XXXX",
        "https://connect.facebook.net/en_US/fbevents.js",
        "https://static.hotjar.com/c/hotjar-1.js",
    ]
    return result


def dumps(obj: dict) -> bytes:
    return json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8")
