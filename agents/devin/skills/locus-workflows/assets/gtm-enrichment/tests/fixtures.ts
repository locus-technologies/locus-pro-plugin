/* oxlint-disable anti-slop/no-unknown-parameters -- Fixtures deliberately send hostile unknown values through the exported Workflow input boundary and assert its exact rejection behavior. */
import { parseInput, parseOutput } from '../workflow.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function rejects(input: unknown, expected: string): void {
  try {
    parseInput(input);
  } catch (error) {
    assert(error instanceof Error && error.message.includes(expected), `expected ${expected}`);
    return;
  }
  throw new Error(`expected rejection: ${expected}`);
}

export default function runFixtures() {
  const valid = parseInput({
    records: [
      {
        id: 'acme',
        entity: { kind: 'company', identifiers: { companyDomain: 'acme.example' } },
        profile: 'company_core',
      },
    ],
    concurrency: 3,
  });
  assert(valid.records[0]?.id === 'acme', 'stable record id must survive parsing');
  assert(valid.maxCreditsPerRecord === '1000', 'credit ceiling must default internally');
  assert(
    parseInput({ records: valid.records, maxCreditsPerRecord: '1500' }).maxCreditsPerRecord ===
      '1500',
    'explicit credit ceiling must survive parsing',
  );
  const output = parseOutput({ records: [{ id: 'acme', enrichment: { company: 'Acme' } }] });
  assert(output.records[0]?.id === 'acme', 'output record id must survive parsing');

  rejects({ records: valid.records, maxCreditsPerRecord: '0' }, 'positive decimal');
  rejects(
    { records: [...valid.records, valid.records[0]], maxCreditsPerRecord: '1000' },
    'duplicate record id',
  );
  rejects({ records: valid.records, maxCreditsPerRecord: '1000', concurrency: 0 }, 'concurrency');
  rejects(
    {
      records: [
        {
          id: 'phone-only',
          entity: { kind: 'person', identifiers: { phone: '+14155550100' } },
        },
      ],
      maxCreditsPerRecord: '1000',
    },
    'person record needs',
  );
  rejects(
    {
      records: [
        {
          id: 'unsupported',
          entity: { kind: 'company', identifiers: { website: 'https://acme.example' } },
        },
      ],
      maxCreditsPerRecord: '1000',
    },
    'unsupported field',
  );
  try {
    parseOutput({ records: [{ id: 'acme' }] });
    throw new Error('expected output rejection');
  } catch (error) {
    assert(error instanceof Error && error.message.includes('needs enrichment'), 'output shape');
  }

  return {
    ok: true,
    assertions: 10,
    cases: [
      'valid-company',
      'invalid-ceiling',
      'duplicate-id',
      'invalid-concurrency',
      'phone-only-person',
      'unsupported-identifier',
      'valid-output',
      'invalid-output',
    ],
  };
}
