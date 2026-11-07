import { defineWorkflow } from "@withlocus/workflows";

export function normalizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("input must be an object");
  }
  return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)));
}

export function normalizeOutput(output: unknown): { status: "complete"; input: Record<string, unknown> } {
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new Error("output must be an object");
  }
  const candidate = output as { status?: unknown; input?: unknown };
  if (candidate.status !== "complete") throw new Error("output status must be complete");
  return { status: "complete", input: normalizeInput(candidate.input) };
}

export default defineWorkflow<Record<string, unknown>, { status: "complete"; input: Record<string, unknown> }>({
  input: { parse: normalizeInput },
  output: { parse: normalizeOutput },
  async run(ctx, input: unknown) {
    await ctx.checkpoint("accepted-input", { keys: Object.keys(input) });
    return { status: "complete", input };
  },
});
