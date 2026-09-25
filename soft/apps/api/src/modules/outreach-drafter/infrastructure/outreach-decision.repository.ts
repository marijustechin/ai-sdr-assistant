import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@ai-sdr/database';
import type {
  OutreachDecisionRecord,
  SetOutreachDecisionData,
} from '../domain/types.js';

type OutreachDecision = Awaited<
  ReturnType<PrismaService['db']['outreachDecision']['upsert']>
>;

function toRecord(row: OutreachDecision): OutreachDecisionRecord {
  return {
    id: row.id,
    opportunityId: row.opportunityId,
    companyId: row.companyId,
    decision: row.decision,
    note: row.note,
    decidedByKind: row.decidedByKind,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Typed repository scoped to the table owned by `outreach-drafter`:
 * `outreach_decisions`. Every write records human provenance (`HUMAN` +
 * `decidedAt`); the agent never writes here.
 */
@Injectable()
export class OutreachDecisionRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async find(
    opportunityId: string,
    companyId: string,
  ): Promise<OutreachDecisionRecord | null> {
    const row = await this.prisma.db.outreachDecision.findUnique({
      where: { opportunityId_companyId: { opportunityId, companyId } },
    });
    return row ? toRecord(row) : null;
  }

  async upsert(
    opportunityId: string,
    companyId: string,
    data: SetOutreachDecisionData,
  ): Promise<OutreachDecisionRecord> {
    const row = await this.prisma.db.outreachDecision.upsert({
      where: { opportunityId_companyId: { opportunityId, companyId } },
      create: {
        opportunityId,
        companyId,
        decision: data.decision,
        note: data.note ?? null,
        decidedByKind: 'HUMAN',
        decidedAt: new Date(),
      },
      update: {
        decision: data.decision,
        note: data.note ?? null,
        decidedByKind: 'HUMAN',
        decidedAt: new Date(),
      },
    });
    return toRecord(row);
  }
}
