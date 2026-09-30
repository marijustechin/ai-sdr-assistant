import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './helpers/database.js';
import { OutreachOutboundRepository } from '../src/modules/outreach-sender/infrastructure/outreach-outbound.repository.js';
import { OutreachReplyRepository } from '../src/modules/outreach-results/infrastructure/outreach-reply.repository.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';

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

describe('Account intelligence / company brief (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let outboundRepo: OutreachOutboundRepository;
  let replyRepo: OutreachReplyRepository;
  let emailAccountId: string;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma.db);
    outboundRepo = new OutreachOutboundRepository(prisma);
    replyRepo = new OutreachReplyRepository(prisma);
    emailAccountId = '';
  });

  async function api(
    method: 'POST' | 'GET' | 'PATCH' | 'PUT',
    url: string,
    payload?: unknown,
  ) {
    return app.inject({
      method,
      url,
      ...(payload !== undefined ? { payload: payload as object } : {}),
      headers: { 'x-internal-api-key': INTERNAL_KEY },
    });
  }

  async function seedScope(): Promise<{
    opportunityId: string;
    runId: string;
    productId: string;
    evidenceId: string;
  }> {
    const product = (await api('POST', '/products', { name: 'Abachi' })).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, { name: 'Thermo Abachi' })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', { offerId: offer.id as string, name: 'Abachi LT' })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', { country: 'Lithuania', segment: 'resellers' })
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
          url: 'https://woodarchitects.example/about',
          evidenceText: 'Manufactures outdoor barrel saunas; sells B2B to resellers.',
          verificationStatus: 'VERIFIED',
          retrievedAt: '2026-09-18T07:00:00.000Z',
        },
      )
    ).json() as Json;
    return {
      opportunityId: opportunity.id as string,
      runId: run.id as string,
      productId: product.id as string,
      evidenceId: evidence.id as string,
    };
  }

  async function addLinkedLead(
    opportunityId: string,
    runId: string,
    evidenceId: string,
    observedActivityText = 'Manufactures outdoor barrel saunas; sells B2B to resellers.',
    qualificationReason = 'Product-fit manufacturer; buys cladding and bench timber.',
  ): Promise<{ leadId: string; companyId: string }> {
    const leadRes = await api('POST', `/opportunities/${opportunityId}/leads`, {
      companyName: 'Wood Architects',
      country: 'Lithuania',
      observedActivityText,
      observedRoles: ['MANUFACTURER'],
      buyerFitHypothesisText:
        'May source thermo cladding/bench timber for sauna production.',
      researchRunId: runId,
      evidenceId,
    });
    expect(leadRes.statusCode, leadRes.body).toBe(201);
    const lead = leadRes.json() as Json;
    await api('PATCH', `/opportunities/${opportunityId}/leads/${lead.id as string}/qualification`, {
      status: 'QUALIFIED',
      reason: qualificationReason,
    });
    await api('POST', `/companies/${(lead.company as Json).id as string}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@woodarchitects.example',
      source: {
        url: 'https://woodarchitects.example/contact',
        title: 'Contact',
        retrievedAt: '2026-09-18T08:00:00.000Z',
        excerptText: 'contact',
      },
    });
    return {
      leadId: lead.id as string,
      companyId: (lead.company as Json).id as string,
    };
  }

  async function createAccount(): Promise<string> {
    const account = (
      await api('POST', '/email-accounts', {
        label: 'LT Mail',
        accountEmail: 'eimantas@example.invalid',
      })
    ).json() as Json;
    return account.id as string;
  }

  async function createSentWithReply(
    opportunityId: string,
    leadId: string,
    companyId: string,
  ): Promise<void> {
    emailAccountId = await createAccount();
    const batch = await prisma.db.outreachBatch.create({
      data: { opportunityId, language: 'lt', status: 'SENT' },
    });
    const draftId = crypto.randomUUID();
    const outbound = await outboundRepo.create({
      batchId: batch.id,
      draftId,
      opportunityId,
      leadId,
      companyId,
      emailAccountId,
      senderProfileId: null,
      recipientEmail: 'info@woodarchitects.example',
      fromName: 'Eimantas Doskus',
      fromEmail: 'eimantas@example.invalid',
      replyToEmail: null,
      subject: 'Dėl Thermo Abachi dailylenčių',
      textBody: 'body',
      htmlBody: null,
      language: 'lt',
      messageId: `<${draftId}@example.invalid>`,
      nextEligibleAt: new Date(),
    });
    await outboundRepo.markSent(outbound!.id, new Date(), null);
    await replyRepo.create({
      batchId: batch.id,
      outboundMessageId: outbound!.id,
      opportunityId,
      leadId,
      companyId,
      draftId,
      emailAccountId,
      mailboxUid: 'uid:1',
      providerMessageId: '<reply@customer.example>',
      inReplyTo: outbound!.messageId,
      references: [outbound!.messageId],
      fromEmail: 'info@woodarchitects.example',
      toEmail: 'eimantas@example.invalid',
      subject: 'Re: Dėl Thermo Abachi dailylenčių',
      bodyText: 'Interested — please send pricing.',
      receivedAt: new Date(),
      classification: 'PRICE_REQUEST',
      classificationSource: 'AUTO',
      classificationReason: 'Reply asks for pricing / a quote',
      handoffState: 'HANDOFF_TO_HUMAN',
      excerpt: 'Interested — please send pricing.',
    });
  }

  it('compiles a brief from existing platform intelligence with facts, hypotheses and unknowns kept distinct', async () => {
    const { opportunityId, runId, evidenceId } = await seedScope();
    const { companyId } = await addLinkedLead(opportunityId, runId, evidenceId);

    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/companies/${companyId}/brief`,
    );
    expect(res.statusCode).toBe(201);
    const view = res.json() as Json;
    expect((view.brief as Json).companyId).toBe(companyId);
    const latest = view.latest as Json;
    expect(latest.status).toBe('COMPILED');
    expect((latest.history as unknown[] | undefined) ?? []).toBeDefined();
    const content = latest.content as Json;

    // Facts vs hypotheses distinct.
    const hypotheses = content.commercialHypotheses as Json[];
    expect(hypotheses.length).toBeGreaterThan(0);
    expect(hypotheses.every((f) => f.kind === 'COMMERCIAL_HYPOTHESIS')).toBe(true);
    const overview = content.companyOverview as Json[];
    expect(overview.every((f) => f.kind !== 'COMMERCIAL_HYPOTHESIS')).toBe(true);

    // No invented financials/headcount; explicit unknowns instead.
    expect((content.financialSizeSignals as Json[]).length).toBe(0);
    expect((content.unknownsGaps as string[]).join(' ')).toContain('financials');

    // Provenance retained (lead evidence URL present somewhere).
    const sources = (content.companyOverview as Json[])
      .flatMap((f) => (f.sources as Json[]) ?? [])
      .concat(
        (content.relevantProductsOperations as Json[]).flatMap(
          (f) => (f.sources as Json[]) ?? [],
        ),
      );
    expect(sources.some((s) => s.url === 'https://woodarchitects.example/about')).toBe(true);

    // Evidence discipline: the qualification *rationale* is an inference, so it
    // must not be promoted into a factual section merely because it was recorded.
    const why = content.whyThisAccountFits as Json[];
    const rationale = why.find((f) =>
      /buys cladding and bench/i.test(f.statement as string),
    );
    expect(rationale?.kind).toBe('COMMERCIAL_HYPOTHESIS');
    const factualSections: Json[] = [
      ...(content.companyOverview as Json[]),
      ...(content.relevantProductsOperations as Json[]),
      ...(content.financialSizeSignals as Json[]),
      ...(content.recentActivity as Json[]),
      ...(content.reputationPublicFeedback as Json[]),
      ...(content.marketsCustomersChannels as Json[]),
      ...(content.keyPeopleContacts as Json[]),
    ];
    expect(
      factualSections.every(
        (f) =>
          f.kind !== 'COMMERCIAL_HYPOTHESIS' &&
          !/buys cladding and bench|at volume/i.test(f.statement as string),
      ),
    ).toBe(true);

    // History exposes the snapshot.
    const history = view.history as Json[];
    expect(history).toHaveLength(1);
    expect(history[0]!.version).toBe(1);
  });

  it('does not narrow materials beyond the source evidence (no species invention)', async () => {
    const { opportunityId, runId, evidenceId } = await seedScope();
    const { companyId } = await addLinkedLead(
      opportunityId,
      runId,
      evidenceId,
      'Manufactures outdoor saunas using thermo-treated wood (Thermowood).',
    );
    const view = (
      await api('POST', `/opportunities/${opportunityId}/companies/${companyId}/brief`)
    ).json() as Json;
    const product = (
      (view.latest as Json).content as Json
    ).relevantProductsOperations as Json[];
    const text = product.map((f) => f.statement as string).join(' ');
    expect(text).toContain('Thermowood');
    // The compiler must not add a species the source did not state.
    expect(text.toLowerCase()).not.toContain('pine');
    expect(text.toLowerCase()).not.toContain('spruce');
  });

  it('reads a brief by id with company/offer context (dedicated page navigation)', async () => {
    const { opportunityId, runId, evidenceId } = await seedScope();
    const { companyId } = await addLinkedLead(opportunityId, runId, evidenceId);
    const prepared = (
      await api('POST', `/opportunities/${opportunityId}/companies/${companyId}/brief`)
    ).json() as Json;
    const briefId = (prepared.brief as Json).id as string;

    const res = await api('GET', `/company-briefs/${briefId}`);
    expect(res.statusCode).toBe(200);
    const body = res.json() as Json;
    expect(body.companyName).toBe('Wood Architects');
    expect(body.offerName).toBe('Thermo Abachi');
    expect((body.latest as Json).version).toBe(1);
    expect((body.latest as Json).status).toBe('COMPILED');
  });

  it('refuses to cross-link an unrelated company (no lead / decision for this opportunity)', async () => {    const a = await seedScope();
    const { companyId } = await addLinkedLead(a.opportunityId, a.runId, a.evidenceId);
    const b = await seedScope(); // a different opportunity

    const unrelated = await api(
      'POST',
      `/opportunities/${b.opportunityId}/companies/${companyId}/brief`,
    );
    expect(unrelated.statusCode).toBe(409);
    expect((unrelated.json() as Json).error).toBe(
      'company_not_linked_to_opportunity',
    );

    const random = crypto.randomUUID();
    const missing = await api(
      'POST',
      `/opportunities/${a.opportunityId}/companies/${random}/brief`,
    );
    expect(missing.statusCode).toBe(409);
  });

  it('refresh appends a fresh snapshot and preserves history', async () => {
    const { opportunityId, runId, evidenceId } = await seedScope();
    const { companyId } = await addLinkedLead(opportunityId, runId, evidenceId);
    const base = `/opportunities/${opportunityId}/companies/${companyId}/brief`;
    await api('POST', base);

    const refreshed = await api('POST', `${base}/refresh`);
    expect(refreshed.statusCode).toBe(201);
    const view = refreshed.json() as Json;
    expect((view.latest as Json).version).toBe(2);
    const history = view.history as Json[];
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.version)).toEqual([2, 1]);
    // Prepared vs refreshed timestamps are recorded.
    expect((view.latest as Json).preparedAt).toBeTruthy();
    expect((view.latest as Json).lastRefreshedAt).toBeTruthy();
  });

  it('a handoff can request enrichment; harness findings merge into a fresh ENRICHED snapshot with provenance', async () => {
    const { opportunityId, runId, evidenceId } = await seedScope();
    const { leadId, companyId } = await addLinkedLead(opportunityId, runId, evidenceId);
    await createSentWithReply(opportunityId, leadId, companyId);

    const prepared = (
      await api('POST', `/opportunities/${opportunityId}/companies/${companyId}/brief`)
    ).json() as Json;
    // The positive reply is reflected in the compiled relationship section.
    const relationship = (prepared.latest as Json).content as Json;
    const relationshipText = JSON.stringify(relationship.existingRelationshipOutreach);
    expect(relationshipText).toContain('PRICE_REQUEST');

    const requested = await api(
      'POST',
      `/opportunities/${opportunityId}/companies/${companyId}/brief/request-enrichment`,
      { note: 'Deep-research for the factory visit.' },
    );
    expect(requested.statusCode).toBe(201);
    expect((requested.json() as Json).latest as Json).toMatchObject({
      status: 'ENRICHMENT_REQUESTED',
    });

    const briefId = (prepared.brief as Json).id as string;
    const submitted = await api('POST', `/company-briefs/${briefId}/enrichment`, {
      findings: [
        {
          section: 'FINANCIAL_SIZE_SIGNALS',
          statement: 'Turnover EUR 4.2m (2023) per registry filing.',
          kind: 'RECENT_ENRICHMENT',
          sources: [
            {
              url: 'https://registry.example/woodarchitects',
              title: 'Company registry',
              retrievedAt: '2026-09-30T00:00:00.000Z',
              kind: 'REGISTRY',
            },
          ],
        },
        {
          section: 'COMMERCIAL_HYPOTHESES',
          statement: 'Thermo Abachi may fit their sauna interior material needs.',
          kind: 'COMMERCIAL_HYPOTHESIS',
        },
      ],
      unknownsGaps: [],
    });
    expect(submitted.statusCode).toBe(201);
    const enriched = submitted.json() as Json;
    expect((enriched.latest as Json).status).toBe('ENRICHED');
    expect((enriched.latest as Json).version).toBe(2);
    expect((enriched.latest as Json).sourceCount as number).toBeGreaterThanOrEqual(1);
    const content = (enriched.latest as Json).content as Json;
    const financial = content.financialSizeSignals as Json[];
    expect(financial.some((f) => f.kind === 'RECENT_ENRICHMENT')).toBe(true);
    expect(
      (financial.find((f) => f.kind === 'RECENT_ENRICHMENT')!.sources as Json[])[0]!.url,
    ).toBe('https://registry.example/woodarchitects');
    // History preserved: compiled v1 still present.
    expect((enriched.history as Json[]).length).toBe(2);
  });

  it('rejects a commercial hypothesis placed in a factual section', async () => {
    const { opportunityId, runId, evidenceId } = await seedScope();
    const { companyId } = await addLinkedLead(opportunityId, runId, evidenceId);
    const prepared = (
      await api('POST', `/opportunities/${opportunityId}/companies/${companyId}/brief`)
    ).json() as Json;
    const briefId = (prepared.brief as Json).id as string;
    const res = await api('POST', `/company-briefs/${briefId}/enrichment`, {
      findings: [
        {
          section: 'COMPANY_OVERVIEW',
          statement: 'They probably want to buy our product.',
          kind: 'COMMERCIAL_HYPOTHESIS',
        },
      ],
    });
    expect(res.statusCode).toBe(400);
  });
});
