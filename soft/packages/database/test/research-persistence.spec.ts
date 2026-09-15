import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  PrismaService,
  ClaimConfidence,
  ClaimEvidenceStance,
  ClaimLifecycleStatus,
  ClaimType,
  EvidenceVerificationStatus,
  ResearchQueryStatus,
  ResearchRunPauseReason,
  ResearchRunStatus,
  type Opportunity,
  type TargetMarket,
} from '../src/index.js';
import { resetDatabase } from './helpers/database.js';

describe('research persistence (integration against local PostgreSQL)', () => {
  let prisma: PrismaService;

  beforeAll(() => {
    prisma = new PrismaService();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => {
    await resetDatabase(prisma.db);
  });

  async function seedOpportunity(): Promise<{
    opportunity: Opportunity;
    market: TargetMarket;
  }> {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });
    const offer = await prisma.db.offer.create({
      data: { productId: product.id, name: 'Thermo Abachi STS 3D' },
    });
    const market = await prisma.db.targetMarket.create({
      data: { country: 'LT', segment: 'sauna manufacturers' },
    });
    const opportunity = await prisma.db.opportunity.create({
      data: { offerId: offer.id, name: 'Thermo Abachi cladding' },
    });
    await prisma.db.opportunityTargetMarket.create({
      data: { opportunityId: opportunity.id, targetMarketId: market.id },
    });
    return { opportunity, market };
  }

  it('persists a run, a run-scoped query, a deduplicated source, evidence, and a separate claim', async () => {
    const { opportunity, market } = await seedOpportunity();

    const run = await prisma.db.researchRun.create({
      data: {
        opportunityId: opportunity.id,
        contextVersion: 1,
        status: ResearchRunStatus.RUNNING,
        startedAt: new Date(),
      },
    });
    await prisma.db.researchRunTargetMarket.create({
      data: { researchRunId: run.id, targetMarketId: market.id },
    });

    const query = await prisma.db.researchQuery.create({
      data: {
        researchRunId: run.id,
        queryText: 'abachi cladding suppliers Lithuania',
        provider: 'exa',
        status: ResearchQueryStatus.SUCCEEDED,
        executedAt: new Date('2026-09-15T08:00:00Z'),
        resultCount: 12,
      },
    });

    const source = await prisma.db.sourceReference.upsert({
      where: { url: 'https://example.invalid/supplier-a' },
      create: {
        url: 'https://example.invalid/supplier-a',
        title: 'Supplier A',
        publisher: 'example.invalid',
      },
      update: {},
    });
    const sameSource = await prisma.db.sourceReference.upsert({
      where: { url: 'https://example.invalid/supplier-a' },
      create: { url: 'https://example.invalid/supplier-a' },
      update: {},
    });
    expect(sameSource.id).toBe(source.id);

    const evidence = await prisma.db.evidence.create({
      data: {
        researchRunId: run.id,
        sourceReferenceId: source.id,
        evidenceText: 'Supplier A lists thermo-treated abachi cladding (20x95mm).',
        verificationStatus: EvidenceVerificationStatus.VERIFIED,
        retrievedAt: new Date('2026-09-15T08:05:00Z'),
      },
    });

    const claim = await prisma.db.claim.create({
      data: {
        researchRunId: run.id,
        type: ClaimType.FACT,
        statement: 'Supplier A offers thermo-treated abachi cladding in Lithuania.',
        confidence: ClaimConfidence.HIGH,
      },
    });
    await prisma.db.claimEvidence.create({
      data: {
        claimId: claim.id,
        evidenceId: evidence.id,
        stance: ClaimEvidenceStance.SUPPORTS,
      },
    });

    expect(run.contextVersion).toBe(1);
    expect(run.pauseReason).toBeNull();
    expect(query.researchRunId).toBe(run.id);
    expect(query.status).toBe(ResearchQueryStatus.SUCCEEDED);
    expect(evidence.retrievedAt).toEqual(new Date('2026-09-15T08:05:00Z'));
    expect(evidence.evidenceText).toContain('thermo-treated abachi');
    expect(claim.type).toBe(ClaimType.FACT);

    const reloaded = await prisma.db.claim.findUniqueOrThrow({
      where: { id: claim.id },
      include: { evidenceLinks: { include: { evidence: true } } },
    });
    // Claim and evidence are structurally separate rows linked explicitly.
    expect(reloaded.evidenceLinks).toHaveLength(1);
    expect(reloaded.evidenceLinks[0]?.evidence.id).toBe(evidence.id);
    expect(reloaded.evidenceLinks[0]?.stance).toBe(
      ClaimEvidenceStance.SUPPORTS,
    );
  });

  it('keeps UNVERIFIED evidence distinguishable from VERIFIED evidence', async () => {
    const { opportunity } = await seedOpportunity();
    const run = await prisma.db.researchRun.create({
      data: { opportunityId: opportunity.id, contextVersion: 1 },
    });
    const source = await prisma.db.sourceReference.create({
      data: { url: 'https://example.invalid/lead' },
    });

    const lead = await prisma.db.evidence.create({
      data: {
        researchRunId: run.id,
        sourceReferenceId: source.id,
        evidenceText: 'Search snippet mentions a supplier (not fetched).',
      },
    });

    expect(lead.verificationStatus).toBe(
      EvidenceVerificationStatus.UNVERIFIED,
    );
    expect(lead.retrievedAt).toBeNull();
  });

  it('keeps PAUSED + pauseReason distinct from FAILED + errorCode', async () => {
    const { opportunity } = await seedOpportunity();

    const paused = await prisma.db.researchRun.create({
      data: {
        opportunityId: opportunity.id,
        contextVersion: 2,
        status: ResearchRunStatus.PAUSED,
        pauseReason: ResearchRunPauseReason.CONTEXT_CHANGED,
        pauseNote: 'context changed from v1 to v2',
        checkpoint: {
          coverage: [
            { targetMarketId: 'm1', dimension: 'suppliers', status: 'PARTIAL' },
          ],
        },
        checkpointAt: new Date(),
      },
    });
    expect(paused.status).toBe(ResearchRunStatus.PAUSED);
    expect(paused.pauseReason).toBe(ResearchRunPauseReason.CONTEXT_CHANGED);
    expect(paused.errorCode).toBeNull();
    expect(paused.checkpoint).toMatchObject({ coverage: [{ status: 'PARTIAL' }] });

    const resumed = await prisma.db.researchRun.update({
      where: { id: paused.id },
      data: { status: ResearchRunStatus.RUNNING, pauseReason: null, pauseNote: null },
    });
    expect(resumed.status).toBe(ResearchRunStatus.RUNNING);
    expect(resumed.pauseReason).toBeNull();

    const failed = await prisma.db.researchRun.create({
      data: {
        opportunityId: opportunity.id,
        contextVersion: 2,
        status: ResearchRunStatus.FAILED,
        errorCode: 'provider_unavailable',
        errorNote: 'discovery provider returned 503',
        finishedAt: new Date(),
      },
    });
    expect(failed.pauseReason).toBeNull();
    expect(failed.errorCode).toBe('provider_unavailable');
  });

  it('prevents duplicate claim↔evidence links', async () => {
    const { opportunity } = await seedOpportunity();
    const run = await prisma.db.researchRun.create({
      data: { opportunityId: opportunity.id, contextVersion: 1 },
    });
    const source = await prisma.db.sourceReference.create({
      data: { url: 'https://example.invalid/dup' },
    });
    const evidence = await prisma.db.evidence.create({
      data: {
        researchRunId: run.id,
        sourceReferenceId: source.id,
        evidenceText: 'A fact.',
      },
    });
    const claim = await prisma.db.claim.create({
      data: {
        researchRunId: run.id,
        type: ClaimType.INFERENCE,
        statement: 'An inference.',
      },
    });

    await prisma.db.claimEvidence.create({
      data: { claimId: claim.id, evidenceId: evidence.id },
    });

    await expect(
      prisma.db.claimEvidence.create({
        data: { claimId: claim.id, evidenceId: evidence.id },
      }),
    ).rejects.toThrow();
  });

  it('defaults claims to CURRENT and records a replacement while preserving the original', async () => {
    const { opportunity } = await seedOpportunity();
    const run = await prisma.db.researchRun.create({
      data: { opportunityId: opportunity.id, contextVersion: 1 },
    });

    const original = await prisma.db.claim.create({
      data: {
        researchRunId: run.id,
        type: ClaimType.FACT,
        statement: 'Original statement.',
      },
    });
    expect(original.lifecycleStatus).toBe(ClaimLifecycleStatus.CURRENT);
    expect(original.correctedAt).toBeNull();
    expect(original.replacedByClaimId).toBeNull();

    const replacement = await prisma.db.claim.create({
      data: {
        researchRunId: run.id,
        type: ClaimType.INFERENCE,
        statement: 'Replacement statement.',
      },
    });

    const corrected = await prisma.db.claim.update({
      where: { id: original.id },
      data: {
        lifecycleStatus: ClaimLifecycleStatus.REPLACED,
        correctionReason: 'Corrected unit of measure.',
        correctedAt: new Date('2026-09-15T12:00:00Z'),
        replacedByClaimId: replacement.id,
      },
    });
    expect(corrected.lifecycleStatus).toBe(ClaimLifecycleStatus.REPLACED);
    expect(corrected.replacedByClaimId).toBe(replacement.id);
    expect(corrected.correctionReason).toBe('Corrected unit of measure.');

    const current = await prisma.db.claim.findMany({
      where: { researchRunId: run.id, lifecycleStatus: ClaimLifecycleStatus.CURRENT },
    });
    expect(current.map((claim) => claim.id)).toEqual([replacement.id]);

    const all = await prisma.db.claim.findMany({
      where: { researchRunId: run.id },
    });
    expect(all).toHaveLength(2);
    expect(all.find((claim) => claim.id === original.id)?.statement).toBe(
      'Original statement.',
    );
  });

  it('cascades run-owned records on run delete but keeps the source', async () => {    const { opportunity } = await seedOpportunity();
    const run = await prisma.db.researchRun.create({
      data: { opportunityId: opportunity.id, contextVersion: 1 },
    });
    const source = await prisma.db.sourceReference.create({
      data: { url: 'https://example.invalid/keep' },
    });
    await prisma.db.researchQuery.create({
      data: { researchRunId: run.id, queryText: 'q' },
    });
    const evidence = await prisma.db.evidence.create({
      data: {
        researchRunId: run.id,
        sourceReferenceId: source.id,
        evidenceText: 'e',
      },
    });
    await prisma.db.claim.create({
      data: {
        researchRunId: run.id,
        type: ClaimType.FACT,
        statement: 's',
        evidenceLinks: { create: { evidenceId: evidence.id } },
      },
    });

    await prisma.db.researchRun.delete({ where: { id: run.id } });

    expect(await prisma.db.researchQuery.count()).toBe(0);
    expect(await prisma.db.evidence.count()).toBe(0);
    expect(await prisma.db.claim.count()).toBe(0);
    expect(await prisma.db.claimEvidence.count()).toBe(0);
    expect(await prisma.db.sourceReference.count()).toBe(1);
  });
});
