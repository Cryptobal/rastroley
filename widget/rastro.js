(function () {
  var KEY = "rastro_consent";
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
    "cloudflareinsights"
  ];

  function getConsent() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function setConsent(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {}
  }
  function accepted() {
    return getConsent() === "accepted";
  }
  function decided() {
    var v = getConsent();
    return v === "accepted" || v === "rejected";
  }
  function isTracker(src) {
    if (!src) return false;
    var s = String(src).toLowerCase();
    if (s.indexOf("widget/rastro.js") !== -1) return false;
    for (var i = 0; i < HINTS.length; i++) {
      if (s.indexOf(HINTS[i]) !== -1) return true;
    }
    return false;
  }

  var held = [];

  function hold(el, src) {
    if (!el || el.getAttribute("data-rastro-held") === "1") return;
    el.setAttribute("data-rastro-held", "1");
    el.setAttribute("data-rastro-src", src);
    try {
      el.type = "text/plain";
    } catch (e) {}
    try {
      el.removeAttribute("src");
    } catch (e) {}
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

  if (!accepted()) {
    try {
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
          }
        });
      }
    } catch (e) {}

    try {
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
    } catch (e) {}
  }

  function mount() {
    if (decided()) return;
    var host = document.createElement("div");
    host.id = "rastro-banner-host";
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;left:0;right:0;bottom:0;";
    var shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML =
      '<style>' +
      ':host{all:initial}' +
      '.bar{font-family:ui-sans-serif,system-ui,sans-serif;background:#14211c;color:#eef3e6;padding:12px 14px;display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;box-shadow:0 -8px 30px rgba(0,0,0,.35)}' +
      'p{margin:0;font-size:14px;line-height:1.4;max-width:52rem}' +
      '.btns{display:flex;gap:8px;flex-wrap:wrap}' +
      'button{font:inherit;font-weight:700;border:0;border-radius:8px;padding:8px 12px;cursor:pointer}' +
      '#ok{background:#e3f06a;color:#14211c}' +
      '#no{background:transparent;color:#e3f06a;border:1px solid #3b4a40}' +
      'small{display:block;margin-top:6px;color:#c9d2a6}' +
      '</style>' +
      '<div class="bar" role="dialog" aria-label="Aviso de cookies Rastro">' +
      '<p>Usamos un aviso de Rastro. Los scripts de medición/marketing conocidos se retienen hasta que aceptes. ' +
      '<small>Herramienta/IA. No es asesoría legal. No es la Agencia.</small></p>' +
      '<div class="btns">' +
      '<button type="button" id="ok">Aceptar</button>' +
      '<button type="button" id="no">Rechazar</button>' +
      '</div></div>';
    (document.body || document.documentElement).appendChild(host);
    shadow.getElementById("ok").addEventListener("click", function () {
      setConsent("accepted");
      host.remove();
      release();
    });
    shadow.getElementById("no").addEventListener("click", function () {
      setConsent("rejected");
      host.remove();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
