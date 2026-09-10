import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateOfferInput } from '@ai-sdr/contracts';
import type {
  CreateFactData,
  CreateProductData,
  OfferRecord,
  ProductFactRecord,
  ProductRecord,
} from '../domain/types.js';
import { assertFactInvariants, InvalidFactError } from '../domain/product-fact.rules.js';
import { ProductsRepository } from '../infrastructure/products.repository.js';
import { OpportunitiesService } from '../../opportunities/application/opportunities.service.js';

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
  ) {}

  async createProduct(input: CreateProductData): Promise<ProductRecord> {
    return this.repository.createProduct(input);
  }

  async createOffer(
    productId: string,
    input: CreateOfferInput,
  ): Promise<OfferRecord> {
    const product = await this.repository.findProduct(productId);
    if (!product) {
      throw new NotFoundException({ error: 'product_not_found' });
    }
    return this.repository.createOffer({
      productId,
      name: input.name,
      commercialStatus: input.commercialStatus,
    });
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

  async getOffer(id: string): Promise<OfferRecord | null> {
    return this.repository.findOffer(id);
  }

  async getFactsForProduct(id: string): Promise<ProductFactRecord[]> {
    return this.repository.listFactsForProduct(id);
  }

  async getFactsForOffer(id: string): Promise<ProductFactRecord[]> {
    return this.repository.listFactsForOffer(id);
  }
}
