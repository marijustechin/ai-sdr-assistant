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

describe('Potential-buyer shortlist API (integration)', () => {
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

  async function seedRun(): Promise<{ opportunityId: string; runId: string }> {
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
    return {
      opportunityId: opportunity.id as string,
      runId: run.id as string,
    };
  }

  async function addEvidence(
    opportunityId: string,
    runId: string,
    url: string,
  ): Promise<Json> {
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/evidence`,
      {
        url,
        evidenceText: 'The company designs and installs saunas.',
        verificationStatus: 'VERIFIED',
        retrievedAt: '2026-09-18T07:00:00.000Z',
      },
    );
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function addClaim(
    opportunityId: string,
    runId: string,
    evidenceId: string,
  ): Promise<Json> {
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims`,
      {
        type: 'FACT',
        statement: 'The company builds and installs saunas.',
        confidence: 'HIGH',
        evidence: [{ evidenceId, stance: 'SUPPORTS' }],
      },
    );
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  function leadBody(
    runId: string,
    evidenceId: string,
    overrides: Json = {},
  ): Json {
    return {
      companyName: 'Pirties Meistrai',
      website: 'https://pirtiesmeistrai.lt',
      country: 'Lithuania',
      observedActivityText:
        'Designs, visualises and installs saunas across Lithuania.',
      observedRoles: ['INSTALLER', 'BUILDER'],
      buyerFitHypothesisText:
        'Sauna installers consume sauna cladding and may buy thermo-Abachi for fit-outs.',
      unknownsText: 'No evidence of purchasing volumes or current Abachi usage.',
      nextVerificationStepText: 'Confirm material purchasing on first contact.',
      researchRunId: runId,
      evidenceId,
      ...overrides,
    };
  }

  it('requires the internal key', async () => {
    const missing = await api(
      'GET',
      `/opportunities/${UNKNOWN_UUID}/leads`,
      undefined,
      null,
    );
    expect(missing.statusCode).toBe(401);
    const wrong = await api(
      'GET',
      `/opportunities/${UNKNOWN_UUID}/leads`,
      undefined,
      'wrong-key-0000000000000000',
    );
    expect(wrong.statusCode).toBe(401);
  });

  it('creates a lead with preserved provenance, observed facts and a separate hypothesis', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(
      opportunityId,
      runId,
      'https://pirtiesmeistrai.lt/',
    );
    const claim = await addClaim(opportunityId, runId, evidence.id as string);

    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/leads`,
      leadBody(runId, evidence.id as string, { claimId: claim.id }),
    );
    expect(res.statusCode).toBe(201);
    const lead = res.json() as Json;

    expect((lead.company as Json).name).toBe('Pirties Meistrai');
    expect((lead.company as Json).country).toBe('Lithuania');
    expect(lead.observedRoles).toEqual(['INSTALLER', 'BUILDER']);
    expect(lead.observedActivityText).toContain('installs saunas');
    expect(lead.buyerFitHypothesisText).toContain('may buy');
    expect(lead.reviewStatus).toBe('UNREVIEWED');
    expect(lead.reviewReason).toBeNull();
    expect(lead.needsReview).toBe(false);
    expect(lead.sourceReferenceId).toBe(evidence.sourceReferenceId);
    expect(lead.evidenceId).toBe(evidence.id);
    expect(lead.claimId).toBe(claim.id);
    expect((lead.evidence as Json).id).toBe(evidence.id);
    expect(((lead.evidence as Json).source as Json).url).toBe(
      'https://pirtiesmeistrai.lt/',
    );
    expect((lead.claim as Json).statement).toContain('builds and installs');
  });

  it('deduplicates the same company within the opportunity (case/space-insensitive)', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(
      opportunityId,
      runId,
      'https://pirtiesmeistrai.lt/',
    );

    const first = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string),
      )
    ).json() as Json;
    const second = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string, {
          companyName: '  pirties   MEISTRAI ',
        }),
      )
    ).json() as Json;

    expect(second.id).toBe(first.id);

    const list = (
      await api('GET', `/opportunities/${opportunityId}/leads`)
    ).json() as Array<Json>;
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(first.id);
  });

  it('rejects provenance from another run or a non-current claim', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidenceA = await addEvidence(opportunityId, runId, 'https://a.invalid/');
    const other = await seedRun();
    const foreignEvidence = await addEvidence(
      other.opportunityId,
      other.runId,
      'https://b.invalid/',
    );

    const crossRun = await api(
      'POST',
      `/opportunities/${opportunityId}/leads`,
      leadBody(runId, foreignEvidence.id as string),
    );
    expect(crossRun.statusCode).toBe(400);
    expect((crossRun.json() as Json).error).toBe('lead_evidence_not_found');

    const claimA = await addClaim(opportunityId, runId, evidenceA.id as string);
    const claimB = await addClaim(opportunityId, runId, evidenceA.id as string);
    // Replace claimA, making it no longer CURRENT.
    const corrected = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims/${claimA.id as string}/corrections`,
      { kind: 'REPLACEMENT', reason: 'superseded', replacementClaimId: claimB.id },
    );
    expect(corrected.statusCode).toBe(201);

    const superseded = await api(
      'POST',
      `/opportunities/${opportunityId}/leads`,
      leadBody(runId, evidenceA.id as string, { claimId: claimA.id }),
    );
    expect(superseded.statusCode).toBe(400);
    expect((superseded.json() as Json).error).toBe('lead_claim_not_current');
  });

  it('flags a lead for review when its supporting claim is replaced, and blocks shortlisting', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId, 'https://a.invalid/');
    const claim = await addClaim(opportunityId, runId, evidence.id as string);

    const created = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string, { claimId: claim.id }),
      )
    ).json() as Json;

    const shortlisted = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}`,
      { reviewStatus: 'SHORTLISTED', reviewReason: 'Strong fit.' },
    );
    expect(shortlisted.statusCode).toBe(200);
    expect((shortlisted.json() as Json).reviewStatus).toBe('SHORTLISTED');
    expect((shortlisted.json() as Json).reviewReason).toBe('Strong fit.');

    const replacement = await addClaim(
      opportunityId,
      runId,
      evidence.id as string,
    );
    const corrected = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims/${claim.id as string}/corrections`,
      {
        kind: 'REPLACEMENT',
        reason: 'better statement',
        replacementClaimId: replacement.id,
      },
    );
    expect(corrected.statusCode).toBe(201);

    const flagged = (
      await api(
        'GET',
        `/opportunities/${opportunityId}/leads/${created.id as string}`,
      )
    ).json() as Json;
    expect(flagged.needsReview).toBe(true);
    expect(((flagged.claim as Json).lifecycleStatus)).toBe('REPLACED');

    const blocked = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}`,
      { reviewStatus: 'SHORTLISTED' },
    );
    expect(blocked.statusCode).toBe(409);
    expect((blocked.json() as Json).error).toBe('lead_claim_not_current');
  });

  it('records reject and reset review actions and lists leads', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId, 'https://a.invalid/');
    const created = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string),
      )
    ).json() as Json;

    const rejected = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}`,
      { reviewStatus: 'REJECTED', reviewReason: 'Not a buyer.' },
    );
    expect(rejected.statusCode).toBe(200);
    const rejectedBody = rejected.json() as Json;
    expect(rejectedBody.reviewStatus).toBe('REJECTED');
    expect(rejectedBody.reviewReason).toBe('Not a buyer.');
    expect(rejectedBody.reviewedAt).not.toBeNull();

    const reset = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}`,
      { reviewStatus: 'UNREVIEWED' },
    );
    const resetBody = reset.json() as Json;
    expect(resetBody.reviewStatus).toBe('UNREVIEWED');
    expect(resetBody.reviewReason).toBeNull();

    const missing = await api(
      'GET',
      `/opportunities/${opportunityId}/leads/${UNKNOWN_UUID}`,
    );
    expect(missing.statusCode).toBe(404);

    const unknownOpportunity = await api(
      'GET',
      `/opportunities/${UNKNOWN_UUID}/leads`,
    );
    expect(unknownOpportunity.statusCode).toBe(404);
  });

  it('rejects an unknown field on create', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId, 'https://a.invalid/');
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/leads`,
      leadBody(runId, evidence.id as string, { score: 87 }),
    );
    expect(res.statusCode).toBe(400);
  });

  it('records agent qualification separately from review and computes eligibility', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId, 'https://a.invalid/');
    const created = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string),
      )
    ).json() as Json;

    const noReason = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}/qualification`,
      { status: 'QUALIFIED' },
    );
    expect(noReason.statusCode).toBe(400);

    const qualified = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}/qualification`,
      {
        status: 'QUALIFIED',
        reason: 'Installer role established by the linked evidence.',
      },
    );
    expect(qualified.statusCode).toBe(200);
    const q = qualified.json() as Json;
    expect(q.agentQualificationStatus).toBe('QUALIFIED');
    expect(q.agentQualificationReason).toContain('Installer');
    expect(q.agentAssessedAt).toBeTruthy();
    // The human review fields are never written by agent qualification.
    expect(q.reviewStatus).toBe('UNREVIEWED');
    expect(q.reviewedAt).toBeNull();
    expect(q.eligibleForContactDiscovery).toBe(true);

    const cleared = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}/qualification`,
      { status: 'NOT_ASSESSED' },
    );
    const c = cleared.json() as Json;
    expect(c.agentQualificationStatus).toBe('NOT_ASSESSED');
    expect(c.agentQualificationReason).toBeNull();
    expect(c.eligibleForContactDiscovery).toBe(false);
  });

  it('lets a human shortlist provide eligibility and always honors a human rejection', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId, 'https://a.invalid/');
    const created = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string),
      )
    ).json() as Json;

    // An unreviewed candidate can be qualified by the agent (already covered);
    // a human shortlist is an additional eligibility path without qualification.
    const shortlisted = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}`,
      { reviewStatus: 'SHORTLISTED' },
    );
    expect((shortlisted.json() as Json).eligibleForContactDiscovery).toBe(true);

    const rejected = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}`,
      { reviewStatus: 'REJECTED', reviewReason: 'Out of scope.' },
    );
    expect(rejected.statusCode).toBe(200);

    const qualify = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Attempted override after rejection.' },
    );
    expect(qualify.statusCode).toBe(409);
    expect((qualify.json() as Json).error).toBe('lead_rejected_by_operator');

    const read = (
      await api(
        'GET',
        `/opportunities/${opportunityId}/leads/${created.id as string}`,
      )
    ).json() as Json;
    expect(read.agentQualificationStatus).toBe('NOT_ASSESSED');
    expect(read.eligibleForContactDiscovery).toBe(false);
  });

  it('invalidates a stale agent qualification when the supporting claim is replaced', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId, 'https://a.invalid/');
    const claim = await addClaim(opportunityId, runId, evidence.id as string);
    const created = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string, { claimId: claim.id }),
      )
    ).json() as Json;

    const qualified = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Product-fit: installer role.' },
    );
    expect((qualified.json() as Json).eligibleForContactDiscovery).toBe(true);

    // Replace the supporting finding, so the qualification basis is superseded.
    const replacement = await addClaim(
      opportunityId,
      runId,
      evidence.id as string,
    );
    const corrected = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims/${claim.id as string}/corrections`,
      {
        kind: 'REPLACEMENT',
        reason: 'better statement',
        replacementClaimId: replacement.id,
      },
    );
    expect(corrected.statusCode).toBe(201);

    const stale = (
      await api(
        'GET',
        `/opportunities/${opportunityId}/leads/${created.id as string}`,
      )
    ).json() as Json;
    expect(stale.needsReview).toBe(true);
    expect(stale.agentQualificationStatus).toBe('QUALIFIED');
    expect(stale.agentQualificationStale).toBe(true);
    // Stale qualification must not silently enable progression.
    expect(stale.eligibleForContactDiscovery).toBe(false);

    // Re-qualifying while the finding is stale is refused.
    const requalify = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Re-qualify on stale evidence.' },
    );
    expect(requalify.statusCode).toBe(409);
    expect((requalify.json() as Json).error).toBe('lead_claim_not_current');

    // Loophole closed: re-submitting the lead with the CURRENT replacement claim
    // changes its provenance basis, so the prior qualification stays stale and
    // progression remains blocked until an explicit reassessment.
    const resubmitted = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/leads`,
        leadBody(runId, evidence.id as string, { claimId: replacement.id }),
      )
    ).json() as Json;
    expect(resubmitted.id).toBe(created.id);
    expect(resubmitted.claimId).toBe(replacement.id);
    expect(resubmitted.needsReview).toBe(false);
    expect(resubmitted.agentQualificationStale).toBe(true);
    expect(resubmitted.eligibleForContactDiscovery).toBe(false);

    // Reassessing on the current basis clears the staleness.
    const reassessed = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${created.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Reassessed on the replacement finding.' },
    );
    expect(reassessed.statusCode).toBe(200);
    expect((reassessed.json() as Json).agentQualificationStale).toBe(false);
    expect((reassessed.json() as Json).eligibleForContactDiscovery).toBe(true);
  });
});
