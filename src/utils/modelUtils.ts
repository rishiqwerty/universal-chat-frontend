import type { ProviderModels } from "../api/api";

/**
 * Determines whether a model is classified as a Premium / Frontier model
 * requiring an upgrade plan or BYOK API key.
 */
export function isPremiumModel(
  provider: string | null,
  modelName: string,
  providerData?: ProviderModels
): boolean {
  if (!provider || !modelName) return false;

  // 1. Explicitly designated by backend
  if (providerData?.premium_models && providerData.premium_models.includes(modelName)) {
    return true;
  }

  const p = provider.toLowerCase();
  const m = modelName.toLowerCase();

  // 2. OpenAI frontier & reasoning models
  if (p === "openai") {
    if (m.includes("gpt-4o-mini") || m.includes("gpt-3.5") || m.includes("text-embedding")) return false;
    if (m.includes("gpt-4") || m.includes("o1") || m.includes("o3") || m.includes("dall-e")) return true;
  }

  // 3. Anthropic Sonnet & Opus
  if (p === "anthropic") {
    if (m.includes("haiku")) return false;
    if (m.includes("sonnet") || m.includes("opus") || m.includes("claude-3-7") || m.includes("claude-3-5")) return true;
  }

  // 4. Google Gemini Pro & Ultra tiers
  if (p === "gemini" || p === "google") {
    if (m.includes("flash-lite") || m.includes("flash")) return false;
    if (m.includes("pro") || m.includes("ultra")) return true;
  }

  // 5. DeepSeek Reasoner / R1
  if (p === "deepseek") {
    if (m.includes("reasoner") || m.includes("r1")) return true;
  }

  // 6. Non-free OpenRouter models
  if (p === "openrouter") {
    if (m.includes(":free")) return false;
    return true;
  }

  // 7. Non-free providers
  if (providerData && providerData.is_free === false) {
    return true;
  }

  return false;
}
