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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await app.init();
  return app;
}

describe('Price inquiry (RFQ) drafts API (integration)', () => {
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

  interface Context {
    opportunityId: string;
    leadId: string;
    companyId: string;
    productId: string;
    runId: string;
  }

  async function seedContext(): Promise<Context> {
    const product = (
      await api('POST', '/products', {
        name: 'Abachi',
        scientificName: 'Triplochiton scleroxylon',
        category: 'Timber',
      })
    ).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi cladding',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'Lithuania',
        segment: 'suppliers',
      })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Abachi sourcing',
      })
    ).json() as Json;
    await api('POST', `/opportunities/${opportunity.id as string}/target-markets`, {
      targetMarketId: market.id,
    });
    const run = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs`,
        {},
      )
    ).json() as Json;
    const evidence = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/evidence`,
        {
          url: 'https://example.invalid/supplier',
          evidenceText: 'Supplier A sells thermo-treated abachi.',
          verificationStatus: 'VERIFIED',
          retrievedAt: '2026-09-20T08:00:00.000Z',
        },
      )
    ).json() as Json;
    const claim = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/claims`,
        {
          type: 'FACT',
          statement: 'Supplier A sells thermo-treated abachi cladding.',
          confidence: 'HIGH',
          evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
        },
      )
    ).json() as Json;
    const lead = (
      await api('POST', `/opportunities/${opportunity.id as string}/leads`, {
        companyName: 'Supplier A',
        country: 'Lithuania',
        observedActivityText: 'Manufactures thermo-treated timber.',
        observedRoles: ['MANUFACTURER'],
        buyerFitHypothesisText: 'Could quote abachi cladding.',
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
      runId: run.id as string,
    };
  }

  async function qualify(opportunityId: string, leadId: string) {
    const res = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${leadId}/qualification`,
      { status: 'QUALIFIED', reason: 'Supplier fit.' },
    );
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
        retrievedAt: '2026-09-20T08:30:00.000Z',
        excerptText: 'contact',
      },
      ...body,
    });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  /** A sender profile linked to an email account (no password: no transport). */
  async function linkSender(
    overrides: {
      accountEmail?: string;
      senderName?: string;
      senderTitle?: string | null;
      companyName?: string | null;
    } = {},
  ): Promise<Json> {
    const accountEmail =
      overrides.accountEmail ?? 'sourcing@example.invalid';
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Sourcing mailbox',
        accountEmail,
        provider: 'Generic',
      })
    ).json() as Json;
    const companyName =
      overrides.companyName === undefined
        ? 'Example Sourcing'
        : overrides.companyName;
    const profile = (
      await api('POST', '/sender-profiles', {
        label: 'Sourcing',
        senderName: overrides.senderName ?? 'Sourcing Desk',
        fromEmail: accountEmail,
        signature: 'Example Sourcing',
        ...(overrides.senderTitle ? { senderTitle: overrides.senderTitle } : {}),
        ...(companyName ? { companyName } : {}),
        emailAccountId: account.id,
      })
    ).json() as Json;
    return profile;
  }

  function countOccurrences(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
  }

  function draftsUrl(opportunityId: string, leadId: string): string {
    return `/opportunities/${opportunityId}/leads/${leadId}/price-inquiry-drafts`;
  }

  it('requires the internal key', async () => {
    const res = await api(
      'GET',
      draftsUrl(UNKNOWN_UUID, UNKNOWN_UUID),
      undefined,
      null,
    );
    expect(res.statusCode).toBe(401);
  });

  it('creates a READY_FOR_HUMAN_REVIEW RFQ preferring a named purchasing contact, grounded in persisted facts', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const named = await addContact(ctx.companyId, {
      contactType: 'NAMED_PERSON',
      email: 'buyer@example.invalid',
      personName: 'Jane Buyer',
      personJobTitle: 'Head of Procurement',
    });
    const profile = await linkSender();

    await api('POST', '/product-facts', {
      productId: ctx.productId,
      key: 'Grade',
      valueText: 'A/B',
      status: 'CONFIRMED',
      visibility: 'OPERATIONAL',
      sourceLabel: 'supplier page',
    });
    await api('POST', '/product-facts', {
      productId: ctx.productId,
      key: 'Thickness',
      valueNumeric: 25,
      unit: 'mm',
      status: 'CONFIRMED',
      visibility: 'OPERATIONAL',
      sourceLabel: 'supplier page',
    });
    // Must never appear in the draft.
    await api('POST', '/product-facts', {
      productId: ctx.productId,
      key: 'PendingNote',
      valueText: 'PENDING-NOT-ALLOWED',
      status: 'PENDING',
      visibility: 'OPERATIONAL',
    });
    await api('POST', '/product-facts', {
      productId: ctx.productId,
      key: 'CostBasis',
      valueText: 'RESTRICTED-NOT-ALLOWED',
      status: 'CONFIRMED',
      visibility: 'RESTRICTED',
      sourceLabel: 'internal',
    });

    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
      senderProfileId: profile.id,
    });
    expect(res.statusCode).toBe(201);
    const draft = res.json() as Json;
    expect(draft.status).toBe('READY_FOR_HUMAN_REVIEW');
    expect(draft.purpose).toBe('PRICE_INQUIRY');
    expect(draft.contactId).toBe(named.id);
    expect(draft.recipientEmail).toBe('buyer@example.invalid');
    expect(String(draft.recipientRationale)).toMatch(/purchasing/i);
    expect(draft.senderProfileId).toBe(profile.id);
    expect(draft.senderSnapshot).toMatchObject({
      senderName: 'Sourcing Desk',
      fromEmail: 'sourcing@example.invalid',
    });

    const subject = String(draft.subject);
    const body = String(draft.body);
    expect(subject).toContain('Abachi');
    // Persisted attributes appear...
    expect(body).toContain('Grade: A/B');
    expect(body).toContain('Thickness: 25 mm');
    expect(body).toContain('Species / material: Triplochiton scleroxylon');
    // ...and unconfirmed/restricted values never do.
    expect(body).not.toContain('PENDING-NOT-ALLOWED');
    expect(body).not.toContain('RESTRICTED-NOT-ALLOWED');
    // Asks for the quote fields.
    for (const phrase of ['current price', 'pricing unit', 'MOQ', 'Incoterm', 'lead time', 'VAT', 'validity']) {
      expect(body.toLowerCase()).toContain(phrase.toLowerCase());
    }
    // No sending state or transport metadata.
    expect(draft).not.toHaveProperty('messageId');
    expect(draft).not.toHaveProperty('sentAt');
    expect(draft.generatedSubject).toBe(draft.subject);
    expect(draft.generatedBody).toBe(draft.body);

    // No secrets in the response.
    const serialized = JSON.stringify(draft);
    for (const forbidden of ['password', 'Ciphertext', 'smtp', 'imap']) {
      expect(serialized.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });

  it('falls back to the general business email when no named purchasing role is published', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'NAMED_PERSON',
      email: 'info.person@example.invalid',
      personName: 'Sam Sales',
      personJobTitle: 'Showroom Assistant',
    });
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'office@example.invalid',
    });
    const profile = await linkSender();

    const draft = (
      await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
        productId: ctx.productId,
        senderProfileId: profile.id,
      })
    ).json() as Json;
    expect(draft.recipientEmail).toBe('office@example.invalid');
    expect(String(draft.recipientRationale)).toMatch(/general company/i);
  });

  it('defaults the sender profile from the product when none is supplied', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();
    await api('PATCH', `/products/${ctx.productId}`, {
      inquirySenderProfileId: profile.id,
    });

    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
    });
    expect(res.statusCode).toBe(201);
    expect((res.json() as Json).senderProfileId).toBe(profile.id);
  });

  it('never falls back to the outreach sender when the inquiry sender is missing', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();
    // Only the *outreach* sender is assigned; the inquiry sender stays unset.
    await api('PATCH', `/products/${ctx.productId}`, {
      outreachSenderProfileId: profile.id,
    });

    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as Json).error).toBe('inquiry_sender_profile_required');

    // An explicit valid selection still works despite the outreach assignment.
    const explicit = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
      senderProfileId: profile.id,
    });
    expect(explicit.statusCode).toBe(201);
    expect((explicit.json() as Json).senderProfileId).toBe(profile.id);
  });

  it('prefers an explicit sender selection over the product inquiry sender', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const productSender = await linkSender();
    const explicitSender = await linkSender({
      accountEmail: 'explicit@example.invalid',
      senderName: 'Explicit Sender',
    });
    await api('PATCH', `/products/${ctx.productId}`, {
      inquirySenderProfileId: productSender.id,
    });

    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
      senderProfileId: explicitSender.id,
    });
    expect(res.statusCode).toBe(201);
    expect((res.json() as Json).senderProfileId).toBe(explicitSender.id);
  });

  it('blocks a rejected lead', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();
    await api('PATCH', `/opportunities/${ctx.opportunityId}/leads/${ctx.leadId}`, {
      reviewStatus: 'REJECTED',
      reviewReason: 'Not a fit.',
    });

    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
      senderProfileId: profile.id,
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as Json).error).toBe('lead_rejected_by_operator');
  });

  it('blocks a stale qualification', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();

    const claims = (
      await api(
        'GET',
        `/opportunities/${ctx.opportunityId}/research-runs/${ctx.runId}/claims`,
      )
    ).json() as Array<Json>;
    const claimId = claims[0]?.id as string;
    const retracted = await api(
      'POST',
      `/opportunities/${ctx.opportunityId}/research-runs/${ctx.runId}/claims/${claimId}/corrections`,
      { kind: 'RETRACTION', reason: 'Source no longer available.' },
    );
    expect(retracted.statusCode).toBe(201);

    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
      senderProfileId: profile.id,
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as Json).error).toBe('lead_provenance_stale');
  });

  it('blocks a lead that is not yet qualified or shortlisted', async () => {
    const ctx = await seedContext();
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();
    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
      senderProfileId: profile.id,
    });
    expect(res.statusCode).toBe(409);
    expect((res.json() as Json).error).toBe('lead_not_eligible');
  });

  it('requires a valid product, a usable sender profile, and a usable recipient', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();

    // Unknown product.
    const badProduct = await api(
      'POST',
      draftsUrl(ctx.opportunityId, ctx.leadId),
      { productId: UNKNOWN_UUID, senderProfileId: profile.id },
    );
    expect(badProduct.statusCode).toBe(400);
    expect((badProduct.json() as Json).error).toBe('product_not_found');

    // No sender profile (product has none and none supplied).
    const noSender = await api(
      'POST',
      draftsUrl(ctx.opportunityId, ctx.leadId),
      { productId: ctx.productId },
    );
    expect(noSender.statusCode).toBe(409);
    expect((noSender.json() as Json).error).toBe(
      'inquiry_sender_profile_required',
    );

    // Sender profile without an email account.
    const unlinked = (
      await api('POST', '/sender-profiles', {
        label: 'Unlinked',
        senderName: 'X',
        companyName: 'Y',
        fromEmail: 'x@example.invalid',
      })
    ).json() as Json;
    const notLinked = await api(
      'POST',
      draftsUrl(ctx.opportunityId, ctx.leadId),
      { productId: ctx.productId, senderProfileId: unlinked.id },
    );
    expect(notLinked.statusCode).toBe(409);
    expect((notLinked.json() as Json).error).toBe('sender_profile_not_linked');

    // Unusable recipient.
    const unusable = await addContact(ctx.companyId, {
      contactType: 'NAMED_PERSON',
      email: 'bad@example.invalid',
      personName: 'Nope',
      personJobTitle: 'Procurement Manager',
    });
    await api(
      'PATCH',
      `/companies/${ctx.companyId}/contacts/${unusable.id as string}`,
      { usabilityStatus: 'UNUSABLE', unusableReason: 'Bounced.' },
    );
    const badRecipient = await api(
      'POST',
      draftsUrl(ctx.opportunityId, ctx.leadId),
      {
        productId: ctx.productId,
        senderProfileId: profile.id,
        contactId: unusable.id,
      },
    );
    expect(badRecipient.statusCode).toBe(400);
    expect((badRecipient.json() as Json).error).toBe(
      'contact_not_usable_or_missing_email',
    );
  });

  it('is idempotent for identical inputs and supports editing subject/body/recipient while preserving the original', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();

    const first = (
      await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
        productId: ctx.productId,
        senderProfileId: profile.id,
      })
    ).json() as Json;
    const again = (
      await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
        productId: ctx.productId,
        senderProfileId: profile.id,
      })
    ).json() as Json;
    expect(again.id).toBe(first.id);

    const updated = (
      await api(
        'PATCH',
        `${draftsUrl(ctx.opportunityId, ctx.leadId)}/${first.id as string}`,
        { subject: 'Edited subject', body: 'Edited body', recipientEmail: 'other@example.invalid' },
      )
    ).json() as Json;
    expect(updated.subject).toBe('Edited subject');
    expect(updated.body).toBe('Edited body');
    expect(updated.recipientEmail).toBe('other@example.invalid');
    // The generated original is preserved for auditability.
    expect(updated.generatedSubject).toBe(first.subject);
    expect(updated.generatedBody).toBe(first.body);

    const list = (
      await api('GET', draftsUrl(ctx.opportunityId, ctx.leadId))
    ).json() as Array<Json>;
    expect(list).toHaveLength(1);
  });

  it('accepts a sender profile without a company/brand and generates no company claim', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender({
      senderName: 'Tomas Berg',
      senderTitle: 'Sourcing & Procurement',
      companyName: null,
    });
    expect(profile.companyName).toBeNull();

    const res = await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
      productId: ctx.productId,
      senderProfileId: profile.id,
    });
    expect(res.statusCode).toBe(201);
    const draft = res.json() as Json;
    const body = String(draft.body);
    expect(body).toContain('Best regards,');
    expect(countOccurrences(body, 'Tomas Berg')).toBe(1);
    expect(countOccurrences(body, 'Sourcing & Procurement')).toBe(1);
    // No company line is invented.
    expect(body).not.toContain('Example Sourcing');
    const snapshot = draft.senderSnapshot as Json;
    expect(snapshot.companyName).toBeNull();
    expect(snapshot.senderTitle).toBe('Sourcing & Procurement');
  });

  it('includes the company/brand and role/title exactly once each when configured', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender({
      senderName: 'Tomas Berg',
      senderTitle: 'Sourcing & Procurement',
      companyName: 'Sapiens Metric',
    });

    const draft = (
      await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
        productId: ctx.productId,
        senderProfileId: profile.id,
      })
    ).json() as Json;
    const body = String(draft.body);
    expect(countOccurrences(body, 'Tomas Berg')).toBe(1);
    expect(countOccurrences(body, 'Sourcing & Procurement')).toBe(1);
    expect(countOccurrences(body, 'Sapiens Metric')).toBe(1);
    const closing = body.split('Best regards,')[1] ?? '';
    expect(closing).toContain('Tomas Berg');
    expect(closing).toContain('Sourcing & Procurement');
    expect(closing).toContain('Sapiens Metric');
  });

  it('persists the draft language and uses an English greeting and closing', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
    });
    const profile = await linkSender();

    const draft = (
      await api('POST', draftsUrl(ctx.opportunityId, ctx.leadId), {
        productId: ctx.productId,
        senderProfileId: profile.id,
        language: 'en',
      })
    ).json() as Json;
    expect(draft.language).toBe('en');
    const body = String(draft.body);
    expect(body).toMatch(/^(Dear|Hello)/);
    expect(body).toContain('Best regards,');
    expect(body).toContain('Please quote:');
  });
});
