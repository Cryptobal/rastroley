(function () {
  var lastScan = null;
  var form = document.getElementById("scan-form");
  var urlInput = document.getElementById("url");
  var scanBtn = document.getElementById("scan-btn");
  var statusEl = document.getElementById("scan-status");
  var results = document.getElementById("results");
  var scoreEl = document.getElementById("score");
  var metaEl = document.getElementById("score-meta");
  var listEl = document.getElementById("tracker-list");
  var snippetEl = document.getElementById("snippet");
  var payStatus = document.getElementById("pay-status");
  var thanks = document.getElementById("gracias");
  var thanksSnippet = document.getElementById("thanks-snippet");

  function snippet() {
    return '<script src="' + location.origin + '/widget/rastro.js"><\/script>';
  }

  function showStatus(el, msg, kind) {
    el.hidden = !msg;
    el.textContent = msg || "";
    el.className = "status" + (kind ? " " + kind : "");
  }

  function renderSnippet() {
    snippetEl.textContent = snippet();
    if (thanksSnippet) thanksSnippet.textContent = snippet();
  }

  function renderScan(data) {
    lastScan = data;
    results.hidden = false;
    scoreEl.textContent = (data.score != null ? data.score : "—") + "/100";
    metaEl.textContent =
      (data.tracker_count || 0) +
      " trackers · scripts " +
      (data.scripts_ok || 0) +
      "/" +
      (data.scripts_limit || 10) +
      " · JS no ejecutado · " +
      (data.banner_detected ? "posible aviso en HTML" : "aviso no evidente");
    listEl.innerHTML = "";
    (data.trackers || []).forEach(function (t) {
      var li = document.createElement("li");
      li.innerHTML = "<strong></strong> <span></span>";
      li.querySelector("strong").textContent = t.name || t.id;
      li.querySelector("span").textContent = " (−" + (t.penalty || "?") + ")";
      listEl.appendChild(li);
    });
    if (!data.trackers || !data.trackers.length) {
      var empty = document.createElement("li");
      empty.textContent = "No aparecieron los trackers conocidos en el HTML ni en los scripts bajados.";
      listEl.appendChild(empty);
    }
  }

  async function downloadInforme(scan) {
    var res = await fetch("/api/informe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scan: scan || lastScan || { url: location.origin, score: 0, trackers: [] } }),
    });
    var blob = await res.blob();
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "informe-rastro.html";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  form.addEventListener("submit", async function (ev) {
    ev.preventDefault();
    scanBtn.disabled = true;
    showStatus(statusEl, "Escaneando con RastroBot (sin ejecutar JS)…");
    results.hidden = true;
    try {
      var res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.value }),
      });
      var data = await res.json();
      if (!res.ok || data.ok === false) {
        showStatus(statusEl, data.error || "No se pudo escanear.", "err");
        return;
      }
      renderScan(data);
      try {
        sessionStorage.setItem("rastro_last_scan", JSON.stringify(data));
      } catch (e) {}
      showStatus(statusEl, "Listo. El scan es gratis; el informe y el cartel se pagan.", "ok");
    } catch (e) {
      showStatus(statusEl, "Error de red al escanear.", "err");
    } finally {
      scanBtn.disabled = false;
    }
  });

  document.getElementById("dl-informe").addEventListener("click", function () {
    downloadInforme(lastScan);
  });

  document.getElementById("copy-snippet").addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(snippet());
      this.textContent = "Copiado";
    } catch (e) {
      this.textContent = "Copia el recuadro a mano";
    }
  });

  document.getElementById("pay-form").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var plan = (ev.submitter && ev.submitter.value) || "informe";
    var email = document.getElementById("email").value;
    showStatus(payStatus, "Creando orden en Flow…");
    try {
      var res = await fetch("/api/pay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan, email: email, scan: lastScan }),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) {
        showStatus(payStatus, data.error || "No se pudo crear el pago.", "err");
        return;
      }
      location.href = data.url;
    } catch (e) {
      showStatus(payStatus, "Error de red al pagar.", "err");
    }
  });

  async function afterPay() {
    var q = new URLSearchParams(location.search);
    if (q.get("pago") !== "1") return;
    thanks.hidden = false;
    renderSnippet();
    var token = q.get("token") || "";
    var copy = document.getElementById("thanks-copy");
    if (!token) {
      copy.textContent = "Volviste de Flow, pero falta el token. Si pagaste, el webhook /pay/confirm igual registra el estado 2.";
      return;
    }
    try {
      var res = await fetch("/api/pay/status?token=" + encodeURIComponent(token));
      var data = await res.json();
      if (data.paid) {
        copy.textContent =
          "Pago confirmado en Flow (status 2). " +
          (data.subject || "") +
          ". Pro es pago del mes, no suscripción recurrente. Copia el snippet e instálalo sin defer/async.";
      } else {
        copy.textContent =
          "Flow aún no marca el pago como pagado (status " +
          data.status +
          "). Si acabas de volver, espera un momento y recarga. Solo status 2 cuenta como pagado.";
      }
    } catch (e) {
      copy.textContent = "No se pudo consultar el estado. El confirm de Flow (webhook) es la fuente de verdad: token → getStatus, pagado solo si status 2.";
    }
    try {
      var stored = sessionStorage.getItem("rastro_last_scan");
      if (stored) lastScan = JSON.parse(stored);
    } catch (e) {}
  }

  document.getElementById("copy-thanks").addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(snippet());
      this.textContent = "Copiado";
    } catch (e) {}
  });
  document.getElementById("dl-thanks").addEventListener("click", function () {
    downloadInforme(lastScan);
  });

  renderSnippet();
  afterPay();
})();
