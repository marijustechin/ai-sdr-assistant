import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  UNSPECIFIED_SEGMENT,
  type CreateResearchRequestInput,
  type ResearchRequestParameters,
} from '@ai-sdr/contracts';
import { PrismaService, type Prisma } from '@ai-sdr/database';
import { isUniqueConstraintViolation } from '../../../common/prisma-errors.js';
import { OpportunitiesService } from '../../opportunities/application/opportunities.service.js';
import type { OfferRecord, ProductRecord } from '../../products-and-offers/domain/types.js';
import { ProductsAndOffersService } from '../../products-and-offers/application/products-and-offers.service.js';
import { MarketResearcherService } from '../../market-researcher/application/research-runs.service.js';
import type { ResearchRunRecord } from '../../market-researcher/domain/types.js';
import type {
  ResearchRequestIntake,
  ResearchRequestSummary,
} from '../domain/research-request.types.js';
import { ResearchContextService } from './research-context.service.js';

/**
 * Application service for the product-independent **research request** flow,
 * owned by `control-plane` because it orchestrates several owning modules:
 * it resolves/creates the Offer and Opportunity (`products-and-offers` /
 * `opportunities`) and creates a `QUEUED` run (`market-researcher`) in one
 * transaction, and it assembles the researcher intake read model.
 *
 * It never writes another module's tables directly — every write goes through
 * the owning service, and each owner still writes only its own tables.
 */
@Injectable()
export class ResearchRequestsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OpportunitiesService)
    private readonly opportunities: OpportunitiesService,
    @Inject(ProductsAndOffersService)
    private readonly products: ProductsAndOffersService,
    @Inject(MarketResearcherService)
    private readonly researcher: MarketResearcherService,
    @Inject(ResearchContextService)
    private readonly researchContext: ResearchContextService,
  ) {}

  async submit(
    input: CreateResearchRequestInput,
  ): Promise<ResearchRequestSummary> {
    // Idempotency (fast path): a repeated requestKey returns the original request.
    if (input.requestKey !== undefined) {
      const existing = await this.researcher.findRunByRequestKey(
        input.requestKey,
      );
      if (existing) {
        return this.buildSummary(existing);
      }
    }

    const product = await this.products.getProduct(input.productId);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }

    try {
      const run = await this.prisma.db.$transaction(async (tx) => {
        const offer = await this.resolveOffer(
          product,
          input.offerName,
          tx,
        );

        const opportunity = await this.opportunities.createOpportunity(
          {
            offerId: offer.id,
            name: `${product.name} — market research`,
            objective:
              'Product-independent market research request (operator-submitted).',
            lifecycleStatus: 'ACTIVE',
          },
          tx,
        );

        const segments =
          input.parameters.segmentPolicy === 'SPECIFIED'
            ? (input.parameters.segments ?? [])
            : [UNSPECIFIED_SEGMENT];

        const targetMarketIds: string[] = [];
        for (const country of input.parameters.countries) {
          for (const segment of segments) {
            const market = await this.opportunities.ensureTargetMarket(
              { country, segment },
              tx,
            );
            await this.opportunities.attachTargetMarketWithinTransaction(
              tx,
              opportunity.id,
              market.id,
            );
            targetMarketIds.push(market.id);
          }
        }

        const { opportunity: refreshed } =
          await this.opportunities.getContextDataWithinTransaction(
            tx,
            opportunity.id,
          );

        return this.researcher.createQueuedRun(
          {
            opportunityId: opportunity.id,
            contextVersion: refreshed.contextVersion,
            targetMarketIds,
            requestParameters: input.parameters,
            ...(input.requestKey !== undefined
              ? { requestKey: input.requestKey }
              : {}),
          },
          tx,
        );
      });

      return this.buildSummary(run);
    } catch (error) {
      // Concurrent duplicate submission: the unique requestKey lost the race;
      // return the winning request instead of failing.
      if (input.requestKey !== undefined && isUniqueConstraintViolation(error)) {
        const existing = await this.researcher.findRunByRequestKey(
          input.requestKey,
        );
        if (existing) {
          return this.buildSummary(existing);
        }
      }
      throw error;
    }
  }

  async listQueued(): Promise<ResearchRequestSummary[]> {
    const runs = await this.researcher.listQueuedRuns();
    return Promise.all(runs.map((run) => this.buildSummary(run)));
  }

  async getIntake(runId: string): Promise<ResearchRequestIntake> {
    const run = await this.researcher.getRunById(runId);
    const { opportunity } = await this.opportunities.getContextData(
      run.opportunityId,
    );
    const offer = await this.products.getOffer(opportunity.offerId);
    if (!offer) {
      throw new NotFoundException({ error: 'offer_not_found' });
    }
    const product = await this.products.getProduct(offer.productId);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }
    const context = await this.researchContext.getResearchContext(
      run.opportunityId,
    );

    return {
      request: {
        runId: run.id,
        opportunityId: run.opportunityId,
        productId: product.id,
        productName: product.name,
        productCategory: product.category,
        productScientificName: product.scientificName,
        offerId: offer.id,
        offerName: offer.name,
        status: run.status,
        contextVersion: run.contextVersion,
        requestedAt: run.requestedAt.toISOString(),
        targetMarketIds: run.targetMarketIds,
        parameters: (run.requestParameters ??
          null) as ResearchRequestParameters | null,
      },
      context,
    };
  }

  private async resolveOffer(
    product: ProductRecord,
    offerName: string | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<OfferRecord> {
    if (offerName !== undefined) {
      const named = await this.products.findOfferByNameForProduct(
        product.id,
        offerName,
        tx,
      );
      if (!named) {
        throw new NotFoundException({ error: 'offer_not_found' });
      }
      return named;
    }

    const offers = await this.products.listOffersForProduct(product.id, tx);
    if (offers.length === 1) {
      return offers[0]!;
    }
    if (offers.length === 0) {
      // Minimal research association only. No price, availability, delivery
      // terms or suitability are invented.
      return this.products.createOffer(product.id, { name: product.name }, tx);
    }
    throw new ConflictException({
      error: 'ambiguous_offer',
      offerNames: offers.map((offer) => offer.name),
    });
  }

  private async buildSummary(
    run: ResearchRunRecord,
  ): Promise<ResearchRequestSummary> {
    const { opportunity } = await this.opportunities.getContextData(
      run.opportunityId,
    );
    const offer = await this.products.getOffer(opportunity.offerId);
    const product = offer
      ? await this.products.getProduct(offer.productId)
      : null;
    const parameters = (run.requestParameters ??
      null) as ResearchRequestParameters | null;

    return {
      runId: run.id,
      opportunityId: run.opportunityId,
      productId: product?.id ?? '',
      productName: product?.name ?? '',
      status: run.status,
      contextVersion: run.contextVersion,
      requestedAt: run.requestedAt.toISOString(),
      countries: parameters?.countries ?? [],
      goals: parameters?.goals ?? [],
    };
  }
}
