// Google Gemini ile ürün analizi (generateContent + Google Arama ve URL okuma araçları).
import { buildPrompt, parseResult } from "../prompt.js";

async function friendlyHttpError(res) {
  let msg = "";
  try { msg = (await res.json())?.error?.message || ""; } catch {}
  if (res.status === 400 && /api key/i.test(msg)) return "Gemini API anahtarı geçersiz. Ayarlardan kontrol edin.";
  if (res.status === 401 || res.status === 403) return "Gemini API anahtarı geçersiz veya yetkisiz. Ayarlardan kontrol edin.";
  if (res.status === 429) return "Gemini kota sınırına ulaşıldı, biraz bekleyip tekrar deneyin.";
  if (res.status === 404) return `Model bulunamadı. Ayarlardaki model adını kontrol edin. ${msg}`;
  return `Gemini hatası (${res.status}): ${msg}`;
}

export async function analyzeWithGemini({ apiKey, model, url, note, onStatus, signal }) {
  onStatus("Gemini Google'da araştırıyor (sonuç bitince toplu gelir)...");
  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
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
