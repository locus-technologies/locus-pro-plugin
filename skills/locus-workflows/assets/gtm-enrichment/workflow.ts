/* oxlint-disable anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters -- Workflow input arrives as untrusted JSON; parseInput establishes the record, entity, ceiling, and concurrency contract before any provider call. */
import { defineWorkflow } from '@withlocus/workflows';

interface GtmRecord {
  id: string;
  entity: {
    kind: 'person' | 'company';
    identifiers: Record<string, string>;
  };
  profile?: 'person_core' | 'person_contact' | 'company_core' | 'company_intelligence' | 'full';
  requestedFields?: string[];
}

interface GtmWorkflowInput {
  records: GtmRecord[];
  maxCreditsPerRecord: string;
  concurrency?: number;
}

interface GtmWorkflowOutput {
  records: Array<{ id: string; enrichment: unknown }>;
}

interface GtmWorkflowOutputValue {
  records?: unknown;
}

const IDENTIFIER_KEYS = [
  'fullName',
  'firstName',
  'lastName',
  'email',
  'phone',
  'linkedinUrl',
  'companyName',
  'companyDomain',
  'companyLinkedinUrl',
  'companyId',
  'personId',
  'ipAddress',
] as const;
const IDENTIFIER_KEY_SET: ReadonlySet<string> = new Set(IDENTIFIER_KEYS);
const PROFILES = [
  'person_core',
  'person_contact',
  'company_core',
  'company_intelligence',
  'full',
] as const;
const REQUESTED_FIELDS = [
  'person.fullName',
  'person.firstName',
  'person.lastName',
  'person.jobTitle',
  'person.location',
  'person.linkedinUrl',
  'person.workEmail',
  'person.personalEmail',
  'person.mobilePhone',
  'company.name',
  'company.domain',
  'company.website',
  'company.linkedinUrl',
  'company.description',
  'company.industry',
  'company.employeeCount',
  'company.employeeRange',
  'company.revenueRange',
  'company.headquarters',
  'company.phone',
  'company.technologies',
  'company.funding',
  'company.hiring',
] as const;

interface WorkflowInputValue {
  records?: unknown;
  maxCreditsPerRecord?: unknown;
  concurrency?: unknown;
}

interface RecordValue {
  id?: unknown;
  entity?: unknown;
  profile?: unknown;
  requestedFields?: unknown;
}

interface EntityValue {
  kind?: unknown;
  identifiers?: unknown;
}

interface IdentifierValue {
  fullName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  linkedinUrl?: unknown;
  companyName?: unknown;
  companyDomain?: unknown;
  companyLinkedinUrl?: unknown;
  companyId?: unknown;
  personId?: unknown;
  ipAddress?: unknown;
}

function objectValue<T extends object>(value: unknown, label: string): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  // SAFETY: The caller supplies the owner shape, and every consumed field is validated before use.
  return value as T;
}

function isOneOf<const Value extends string>(
  values: readonly Value[],
  candidate: unknown,
): candidate is Value {
  return typeof candidate === 'string' && values.some((value) => value === candidate);
}

function parseIdentifiers(
  value: unknown,
  kind: 'person' | 'company',
): GtmRecord['entity']['identifiers'] {
  const input = objectValue<IdentifierValue>(value, 'identifiers');
  const unsupported = Object.keys(input).find((key) => !IDENTIFIER_KEY_SET.has(key));
  if (unsupported) throw new Error(`identifiers contains unsupported field: ${unsupported}`);
  const identifiers: GtmRecord['entity']['identifiers'] = {};
  for (const key of IDENTIFIER_KEYS) {
    const raw = input[key];
    if (raw === undefined) continue;
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      throw new Error(`identifier ${key} must be a nonempty string`);
    }
    const normalized = raw.trim();
    const maximum = ['linkedinUrl', 'companyLinkedinUrl'].includes(key) ? 2_000 : key === 'email' ? 320 : 500;
    if (normalized.length > maximum) throw new Error(`identifier ${key} is too long`);
    if (key === 'phone' && normalized.length < 7) throw new Error('identifier phone is too short');
    if (key === 'companyDomain' && normalized.length < 3) {
      throw new Error('identifier companyDomain is too short');
    }
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new Error('identifier email must be an email address');
    }
    if (
      ['linkedinUrl', 'companyLinkedinUrl'].includes(key) &&
      !/^[a-z][a-z\d+.-]*:\/\/\S+$/i.test(normalized)
    ) {
      throw new Error(`identifier ${key} must be a URL`);
    }
    identifiers[key] = normalized;
  }
  const has = (key: string) => Boolean(identifiers[key]);
  if (kind === 'company') {
    if (!['companyDomain', 'companyName', 'companyLinkedinUrl', 'companyId'].some(has)) {
      throw new Error('company record needs a domain, name, profile URL, or provider ID');
    }
  } else {
    const direct = ['email', 'linkedinUrl', 'personId'].some(has);
    const named =
      (has('fullName') || (has('firstName') && has('lastName'))) &&
      ['companyDomain', 'companyName', 'companyLinkedinUrl'].some(has);
    if (!direct && !named) {
      throw new Error('person record needs an email, profile URL, provider ID, or name plus company');
    }
  }
  return identifiers;
}

export function parseInput(value: unknown): GtmWorkflowInput {
  const candidate = objectValue<WorkflowInputValue>(value, 'input');
  const unsupportedInput = Object.keys(candidate).find(
    (key) => !['records', 'maxCreditsPerRecord', 'concurrency'].includes(key),
  );
  if (unsupportedInput) throw new Error(`input contains unsupported field: ${unsupportedInput}`);
  if (
    !Array.isArray(candidate.records) ||
    candidate.records.length === 0 ||
    typeof candidate.maxCreditsPerRecord !== 'string' ||
    !/^\d+(?:\.\d{1,6})?$/.test(candidate.maxCreditsPerRecord) ||
    Number(candidate.maxCreditsPerRecord) <= 0
  ) {
    throw new Error('records and maxCreditsPerRecord are required');
  }
  let concurrency: number | undefined;
  if (candidate.concurrency !== undefined) {
    if (
      typeof candidate.concurrency !== 'number' ||
      !Number.isInteger(candidate.concurrency) ||
      candidate.concurrency < 1 ||
      candidate.concurrency > 20
    ) {
      throw new Error('concurrency must be an integer from 1 through 20');
    }
    concurrency = candidate.concurrency;
  }
  const ids = new Set<string>();
  const records = candidate.records.map((rawRecord, index): GtmRecord => {
    const record = objectValue<RecordValue>(rawRecord, `record ${index}`);
    const unsupportedRecord = Object.keys(record).find(
      (key) => !['id', 'entity', 'profile', 'requestedFields'].includes(key),
    );
    if (unsupportedRecord) {
      throw new Error(`record ${index} contains unsupported field: ${unsupportedRecord}`);
    }
    if (typeof record.id !== 'string' || record.id.trim().length === 0) {
      throw new Error(`record ${index} needs a stable id`);
    }
    const id = record.id.trim();
    if (ids.has(id)) throw new Error(`duplicate record id: ${id}`);
    ids.add(id);
    const entity = objectValue<EntityValue>(record.entity, `record ${id} entity`);
    const unsupportedEntity = Object.keys(entity).find(
      (key) => !['kind', 'identifiers'].includes(key),
    );
    if (unsupportedEntity) {
      throw new Error(`record ${id} entity contains unsupported field: ${unsupportedEntity}`);
    }
    if (entity.kind !== 'person' && entity.kind !== 'company') {
      throw new Error(`record ${id} needs a person or company entity kind`);
    }
    const profile = record.profile;
    if (profile !== undefined && !isOneOf(PROFILES, profile)) {
      throw new Error(`record ${id} has an unsupported profile`);
    }
    let requestedFields: string[] | undefined;
    if (record.requestedFields !== undefined) {
      if (!Array.isArray(record.requestedFields) || record.requestedFields.length === 0) {
        throw new Error(`record ${id} has unsupported requestedFields`);
      }
      requestedFields = [];
      for (const field of record.requestedFields) {
        if (!isOneOf(REQUESTED_FIELDS, field)) {
          throw new Error(`record ${id} has unsupported requestedFields`);
        }
        requestedFields.push(field);
      }
    }
    const parsed: GtmRecord = {
      id,
      entity: { kind: entity.kind, identifiers: parseIdentifiers(entity.identifiers, entity.kind) },
    };
    if (profile) parsed.profile = profile;
    if (requestedFields) parsed.requestedFields = [...requestedFields];
    return parsed;
  });
  const parsed: GtmWorkflowInput = {
    records,
    maxCreditsPerRecord: candidate.maxCreditsPerRecord,
  };
  if (concurrency !== undefined) parsed.concurrency = concurrency;
  return parsed;
}

export function parseOutput(value: unknown): GtmWorkflowOutput {
  const candidate = objectValue<GtmWorkflowOutputValue>(value, 'output');
  if (!Array.isArray(candidate.records)) throw new Error('output records must be an array');
  const records = candidate.records.map((rawRecord, index) => {
    const record = objectValue<{ id?: unknown; enrichment?: unknown }>(
      rawRecord,
      `output record ${index}`,
    );
    if (typeof record.id !== 'string' || record.id.length === 0) {
      throw new Error(`output record ${index} needs an id`);
    }
    if (!Object.hasOwn(record, 'enrichment')) {
      throw new Error(`output record ${record.id} needs enrichment`);
    }
    return { id: record.id, enrichment: record.enrichment };
  });
  return { records };
}

export default defineWorkflow<GtmWorkflowInput, GtmWorkflowOutput>({
  input: { parse: parseInput },
  output: { parse: parseOutput },
  async run(ctx, input) {
    const records = await ctx.mapRows('records', input.records, {
      key: (record) => record.id,
      concurrency: input.concurrency ?? 3,
      async run(row, record) {
        const enrichment = await row.call(
          'gtmEnrich',
          'enrich',
          {
            entity: record.entity,
            ...(record.profile ? { profile: record.profile } : {}),
            ...(record.requestedFields ? { requestedFields: record.requestedFields } : {}),
            maxCredits: input.maxCreditsPerRecord,
          },
          { maxChargeCredits: input.maxCreditsPerRecord },
        );
        await row.checkpoint('complete', { id: record.id });
        return { id: record.id, enrichment };
      },
    });
    return { records };
  },
});
