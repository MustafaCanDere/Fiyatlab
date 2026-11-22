import { analyze, testKey, PROVIDERS } from "./analyze.js";
import { checkForUpdate, currentVersion } from "./update.js";

const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ""; } catch { return ""; } };
const link = (u, text) => { const s = safeUrl(u); return s ? `<a href="${esc(s)}" target="_blank" rel="noopener noreferrer">${esc(text || s)}</a>` : esc(text || ""); };
const list = (arr, cls = "") => (arr && arr.length) ? `<ul class="plain ${cls}">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="small">Bilgi bulunamadı.</p>`;

function score(label, v) {
  const n = Math.max(0, Math.min(10, Number(v) || 0));
  return `<div class="score"><span class="small">${esc(label)}</span><b>${n.toFixed(1)}<span class="small"> / 10</span></b><div class="bar"><span style="width:${n * 10}%"></span></div></div>`;
}

function render(d) {
  const u = d.urun || {}, p = d.puan || {}, f = d.fiyat_analizi || {}, y = d.yorum_ozeti || {}, k = d.karar || {};
  const verdictCls = "v-" + String(k.tavsiye || "").split(" ")[0];
  $("#result").innerHTML = `
    <section class="card hero">
      <h2>${esc(u.ad)}</h2>
      <div class="meta">${esc([u.marka, u.kategori, u.magaza].filter(Boolean).join(" · "))}</div>
      <div class="price">${esc(u.fiyat)}</div>
      <p>${esc(u.ozet)}</p>
    </section>

    <section class="card">
      <h2>Karar</h2>
      <div class="verdict ${esc(verdictCls)}">${esc(k.tavsiye)}</div>
      <p>${esc(k.aciklama)}</p>
    </section>

    <section class="card">
      <h2>Puanlar</h2>
      <div class="scores">
        ${score("Genel", p.genel)}${score("Fiyat / performans", p.fiyat_performans)}
        ${score("Kalite", p.kalite)}${score("Kullanıcı memnuniyeti", p.kullanici_memnuniyeti)}
      </div>
    </section>

    <section class="card two">
      <div><h2>Artılar</h2>${list(d.artilar, "pros")}</div>
      <div><h2>Eksiler</h2>${list(d.eksiler, "cons")}</div>
    </section>

    <section class="card">
      <h2>Fiyat analizi <span class="badge">${esc(f.degerlendirme)}</span></h2>
      <p>${esc(f.aciklama)}</p>
      ${(f.diger_saticilar || []).length ? `<table>${f.diger_saticilar.map((s) => `<tr><td>${link(s.url, s.magaza)}</td><td>${esc(s.fiyat)}</td></tr>`).join("")}</table>` : ""}
    </section>

    <section class="card">
      <h2>Kullanıcı yorumları ${y.puan_ortalamasi ? `<span class="badge">${esc(y.puan_ortalamasi)}</span>` : ""}</h2>
      <p>${esc(y.genel_kanaat)}</p>
      <div class="two">
        <div><h3 class="small">Sık övülenler</h3>${list(y.sik_ovgular, "pros")}</div>
        <div><h3 class="small">Sık şikayet edilenler</h3>${list(y.sik_sikayetler, "cons")}</div>
      </div>
    </section>

    <section class="card">
      <h2>Önerilen alternatifler</h2>
      ${(d.alternatifler || []).map((a) => `
        <div class="alt">
          <div class="alt-head"><strong>${link(a.url, a.ad)}</strong><span><span class="badge">${esc(a.tip)}</span> ${esc(a.fiyat)}</span></div>
          <div>${esc(a.neden)}</div>
        </div>`).join("") || `<p class="small">Alternatif bulunamadı.</p>`}
    </section>

    ${(d.dikkat_edilecekler || []).length ? `<section class="card"><h2>Almadan önce dikkat</h2>${list(d.dikkat_edilecekler)}</section>` : ""}

    ${(d.ozellikler || []).length ? `<section class="card"><h2>Özellikler</h2><table>${d.ozellikler.map((o) => `<tr><td>${esc(o.ad)}</td><td>${esc(o.deger)}</td></tr>`).join("")}</table></section>` : ""}

    ${(d.kaynaklar || []).length ? `<section class="card"><h2>Kaynaklar</h2><ul class="plain small">${d.kaynaklar.map((s) => `<li>${link(s.url, s.baslik)}</li>`).join("")}</ul></section>` : ""}
  `;
}

// --- Ayarlar (anahtar sadece bu cihazda, localStorage'da) ---
const store = {
  get: (k) => { try { return localStorage.getItem(k) || ""; } catch { return ""; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
// Her sağlayıcının anahtarı ve modeli ayrı saklanır (ör. apiKey:openai).
const keyOf = (p) => store.get(`apiKey:${p}`) || (p === "claude" ? store.get("apiKey") : "");
const modelOf = (p) => store.get(`model:${p}`) || (p === "claude" && store.get("model")) || PROVIDERS[p].models[0];
const providerNow = () => (PROVIDERS[store.get("provider")] ? store.get("provider") : "claude");

$("#provider").innerHTML = Object.entries(PROVIDERS).map(([id, p]) => `<option value="${id}">${esc(p.label)}</option>`).join("");

function fillProviderFields(p) {
  const info = PROVIDERS[p];
  $("#keyLabel").textContent = `${info.label} API anahtarı`;
  $("#apiKey").placeholder = info.keyHint;
  $("#apiKey").value = keyOf(p);
  $("#keyLink").href = info.keyUrl;
  $("#modelList").innerHTML = info.models.map((m) => `<option value="${esc(m)}">`).join("");
  $("#model").value = modelOf(p);
}
$("#provider").addEventListener("change", () => fillProviderFields($("#provider").value));

function refreshKeyState() {
  const p = providerNow();
  const has = !!keyOf(p);
  $("#keyState").textContent = has ? `${PROVIDERS[p].label.split(" ")[0]} · ${modelOf(p)}` : "Anahtar gerekli";
  if (!has) $("#settings").open = true;
}
$("#provider").value = providerNow();
fillProviderFields(providerNow());
// Kopyala-yapıştırda gelen boşluk, satır sonu, görünmez karakter ve tırnakları temizle.
const cleanKey = (k) => String(k || "").replace(/[\s\u200B-\u200D\uFEFF"'`]/g, "");

// Ayarlar yazarken otomatik kaydedilir; "Kaydet"e basmayı unutmak sorun olmaz.
function saveSettings() {
  const p = $("#provider").value;
  store.set("provider", p);
  store.set(`apiKey:${p}`, cleanKey($("#apiKey").value));
  store.set(`model:${p}`, $("#model").value.trim() || PROVIDERS[p].models[0]);
  refreshKeyState();
}
["#apiKey", "#model"].forEach((id) => $(id).addEventListener("input", saveSettings));
$("#provider").addEventListener("change", saveSettings);
$("#saveKey").addEventListener("click", () => {
  saveSettings();
  if (keyOf($("#provider").value)) $("#settings").open = false;
});

$("#testKey").addEventListener("click", async () => {
  saveSettings();
  const p = $("#provider").value, out = $("#testResult");
  const key = keyOf(p);
  if (!key) { out.className = "small error"; out.textContent = "Önce anahtarı gir."; return; }
  out.className = "small"; out.textContent = "Deneniyor...";
  $("#testKey").disabled = true;
  try {
    const r = await testKey(p, key, modelOf(p));
    out.className = "small ok"; out.textContent = r;
  } catch (err) {
    out.className = "small error"; out.textContent = err.message;
  } finally {
    $("#testKey").disabled = false;
  }
});
refreshKeyState();

$("#form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const provider = providerNow();
  const apiKey = keyOf(provider);
  if (!apiKey) { $("#settings").open = true; $("#apiKey").focus(); return; }
  const url = $("#url").value.trim();
  if (!/^https?:\/\//i.test(url)) { alertBox("Lütfen geçerli bir ürün linki girin (https://...)"); return; }

  const btn = $("#go"), status = $("#status");
  btn.disabled = true; btn.textContent = "Araştırılıyor...";
  $("#result").innerHTML = "";
  status.hidden = false;
  status.innerHTML = `<div>Araştırma başladı. Bu işlem genelde 1-3 dakika sürer, uygulamayı kapatma.</div><ul id="steps"></ul>`;
  const steps = $("#steps");
  const addStep = (t) => { const li = document.createElement("li"); li.textContent = t; steps.appendChild(li); steps.scrollTop = steps.scrollHeight; };

  try {
    addStep("Ürün sayfası inceleniyor...");
    const data = await analyze({
      provider, apiKey, model: modelOf(provider),
      url, note: $("#note").value.trim().slice(0, 500), onStatus: addStep,
    });
    status.hidden = true;
    render(data);
  } catch (err) {
    alertBox(err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Analiz et";
  }
});

function alertBox(msg) {
  const status = $("#status");
  status.hidden = false;
  status.innerHTML = `<div class="error">${esc(msg)}</div>`;
}

// --- Yeni sürüm bildirimi ---
$("#version").textContent = `Sürüm: ${currentVersion}`;
checkForUpdate().then((u) => {
  if (!u) return;
  const bar = $("#update");
  bar.innerHTML = `<div><strong>Yeni sürüm var: ${esc(u.version)}</strong><div class="small">İndirip açınca mevcut uygulamanın üstüne kurulur, ayarların kaybolmaz.</div></div>
    <a class="btn" href="${esc(safeUrl(u.apkUrl))}" target="_blank" rel="noopener noreferrer">Güncelle</a>`;
  bar.hidden = false;
});
