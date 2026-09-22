import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@ai-sdr/database';
import type { CreateOfferInput, ProductResponse, UpdateProductInput } from '@ai-sdr/contracts';
import type {
  CreateFactData,
  CreateProductData,
  OfferRecord,
  ProductFactRecord,
  ProductRecord,
} from '../domain/types.js';
import type { OpportunityDiscoveryRecord } from '../../opportunities/domain/types.js';
import { assertFactInvariants, InvalidFactError } from '../domain/product-fact.rules.js';
import { ProductsRepository } from '../infrastructure/products.repository.js';
import { OpportunitiesService } from '../../opportunities/application/opportunities.service.js';
import { SenderProfilesService } from '../../sender-profiles/application/sender-profiles.service.js';

/** Wire shape for the Product admin endpoints (ISO timestamps). */
function toProductResponse(product: ProductRecord): ProductResponse {
  return {
    id: product.id,
    name: product.name,
    scientificName: product.scientificName,
    description: product.description,
    category: product.category,
    lifecycleStatus: product.lifecycleStatus,
    senderProfileId: product.senderProfileId,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

/**
 * Application service for the `products-and-offers` module: Product catalog,
 * sellable Offers, and typed ProductFacts (human / trusted-source authored).
 */
@Injectable()
export class ProductsAndOffersService {
  constructor(
    @Inject(ProductsRepository)
    private readonly repository: ProductsRepository,
    @Inject(OpportunitiesService)
    private readonly opportunities: OpportunitiesService,
    @Inject(SenderProfilesService)
    private readonly senderProfiles: SenderProfilesService,
  ) {}

  async createProduct(input: CreateProductData): Promise<ProductResponse> {
    await this.assertSenderProfileAssignable(input.senderProfileId);
    return toProductResponse(await this.repository.createProduct(input));
  }

  /** A `null`/absent assignment is allowed; a set id must exist. */
  private async assertSenderProfileAssignable(
    senderProfileId: string | null | undefined,
  ): Promise<void> {
    if (senderProfileId === undefined || senderProfileId === null) return;
    const profile = await this.senderProfiles.getProfile(senderProfileId);
    if (!profile) {
      throw new BadRequestException({ error: 'sender_profile_not_found' });
    }
  }

  async createOffer(
    productId: string,
    input: CreateOfferInput,
    tx?: Prisma.TransactionClient,
  ): Promise<OfferRecord> {
    const product = await this.repository.findProduct(productId, tx);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }
    return this.repository.createOffer(
      {
        productId,
        name: input.name,
        commercialStatus: input.commercialStatus,
      },
      tx,
    );
  }

  /**
   * Case-insensitive lookup of one product's offer by its operator-facing name.
   * Used only to disambiguate offer resolution in the research-request flow.
   */
  async findOfferByNameForProduct(
    productId: string,
    name: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OfferRecord | null> {
    return this.repository.findOfferByNameForProduct(productId, name, tx);
  }

  /**
   * Creates a fact and, in the same transaction, increments the context version
   * of every affected Opportunity. A non-SUPERSEDED fact changes the assembled
   * operational research context (confirmed value, or a redacted placeholder).
   */
  async createFact(input: CreateFactData): Promise<ProductFactRecord> {
    try {
      assertFactInvariants(input);
    } catch (error) {
      if (error instanceof InvalidFactError) {
        throw new BadRequestException({
          error: 'invalid_fact',
          message: error.message,
        });
      }
      throw error;
    }

    if (input.productId !== undefined) {
      const product = await this.repository.findProduct(input.productId);
      if (!product) {
        throw new NotFoundException({ error: 'product_not_found' });
      }
    }
    if (input.offerId !== undefined) {
      const offer = await this.repository.findOffer(input.offerId);
      if (!offer) {
        throw new NotFoundException({ error: 'offer_not_found' });
      }
    }

    return this.repository.runInTransaction(async (tx) => {
      const fact = await this.repository.createFact(input, tx);
      await this.opportunities.bumpContextVersionForFact(tx, {
        productId: input.productId ?? null,
        offerId: input.offerId ?? null,
      });
      return fact;
    });
  }

  async getProduct(id: string): Promise<ProductRecord | null> {
    return this.repository.findProduct(id);
  }

  /** Product read for the admin API; throws the standard 404 when absent. */
  async getProductOrThrow(id: string): Promise<ProductResponse> {
    const product = await this.repository.findProduct(id);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }
    return toProductResponse(product);
  }

  /** Most recently updated first (repository-defined deterministic order). */
  async listProducts(): Promise<ProductResponse[]> {
    const products = await this.repository.listProducts();
    return products.map(toProductResponse);
  }

  /**
   * Applies a partial update. An absent key is left unchanged; `null` clears a
   * nullable text column. The contract validation happens at the HTTP boundary.
   */
  async updateProduct(
    id: string,
    input: UpdateProductInput,
  ): Promise<ProductResponse> {
    const existing = await this.repository.findProduct(id);
    if (!existing) {
      throw new NotFoundException({ error: 'product_not_found' });
    }
    await this.assertSenderProfileAssignable(input.senderProfileId);
    const updated = await this.repository.updateProduct(id, input);
    return toProductResponse(updated);
  }

  async getOffer(id: string): Promise<OfferRecord | null> {
    return this.repository.findOffer(id);
  }

  /** Offers belonging to one product (404 for an unknown product). */
  async listOffersForProduct(
    productId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OfferRecord[]> {
    const product = await this.repository.findProduct(productId, tx);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }
    return this.repository.listOffersForProduct(productId, tx);
  }

  /**
   * Product-scoped discovery: offers → opportunities → attached target markets.
   * Returns `[]` when the product has no offers or none of its offers have an
   * opportunity; the product's DRAFT lifecycle does not block discovery.
   */
  async listOpportunitiesForProduct(
    productId: string,
  ): Promise<OpportunityDiscoveryRecord[]> {
    const product = await this.repository.findProduct(productId);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }
    const offers = await this.repository.listOffersForProduct(productId);
    if (offers.length === 0) {
      return [];
    }
    return this.opportunities.listOpportunitiesForOffers(
      offers.map((offer) => offer.id),
    );
  }

  async getFactsForProduct(id: string): Promise<ProductFactRecord[]> {
    return this.repository.listFactsForProduct(id);
  }

  async getFactsForOffer(id: string): Promise<ProductFactRecord[]> {
    return this.repository.listFactsForOffer(id);
  }
}
