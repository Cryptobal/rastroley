/**
 * Rastro widget v0.4.0 — vanilla JS, cero dependencias.
 * Fail-open: si la config/API falla, el sitio del cliente no se rompe.
 * Consent Mode v2 + Meta Pixel consent. Decision en localStorage + POST evidencia.
 */
(function (window, document) {
  "use strict";

  var VERSION = "0.4.0";
  var STORAGE_KEY = "rastro_consent_v1";
  var API_BASE = (document.currentScript && document.currentScript.getAttribute("data-api")) || "";
  var SITE_KEY = (document.currentScript && document.currentScript.getAttribute("data-site-key")) || "";

  function safe(fn) {
    try {
      return fn();
    } catch (e) {
      try {
        if (window.console && console.warn) console.warn("[rastro] fail-open", e);
      } catch (_) {}
      return null;
    }
  }

  function gtag() {
    safe(function () {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(arguments);
    });
  }

  function setConsentDefaults() {
    safe(function () {
      gtag("consent", "default", {
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
        analytics_storage: "denied",
        wait_for_update: 500,
      });
      if (window.fbq) {
        try {
          window.fbq("consent", "revoke");
        } catch (_) {}
      }
    });
  }

  function applyConsent(decision) {
    safe(function () {
      var granted = decision === "ACCEPT_ALL";
      var state = granted ? "granted" : "denied";
      gtag("consent", "update", {
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
        analytics_storage: state,
      });
      if (window.fbq) {
        try {
          window.fbq("consent", granted ? "grant" : "revoke");
        } catch (_) {}
      }
    });
  }

  function readStored() {
    return safe(function () {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    });
  }

  function writeStored(payload) {
    safe(function () {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    });
  }

  function postEvidence(decision) {
    if (!API_BASE || !SITE_KEY) return;
    safe(function () {
      var body = JSON.stringify({
        siteKey: SITE_KEY,
        decision: decision,
        bannerVersion: VERSION,
        userAgent: (navigator && navigator.userAgent) || "",
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API_BASE + "/api/consent", new Blob([body], { type: "application/json" }));
      } else {
        fetch(API_BASE + "/api/consent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: body,
          keepalive: true,
          mode: "cors",
        }).catch(function () {});
      }
    });
  }

  function pingInstall() {
    if (!API_BASE || !SITE_KEY) return;
    safe(function () {
      fetch(API_BASE + "/api/install/ping", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteKey: SITE_KEY }),
        mode: "cors",
        keepalive: true,
      }).catch(function () {});
    });
  }

  function css() {
    return [
      "#rastro-banner{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#f8fafc;padding:16px 20px;box-shadow:0 -8px 24px rgba(0,0,0,.25)}",
      "#rastro-banner *{box-sizing:border-box}",
      "#rastro-banner .r-wrap{max-width:960px;margin:0 auto;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}",
      "#rastro-banner p{margin:0;font-size:14px;line-height:1.45;max-width:620px}",
      "#rastro-banner .r-actions{display:flex;gap:8px;flex-wrap:wrap}",
      "#rastro-banner button{appearance:none;border:1px solid #94a3b8;background:transparent;color:#f8fafc;padding:10px 14px;font-size:14px;font-weight:600;cursor:pointer;min-width:110px}",
      "#rastro-banner button.r-accept{background:#f8fafc;color:#0f172a;border-color:#f8fafc}",
      "#rastro-reopen{position:fixed;right:12px;bottom:12px;z-index:2147483000;appearance:none;border:0;background:#0f172a;color:#f8fafc;padding:8px 12px;font:600 12px/1 system-ui,sans-serif;cursor:pointer;opacity:.92}",
      "#rastro-banner .r-disc{display:block;margin-top:6px;font-size:11px;opacity:.75}",
    ].join("");
  }

  function injectStyle() {
    if (document.getElementById("rastro-style")) return;
    var s = document.createElement("style");
    s.id = "rastro-style";
    s.textContent = css();
    document.head.appendChild(s);
  }

  function removeBanner() {
    var el = document.getElementById("rastro-banner");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function showReopen() {
    if (document.getElementById("rastro-reopen")) return;
    var btn = document.createElement("button");
    btn.id = "rastro-reopen";
    btn.type = "button";
    btn.textContent = "Privacidad";
    btn.setAttribute("aria-label", "Cambiar preferencias de cookies");
    btn.onclick = function () {
      writeStored(null);
      safe(function () {
        window.localStorage.removeItem(STORAGE_KEY);
      });
      setConsentDefaults();
      showBanner();
    };
    document.body.appendChild(btn);
  }

  function decide(decision) {
    var payload = { decision: decision, bannerVersion: VERSION, at: Date.now() };
    writeStored(payload);
    applyConsent(decision);
    postEvidence(decision);
    removeBanner();
    showReopen();
  }

  function showBanner() {
    removeBanner();
    injectStyle();
    var root = document.createElement("div");
    root.id = "rastro-banner";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-live", "polite");
    root.innerHTML =
      '<div class="r-wrap">' +
      "<div><p>Usamos cookies propias y de terceros para medir y mejorar este sitio. Puedes aceptar o rechazar.</p>" +
      '<span class="r-disc">Rastro no es asesoría legal ni garantiza cumplimiento.</span></div>' +
      '<div class="r-actions">' +
      '<button type="button" class="r-reject">Rechazar</button>' +
      '<button type="button" class="r-accept">Aceptar</button>' +
      "</div></div>";
    document.body.appendChild(root);
    root.querySelector(".r-accept").onclick = function () {
      decide("ACCEPT_ALL");
    };
    root.querySelector(".r-reject").onclick = function () {
      decide("REJECT_ALL");
    };
  }

  function boot() {
    setConsentDefaults();
    pingInstall();
    injectStyle();
    var stored = readStored();
    if (stored && stored.decision) {
      applyConsent(stored.decision);
      showReopen();
      return;
    }
    if (document.body) showBanner();
    else document.addEventListener("DOMContentLoaded", showBanner);
  }

  safe(boot);

  window.Rastro = {
    version: VERSION,
    reopen: function () {
      safe(function () {
        window.localStorage.removeItem(STORAGE_KEY);
        setConsentDefaults();
        showBanner();
      });
    },
  };
})(window, document);
