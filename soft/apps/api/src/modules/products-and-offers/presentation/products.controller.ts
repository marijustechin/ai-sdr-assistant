import {
  Body,
  Controller,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateOfferSchema,
  CreateProductSchema,
  type CreateOfferInput,
  type CreateProductInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { ProductsAndOffersService } from '../application/products-and-offers.service.js';

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
  ) {
    return this.service.createProduct(body);
  }

  @Post(':productId/offers')
  async createOffer(
    @Param('productId', new ParseUUIDPipe()) productId: string,
    @Body(new ZodValidationPipe(CreateOfferSchema)) body: CreateOfferInput,
  ) {
    return this.service.createOffer(productId, body);
  }
}
