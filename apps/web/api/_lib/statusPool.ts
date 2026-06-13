// One-word, shopping- and gifting-themed status copy. The pipeline emits a
// `state`, and we pick a random word from the matching pool so each turn
// narrates itself a little differently (Claude-style, but on-brand).
//
// Stick to a single present-participle word per phrase. The bubble appends
// ellipsis + animated dots, so the word reads as ongoing without a verb tail.

type Pool = readonly string[];

const POOLS: Record<
  | "thinking"
  | "routing"
  | "searching"
  | "fetching"
  | "checking"
  | "creating"
  | "tracking"
  | "composing"
  | "working",
  Pool
> = {
  thinking: ["Pondering", "Mulling", "Brewing", "Plotting", "Wondering", "Cooking", "Hatching"],
  routing: ["Listening", "Tuning", "Reading", "Hearing", "Decoding", "Peeking"],
  searching: ["Hunting", "Combing", "Browsing", "Foraging", "Rummaging", "Scouring", "Sleuthing"],
  fetching: ["Unboxing", "Unwrapping", "Lifting", "Peeking", "Pulling", "Inspecting"],
  checking: ["Mapping", "Plotting", "Routing", "Pinging", "Calling", "Dispatching"],
  creating: ["Wrapping", "Sealing", "Folding", "Tying", "Boxing", "Bowing"],
  tracking: ["Tracking", "Trailing", "Watching", "Tracing", "Following"],
  composing: ["Penning", "Drafting", "Writing", "Scribbling", "Composing", "Phrasing"],
  working: ["Working", "Bustling", "Hustling", "Crafting", "Tinkering"],
};

export type StatusPoolKey = keyof typeof POOLS;

export function pickStatusLabel(key: StatusPoolKey): string {
  const pool = POOLS[key];
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? pool[0]!;
}
