// AsyncLocalStorage binding for the active turn tracer. Lets the structured
// logger and any nested code call into the tracer without passing it through
// every function signature.
import { AsyncLocalStorage } from "node:async_hooks";
import type { TurnTracer } from "./tracer";

const store = new AsyncLocalStorage<TurnTracer>();

export function runWithTracer<T>(tracer: TurnTracer, fn: () => Promise<T> | T): Promise<T> | T {
  return store.run(tracer, fn);
}

export function getActiveTracer(): TurnTracer | undefined {
  return store.getStore();
}
