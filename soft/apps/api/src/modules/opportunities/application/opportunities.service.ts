import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@ai-sdr/database';
import { isUniqueConstraintViolation } from '../../../common/prisma-errors.js';
import type {
  CreateOpportunityData,
  CreateTargetMarketData,
  OpportunityContextData,
  OpportunityDiscoveryRecord,
  OpportunityRecord,
  TargetMarketRecord,
} from '../domain/types.js';
import { OpportunitiesRepository } from '../infrastructure/opportunities.repository.js';

/**
 * Application service for the `opportunities` module. Owns target markets,
 * opportunities, and the Opportunity context-version increments.
 */
@Injectable()
export class OpportunitiesService {
  constructor(
    @Inject(OpportunitiesRepository)
    private readonly repository: OpportunitiesRepository,
  ) {}

  async createTargetMarket(
    input: CreateTargetMarketData,
  ): Promise<TargetMarketRecord> {
    const existing =
      await this.repository.findTargetMarketByCountrySegment(
        input.country,
        input.segment,
      );
    if (existing) {
      throw new ConflictException({
        error: 'target_market_exists',
        id: existing.id,
      });
    }
    try {
      return await this.repository.createTargetMarket(input);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException({ error: 'target_market_exists' });
      }
      throw error;
    }
  }

  async createOpportunity(
    input: CreateOpportunityData,
    tx?: Prisma.TransactionClient,
  ): Promise<OpportunityRecord> {
    const offer = await this.repository.findOfferById(input.offerId, tx);
    if (!offer) {
      throw new NotFoundException({ error: 'offer_not_found' });
    }
    return this.repository.createOpportunity(input, tx);
  }

  /**
   * Resolves a `(country, segment)` target market, reusing an existing one or
   * creating it. Safe inside a caller-provided transaction.
   */
  async ensureTargetMarket(
    input: CreateTargetMarketData,
    tx?: Prisma.TransactionClient,
  ): Promise<TargetMarketRecord> {
    const existing = await this.repository.findTargetMarketByCountrySegment(
      input.country,
      input.segment,
      tx,
    );
    if (existing) {
      return existing;
    }
    try {
      return await this.repository.createTargetMarket(input, tx);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        const raced = await this.repository.findTargetMarketByCountrySegment(
          input.country,
          input.segment,
          tx,
        );
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  /**
   * Attaches a target market and bumps the opportunity context version within a
   * caller-provided transaction (used by the research-request submission so all
   * related writes commit or roll back together).
   */
  async attachTargetMarketWithinTransaction(
    tx: Prisma.TransactionClient,
    opportunityId: string,
    targetMarketId: string,
  ): Promise<void> {
    await this.repository.attachTargetMarket(opportunityId, targetMarketId, tx);
    await this.repository.bumpContextVersionForOpportunity(opportunityId, tx);
  }

  /**
   * Attaches a target market and increments the opportunity context version in
   * one transaction: the attachment changes the operational research context.
   */
  async attachTargetMarket(
    opportunityId: string,
    targetMarketId: string,
  ): Promise<{ contextVersion: number; targetMarketId: string }> {
    const opportunity = await this.repository.findOpportunity(opportunityId);
    if (!opportunity) {
      throw new NotFoundException({ error: 'opportunity_not_found' });
    }
    const market = await this.repository.findTargetMarket(targetMarketId);
    if (!market) {
      throw new NotFoundException({ error: 'target_market_not_found' });
    }

    try {
      return await this.repository.runInTransaction(async (tx) => {
        await this.repository.attachTargetMarket(
          opportunityId,
          targetMarketId,
          tx,
        );
        const contextVersion =
          await this.repository.bumpContextVersionForOpportunity(
            opportunityId,
            tx,
          );
        return { contextVersion, targetMarketId };
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException({
          error: 'target_market_already_attached',
        });
      }
      throw error;
    }
  }

  async getContextData(opportunityId: string): Promise<OpportunityContextData> {
    const opportunity = await this.repository.findOpportunity(opportunityId);
    if (!opportunity) {
      throw new NotFoundException({ error: 'opportunity_not_found' });
    }
    const targetMarkets =
      await this.repository.listTargetMarketsForOpportunity(opportunityId);
    return { opportunity, targetMarkets };
  }

  /**
   * Transaction-aware context read: sees writes made earlier in the same
   * transaction (used by the research-request submission to record the final
   * `contextVersion` after attaching markets).
   */
  async getContextDataWithinTransaction(
    tx: Prisma.TransactionClient,
    opportunityId: string,
  ): Promise<OpportunityContextData> {
    const opportunity = await this.repository.findOpportunity(
      opportunityId,
      tx,
    );
    if (!opportunity) {
      throw new NotFoundException({ error: 'opportunity_not_found' });
    }
    const targetMarkets =
      await this.repository.listTargetMarketsForOpportunity(opportunityId, tx);
    return { opportunity, targetMarkets };
  }

  /**
   * Product-scoped discovery read: opportunities for the given offers, each
   * with its attached target markets. Used by `products-and-offers` so an agent
   * can resolve product → offer → opportunity → target markets.
   */
  async listOpportunitiesForOffers(
    offerIds: string[],
  ): Promise<OpportunityDiscoveryRecord[]> {
    const rows = await this.repository.listOpportunitiesForOffers(offerIds);
    return rows.map(({ opportunity, targetMarkets }) => ({
      ...opportunity,
      targetMarkets,
    }));
  }

  /** Called by `products-and-offers` inside its fact-creation transaction. */
  async bumpContextVersionForFact(
    tx: Prisma.TransactionClient,
    subject: { productId: string | null; offerId: string | null },
  ): Promise<void> {
    await this.repository.bumpContextVersionForFact(tx, subject);
  }
}
