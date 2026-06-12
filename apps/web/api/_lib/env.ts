// Validated environment surface. Never re-export to the SPA.
import { z } from "zod";

const EnvSchema = z
  .object({
    /** Model provider: "openai" (default) or "gemini". */
    MODEL_PROVIDER: z.enum(["openai", "gemini"]).default("openai"),

    // OpenAI (default). Strongest mini for tool-calling agents: gpt-5.4-mini.
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default("gpt-5.4-mini"),

    // Gemini (alternative). Set MODEL_PROVIDER=gemini to use.
    GOOGLE_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

    // Per-stage model overrides. All optional; each falls back to the provider default above.
    // Stage 1 (router) wants a cheap classifier; stages 2 and 3 want a capable tool-using model.
    ROUTER_MODEL: z.string().optional(),
    TOOLS_MODEL: z.string().optional(),
    RESPONSE_MODEL: z.string().optional(),

    MCP_SERVER_URL: z.string().url().default("https://mcp.kapruka.com/mcp"),
    MCP_MOCK: z
      .string()
      .optional()
      .transform((v) => v === "1" || v === "true"),
    MAX_STEPS: z
      .string()
      .optional()
      .transform((v) => (v ? Number.parseInt(v, 10) : 8))
      .pipe(z.number().int().min(1).max(20)),
  })
  .superRefine((val, ctx) => {
    if (val.MODEL_PROVIDER === "gemini" && !val.GOOGLE_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GOOGLE_API_KEY is required when MODEL_PROVIDER=gemini",
        path: ["GOOGLE_API_KEY"],
      });
    }
    if (val.MODEL_PROVIDER === "openai" && !val.OPENAI_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "OPENAI_API_KEY is required when MODEL_PROVIDER=openai",
        path: ["OPENAI_API_KEY"],
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Bad gateway env: ${parsed.error.message}`);
  }
  cached = parsed.data;
  return cached;
}
