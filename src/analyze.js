// Seçilen yapay zeka sağlayıcısına göre analizi başlatır.
import { analyzeWithClaude, testClaudeKey } from "./providers/claude.js";
import { analyzeWithOpenAI, testOpenAIKey } from "./providers/openai.js";
import { analyzeWithGemini, testGeminiKey } from "./providers/gemini.js";

export const PROVIDERS = {
  claude: {
    label: "Claude (Anthropic)",
    keyHint: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: ["claude-opus-5-5", "claude-sonnet-5-5"],
    run: analyzeWithClaude,
    test: testClaudeKey,
  },
  openai: {
    label: "ChatGPT (OpenAI)",
    keyHint: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    models: ["gpt-6.2-astra"],
    run: analyzeWithOpenAI,
    test: testOpenAIKey,
  },
  gemini: {
    label: "Gemini (Google)",
    keyHint: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
    models: ["gemini-3.5-flash", "gemini-3.1-pro-preview"],
    run: analyzeWithGemini,
    test: testGeminiKey,
  },
};

export function analyze({ provider, ...opts }) {
  const p = PROVIDERS[provider] || PROVIDERS.claude;
  return p.run(opts);
}

export function testKey(provider, apiKey, model) {
  return (PROVIDERS[provider] || PROVIDERS.claude).test(apiKey, model);
}
