import { defineWorkflow } from "@withlocus/workflows";

export function normalizeInput(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("input must be an object");
  }
  return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)));
}

export default defineWorkflow({
  async run(ctx, input: unknown) {
    const normalized = normalizeInput(input);
    await ctx.checkpoint("accepted-input", { keys: Object.keys(normalized) });
    return { status: "complete", input: normalized };
  },
});
