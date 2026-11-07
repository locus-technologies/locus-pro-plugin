# Customer Workflow

Replace the example with the customer's parameterized process. Keep provider
bindings in `workflow.json` and `locus.lock.json`, then run structural checks
and fixture tests before any live pilot. Do not add secrets or package-manager
install hooks.

`workflow.json` is the server-enforced binding contract. `locus.lock.json` is
an optional review/export aid and must match it; it never widens run authority.
The fixed fixture runner calls the default export from `tests/fixtures.ts`
without network or live provider access. The example imports and exercises the
pure input/output parsers from `../workflow.ts`; replace those assertions with
the customer's real boundary and business invariants. Provider calls return
the raw response body described by the binding's output schema, not an MCP
`data` envelope.

Template files: [workflow.json](workflow.json), [workflow.ts](workflow.ts),
[locus.lock.json](locus.lock.json), and [fixture test](tests/fixtures.ts).
