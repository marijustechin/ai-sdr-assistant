import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Product } from '../../generated/prisma/client.js';
import { ProductDto } from './dtos/product.dto.js';

@Injectable()
export class ProductService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async getAllProducts(): Promise<Product[]> {
    const products = await this.prismaService.product.findMany();

    return products;
  }

  public async getProductById(id: string): Promise<Product | null> {
    const product = await this.prismaService.product.findUnique({
      where: { id },
    });

    return product;
  }

  public async create(dto: ProductDto) {
    console.log(dto);
    return null;
  }
}
