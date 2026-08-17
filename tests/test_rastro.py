#!/usr/bin/env python3
"""Pruebas locales sin red ni secretos."""

from __future__ import annotations

import hmac
import hashlib
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from lib.flow_pay import PLANS, is_paid, sign_params  # noqa: E402
from lib.informe import handle_informe, render_informe  # noqa: E402
from lib.rastro_engine import analyze_texts, extract_script_srcs, normalize_url  # noqa: E402
from lib.scan import handle_scan  # noqa: E402


class EngineTests(unittest.TestCase):
    def test_detects_known_trackers_and_scores_from_100(self) -> None:
        html = """
        <html><head>
          <script src="https://www.googletagmanager.com/gtm.js?id=GTM-AAAA"></script>
          <script src="https://www.google-analytics.com/analytics.js"></script>
          <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
          <script src="https://analytics.tiktok.com/i18n/pixel/events.js"></script>
          <script src="https://static.hotjar.com/c/hotjar-1.js"></script>
          <script src="https://www.clarity.ms/tag/abc"></script>
          <script src="https://snap.licdn.com/li.lms-analytics/insight.min.js"></script>
          <script src="https://static.ads-twitter.com/uwt.js"></script>
          <script src="https://js.hs-scripts.com/1.js"></script>
          <script src="https://widget.intercom.io/widget/x"></script>
          <script src="https://client.crisp.chat/l.js"></script>
          <script src="https://static.zdassets.com/ekr/snippet.js"></script>
          <script src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"></script>
          <iframe src="https://www.youtube.com/embed/dQw4"></iframe>
          <script src="https://static.cloudflareinsights.com/beacon.min.js"></script>
        </head></html>
        """
        result = analyze_texts("https://ejemplo.cl/", html, [])
        ids = {t["id"] for t in result["trackers"]}
        expected = {
            "gtm", "ga", "meta", "tiktok", "hotjar", "clarity", "linkedin", "x",
            "hubspot", "intercom", "crisp", "zendesk", "doubleclick", "youtube",
            "cloudflare_insights",
        }
        self.assertTrue(expected <= ids, f"faltan {expected - ids}")
        self.assertLess(result["score"], 100)
        self.assertGreaterEqual(result["score"], 0)
        self.assertFalse(result["js_executed"])
        self.assertIn("RastroBot", result["user_agent"])
        self.assertIn("asesoría legal", result["disclaimer"])

    def test_extracts_up_to_script_srcs(self) -> None:
        html = "".join(f'<script src="/t{i}.js"></script>' for i in range(12))
        srcs = extract_script_srcs(html, "https://a.cl/")
        self.assertEqual(len(srcs), 12)
        self.assertTrue(all(s.startswith("https://a.cl/") for s in srcs))

    def test_blocks_private_hosts(self) -> None:
        with self.assertRaises(ValueError):
            normalize_url("http://127.0.0.1/")
        with self.assertRaises(ValueError):
            normalize_url("http://localhost:8766/")


class FlowTests(unittest.TestCase):
    def test_hmac_concat_sorted(self) -> None:
        params = {"apiKey": "AAA", "token": "TOK", "amount": 4990}
        secret = "secret"
        to_sign = "amount4990apiKeyAAAtokenTOK"
        expect = hmac.new(secret.encode(), to_sign.encode(), hashlib.sha256).hexdigest()
        self.assertEqual(sign_params(params, secret), expect)

    def test_paid_only_status_2(self) -> None:
        self.assertTrue(is_paid({"status": 2}))
        self.assertTrue(is_paid({"status": "2"}))
        self.assertFalse(is_paid({"status": 1}))
        self.assertFalse(is_paid({"status": 3}))

    def test_plans(self) -> None:
        self.assertEqual(PLANS["informe"]["amount"], 4990)
        self.assertEqual(PLANS["pro"]["amount"], 14990)
        self.assertIn("pago del mes", PLANS["pro"]["subject"].lower())


class HttpLibTests(unittest.TestCase):
    def test_scan_requires_post_and_url(self) -> None:
        st, _, body = handle_scan("GET", {}, b"")
        self.assertEqual(st, 405)
        st, _, body = handle_scan("POST", {}, b"{}")
        self.assertEqual(st, 400)
        self.assertIn("url", json.loads(body.decode())["error"].lower())

    def test_informe_ejemplo(self) -> None:
        st, ctype, body = handle_informe("GET", {"ejemplo": "1"}, b"")
        self.assertEqual(st, 200)
        self.assertIn("text/html", ctype)
        html = body.decode()
        self.assertIn("Informe", html)
        self.assertIn("No es asesoría legal", html)
        self.assertIn("No es la Agencia", html)

    def test_informe_post_scan(self) -> None:
        scan = {"url": "https://x.cl", "score": 90, "trackers": []}
        st, ctype, body = handle_informe("POST", {}, json.dumps({"scan": scan}).encode())
        self.assertEqual(st, 200)
        self.assertIn("https://x.cl", body.decode())
        self.assertIn("90/100", render_informe(scan))


class WidgetTests(unittest.TestCase):
    def test_widget_contract(self) -> None:
        js = (ROOT / "widget" / "rastro.js").read_text(encoding="utf-8")
        self.assertIn("rastro_consent", js)
        self.assertIn("Aceptar", js)
        self.assertIn("Rechazar", js)
        self.assertIn("attachShadow", js)
        demo = (ROOT / "widget" / "demo.html").read_text(encoding="utf-8")
        self.assertIn('<script src="/widget/rastro.js"></script>', demo)
        self.assertNotIn("defer", demo.split("rastro.js")[0][-80:])


class ConfigTests(unittest.TestCase):
    def test_env_example_empty_keys(self) -> None:
        text = (ROOT / ".env.example").read_text(encoding="utf-8")
        self.assertIn("FLOW_API_KEY=\n", text)
        self.assertIn("FLOW_SECRET_KEY=\n", text)
        self.assertIn("FLOW_API_URL=https://www.flow.cl/api", text)
        self.assertIn("RASTRO_PUBLIC_URL=", text)

    def test_vercel_framework_null(self) -> None:
        cfg = json.loads((ROOT / "vercel.json").read_text(encoding="utf-8"))
        self.assertIsNone(cfg["framework"])
        self.assertEqual(cfg["functions"]["api/scan.py"]["maxDuration"], 30)
        self.assertIn("lib/{scan.py,rastro_engine.py}", cfg["functions"]["api/scan.py"]["includeFiles"])

    def test_no_old_preview_url(self) -> None:
        forbidden = "rastro-gard-security.vercel.app"
        for path in [ROOT / "README.md", ROOT / "outreach-draft.md", ROOT / "index.html", ROOT / "app.js"]:
            self.assertNotIn(forbidden, path.read_text(encoding="utf-8"))
        self.assertIn("{URL_PUBLICA}", (ROOT / "outreach-draft.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
