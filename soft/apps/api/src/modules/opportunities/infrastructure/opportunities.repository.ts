import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaService,
  type Opportunity,
  type TargetMarket,
} from '@ai-sdr/database';
import type {
  CreateOpportunityData,
  CreateTargetMarketData,
  OpportunityRecord,
  TargetMarketRecord,
} from '../domain/types.js';

type DbClient = Prisma.TransactionClient;

function toTargetMarketRecord(market: TargetMarket): TargetMarketRecord {
  return {
    id: market.id,
    country: market.country,
    segment: market.segment,
    lifecycleStatus: market.lifecycleStatus,
  };
}

function toOpportunityRecord(opportunity: Opportunity): OpportunityRecord {
  return {
    id: opportunity.id,
    offerId: opportunity.offerId,
    name: opportunity.name,
    objective: opportunity.objective,
    lifecycleStatus: opportunity.lifecycleStatus,
    contextVersion: opportunity.contextVersion,
  };
}

/**
 * Typed repository scoped to the tables owned by `opportunities`:
 * `target_markets`, `opportunities`, `opportunity_target_markets`. It also
 * performs the declared read of `offers` needed to resolve an opportunity's
 * product when bumping the context version.
 */
@Injectable()
export class OpportunitiesRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private client(tx?: DbClient): DbClient {
    return tx ?? this.prisma.db;
  }

  runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.prisma.db.$transaction(fn);
  }

  async findOfferById(
    id: string,
    tx?: DbClient,
  ): Promise<{ id: string; productId: string } | null> {
    return this.client(tx).offer.findUnique({
      where: { id },
      select: { id: true, productId: true },
    });
  }

  async createTargetMarket(
    data: CreateTargetMarketData,
    tx?: DbClient,
  ): Promise<TargetMarketRecord> {
    const market = await this.client(tx).targetMarket.create({
      data: {
        country: data.country,
        segment: data.segment,
        ...(data.lifecycleStatus !== undefined
          ? { lifecycleStatus: data.lifecycleStatus }
          : {}),
      },
    });
    return toTargetMarketRecord(market);
  }

  async findTargetMarket(
    id: string,
    tx?: DbClient,
  ): Promise<TargetMarketRecord | null> {
    const market = await this.client(tx).targetMarket.findUnique({
      where: { id },
    });
    return market ? toTargetMarketRecord(market) : null;
  }

  async findTargetMarketByCountrySegment(
    country: string,
    segment: string,
    tx?: DbClient,
  ): Promise<TargetMarketRecord | null> {
    const market = await this.client(tx).targetMarket.findUnique({
      where: { country_segment: { country, segment } },
    });
    return market ? toTargetMarketRecord(market) : null;
  }

  async createOpportunity(
    data: CreateOpportunityData,
    tx?: DbClient,
  ): Promise<OpportunityRecord> {
    const opportunity = await this.client(tx).opportunity.create({
      data: {
        offerId: data.offerId,
        name: data.name,
        objective: data.objective ?? null,
        ...(data.lifecycleStatus !== undefined
          ? { lifecycleStatus: data.lifecycleStatus }
          : {}),
      },
    });
    return toOpportunityRecord(opportunity);
  }

  async findOpportunity(
    id: string,
    tx?: DbClient,
  ): Promise<OpportunityRecord | null> {
    const opportunity = await this.client(tx).opportunity.findUnique({
      where: { id },
    });
    return opportunity ? toOpportunityRecord(opportunity) : null;
  }

  async attachTargetMarket(
    opportunityId: string,
    targetMarketId: string,
    tx?: DbClient,
  ): Promise<{ id: string }> {
    const link = await this.client(tx).opportunityTargetMarket.create({
      data: { opportunityId, targetMarketId },
      select: { id: true },
    });
    return link;
  }

  async listTargetMarketsForOpportunity(
    opportunityId: string,
    tx?: DbClient,
  ): Promise<TargetMarketRecord[]> {
    const links = await this.client(tx).opportunityTargetMarket.findMany({
      where: { opportunityId },
      include: { targetMarket: true },
      orderBy: { createdAt: 'asc' },
    });
    return links.map((link) => toTargetMarketRecord(link.targetMarket));
  }

  async bumpContextVersionForOpportunity(
    opportunityId: string,
    tx: DbClient,
  ): Promise<number> {
    const updated = await tx.opportunity.update({
      where: { id: opportunityId },
      data: { contextVersion: { increment: 1 } },
      select: { contextVersion: true },
    });
    return updated.contextVersion;
  }

  /**
   * Increments the context version of every opportunity whose operational
   * research context is affected by a new product/offer fact.
   */
  async bumpContextVersionForFact(
    tx: DbClient,
    subject: { productId: string | null; offerId: string | null },
  ): Promise<void> {
    if (subject.offerId !== null) {
      await tx.opportunity.updateMany({
        where: { offerId: subject.offerId },
        data: { contextVersion: { increment: 1 } },
      });
      return;
    }

    if (subject.productId !== null) {
      const offers = await tx.offer.findMany({
        where: { productId: subject.productId },
        select: { id: true },
      });
      const offerIds = offers.map((offer) => offer.id);
      if (offerIds.length > 0) {
        await tx.opportunity.updateMany({
          where: { offerId: { in: offerIds } },
          data: { contextVersion: { increment: 1 } },
        });
      }
    }
  }
}
