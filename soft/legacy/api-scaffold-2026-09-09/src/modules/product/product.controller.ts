import { Body, Controller, Get, Post } from '@nestjs/common';
import { ProductService } from './product.service.js';
import { ProductDto } from './dtos/product.dto.js';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('all')
  public async getAllProducts() {
    return this.productService.getAllProducts();
  }

  @Get('id/:id')
  public async getProduct(id: string) {
    return this.productService.getProductById(id);
  }

  @Post('create')
  public async create(@Body() dto: ProductDto) {}
}
