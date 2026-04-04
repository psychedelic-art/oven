// ─── Model Pricing Table ─────────────────────────────────────
// Prices are in cents per million tokens.

interface ModelPricing {
  inputPerMToken: number;
  outputPerMToken: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { inputPerMToken: 250, outputPerMToken: 1000 },
  'gpt-4o-mini': { inputPerMToken: 15, outputPerMToken: 60 },
  'gpt-4-turbo': { inputPerMToken: 1000, outputPerMToken: 3000 },
  'gpt-4': { inputPerMToken: 3000, outputPerMToken: 6000 },
  'gpt-3.5-turbo': { inputPerMToken: 50, outputPerMToken: 150 },
  'o1': { inputPerMToken: 1500, outputPerMToken: 6000 },
  'o1-mini': { inputPerMToken: 300, outputPerMToken: 1200 },
  'o1-pro': { inputPerMToken: 15000, outputPerMToken: 60000 },
  'text-embedding-3-small': { inputPerMToken: 2, outputPerMToken: 0 },
  'text-embedding-3-large': { inputPerMToken: 13, outputPerMToken: 0 },
  'dall-e-3': { inputPerMToken: 0, outputPerMToken: 0 }, // Image pricing is per-image, not per-token

  // Anthropic
  'claude-sonnet-4-20250514': { inputPerMToken: 300, outputPerMToken: 1500 },
  'claude-3-5-sonnet-20241022': { inputPerMToken: 300, outputPerMToken: 1500 },
  'claude-3-5-haiku-20241022': { inputPerMToken: 80, outputPerMToken: 400 },
  'claude-3-opus-20240229': { inputPerMToken: 1500, outputPerMToken: 7500 },

  // Google
  'gemini-2.0-flash': { inputPerMToken: 10, outputPerMToken: 40 },
  'gemini-1.5-pro': { inputPerMToken: 125, outputPerMToken: 500 },
  'gemini-1.5-flash': { inputPerMToken: 8, outputPerMToken: 30 },
};

// ─── Public API ──────────────────────────────────────────────

/**
 * Calculate cost in cents for a given model and token counts.
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMToken;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMToken;

  // Round to nearest cent (minimum 0)
  return Math.max(0, Math.round((inputCost + outputCost) * 100) / 100);
}

/**
 * Get pricing info for a model. Returns null if model is unknown.
 */
export function getModelPricing(model: string): ModelPricing | null {
  return MODEL_PRICING[model] ?? null;
}

/**
 * Check if a model has known pricing.
 */
export function hasModelPricing(model: string): boolean {
  return model in MODEL_PRICING;
}
