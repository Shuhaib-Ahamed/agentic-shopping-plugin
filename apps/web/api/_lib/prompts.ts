import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve prompts/ relative to the project root regardless of where this module is bundled to.
// Vercel Functions ship a flattened bundle so an absolute path via process.cwd() is reliable.

const promptCache = new Map<string, string>();

export async function loadPrompt(name: string): Promise<string> {
  if (promptCache.has(name)) return promptCache.get(name)!;
  const root = process.cwd();
  const candidates = [
    path.join(root, "prompts", `${name}.md`),
    path.join(root, "apps", "web", "prompts", `${name}.md`),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "prompts", `${name}.md`),
  ];
  for (const p of candidates) {
    try {
      const text = await readFile(p, "utf-8");
      promptCache.set(name, text);
      return text;
    } catch {
      /* try next */
    }
  }
  throw new Error(`Prompt not found: ${name}`);
}
