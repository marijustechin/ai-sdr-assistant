import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './helpers/database.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

interface Json {
  [key: string]: unknown;
}

async function createApp(): Promise<NestFastifyApplication> {
  const newApp = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await newApp.init();
  return newApp;
}

describe('Contact-discovery API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma.db);
  });

  async function api(
    method: 'POST' | 'GET' | 'PATCH',
    url: string,
    payload?: unknown,
    key: string | null = INTERNAL_KEY,
  ) {
    return app.inject({
      method,
      url,
      ...(payload !== undefined ? { payload: payload as object } : {}),
      headers: key === null ? {} : { 'x-internal-api-key': key },
    });
  }

  /** Seeds a company through the lead flow (companies are owned by lead-discoverer). */
  async function seedCompany(
    companyName = 'Pirties Meistrai',
  ): Promise<string> {
    const product = (await api('POST', '/products', { name: 'Abachi' })).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi STS 3D',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'LT',
        segment: 'sauna builders',
      })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Thermo Abachi cladding',
      })
    ).json() as Json;
    await api('POST', `/opportunities/${opportunity.id as string}/target-markets`, {
      targetMarketId: market.id,
    });
    const run = (
      await api('POST', `/opportunities/${opportunity.id as string}/research-runs`, {})
    ).json() as Json;
    const evidence = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/evidence`,
        {
          url: 'https://example.invalid/about',
          evidenceText: 'The company builds saunas.',
          verificationStatus: 'VERIFIED',
          retrievedAt: '2026-09-18T07:00:00.000Z',
        },
      )
    ).json() as Json;
    const claim = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/claims`,
        {
          type: 'FACT',
          statement: 'The company builds saunas.',
          confidence: 'HIGH',
          evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
        },
      )
    ).json() as Json;
    const lead = (
      await api('POST', `/opportunities/${opportunity.id as string}/leads`, {
        companyName,
        country: 'Lithuania',
        observedActivityText: 'Builds saunas.',
        observedRoles: ['BUILDER'],
        buyerFitHypothesisText: 'May buy cladding.',
        researchRunId: run.id as string,
        evidenceId: evidence.id as string,
        claimId: claim.id as string,
      })
    ).json() as Json;
    return (lead.company as Json).id as string;
  }

  function sourceBody(url: string, excerpt: string) {
    return {
      url,
      title: 'Contact',
      publisher: 'Example',
      sourceType: 'company_website',
      retrievedAt: '2026-09-18T08:30:00.000Z',
      excerptText: excerpt,
    };
  }

  it('requires the internal key', async () => {
    const missing = await api(
      'GET',
      `/companies/${UNKNOWN_UUID}/contacts`,
      undefined,
      null,
    );
    expect(missing.statusCode).toBe(401);
  });

  it('persists a general company contact with its own provenance', async () => {
    const companyId = await seedCompany();
    const res = await api('POST', `/companies/${companyId}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      email: 'Info@Example.invalid',
      contactPageUrl: 'https://example.invalid/contact',
      source: sourceBody(
        'https://example.invalid/contact',
        'General enquiries: Info@Example.invalid',
      ),
    });
    expect(res.statusCode).toBe(201);
    const contact = res.json() as Json;
    expect(contact.companyId).toBe(companyId);
    expect(contact.contactType).toBe('GENERAL_COMPANY');
    // Original value preserved verbatim; normalization only for comparison.
    expect(contact.email).toBe('Info@Example.invalid');
    expect(contact.deliverabilityStatus).toBe('NOT_VERIFIED');
    expect(contact.usabilityStatus).toBe('USABLE');
    const sources = contact.sources as Array<Json>;
    expect(sources).toHaveLength(1);
    expect(sources[0]?.url).toBe('https://example.invalid/contact');
    expect(sources[0]?.excerptText).toContain('Info@Example.invalid');
    expect(sources[0]?.retrievedAt).toBeTruthy();
  });

  it('is idempotent for repeated submissions and accumulates sources', async () => {
    const companyId = await seedCompany();
    const body = {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
      source: sourceBody('https://example.invalid/contact', 'info@example.invalid'),
    };
    const first = (
      await api('POST', `/companies/${companyId}/contacts`, body)
    ).json() as Json;
    const second = (
      await api('POST', `/companies/${companyId}/contacts`, body)
    ).json() as Json;
    expect(second.id).toBe(first.id);

    // The same address published on a second source must not overwrite the first.
    await api('POST', `/companies/${companyId}/contacts`, {
      ...body,
      source: sourceBody('https://example.invalid/imprint', 'info@example.invalid'),
    });
    const list = (
      await api('GET', `/companies/${companyId}/contacts`)
    ).json() as Array<Json>;
    expect(list).toHaveLength(1);
    expect((list[0]?.sources as Array<Json>)).toHaveLength(2);
  });

  it('distinguishes named-person contacts and keeps them separate by identity', async () => {
    const companyId = await seedCompany();
    const jane = (
      await api('POST', `/companies/${companyId}/contacts`, {
        contactType: 'NAMED_PERSON',
        personName: 'Jane Doe',
        personJobTitle: 'Purchasing Manager',
        email: 'jane.doe@example.invalid',
        source: sourceBody('https://example.invalid/team', 'Jane Doe, Purchasing Manager'),
      })
    ).json() as Json;
    expect(jane.contactType).toBe('NAMED_PERSON');
    expect(jane.personName).toBe('Jane Doe');
    expect(jane.personJobTitle).toBe('Purchasing Manager');

    await api('POST', `/companies/${companyId}/contacts`, {
      contactType: 'NAMED_PERSON',
      personName: 'John Roe',
      email: 'john.roe@example.invalid',
      source: sourceBody('https://example.invalid/team', 'John Roe'),
    });
    const list = (
      await api('GET', `/companies/${companyId}/contacts`)
    ).json() as Array<Json>;
    expect(list).toHaveLength(2);
  });

  it('marks a contact unusable and restores it without losing provenance', async () => {
    const companyId = await seedCompany();
    const contact = (
      await api('POST', `/companies/${companyId}/contacts`, {
        contactType: 'GENERAL_COMPANY',
        phone: '+370 600 00000',
        source: sourceBody('https://example.invalid/contact', 'Tel. +370 600 00000'),
      })
    ).json() as Json;

    const marked = await api(
      'PATCH',
      `/companies/${companyId}/contacts/${contact.id as string}`,
      { usabilityStatus: 'UNUSABLE', unusableReason: 'Number out of service.' },
    );
    expect(marked.statusCode).toBe(200);
    const markedBody = marked.json() as Json;
    expect(markedBody.usabilityStatus).toBe('UNUSABLE');
    expect(markedBody.unusableReason).toBe('Number out of service.');
    expect((markedBody.sources as Array<Json>)).toHaveLength(1);

    const restored = await api(
      'PATCH',
      `/companies/${companyId}/contacts/${contact.id as string}`,
      { usabilityStatus: 'USABLE' },
    );
    const restoredBody = restored.json() as Json;
    expect(restoredBody.usabilityStatus).toBe('USABLE');
    expect(restoredBody.unusableReason).toBeNull();
    expect((restoredBody.sources as Array<Json>)).toHaveLength(1);
  });

  it('scopes contacts to their company and 404s for an unknown company', async () => {
    const companyA = await seedCompany('Company A');
    const companyB = await seedCompany('Company B');
    await api('POST', `/companies/${companyA}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      email: 'a@example.invalid',
      source: sourceBody('https://example.invalid/a', 'a@example.invalid'),
    });
    const listB = (
      await api('GET', `/companies/${companyB}/contacts`)
    ).json() as Array<Json>;
    expect(listB).toEqual([]);

    const unknown = await api(
      'POST',
      `/companies/${UNKNOWN_UUID}/contacts`,
      {
        contactType: 'GENERAL_COMPANY',
        email: 'x@example.invalid',
        source: sourceBody('https://example.invalid/x', 'x@example.invalid'),
      },
    );
    expect(unknown.statusCode).toBe(404);
  });

  it('rejects unknown fields and channel-less contacts', async () => {
    const companyId = await seedCompany();
    const extra = await api('POST', `/companies/${companyId}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
      guessedEmail: 'x@example.invalid',
      source: sourceBody('https://example.invalid/contact', 'info@example.invalid'),
    });
    expect(extra.statusCode).toBe(400);

    const noChannel = await api('POST', `/companies/${companyId}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      source: sourceBody('https://example.invalid/contact', 'contact us'),
    });
    expect(noChannel.statusCode).toBe(400);
  });
});
