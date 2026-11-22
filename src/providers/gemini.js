// Google Gemini ile ürün analizi (generateContent + Google Arama ve URL okuma araçları).
import { buildPrompt, parseResult } from "../prompt.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

// Google'ın verdiği asıl hata mesajını da gösterir; sorunu anlamak kolaylaşır.
async function friendlyHttpError(res) {
  let msg = "", reason = "";
  try {
    const e = (await res.json())?.error || {};
    msg = e.message || "";
    reason = (e.details || []).find((d) => d.reason)?.reason || "";
  } catch {}
  const detail = msg ? ` (Google: ${msg})` : "";
  if (reason === "API_KEY_INVALID" || (res.status === 400 && /api key/i.test(msg)))
    return `Gemini API anahtarı geçersiz${detail}. Anahtarı aistudio.google.com/apikey adresinden yeniden kopyalayıp yapıştır.`;
  if (reason === "SERVICE_DISABLED" || /has not been used|is disabled/i.test(msg))
    return `Bu anahtarın Google projesinde Gemini API açık değil${detail}. En kolayı aistudio.google.com/apikey adresinden yeni anahtar oluşturmak.`;
  if (/referer|referrer|android|ip address|restrict/i.test(msg))
    return `Anahtarda kısıtlama var, bu uygulamadan kullanılamıyor${detail}. Google Cloud'da anahtarın "Uygulama kısıtlamaları"nı "Yok" yap ya da AI Studio'dan yeni anahtar al.`;
  if (/location|region|country/i.test(msg)) return `Gemini API bu bölgede kullanılamıyor${detail}.`;
  if (res.status === 401 || res.status === 403) return `Gemini anahtarı yetkisiz${detail}.`;
  if (res.status === 429) return `Gemini kota sınırına ulaşıldı, biraz bekleyip tekrar dene${detail}.`;
  if (res.status === 404) return `Model bulunamadı, ayarlardaki model adını kontrol et${detail}.`;
  return `Gemini hatası (${res.status})${detail}`;
}

export async function testGeminiKey(apiKey, model) {
  let res;
  try {
    res = await fetch(`${BASE}/models/${encodeURIComponent(model)}`, { headers: { "x-goog-api-key": apiKey } });
  } catch {
    throw new Error("Gemini'ye bağlanılamadı. İnternet bağlantını kontrol et.");
  }
  if (!res.ok) throw new Error(await friendlyHttpError(res));
  return `Anahtar çalışıyor, ${model} modeli kullanılabilir.`;
}

export async function analyzeWithGemini({ apiKey, model, url, note, onStatus, signal }) {
  onStatus("Gemini Google'da araştırıyor (sonuç bitince toplu gelir)...");
  let res;
  try {
    res = await fetch(
      `${BASE}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPrompt(url, note) }] }],
          tools: [{ url_context: {} }, { google_search: {} }],
        }),
        signal,
      },
    );
  } catch (err) {
    if (signal?.aborted) throw new Error("İptal edildi.");
    throw new Error("Gemini'ye bağlanılamadı. İnternet bağlantınızı kontrol edin.");
  }
  if (!res.ok) throw new Error(await friendlyHttpError(res));

  const data = await res.json();
  const cand = data.candidates?.[0];
  for (const q of cand?.groundingMetadata?.webSearchQueries || []) onStatus(`Arandı: "${q}"`);
  const text = (cand?.content?.parts || []).map((p) => p.text || "").join("");
  if (!text) {
    const reason = cand?.finishReason || data.promptFeedback?.blockReason || "bilinmiyor";
    throw new Error(`Gemini yanıt vermedi (sebep: ${reason}). Tekrar deneyin.`);
  }
  return parseResult(text);
}
