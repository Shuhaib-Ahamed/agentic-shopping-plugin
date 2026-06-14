// Default pricing table. The admin pricing editor edits this in Mongo when
// MONGODB_URI is set. With no Mongo, the seed and admin APIs fall back to this.
// USD per 1M tokens. Effective dates align with hypothetical OpenAI price cuts.
import type { PricingRow } from "./mongo.js";

export const PRICING: PricingRow[] = [
  {
    // Default runtime model. Cheapest tool-calling tier in the OpenAI lineup.
    model: "gpt-5-nano",
    inputPer1M: 0.05,
    cachedInputPer1M: 0.025,
    outputPer1M: 0.4,
    reasoningPer1M: 0,
    currency: "USD",
    effectiveFrom: "2026-01-01",
  },
  {
    model: "gpt-5.1-mini",
    inputPer1M: 0.4,
    cachedInputPer1M: 0.2,
    outputPer1M: 1.6,
    reasoningPer1M: 0,
    currency: "USD",
    effectiveFrom: "2026-01-01",
  },
  {
    model: "gpt-4.1-nano",
    inputPer1M: 0.1,
    cachedInputPer1M: 0.05,
    outputPer1M: 0.4,
    reasoningPer1M: 0,
    currency: "USD",
    effectiveFrom: "2026-01-01",
  },
  {
    model: "gpt-5.1",
    inputPer1M: 1.25,
    cachedInputPer1M: 0.65,
    outputPer1M: 5.0,
    reasoningPer1M: 5.0,
    currency: "USD",
    effectiveFrom: "2026-01-01",
  },
];
