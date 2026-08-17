from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import sys

ROOT = Path(__file__).resolve().parent.parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.flow_pay import handle_return, location_from_content_type  # noqa: E402


def _query(path: str) -> dict[str, str]:
    qs = parse_qs(urlparse(path).query, keep_blank_values=True)
    return {k: (v[0] if v else "") for k, v in qs.items()}


class handler(BaseHTTPRequestHandler):
    def _read(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length > 0 else b""

    def _headers(self) -> dict[str, str]:
        return {str(k): str(v) for k, v in self.headers.items()}

    def _respond(self, method: str, body: bytes) -> None:
        status, ctype, payload = handle_return(method, _query(self.path), body, self._headers())
        loc = location_from_content_type(ctype)
        html_type = "text/html; charset=utf-8"
        self.send_response(302 if loc else status)
        if loc:
            self.send_header("Location", loc)
            ctype = html_type
        self.send_header("Content-Type", ctype.split("; location=")[0])
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if payload and self.command != "HEAD":
            self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802
        self._respond("GET", b"")

    def do_POST(self) -> None:  # noqa: N802
        self._respond("POST", self._read())

    def log_message(self, fmt: str, *args) -> None:
        return
