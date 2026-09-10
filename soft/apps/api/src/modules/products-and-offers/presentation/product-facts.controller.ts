import {
  Body,
  Controller,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateProductFactSchema,
  type CreateProductFactInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { ProductsAndOffersService } from '../application/products-and-offers.service.js';

@Controller('product-facts')
@UseGuards(InternalApiKeyGuard)
export class ProductFactsController {
  constructor(
    @Inject(ProductsAndOffersService)
    private readonly service: ProductsAndOffersService,
  ) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateProductFactSchema))
    body: CreateProductFactInput,
  ) {
    return this.service.createFact(body);
  }
}
