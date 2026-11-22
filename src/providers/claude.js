// Claude ile ürün analizi. Tarayıcıda / Android WebView içinde doğrudan çalışır;
// API anahtarı kullanıcının kendi cihazında saklanır.
import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt, parseResult } from "../prompt.js";

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

function describeToolUse(block) {
  const input = block.input || {};
  if (block.name === "web_search") return `Aranıyor: "${input.query ?? ""}"`;
  if (block.name === "web_fetch") return `Sayfa okunuyor: ${input.url ?? ""}`;
  return `Araç kullanılıyor: ${block.name}`;
}

function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) return "Claude API anahtarı geçersiz. console.anthropic.com adresinden yeniden kopyala.";
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
export async function analyzeWithClaude({ apiKey, model, url, note, onStatus, signal }) {
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
  return parseResult(text);
}

export async function testClaudeKey(apiKey, model) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0 });
  try {
    await client.models.retrieve(model);
  } catch (err) {
    throw new Error(friendlyError(err));
  }
  return `Anahtar çalışıyor, ${model} modeli kullanılabilir.`;
}
