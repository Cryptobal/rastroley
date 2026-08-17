from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import sys

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from lib.informe import handle_informe  # noqa: E402


def _query(path: str) -> dict[str, str]:
    qs = parse_qs(urlparse(path).query, keep_blank_values=True)
    return {k: (v[0] if v else "") for k, v in qs.items()}


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, ctype: str, body: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body and self.command != "HEAD":
            self.wfile.write(body)

    def _read(self) -> bytes:
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length > 0 else b""

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send(204, "text/plain", b"")

    def do_GET(self) -> None:  # noqa: N802
        status, ctype, body = handle_informe("GET", _query(self.path), b"")
        self._send(status, ctype, body)

    def do_POST(self) -> None:  # noqa: N802
        status, ctype, body = handle_informe("POST", _query(self.path), self._read())
        self._send(status, ctype, body)

    def log_message(self, fmt: str, *args) -> None:
        return
