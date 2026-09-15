import { normalizeInput } from "../workflow.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export default function runFixtures() {
  const normalized = normalizeInput({ zebra: 2, alpha: 1 });
  assert(JSON.stringify(normalized) === '{"alpha":1,"zebra":2}', "input keys must be stable");

  let rejected = false;
  try {
    normalizeInput(["not", "an", "object"]);
  } catch {
    rejected = true;
  }
  assert(rejected, "array input must be rejected");
  return { ok: true, assertions: 2, cases: ["stable-input", "invalid-input"] };
}
