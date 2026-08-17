/**
 * Rastro widget v0.4.1 — vanilla JS, cero dependencias.
 * Combina: retención de trackers (v0.4) + Consent Mode v2 / Meta / evidencia (Fase 0/1).
 * Fail-open: errores de API/config no rompen el sitio del cliente.
 */
(function (window, document) {
  "use strict";

  var VERSION = "0.4.1";
  var STORAGE_KEY = "rastro_consent_v1";
  var LEGACY_KEY = "rastro_consent";
  var API_BASE =
    (document.currentScript && document.currentScript.getAttribute("data-api")) || "";
  var SITE_KEY =
    (document.currentScript && document.currentScript.getAttribute("data-site-key")) || "";

  var HINTS = [
    "googletagmanager.com",
    "google-analytics.com",
    "gtag/js",
    "connect.facebook.net",
    "facebook.com/tr",
    "analytics.tiktok.com",
    "static.hotjar.com",
    "hotjar.com/c/",
    "clarity.ms",
    "snap.licdn.com",
    "linkedin.com/px",
    "static.ads-twitter.com",
    "analytics.twitter.com",
    "platform.twitter.com/oct.js",
    "js.hs-scripts.com",
    "js.hs-analytics.net",
    "js.hubspot.com",
    "widget.intercom.io",
    "js.intercomcdn.com",
    "client.crisp.chat",
    "static.zdassets.com",
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "youtube.com/iframe_api",
    "youtube.com/embed",
    "youtube-nocookie.com",
    "static.cloudflareinsights.com",
    "cloudflareinsights",
  ];

  var held = [];

  function safe(fn) {
    try {
      return fn();
    } catch (err) {
      try {
        if (window.console && console.warn) console.warn("[rastro] fail-open", err);
      } catch (ignore) {}
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
        } catch (ignore) {}
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
        } catch (ignore) {}
      }
    });
  }

  function readStored() {
    return safe(function () {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      var legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy === "accepted") return { decision: "ACCEPT_ALL", bannerVersion: "legacy" };
      if (legacy === "rejected") return { decision: "REJECT_ALL", bannerVersion: "legacy" };
      return null;
    });
  }

  function writeStored(payload) {
    safe(function () {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      window.localStorage.setItem(
        LEGACY_KEY,
        payload.decision === "ACCEPT_ALL" ? "accepted" : "rejected",
      );
    });
  }

  function clearStored() {
    safe(function () {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_KEY);
    });
  }

  function accepted() {
    var stored = readStored();
    return !!(stored && stored.decision === "ACCEPT_ALL");
  }

  function decided() {
    var stored = readStored();
    return !!(stored && stored.decision);
  }

  function isTracker(src) {
    if (!src) return false;
    var s = String(src).toLowerCase();
    if (s.indexOf("widget/rastro.js") !== -1) return false;
    if (s.indexOf("/w/rastro") !== -1) return false;
    for (var i = 0; i < HINTS.length; i++) {
      if (s.indexOf(HINTS[i]) !== -1) return true;
    }
    return false;
  }

  function hold(el, src) {
    if (!el || el.getAttribute("data-rastro-held") === "1") return;
    el.setAttribute("data-rastro-held", "1");
    el.setAttribute("data-rastro-src", src);
    try {
      el.type = "text/plain";
    } catch (ignore) {}
    try {
      el.removeAttribute("src");
    } catch (ignore) {}
    held.push({ el: el, src: src });
  }

  function release() {
    var i;
    for (i = 0; i < held.length; i++) {
      var src = held[i].src;
      if (!src) continue;
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      (document.head || document.documentElement).appendChild(s);
    }
    held = [];
    var blocked = document.querySelectorAll("script[data-rastro-src]");
    for (i = 0; i < blocked.length; i++) {
      var extra = blocked[i].getAttribute("data-rastro-src");
      if (!extra) continue;
      var s2 = document.createElement("script");
      s2.src = extra;
      s2.async = true;
      (document.head || document.documentElement).appendChild(s2);
    }
  }

  function installHolders() {
    if (accepted()) return;
    safe(function () {
      var proto = HTMLScriptElement.prototype;
      var nativeSet = proto.setAttribute;
      proto.setAttribute = function (name, value) {
        if (String(name).toLowerCase() === "src" && !accepted() && isTracker(value)) {
          hold(this, value);
          return;
        }
        return nativeSet.apply(this, arguments);
      };
      var desc = Object.getOwnPropertyDescriptor(proto, "src");
      if (!desc) desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "src");
      if (desc && desc.set) {
        Object.defineProperty(proto, "src", {
          configurable: true,
          enumerable: true,
          get: function () {
            return desc.get.call(this);
          },
          set: function (v) {
            if (!accepted() && isTracker(v)) {
              hold(this, v);
              return;
            }
            return desc.set.call(this, v);
          },
        });
      }
    });

    safe(function () {
      var mo = new MutationObserver(function (muts) {
        if (accepted()) return;
        for (var i = 0; i < muts.length; i++) {
          var nodes = muts[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];
            if (!n || n.tagName !== "SCRIPT") continue;
            var src = n.getAttribute("src") || n.src;
            if (isTracker(src)) hold(n, src);
          }
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
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
        navigator.sendBeacon(
          API_BASE + "/api/consent",
          new Blob([body], { type: "application/json" }),
        );
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

  function removeBanner() {
    var host = document.getElementById("rastro-banner-host");
    if (host && host.parentNode) host.parentNode.removeChild(host);
    var reopen = document.getElementById("rastro-reopen");
    if (reopen && reopen.parentNode) reopen.parentNode.removeChild(reopen);
  }

  function showReopen() {
    if (document.getElementById("rastro-reopen")) return;
    var btn = document.createElement("button");
    btn.id = "rastro-reopen";
    btn.type = "button";
    btn.textContent = "Privacidad";
    btn.setAttribute("aria-label", "Cambiar preferencias de cookies");
    btn.style.cssText =
      "all:initial;position:fixed;right:12px;bottom:12px;z-index:2147483647;background:#14211c;color:#eef3e6;padding:8px 12px;font:600 12px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;opacity:.92";
    btn.onclick = function () {
      clearStored();
      setConsentDefaults();
      showBanner();
    };
    (document.body || document.documentElement).appendChild(btn);
  }

  function decide(decision) {
    writeStored({ decision: decision, bannerVersion: VERSION, at: Date.now() });
    applyConsent(decision);
    postEvidence(decision);
    removeBanner();
    if (decision === "ACCEPT_ALL") release();
    showReopen();
  }

  function showBanner() {
    if (decided()) return;
    removeBanner();
    var host = document.createElement("div");
    host.id = "rastro-banner-host";
    host.style.cssText =
      "all:initial;position:fixed;z-index:2147483647;left:0;right:0;bottom:0;";
    var shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML =
      "<style>" +
      ":host{all:initial}" +
      ".bar{font-family:ui-sans-serif,system-ui,sans-serif;background:#14211c;color:#eef3e6;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;box-shadow:0 -8px 30px rgba(0,0,0,.35)}" +
      "p{margin:0;font-size:14px;line-height:1.4;max-width:52rem}" +
      ".btns{display:flex;gap:8px;flex-wrap:wrap}" +
      "button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:8px 12px;cursor:pointer;min-width:110px}" +
      "#ok{background:#e3f06a;color:#14211c}" +
      "#no{background:transparent;color:#e3f06a;border:1px solid #3b4a40}" +
      "small{display:block;margin-top:6px;color:#c9d2a6}" +
      "</style>" +
      '<div class="bar" role="dialog" aria-label="Aviso de cookies Rastro">' +
      "<p>Usamos un aviso de Rastro. Los scripts de medición/marketing conocidos se retienen hasta que aceptes. " +
      "<small>Herramienta/IA. No es asesoría legal. No es la Agencia. No garantiza cumplimiento.</small></p>" +
      '<div class="btns">' +
      '<button type="button" id="no">Rechazar</button>' +
      '<button type="button" id="ok">Aceptar</button>' +
      "</div></div>";
    (document.body || document.documentElement).appendChild(host);
    shadow.getElementById("ok").addEventListener("click", function () {
      decide("ACCEPT_ALL");
    });
    shadow.getElementById("no").addEventListener("click", function () {
      decide("REJECT_ALL");
    });
  }

  function boot() {
    setConsentDefaults();
    pingInstall();
    installHolders();
    var stored = readStored();
    if (stored && stored.decision) {
      applyConsent(stored.decision);
      if (stored.decision === "ACCEPT_ALL") release();
      showReopen();
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", showBanner);
    } else {
      showBanner();
    }
  }

  safe(boot);

  window.Rastro = {
    version: VERSION,
    reopen: function () {
      safe(function () {
        clearStored();
        setConsentDefaults();
        showBanner();
      });
    },
  };
})(window, document);
