// Claude ile ürün analizi. Tarayıcıda / Android WebView içinde doğrudan çalışır;
// API anahtarı kullanıcının kendi cihazında saklanır.
import Anthropic from "@anthropic-ai/sdk";

const MAX_CONTINUATIONS = 5;

const TOOLS = [
  {
    type: "web_search_20260209",
    name: "web_search",
    max_uses: 12,
    user_location: { type: "approximate", country: "TR", city: "Istanbul", timezone: "Europe/Istanbul" },
  },
  { type: "web_fetch_20260209", name: "web_fetch", max_uses: 8, max_content_tokens: 30000 },
];

function buildPrompt(url, note) {
  return `Sen Türkiye'deki alışveriş sitelerini (Trendyol, Hepsiburada, Amazon.com.tr, n11, Akakçe, Cimri vb.) çok iyi bilen, tarafsız bir ürün danışmanısın.

Kullanıcı şu ürünü inceliyor: ${url}
${note ? `Kullanıcının notu / ihtiyacı: ${note}\n` : ""}
Görevin:
1. Önce web_fetch ile ürün sayfasını oku. Sayfa açılmazsa ürün adını linkten çıkar ve web_search ile bul.
2. Ürünün özelliklerini, fiyatını ve satıcısını belirle.
3. Kullanıcı yorumlarını ve bağımsız incelemeleri ara (ör. "<ürün adı> yorum", "<ürün adı> şikayet", şikayetvar, forumlar, YouTube inceleme özetleri).
4. Aynı ürünün başka mağazalardaki fiyatlarını kontrol et (Akakçe / Cimri gibi fiyat karşılaştırma siteleri işe yarar).
5. Aynı fiyat aralığında veya biraz üstünde DAHA İYİ ya da DAHA UCUZ alternatifleri araştır; her alternatif için gerçek bir ürün sayfası linki bul.
Sadece gerçekten bulduğun bilgileri yaz; emin olmadığın fiyat veya puanları "bilinmiyor" diye belirt, uydurma.

Araştırma bittiğinde, SON mesajında yalnızca aşağıdaki yapıda TEK bir JSON nesnesi yaz (açıklama metni ekleme, tüm metinler Türkçe olsun):
{
  "urun": { "ad": string, "marka": string, "kategori": string, "magaza": string, "fiyat": string, "ozet": string },
  "puan": { "genel": number (0-10), "fiyat_performans": number (0-10), "kalite": number (0-10), "kullanici_memnuniyeti": number (0-10) },
  "fiyat_analizi": {
    "degerlendirme": "Ucuz" | "Normal" | "Pahalı" | "Bilinmiyor",
    "aciklama": string,
    "diger_saticilar": [ { "magaza": string, "fiyat": string, "url": string } ]
  },
  "ozellikler": [ { "ad": string, "deger": string } ],
  "artilar": [string],
  "eksiler": [string],
  "yorum_ozeti": { "genel_kanaat": string, "sik_ovgular": [string], "sik_sikayetler": [string], "puan_ortalamasi": string },
  "dikkat_edilecekler": [string],
  "alternatifler": [
    { "ad": string, "fiyat": string, "tip": "Daha iyi" | "Daha ucuz" | "Benzer" | "Üst segment", "neden": string, "url": string }
  ],
  "karar": { "tavsiye": "Al" | "Bekle" | "Alternatife bak" | "Alma", "aciklama": string },
  "kaynaklar": [ { "baslik": string, "url": string } ]
}
En az 3, en fazla 6 alternatif öner. Artılar ve eksiler 3-6 madde olsun.`;
}

function parseJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

function describeToolUse(block) {
  const input = block.input || {};
  if (block.name === "web_search") return `Aranıyor: "${input.query ?? ""}"`;
  if (block.name === "web_fetch") return `Sayfa okunuyor: ${input.url ?? ""}`;
  return `Araç kullanılıyor: ${block.name}`;
}

function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) return "API anahtarı geçersiz. Ayarlardan kontrol edin.";
  if (err instanceof Anthropic.PermissionDeniedError) return "Bu API anahtarının bu modele erişimi yok.";
  if (err instanceof Anthropic.RateLimitError) return "Çok fazla istek gönderildi, biraz bekleyip tekrar deneyin.";
  if (err instanceof Anthropic.APIConnectionError) return "Claude'a bağlanılamadı. İnternet bağlantınızı kontrol edin.";
  if (err instanceof Anthropic.APIError) {
    if (err.status === 400 && /credit/i.test(err.message)) return "API hesabınızda kredi yok. console.anthropic.com üzerinden kredi yükleyin.";
    return `Claude API hatası (${err.status ?? "?"}): ${err.message}`;
  }
  return err?.message || "Bilinmeyen hata";
}

/**
 * @param {{apiKey: string, model: string, url: string, note?: string, onStatus: (t: string) => void, signal?: AbortSignal}} opts
 */
export async function analyze({ apiKey, model, url, note, onStatus, signal }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const messages = [{ role: "user", content: buildPrompt(url, note) }];
  let final;

  try {
    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      const stream = client.beta.messages.stream(
        {
          model,
          max_tokens: 32000,
          thinking: { type: "adaptive" },
          output_config: { effort: "high" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          tools: TOOLS,
          messages,
        },
        { signal },
      );
      stream.on("contentBlock", (block) => {
        if (block.type === "server_tool_use") onStatus(describeToolUse(block));
      });
      final = await stream.finalMessage();

      if (final.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: final.content });
        onStatus("Araştırma sürüyor...");
        continue;
      }
      break;
    }
  } catch (err) {
    if (signal?.aborted) throw new Error("İptal edildi.");
    console.error(err);
    throw new Error(friendlyError(err));
  }

  if (final.stop_reason === "refusal") throw new Error("Claude bu isteği yanıtlamayı reddetti.");
  if (final.stop_reason === "pause_turn") throw new Error("Araştırma çok uzun sürdü, lütfen tekrar deneyin.");

  const text = final.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    return parseJson(text);
  } catch {
    throw new Error("Sonuç okunamadı. Lütfen tekrar deneyin.");
  }
}
