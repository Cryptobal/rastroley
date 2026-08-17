#!/usr/bin/env python3
"""Servidor local de Rastro en 127.0.0.1:8766 (no se despliega: está en .vercelignore)."""

from __future__ import annotations

import json
import mimetypes
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.flow_pay import (  # noqa: E402
    handle_confirm,
    handle_create,
    handle_return,
    handle_status,
    location_from_content_type,
)
from lib.informe import handle_informe  # noqa: E402
from lib.scan import handle_scan  # noqa: E402

HOST = "127.0.0.1"
PORT = 8766


def load_env() -> None:
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#") or "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def query_of(path: str) -> dict[str, str]:
    qs = parse_qs(urlparse(path).query, keep_blank_values=True)
    return {k: (v[0] if v else "") for k, v in qs.items()}


class RastroHandler(BaseHTTPRequestHandler):
    def _headers_dict(self) -> dict[str, str]:
        return {str(k): str(v) for k, v in self.headers.items()}

    def _read(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length > 0 else b""

    def _send(self, status: int, ctype: str, body: bytes, extra: dict[str, str] | None = None) -> None:
        loc = location_from_content_type(ctype)
        if loc:
            status = 302
            extra = dict(extra or {})
            extra["Location"] = loc
            ctype = "text/html; charset=utf-8"
        self.send_response(status)
        self.send_header("Content-Type", ctype.split("; location=")[0])
        self.send_header("X-Content-Type-Options", "nosniff")
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        if self.path.startswith("/widget/rastro.js") or self.path.startswith("/api") or self.path.startswith("/scan") or self.path.startswith("/pay") or self.path.startswith("/informe"):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if self.path.startswith("/widget/rastro.js"):
            self.send_header("Cache-Control", "public, max-age=300")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(204, "text/plain", b"")

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET()

    def do_GET(self) -> None:  # noqa: N802
        if not self._dispatch("GET", b""):
            self._static()

    def do_POST(self) -> None:  # noqa: N802
        if not self._dispatch("POST", self._read()):
            self._send(404, "application/json", json.dumps({"ok": False, "error": "No encontrado."}).encode())

    def _dispatch(self, method: str, body: bytes) -> bool:
        path = urlparse(self.path).path.rstrip("/") or "/"
        q = query_of(self.path)
        h = self._headers_dict()
        if path in {"/scan", "/api/scan"}:
            self._send(*handle_scan(method, q, body))
            return True
        if path in {"/informe", "/api/informe"}:
            self._send(*handle_informe(method, q, body))
            return True
        if path in {"/pay/create", "/api/pay/create"}:
            self._send(*handle_create(method, q, body, h))
            return True
        if path in {"/pay/confirm", "/api/pay/confirm"}:
            self._send(*handle_confirm(method, q, body, h))
            return True
        if path in {"/pay/return", "/api/pay/return"}:
            self._send(*handle_return(method, q, body, h))
            return True
        if path in {"/pay/status", "/api/pay/status"}:
            self._send(*handle_status(method, q, body, h))
            return True
        return False

    def _static(self) -> None:
        path = urlparse(self.path).path
        if path.endswith(".py") or path.startswith("/lib") or path.startswith("/.env"):
            self._send(404, "text/plain; charset=utf-8", b"Not found")
            return
        rel = path.lstrip("/") or "index.html"
        candidate = (ROOT / rel).resolve()
        if not str(candidate).startswith(str(ROOT)) or not candidate.is_file():
            if path == "/" or path.endswith("/"):
                candidate = ROOT / "index.html"
            else:
                self._send(404, "text/plain; charset=utf-8", b"Not found")
                return
        ctype = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
        if candidate.suffix == ".js":
            ctype = "application/javascript; charset=utf-8"
        elif candidate.suffix == ".css":
            ctype = "text/css; charset=utf-8"
        elif candidate.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        extra = {}
        if candidate.name == "rastro.js":
            extra = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
                "Cache-Control": "public, max-age=300",
            }
        self._send(200, ctype, candidate.read_bytes(), extra)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> None:
    load_env()
    httpd = ThreadingHTTPServer((HOST, PORT), RastroHandler)
    print(f"Rastro local en http://{HOST}:{PORT}", flush=True)
    print("Scan POST /api/scan  ·  widget /widget/rastro.js  ·  informe ?ejemplo=1", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
