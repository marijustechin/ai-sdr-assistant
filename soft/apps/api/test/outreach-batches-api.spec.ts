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

describe('Outreach batch review API (integration)', () => {
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
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi',
      })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Abachi LT',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'Lithuania',
        segment: 'resellers',
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
          url: 'https://example.invalid/a',
          evidenceText: 'Sells sauna cladding.',
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

  async function addLead(
    opportunityId: string,
    runId: string,
    evidenceId: string,
    companyName: string,
  ): Promise<Json> {
    const res = await api('POST', `/opportunities/${opportunityId}/leads`, {
      companyName,
      country: 'Lithuania',
      observedActivityText: 'sells sauna cladding',
      observedRoles: ['DISTRIBUTOR'],
      buyerFitHypothesisText: 'May resell the product.',
      researchRunId: runId,
      evidenceId,
    });
    expect(res.statusCode, res.body).toBe(201);
    return res.json() as Json;
  }

  async function qualifyAndContact(
    opportunityId: string,
    lead: Json,
    withContact: boolean,
  ) {
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${lead.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Product-fit: distributor.' },
    );
    if (withContact) {
      await api('POST', `/companies/${(lead.company as Json).id as string}/contacts`, {
        contactType: 'GENERAL_COMPANY',
        email: 'info@example.invalid',
        source: {
          url: 'https://example.invalid/contact',
          title: 'Contact',
          retrievedAt: '2026-09-18T08:00:00.000Z',
          excerptText: 'contact',
        },
      });
    }
  }

  async function assignSender(productId: string) {
    const profile = (
      await api('POST', '/sender-profiles', {
        label: 'Sales LT',
        senderName: 'Eimantas Doskus',
        senderTitle: 'Sales Manager',
        companyName: 'Premium Timber Hub',
        fromEmail: 'eimantas@example.invalid',
      })
    ).json() as Json;
    await api('PATCH', `/products/${productId}`, {
      outreachSenderProfileId: profile.id as string,
    });
  }

  const batchesUrl = (o: string) => `/opportunities/${o}/outreach-batches`;

  /** First occurrence per lead is the latest version (rows are version desc). */
  const latestPerLead = (list: Json[]): Json[] => {
    const byLead = new Map<string, Json>();
    for (const draft of list) {
      if (!byLead.has(draft.leadId as string)) {
        byLead.set(draft.leadId as string, draft);
      }
    }
    return [...byLead.values()];
  };

  it('generates a batch for eligible leads, counts exclusions/no-recipients, and approves the whole batch', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    const b = await addLead(opportunityId, runId, evidenceId, 'Geras Garas');
    const excluded = await addLead(opportunityId, runId, evidenceId, 'Excluded Co');
    const noRecipient = await addLead(opportunityId, runId, evidenceId, 'No Contact Co');
    await qualifyAndContact(opportunityId, a, true);
    await qualifyAndContact(opportunityId, b, true);
    await qualifyAndContact(opportunityId, excluded, true);
    await qualifyAndContact(opportunityId, noRecipient, false);
    await assignSender(productId);
    // Human exclusion for one company.
    await api(
      'PUT',
      `/opportunities/${opportunityId}/companies/${(excluded.company as Json).id as string}/outreach-decision`,
      { decision: 'DO_NOT_CONTACT' },
    );

    const created = await api('POST', batchesUrl(opportunityId), { language: 'en' });
    expect(created.statusCode).toBe(201);
    const summary = created.json() as Json;
    const counts = summary.counts as Json;
    expect(summary.batch).toBeTruthy();
    expect(counts.eligibleLeads).toBe(3);
    expect(counts.excludedByDecision).toBe(1);
    expect(counts.withoutRecipient).toBe(1);
    expect(counts.generatedDrafts).toBe(2);
    expect((summary.representative as Json[]).length).toBeGreaterThan(0);
    const batchId = (summary.batch as Json).id as string;

    const approved = await api(
      'POST',
      `${batchesUrl(opportunityId)}/${batchId}/approve`,
    );
    expect(approved.statusCode).toBe(201);
    const approvedSummary = approved.json() as Json;
    expect((approvedSummary.batch as Json).status).toBe('APPROVED');
    expect((approvedSummary.counts as Json).approvedDrafts).toBe(2);
    expect((approvedSummary.counts as Json).pendingDrafts).toBe(0);
    // Every included draft is an immutable approved snapshot.
    const drafts = approvedSummary.drafts as Json[];
    expect(drafts.every((d) => d.approvalStatus === 'APPROVED')).toBe(true);
    expect(drafts.every((d) => typeof d.body === 'string' && d.body.length > 0)).toBe(true);
  });

  it('an edited (customized) draft becomes a new pending version and forces batch re-approval', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    await qualifyAndContact(opportunityId, a, true);
    await assignSender(productId);

    const summary = (
      await api('POST', batchesUrl(opportunityId), { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/approve`);

    const draft = (summary.drafts as Json[])[0] as Json;
    const revised = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${a.id as string}/outreach-drafts/${draft.id as string}`,
      { canonicalBody: 'Edited by a human.\n\nWould this be relevant?' },
    );
    expect(revised.statusCode).toBe(200);
    const revision = revised.json() as Json;
    expect(revision.customized).toBe(true);
    expect(revision.approvalStatus).toBe('PENDING');

    const after = (
      await api('GET', `${batchesUrl(opportunityId)}/${batchId}`)
    ).json() as Json;
    // Deterministic rule: the batch returns to review.
    expect((after.batch as Json).status).toBe('DRAFT');
    expect((after.counts as Json).pendingDrafts).toBe(1);

    // Regeneration never silently overwrites the customized draft.
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/regenerate`);
    const afterRegen = (
      await api('GET', `${batchesUrl(opportunityId)}/${batchId}`)
    ).json() as Json;
    expect((afterRegen.counts as Json).pendingDrafts).toBe(1);
    const customized = (afterRegen.drafts as Json[]).find(
      (d) => d.customized === true,
    ) as Json;
    expect(customized.body).toContain('Edited by a human.');
  });

  it('applies a batch message to the current non-customized drafts, preserves personalization, and protects customized drafts', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    const b = await addLead(opportunityId, runId, evidenceId, 'Geras Garas');
    await qualifyAndContact(opportunityId, a, true);
    await qualifyAndContact(opportunityId, b, true);
    await assignSender(productId);

    const summary = (
      await api('POST', batchesUrl(opportunityId), { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;

    const applied = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/apply-message`, {
        subject: 'Batch subject',
        proposition: 'Shared proposition text.',
        terms: 'Shared terms text.',
        cta: 'Shared CTA?',
      })
    ).json() as Json;
    const drafts = latestPerLead(applied.drafts as Json[]);
    expect(drafts).toHaveLength(2);
    for (const draft of drafts) {
      expect(draft.subject).toBe('Batch subject');
      expect(draft.body).toContain('Shared proposition text.');
      expect(draft.body).toContain('Shared terms text.');
      expect(draft.body).toContain('Shared CTA?');
      // Evidence-backed personalization is preserved.
      expect(draft.body).toContain('you sell sauna cladding');
      expect(draft.customized).toBe(false);
    }
    expect((applied.counts as Json).regeneratableDrafts).toBe(2);

    // Individually customize one draft, then re-apply a new batch subject.
    const first = drafts[0]!;
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${first.leadId as string}/outreach-drafts/${first.id as string}`,
      { canonicalBody: 'CUSTOM individual body.\n\nWould this be relevant?' },
    );
    const applied2 = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/apply-message`, {
        subject: 'Second subject',
      })
    ).json() as Json;
    const drafts2 = latestPerLead(applied2.drafts as Json[]);
    const customized = drafts2.find((d) => d.leadId === first.leadId) as Json;
    const other = drafts2.find((d) => d.leadId !== first.leadId) as Json;
    expect(customized.customized).toBe(true);
    expect(customized.body).toContain('CUSTOM individual body.');
    expect(customized.subject).not.toBe('Second subject');
    expect(other.subject).toBe('Second subject');
    expect((applied2.counts as Json).customizedDrafts).toBe(1);
  });

  it('does not silently apply a message to an APPROVED batch (must reopen first)', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    await qualifyAndContact(opportunityId, a, true);
    await assignSender(productId);
    const summary = (
      await api('POST', batchesUrl(opportunityId), { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/approve`);

    const conflict = await api(
      'POST',
      `${batchesUrl(opportunityId)}/${batchId}/apply-message`,
      { subject: 'Should not apply' },
    );
    expect(conflict.statusCode).toBe(409);
    expect((conflict.json() as Json).error).toBe('batch_approved_reopen_first');
    // The approved version is untouched.
    const after = (
      await api('GET', `${batchesUrl(opportunityId)}/${batchId}`)
    ).json() as Json;
    expect((after.batch as Json).status).toBe('APPROVED');
    expect((latestPerLead(after.drafts as Json[])[0] as Json).subject).not.toBe(
      'Should not apply',
    );
  });

  it('reopen returns an approved batch to DRAFT, preserves approved history, re-applies as new pending versions, and re-approval freezes only the new versions', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    const b = await addLead(opportunityId, runId, evidenceId, 'Geras Garas');
    await qualifyAndContact(opportunityId, a, true);
    await qualifyAndContact(opportunityId, b, true);
    await assignSender(productId);

    const summary = (
      await api('POST', batchesUrl(opportunityId), { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/apply-message`, {
      subject: 'First subject',
      proposition: 'First proposition.',
    });
    const approved = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/approve`)
    ).json() as Json;
    expect((approved.batch as Json).status).toBe('APPROVED');
    const approvedVersions = latestPerLead(approved.drafts as Json[]);
    expect(approvedVersions).toHaveLength(2);
    expect(
      approvedVersions.every((d) => d.approvalStatus === 'APPROVED'),
    ).toBe(true);

    // Reopen for editing.
    const reopened = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/reopen`, {})
    ).json() as Json;
    expect((reopened.batch as Json).status).toBe('DRAFT');
    // Approved versions remain untouched immutable history.
    for (const version of approvedVersions) {
      const found = (reopened.drafts as Json[]).find(
        (d) => d.id === version.id,
      ) as Json;
      expect(found.approvalStatus).toBe('APPROVED');
      expect(found.subject).toBe('First subject');
      expect(found.body).toBe(version.body);
    }

    // Apply the new shared message: new PENDING versions, old ones unchanged.
    const applied = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/apply-message`, {
        subject: 'Reopened subject',
        proposition: 'Reopened proposition.',
      })
    ).json() as Json;
    expect((applied.batch as Json).status).toBe('DRAFT');
    const newVersions = latestPerLead(applied.drafts as Json[]);
    for (const version of newVersions) {
      expect(version.subject).toBe('Reopened subject');
      expect(version.body).toContain('Reopened proposition.');
      expect(version.approvalStatus).toBe('PENDING');
      expect(version.customized).toBe(false);
    }
    for (const version of approvedVersions) {
      const found = (applied.drafts as Json[]).find((d) => d.id === version.id) as Json;
      expect(found.subject).toBe('First subject');
      expect(found.body).toBe(version.body);
      expect(found.approvalStatus).toBe('APPROVED');
    }

    // Re-approval freezes only the new current versions.
    const reapproved = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/approve`)
    ).json() as Json;
    const finalVersions = latestPerLead(reapproved.drafts as Json[]);
    for (const version of finalVersions) {
      expect(version.approvalStatus).toBe('APPROVED');
      expect(version.subject).toBe('Reopened subject');
    }
    for (const version of approvedVersions) {
      const found = (reapproved.drafts as Json[]).find(
        (d) => d.id === version.id,
      ) as Json;
      expect(found.subject).toBe('First subject');
      expect(found.body).toBe(version.body);
    }
  });

  it('reopen with resetCustomized unlocks a customized draft for regeneration while keeping its history', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    await qualifyAndContact(opportunityId, a, true);
    await assignSender(productId);
    const summary = (
      await api('POST', batchesUrl(opportunityId), { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/apply-message`, {
      subject: 'Initial subject',
    });
    const initial = latestPerLead(
      ((await api('GET', `${batchesUrl(opportunityId)}/${batchId}`)).json() as Json)
        .drafts as Json[],
    )[0] as Json;
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${initial.leadId as string}/outreach-drafts/${initial.id as string}`,
      { canonicalBody: 'HUMAN EDIT body.\n\nWould this be relevant?' },
    );
    // Approve the customized draft, then reopen with the explicit reset.
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/approve`);
    const reopened = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/reopen`, {
        resetCustomized: true,
      })
    ).json() as Json;
    const afterReset = latestPerLead(reopened.drafts as Json[])[0] as Json;
    expect(afterReset.customized).toBe(false);
    expect(afterReset.approvalStatus).toBe('PENDING');
    expect(afterReset.body).toContain('HUMAN EDIT body.');

    const applied = (
      await api('POST', `${batchesUrl(opportunityId)}/${batchId}/apply-message`, {
        subject: 'Shared reset subject',
      })
    ).json() as Json;
    const latest = latestPerLead(applied.drafts as Json[])[0] as Json;
    expect(latest.subject).toBe('Shared reset subject');
    expect(latest.customized).toBe(false);
    // The human-edited version is still preserved as history.
    expect(
      (applied.drafts as Json[]).some(
        (d) => typeof d.body === 'string' && d.body.includes('HUMAN EDIT body.'),
      ),
    ).toBe(true);
  });

  it('refuses to reopen a batch that has entered QUEUED, SENDING or SENT', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    await qualifyAndContact(opportunityId, a, true);
    await assignSender(productId);
    const summary = (
      await api('POST', batchesUrl(opportunityId), { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/approve`);

    for (const status of ['QUEUED', 'SENDING', 'SENT'] as const) {
      await prisma.db.outreachBatch.update({
        where: { id: batchId },
        data: { status, startedAt: new Date() },
      });
      const res = await api(
        'POST',
        `${batchesUrl(opportunityId)}/${batchId}/reopen`,
        {},
      );
      expect(res.statusCode, status).toBe(409);
      expect((res.json() as Json).error).toBe('batch_not_reopenable');
    }
  });
});
