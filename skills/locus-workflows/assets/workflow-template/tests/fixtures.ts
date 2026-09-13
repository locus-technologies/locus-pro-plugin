export default function runFixtures(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("fixture input must be an object");
  return { ok: true, cases: ["input-contract"] };
}
