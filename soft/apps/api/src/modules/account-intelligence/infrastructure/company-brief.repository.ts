import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type { BriefContent, CompanyBriefStatus } from '@ai-sdr/contracts';
import type {
  CompanyBriefRecord,
  CompanyBriefSnapshotRecord,
  CreateBriefSnapshotData,
} from '../domain/types.js';

type Brief = Prisma.CompanyBriefGetPayload<Record<string, never>>;
type Snapshot = Prisma.CompanyBriefSnapshotGetPayload<Record<string, never>>;

function toBrief(row: Brief): CompanyBriefRecord {
  return {
    id: row.id,
    opportunityId: row.opportunityId,
    companyId: row.companyId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSnapshot(row: Snapshot): CompanyBriefSnapshotRecord {
  return {
    id: row.id,
    briefId: row.briefId,
    version: row.version,
    status: row.status,
    preparedAt: row.preparedAt,
    lastRefreshedAt: row.lastRefreshedAt,
    sourceCount: row.sourceCount,
    content: row.content as unknown as BriefContent,
    enrichmentNote: row.enrichmentNote,
    createdAt: row.createdAt,
  };
}

/**
 * Repository scoped to `company_briefs` / `company_brief_snapshots`, owned by
 * `account-intelligence`. Briefs are append-only at the snapshot level so
 * historical dossiers are preserved.
 */
@Injectable()
export class CompanyBriefRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findBrief(
    opportunityId: string,
    companyId: string,
  ): Promise<CompanyBriefRecord | null> {
    const row = await this.prisma.db.companyBrief.findUnique({
      where: { opportunityId_companyId: { opportunityId, companyId } },
    });
    return row ? toBrief(row) : null;
  }

  async findBriefById(id: string): Promise<CompanyBriefRecord | null> {
    const row = await this.prisma.db.companyBrief.findUnique({ where: { id } });
    return row ? toBrief(row) : null;
  }

  async createBrief(
    opportunityId: string,
    companyId: string,
  ): Promise<CompanyBriefRecord> {
    const row = await this.prisma.db.companyBrief.create({
      data: { opportunityId, companyId },
    });
    return toBrief(row);
  }

  async listSnapshots(briefId: string): Promise<CompanyBriefSnapshotRecord[]> {
    const rows = await this.prisma.db.companyBriefSnapshot.findMany({
      where: { briefId },
      orderBy: [{ version: 'desc' }],
    });
    return rows.map(toSnapshot);
  }

  async findSnapshot(
    briefId: string,
    version: number,
  ): Promise<CompanyBriefSnapshotRecord | null> {
    const row = await this.prisma.db.companyBriefSnapshot.findUnique({
      where: { briefId_version: { briefId, version } },
    });
    return row ? toSnapshot(row) : null;
  }

  async nextVersion(briefId: string): Promise<number> {
    const result = await this.prisma.db.companyBriefSnapshot.aggregate({
      where: { briefId },
      _max: { version: true },
    });
    return (result._max.version ?? 0) + 1;
  }

  async createSnapshot(
    data: CreateBriefSnapshotData,
  ): Promise<CompanyBriefSnapshotRecord> {
    const row = await this.prisma.db.companyBriefSnapshot.create({
      data: {
        briefId: data.briefId,
        version: data.version,
        status: data.status,
        preparedAt: data.preparedAt,
        lastRefreshedAt: data.lastRefreshedAt,
        sourceCount: data.sourceCount,
        content: data.content as unknown as Prisma.InputJsonValue,
        enrichmentNote: data.enrichmentNote,
      },
    });
    return toSnapshot(row);
  }

  async updateSnapshotStatus(
    id: string,
    status: CompanyBriefStatus,
    enrichmentNote: string | null,
  ): Promise<CompanyBriefSnapshotRecord> {
    const row = await this.prisma.db.companyBriefSnapshot.update({
      where: { id },
      data: { status, enrichmentNote },
    });
    return toSnapshot(row);
  }
}
