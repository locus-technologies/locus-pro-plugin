import { defineWorkflow } from "@withlocus/workflows";

export default defineWorkflow({
  async run(ctx, input: Record<string, unknown>) {
    await ctx.checkpoint("accepted-input", { keys: Object.keys(input).sort() });
    return { status: "complete", input };
  },
});
