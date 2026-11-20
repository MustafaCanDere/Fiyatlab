// OpenAI ile ürün analizi (Responses API + web_search aracı).
import { buildPrompt, parseResult } from "../prompt.js";

async function friendlyHttpError(res) {
  let msg = "";
  try { msg = (await res.json())?.error?.message || ""; } catch {}
  if (res.status === 401) return "OpenAI API anahtarı geçersiz. Ayarlardan kontrol edin.";
  if (res.status === 429) return /quota|billing/i.test(msg)
    ? "OpenAI hesabınızda kredi/kota yok. platform.openai.com üzerinden kontrol edin."
    : "Çok fazla istek gönderildi, biraz bekleyip tekrar deneyin.";
  if (res.status === 404) return `Model bulunamadı. Ayarlardaki model adını kontrol edin. ${msg}`;
  return `OpenAI hatası (${res.status}): ${msg}`;
}

export async function analyzeWithOpenAI({ apiKey, model, url, note, onStatus, signal }) {
  onStatus("OpenAI web'de araştırıyor (sonuç bitince toplu gelir)...");
  let res;
  try {
    res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: buildPrompt(url, note),
        tools: [{ type: "web_search", user_location: { type: "approximate", country: "TR", city: "Istanbul" } }],
        tool_choice: "auto",
      }),
      signal,
    });
  } catch (err) {
    if (signal?.aborted) throw new Error("İptal edildi.");
    throw new Error("OpenAI'ye bağlanılamadı. İnternet bağlantınızı kontrol edin.");
  }
  if (!res.ok) throw new Error(await friendlyHttpError(res));

  const data = await res.json();
  for (const item of data.output || []) {
    if (item.type === "web_search_call" && item.action?.query) onStatus(`Arandı: "${item.action.query}"`);
  }
  const text = (data.output || [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content || [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text)
    .join("");
  if (!text) throw new Error("OpenAI boş yanıt döndü. Tekrar deneyin.");
  return parseResult(text);
}
