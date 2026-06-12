// Model client and message-shape helpers.
//
// The OpenAI SDK is used for both providers, but pointed at different base
// URLs. Google exposes an OpenAI-compatible Chat Completions endpoint at
// `https://generativelanguage.googleapis.com/v1beta/openai/`, so the same SDK
// works for gemini-2.5-flash with only the apiKey and baseURL changed.

import OpenAI from "openai";
import { env } from "./env";

let cachedClient: OpenAI | null = null;

/** Provider-aware OpenAI SDK client. Connect once per cold start. */
export function modelClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const e = env();
  if (e.MODEL_PROVIDER === "gemini") {
    cachedClient = new OpenAI({
      apiKey: e.GOOGLE_API_KEY!,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
  } else {
    cachedClient = new OpenAI({ apiKey: e.OPENAI_API_KEY! });
  }
  return cachedClient;
}

export function modelName(): string {
  const e = env();
  return e.MODEL_PROVIDER === "gemini" ? e.GEMINI_MODEL : e.OPENAI_MODEL;
}

export function modelProvider(): "gemini" | "openai" {
  return env().MODEL_PROVIDER;
}

export type StageName = "router" | "tools" | "response";

/** Per-stage model name. Falls back to the provider default if no override is set. */
export function stageModel(stage: StageName): string {
  const e = env();
  const override =
    stage === "router" ? e.ROUTER_MODEL : stage === "tools" ? e.TOOLS_MODEL : e.RESPONSE_MODEL;
  return override ?? modelName();
}

// -----------------------------------------------------------------------------
// Chat Completions message + tool shapes (subset we use).
// -----------------------------------------------------------------------------

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessageItem {
  role: ChatRole;
  content?: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
