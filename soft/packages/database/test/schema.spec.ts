import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  PrismaService,
  FactStatus,
  FactVisibility,
  OfferStatus,
  OpportunityStatus,
  ResearchRunStatus,
} from '../src/index.js';
import { resetDatabase } from './helpers/database.js';

describe('core commercial domain (integration against local PostgreSQL)', () => {
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

  it('checkReadiness() performs a safe connectivity query', async () => {
    await expect(prisma.checkReadiness()).resolves.toBeUndefined();
  });

  it('supports the full product → offer → opportunity → research flow', async () => {
    const product = await prisma.db.product.create({
      data: { name: 'Abachi', scientificName: 'Triplochiton scleroxylon' },
    });

    const offer = await prisma.db.offer.create({
      data: { productId: product.id, name: 'Thermo Abachi STS 3D', commercialStatus: OfferStatus.ACTIVE },
    });

    const fact = await prisma.db.productFact.create({
      data: {
        productId: product.id,
        key: 'thickness_mm',
        valueText: '20',
        status: FactStatus.CONFIRMED,
        visibility: FactVisibility.OPERATIONAL,
        sourceLabel: 'internal-spec-sheet',
      },
    });

    const market = await prisma.db.targetMarket.create({
      data: { country: 'LT', segment: 'sauna manufacturers' },
    });

    const opportunity = await prisma.db.opportunity.create({
      data: { offerId: offer.id, name: 'Thermo Abachi cladding', lifecycleStatus: OpportunityStatus.ACTIVE },
    });

    const link = await prisma.db.opportunityTargetMarket.create({
      data: { opportunityId: opportunity.id, targetMarketId: market.id },
    });

    const run = await prisma.db.researchRun.create({
      data: { opportunityId: opportunity.id, status: ResearchRunStatus.QUEUED, contextVersion: 1 },
    });

    const runScope = await prisma.db.researchRunTargetMarket.create({
      data: { researchRunId: run.id, targetMarketId: market.id },
    });

    expect(product.id).toBeTruthy();
    expect(offer.productId).toBe(product.id);
    expect(fact.productId).toBe(product.id);
    expect(fact.valueText).toBe('20');
    expect(link.opportunityId).toBe(opportunity.id);
    expect(opportunity.offerId).toBe(offer.id);
    expect(run.opportunityId).toBe(opportunity.id);
    expect(run.contextVersion).toBe(1);
    expect(runScope.researchRunId).toBe(run.id);
  });

  it('rejects a ProductFact belonging to both a Product and an Offer', async () => {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });
    const offer = await prisma.db.offer.create({
      data: { productId: product.id, name: 'Thermo Abachi STS 3D' },
    });

    await expect(
      prisma.db.productFact.create({
        data: { productId: product.id, offerId: offer.id, key: 'origin', valueText: 'West Africa' },
      }),
    ).rejects.toThrow();
  });

  it('rejects a ProductFact belonging to neither a Product nor an Offer', async () => {
    await expect(
      prisma.db.productFact.create({
        data: { key: 'origin', valueText: 'West Africa' },
      }),
    ).rejects.toThrow();
  });

  it('rejects a ProductFact without a textual or numeric value', async () => {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });

    await expect(
      prisma.db.productFact.create({
        data: { productId: product.id, key: 'thickness_mm' },
      }),
    ).rejects.toThrow();
  });

  it('stores numeric facts with an optional unit', async () => {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });

    const fact = await prisma.db.productFact.create({
      data: {
        productId: product.id,
        key: 'density_kg_m3',
        valueNumeric: 420,
        unit: 'kg/m3',
        status: FactStatus.PENDING,
      },
    });

    expect(fact.valueNumeric?.toNumber()).toBe(420);
    expect(fact.unit).toBe('kg/m3');
  });

  it('prevents duplicate TargetMarket country+segment combinations', async () => {
    await prisma.db.targetMarket.create({
      data: { country: 'DE', segment: 'timber importers' },
    });

    await expect(
      prisma.db.targetMarket.create({
        data: { country: 'DE', segment: 'timber importers' },
      }),
    ).rejects.toThrow();
  });

  it('prevents duplicate Opportunity↔TargetMarket joins', async () => {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });
    const offer = await prisma.db.offer.create({ data: { productId: product.id, name: 'STS 3D' } });
    const opportunity = await prisma.db.opportunity.create({
      data: { offerId: offer.id, name: 'Opp' },
    });
    const market = await prisma.db.targetMarket.create({
      data: { country: 'LT', segment: 'sauna manufacturers' },
    });

    await prisma.db.opportunityTargetMarket.create({
      data: { opportunityId: opportunity.id, targetMarketId: market.id },
    });

    await expect(
      prisma.db.opportunityTargetMarket.create({
        data: { opportunityId: opportunity.id, targetMarketId: market.id },
      }),
    ).rejects.toThrow();
  });

  it('prevents duplicate ResearchRun↔TargetMarket scope joins', async () => {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });
    const offer = await prisma.db.offer.create({ data: { productId: product.id, name: 'STS 3D' } });
    const opportunity = await prisma.db.opportunity.create({
      data: { offerId: offer.id, name: 'Opp' },
    });
    const market = await prisma.db.targetMarket.create({
      data: { country: 'LT', segment: 'sauna manufacturers' },
    });
    const run = await prisma.db.researchRun.create({
      data: { opportunityId: opportunity.id, contextVersion: 2 },
    });

    await prisma.db.researchRunTargetMarket.create({
      data: { researchRunId: run.id, targetMarketId: market.id },
    });

    await expect(
      prisma.db.researchRunTargetMarket.create({
        data: { researchRunId: run.id, targetMarketId: market.id },
      }),
    ).rejects.toThrow();
  });

  it('records ResearchRun lifecycle timestamps and failure-safe note', async () => {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });
    const offer = await prisma.db.offer.create({ data: { productId: product.id, name: 'STS 3D' } });
    const opportunity = await prisma.db.opportunity.create({
      data: { offerId: offer.id, name: 'Opp' },
    });

    const run = await prisma.db.researchRun.create({
      data: {
        opportunityId: opportunity.id,
        contextVersion: 3,
        status: ResearchRunStatus.COMPLETED,
        startedAt: new Date('2026-09-10T10:00:00Z'),
        finishedAt: new Date('2026-09-10T10:05:00Z'),
      },
    });

    expect(run.status).toBe(ResearchRunStatus.COMPLETED);
    expect(run.startedAt).toEqual(new Date('2026-09-10T10:00:00Z'));
    expect(run.requestedAt).toBeInstanceOf(Date);
    expect(run.errorCode).toBeNull();
    expect(run.errorNote).toBeNull();
  });
});
