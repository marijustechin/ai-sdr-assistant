import { Module } from '@nestjs/common';
import { OpportunitiesModule } from '../opportunities/opportunities.module.js';
import { ProductsRepository } from './infrastructure/products.repository.js';
import { ProductsAndOffersService } from './application/products-and-offers.service.js';
import { ProductsController } from './presentation/products.controller.js';
import { ProductFactsController } from './presentation/product-facts.controller.js';

@Module({
  imports: [OpportunitiesModule],
  controllers: [ProductsController, ProductFactsController],
  providers: [ProductsRepository, ProductsAndOffersService],
  exports: [ProductsAndOffersService],
})
export class ProductsAndOffersModule {}
