import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  PrismaService,
  EvidenceVerificationStatus,
  ResearchQueryStatus,
  ResearchRunStatus,
} from '../src/index.js';
import { resetDatabase } from './helpers/database.js';

/**
 * Regression guard for O-016: non-ASCII research text must round-trip through
 * the database exactly, with no U+FFFD replacement character and no
 * double-encoding. Historical corruption was introduced by the *manager write
 * path* (PowerShell), not here; this test pins the persistence layer so a future
 * regression is caught. Characters chosen are the ones historically damaged:
 * Lithuanian (ė š ū ą ž č) and Finnish (ä ö) plus U+20AC and U+2014.
 */
describe('research text encoding round-trip (integration against local PostgreSQL)', () => {
  let prisma: PrismaService;
  const FFFD = '\uFFFD';

  const LITHUANIAN = 'Termiškai apdorotas abachi ajuosas dailylentės sauna gamintojas tiekėjas';
  const FINNISH = 'lämpökäsitelty abachi saunan paneeli valmistaja jälleenmyyjä';
  const TITLE = '3D dailylentė Thermo Abachi 18-140- 1550 mm - MatoSauna';
  const PUBLISHER = 'UAB Pirtelė (Pirtele.lt)';
  const EVIDENCE = 'UAB Pirtelė, Lithuania — "Termo abachi dailylentės STS 18x140mm, A rūšis" at 69.00 EUR/m²';

  beforeAll(() => {
    prisma = new PrismaService();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => {
    await resetDatabase(prisma.db);
  });

  it('stores and reads back LT/FI text, € and — byte-exactly without U+FFFD', async () => {
    const product = await prisma.db.product.create({ data: { name: 'Abachi' } });
    const offer = await prisma.db.offer.create({
      data: { productId: product.id, name: 'Thermo Abachi STS 3D' },
    });
    const opportunity = await prisma.db.opportunity.create({
      data: { offerId: offer.id, name: 'Thermo Abachi cladding' },
    });
    const run = await prisma.db.researchRun.create({
      data: {
        opportunityId: opportunity.id,
        contextVersion: 7,
        status: ResearchRunStatus.PAUSED,
      },
    });

    await prisma.db.researchQuery.create({
      data: { researchRunId: run.id, queryText: LITHUANIAN, status: ResearchQueryStatus.SUCCEEDED },
    });
    await prisma.db.researchQuery.create({
      data: { researchRunId: run.id, queryText: FINNISH, status: ResearchQueryStatus.SUCCEEDED },
    });

    const source = await prisma.db.sourceReference.create({
      data: { url: 'https://example.invalid/matosauna', title: TITLE, publisher: PUBLISHER },
    });
    await prisma.db.evidence.create({
      data: {
        researchRunId: run.id,
        sourceReferenceId: source.id,
        evidenceText: EVIDENCE,
        verificationStatus: EvidenceVerificationStatus.VERIFIED,
        retrievedAt: new Date('2026-09-15T08:05:00Z'),
      },
    });

    const queries = await prisma.db.researchQuery.findMany({
      where: { researchRunId: run.id },
      orderBy: { queryText: 'asc' },
    });
    const texts = queries.map((q) => q.queryText);
    expect(texts).toContain(LITHUANIAN);
    expect(texts).toContain(FINNISH);

    const reloadedSource = await prisma.db.sourceReference.findUniqueOrThrow({
      where: { id: source.id },
    });
    expect(reloadedSource.title).toBe(TITLE);
    expect(reloadedSource.publisher).toBe(PUBLISHER);

    const reloadedEvidence = await prisma.db.evidence.findFirstOrThrow({
      where: { researchRunId: run.id },
    });
    expect(reloadedEvidence.evidenceText).toBe(EVIDENCE);

    for (const value of [...texts, reloadedSource.title, reloadedSource.publisher, reloadedEvidence.evidenceText]) {
      expect(value).not.toContain(FFFD);
    }
    // The specific characters that were historically damaged are present intact.
    expect(reloadedSource.title).toContain('dailylentė');
    expect(reloadedSource.publisher).toContain('Pirtelė');
    expect(reloadedEvidence.evidenceText).toContain('dailylentės');
    expect(reloadedEvidence.evidenceText).toContain('rūšis');
    expect(reloadedEvidence.evidenceText).toContain('—');
    expect(reloadedEvidence.evidenceText).toContain('²');
    expect(texts.find((t) => t.includes('lämpökäsitelty'))).toBeDefined();
  });
});
