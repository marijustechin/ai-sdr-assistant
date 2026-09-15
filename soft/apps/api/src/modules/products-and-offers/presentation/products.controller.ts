import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateOfferSchema,
  CreateProductSchema,
  UpdateProductSchema,
  type CreateOfferInput,
  type CreateProductInput,
  type ProductResponse,
  type UpdateProductInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { ProductsAndOffersService } from '../application/products-and-offers.service.js';
import type { OfferRecord } from '../domain/types.js';
import type { OpportunityDiscoveryRecord } from '../../opportunities/domain/types.js';

@Controller('products')
@UseGuards(InternalApiKeyGuard)
export class ProductsController {
  constructor(
    @Inject(ProductsAndOffersService)
    private readonly service: ProductsAndOffersService,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateProductSchema))
    body: CreateProductInput,
  ): Promise<ProductResponse> {
    return this.service.createProduct(body);
  }

  @Get()
  async list(): Promise<ProductResponse[]> {
    return this.service.listProducts();
  }

  @Get(':productId')
  async getOne(
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<ProductResponse> {
    return this.service.getProductOrThrow(productId);
  }

  /** Product-scoped discovery: offers belonging to the product. */
  @Get(':productId/offers')
  async listOffers(
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<OfferRecord[]> {
    return this.service.listOffersForProduct(productId);
  }

  /** Product-scoped discovery: offers → opportunities → attached markets. */
  @Get(':productId/opportunities')
  async listOpportunities(
    @Param('productId', new ParseUUIDPipe()) productId: string,
  ): Promise<OpportunityDiscoveryRecord[]> {
    return this.service.listOpportunitiesForProduct(productId);
  }

  @Patch(':productId')
  async update(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body(new ZodValidationPipe(UpdateProductSchema))
    body: UpdateProductInput,
  ): Promise<ProductResponse> {
    return this.service.updateProduct(productId, body);
  }

  @Post(':productId/offers')
  async createOffer(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body(new ZodValidationPipe(CreateOfferSchema)) body: CreateOfferInput,
  ) {
    return this.service.createOffer(productId, body);
  }
}
