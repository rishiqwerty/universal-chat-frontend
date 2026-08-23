import type { ProviderModels } from "../api/api";

/**
 * Normalizes provider keys so that aliases (e.g. google)
 * map to a canonical single provider name (e.g. gemini).
 */
export function normalizeProviderName(provider: string): string {
  if (!provider) return "";
  const p = provider.toLowerCase().trim();
  if (p === "google") return "gemini";
  return p;
}

/**
 * Merges multiple provider records with the same canonical provider name
 * into a single unified ProviderModels object with all models combined.
 */
export function mergeProviderModels(providers: ProviderModels[]): ProviderModels[] {
  if (!providers || !Array.isArray(providers)) return [];
  const mergedMap = new Map<string, ProviderModels>();

  for (const item of providers) {
    const canonicalKey = normalizeProviderName(item.provider);
    if (!mergedMap.has(canonicalKey)) {
      mergedMap.set(canonicalKey, {
        ...item,
        provider: canonicalKey,
        display_name: canonicalKey.charAt(0).toUpperCase() + canonicalKey.slice(1),
        text_models: [...(item.text_models || [])],
        image_models: [...(item.image_models || [])],
        premium_models: [...(item.premium_models || [])],
        reachable_models: item.reachable_models ? [...item.reachable_models] : undefined,
        model_speeds: item.model_speeds ? { ...item.model_speeds } : undefined,
      });
    } else {
      const existing = mergedMap.get(canonicalKey)!;
      // Merge models uniquely
      existing.text_models = Array.from(new Set([...existing.text_models, ...(item.text_models || [])]));
      existing.image_models = Array.from(new Set([...(existing.image_models || []), ...(item.image_models || [])]));
      existing.premium_models = Array.from(new Set([...(existing.premium_models || []), ...(item.premium_models || [])]));

      if (item.reachable_models && existing.reachable_models) {
        existing.reachable_models = Array.from(new Set([...existing.reachable_models, ...item.reachable_models]));
      }
      if (item.model_speeds) {
        existing.model_speeds = { ...existing.model_speeds, ...item.model_speeds };
      }

      // If either has is_free or is_byok_configured, retain true
      if (item.is_free) existing.is_free = true;
      if (item.is_byok_configured) existing.is_byok_configured = true;

      // Keep best latency/status
      if (item.status === "online") existing.status = "online";
      if (item.latency_ms && (!existing.latency_ms || item.latency_ms < existing.latency_ms)) {
        existing.latency_ms = item.latency_ms;
      }
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Determines whether a model is classified as a Premium / Frontier model
 * requiring an upgrade plan or BYOK API key.
 *
 * If model in API response has is_free === true, then it is treated as free.
 */
export function isPremiumModel(
  provider: string | null,
  modelName: string,
  providerData?: ProviderModels
): boolean {
  if (!provider || !modelName) return false;

  // 1. If backend explicitly provides premium_models list
  if (providerData?.premium_models && Array.isArray(providerData.premium_models) && providerData.premium_models.length > 0) {
    return providerData.premium_models.includes(modelName);
  }

  // 2. If provider in API response is marked is_free === true, then it is free
  if (providerData?.is_free === true) {
    return false;
  }

  // 3. If provider is explicitly marked non-free and BYOK is not configured
  if (providerData && providerData.is_free === false) {
    return !providerData.is_byok_configured;
  }

  const p = normalizeProviderName(provider);
  const m = modelName.toLowerCase();

  // Fallback heuristics only when API providerData is not available
  if (p === "openai") {
    if (m.includes("gpt-4o-mini") || m.includes("gpt-3.5") || m.includes("text-embedding")) return false;
    if (m.includes("gpt-4") || m.includes("o1") || m.includes("o3") || m.includes("dall-e")) return true;
  }

  if (p === "anthropic") {
    if (m.includes("haiku")) return false;
    if (m.includes("sonnet") || m.includes("opus") || m.includes("claude-3-7") || m.includes("claude-3-5")) return true;
  }

  if (p === "gemini") {
    if (m.includes("flash-lite") || m.includes("flash")) return false;
    if (m.includes("pro") || m.includes("ultra")) return true;
  }

  if (p === "deepseek") {
    if (m.includes("reasoner") || m.includes("r1")) return true;
  }

  return false;
}
