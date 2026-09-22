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
const SYNTHETIC_KEY = Buffer.alloc(32, 7).toString('base64');

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

describe('Outreach drafts API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.EMAIL_SECRETS_KEY = SYNTHETIC_KEY;
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    delete process.env.EMAIL_SECRETS_KEY;
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

  async function seedLead(): Promise<{
    opportunityId: string;
    leadId: string;
    companyId: string;
    productId: string;
  }> {
    const product = (await api('POST', '/products', { name: 'Cladding' })).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Cladding offer',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', { country: 'Lithuania', segment: 'builders' })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Cladding opportunity',
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
          evidenceText: 'The company builds structures.',
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
          statement: 'The company builds structures.',
          confidence: 'HIGH',
          evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
        },
      )
    ).json() as Json;
    const lead = (
      await api('POST', `/opportunities/${opportunity.id as string}/leads`, {
        companyName: 'Example Builder',
        country: 'Lithuania',
        observedActivityText: 'Builds structures.',
        observedRoles: ['BUILDER'],
        buyerFitHypothesisText: 'May use the product.',
        researchRunId: run.id as string,
        evidenceId: evidence.id as string,
        claimId: claim.id as string,
      })
    ).json() as Json;
    return {
      opportunityId: opportunity.id as string,
      leadId: lead.id as string,
      companyId: (lead.company as Json).id as string,
      productId: product.id as string,
    };
  }

  async function qualify(opportunityId: string, leadId: string) {
    const res = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${leadId}/qualification`,
      { status: 'QUALIFIED', reason: 'Product-fit: builder role.' },
    );
    expect(res.statusCode).toBe(200);
  }

  async function createProfile(overrides: Json = {}): Promise<Json> {
    const res = await api('POST', '/sender-profiles', {
      label: 'Acme Sales',
      senderName: 'Jane Doe',
      companyName: 'Acme Timber',
      fromEmail: 'jane@acme.invalid',
      ...overrides,
    });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function createAccount(overrides: Json = {}): Promise<Json> {
    const res = await api('POST', '/email-accounts', {
      label: 'Acme Mail',
      accountEmail: 'mail@acme.invalid',
      smtpHost: 'smtp.acme.invalid',
      smtpPort: 587,
      smtpTlsMode: 'STARTTLS',
      smtpUsername: 'mail@acme.invalid',
      smtpPassword: 'synthetic-smtp-1',
      ...overrides,
    });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function assign(productId: string, senderProfileId: string | null) {
    const res = await api('PATCH', `/products/${productId}`, {
      senderProfileId,
    });
    expect(res.statusCode).toBe(200);
  }

  async function addContact(
    companyId: string,
    body: Record<string, unknown>,
  ): Promise<Json> {
    const res = await api('POST', `/companies/${companyId}/contacts`, {
      source: {
        url: 'https://example.invalid/contact',
        title: 'Contact',
        retrievedAt: '2026-09-18T08:00:00.000Z',
        excerptText: 'contact',
      },
      ...body,
    });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  function draftsUrl(opportunityId: string, leadId: string): string {
    return `/opportunities/${opportunityId}/leads/${leadId}/outreach-drafts`;
  }

  it('requires the internal key', async () => {
    const missing = await api(
      'GET',
      draftsUrl(UNKNOWN_UUID, UNKNOWN_UUID),
      undefined,
      null,
    );
    expect(missing.statusCode).toBe(401);
  });

  it('prepares an identity-only draft (no mailbox connection) using the assigned profile', async () => {
    const { opportunityId, leadId, companyId, productId } = await seedLead();
    await qualify(opportunityId, leadId);
    await addContact(companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await createProfile();
    await assign(productId, profile.id as string);

    const res = await api('POST', draftsUrl(opportunityId, leadId), {});
    expect(res.statusCode).toBe(201);
    const draft = res.json() as Json;
    expect(draft.preparationStatus).toBe('PREPARED');
    expect(draft.language).toBe('lt');
    expect(draft.body).toContain('Jane Doe');
    expect(draft.body).toContain('Acme Timber');
    expect(draft.recipientEmail).toBe('info@example.invalid');
    expect(draft.senderProfileId).toBe(profile.id);
    expect(draft.emailAccountId).toBeNull();
    const snapshot = draft.senderSnapshot as Json;
    expect(snapshot.senderName).toBe('Jane Doe');
    expect(snapshot.fromEmail).toBe('jane@acme.invalid');
    expect(snapshot).not.toHaveProperty('smtpPassword');
  });

  it('records the mailbox connection referenced by the assigned profile', async () => {
    const { opportunityId, leadId, companyId, productId } = await seedLead();
    await qualify(opportunityId, leadId);
    await addContact(companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const account = await createAccount();
    const profile = await createProfile({ emailAccountId: account.id });
    await assign(productId, profile.id as string);

    const draft = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect(draft.emailAccountId).toBe(account.id);
    expect(draft.senderSnapshot).not.toHaveProperty('smtpPassword');
    expect(draft).not.toHaveProperty('smtpPassword');
  });

  it('blocks clearly when no profile is assigned or the profile is disabled', async () => {
    const { opportunityId, leadId, companyId, productId } = await seedLead();
    await qualify(opportunityId, leadId);
    await addContact(companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });

    const noProfile = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect(noProfile.preparationStatus).toBe('BLOCKED');
    expect(noProfile.missingFields as string[]).toContain(
      'senderProfileNotAssigned',
    );
    expect(noProfile.recipientEmail).toBe('info@example.invalid');

    const profile = await createProfile();
    await assign(productId, profile.id as string);
    await api('PATCH', `/sender-profiles/${profile.id as string}`, {
      status: 'DISABLED',
    });
    const disabled = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect(disabled.preparationStatus).toBe('BLOCKED');
    expect(disabled.missingFields as string[]).toContain(
      'senderProfileDisabled',
    );
  });

  it('is idempotent, versions on identity change, and ignores transport-only changes', async () => {
    const { opportunityId, leadId, companyId, productId } = await seedLead();
    await qualify(opportunityId, leadId);
    await addContact(companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const account = await createAccount();
    const profile = await createProfile({ emailAccountId: account.id });
    await assign(productId, profile.id as string);

    const first = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    const again = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect(again.id).toBe(first.id);

    // Credential-only change must not create a new content version.
    await api('PATCH', `/email-accounts/${account.id as string}`, {
      smtpPassword: 'synthetic-smtp-2',
    });
    const afterPassword = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect(afterPassword.id).toBe(first.id);

    // Swapping to another mailbox connection is transport-only: no new version.
    const accountB = await createAccount({
      label: 'Acme Mail B',
      accountEmail: 'mail-b@acme.invalid',
      smtpUsername: 'mail-b@acme.invalid',
      smtpPassword: 'synthetic-smtp-b',
    });
    await api('PATCH', `/sender-profiles/${profile.id as string}`, {
      emailAccountId: accountB.id,
    });
    const afterAccount = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect(afterAccount.id).toBe(first.id);

    // A material identity change creates a new version.
    await api('PATCH', `/sender-profiles/${profile.id as string}`, {
      senderName: 'Jane Q. Doe',
    });
    const afterIdentity = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect(afterIdentity.id).not.toBe(first.id);
    expect(afterIdentity.version).toBe(2);
    expect(afterIdentity.body).toContain('Jane Q. Doe');

    const list = (
      await api('GET', draftsUrl(opportunityId, leadId))
    ).json() as Array<Json>;
    expect(list).toHaveLength(2);
    // The earlier draft is preserved unchanged.
    const preserved = list.find((d) => d.id === first.id) as Json;
    expect(preserved.body).toBe(first.body);
  });

  it('flags outdated sender inputs while leaving historical drafts unchanged', async () => {
    const { opportunityId, leadId, companyId, productId } = await seedLead();
    await qualify(opportunityId, leadId);
    await addContact(companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await createProfile();
    await assign(productId, profile.id as string);
    const draft = (
      await api('POST', draftsUrl(opportunityId, leadId), {})
    ).json() as Json;
    expect((draft.inputsStale as boolean)).toBe(false);

    await api('PATCH', `/sender-profiles/${profile.id as string}`, {
      companyName: 'Acme Timber Group',
    });
    const read = (
      await api(
        'GET',
        `${draftsUrl(opportunityId, leadId)}/${draft.id as string}`,
      )
    ).json() as Json;
    expect(read.inputsStale).toBe(true);
    expect((read.staleReasons as string[]).join(' ')).toContain(
      'sender identity changed',
    );
    // History is not rewritten.
    expect(read.body).toBe(draft.body);
    expect((read.senderSnapshot as Json).companyName).toBe('Acme Timber');
  });

  it('rejects an ineligible lead and blocks when no usable email exists', async () => {
    const { opportunityId, leadId, productId } = await seedLead();
    const profile = await createProfile();
    await assign(productId, profile.id as string);

    const notEligible = await api('POST', draftsUrl(opportunityId, leadId), {});
    expect(notEligible.statusCode).toBe(409);
    expect((notEligible.json() as Json).error).toBe('lead_not_eligible');

    const { opportunityId: o2, leadId: l2, productId: p2 } = await seedLead();
    await qualify(o2, l2);
    const profile2 = await createProfile({ label: 'Second' });
    await assign(p2, profile2.id as string);
    const blocked = (
      await api('POST', draftsUrl(o2, l2), {})
    ).json() as Json;
    expect(blocked.preparationStatus).toBe('BLOCKED');
    expect(blocked.missingFields as string[]).toContain('recipientEmail');
  });
});
