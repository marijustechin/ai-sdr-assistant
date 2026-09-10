import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaService,
  type Offer,
  type Product,
  type ProductFact,
} from '@ai-sdr/database';
import type {
  CreateFactData,
  CreateOfferData,
  CreateProductData,
  OfferRecord,
  ProductFactRecord,
  ProductRecord,
} from '../domain/types.js';

/** A Prisma client or an interactive-transaction client. */
type DbClient = Prisma.TransactionClient;

function toProductRecord(product: Product): ProductRecord {
  return {
    id: product.id,
    name: product.name,
    scientificName: product.scientificName,
    description: product.description,
    category: product.category,
    lifecycleStatus: product.lifecycleStatus,
  };
}

function toOfferRecord(offer: Offer): OfferRecord {
  return {
    id: offer.id,
    productId: offer.productId,
    name: offer.name,
    commercialStatus: offer.commercialStatus,
  };
}

function toFactRecord(fact: ProductFact): ProductFactRecord {
  return {
    id: fact.id,
    productId: fact.productId,
    offerId: fact.offerId,
    key: fact.key,
    valueText: fact.valueText,
    valueNumeric: fact.valueNumeric === null ? null : Number(fact.valueNumeric),
    unit: fact.unit,
    status: fact.status,
    visibility: fact.visibility,
    sourceLabel: fact.sourceLabel,
    createdAt: fact.createdAt,
    updatedAt: fact.updatedAt,
  };
}

/**
 * Typed repository scoped to the tables owned by `products-and-offers`:
 * `products`, `offers`, `product_facts`.
 */
@Injectable()
export class ProductsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  private client(tx?: DbClient): DbClient {
    return tx ?? this.prisma.db;
  }

  runInTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    return this.prisma.db.$transaction(fn);
  }

  async createProduct(
    data: CreateProductData,
    tx?: DbClient,
  ): Promise<ProductRecord> {
    const product = await this.client(tx).product.create({
      data: {
        name: data.name,
        scientificName: data.scientificName ?? null,
        description: data.description ?? null,
        category: data.category ?? null,
        ...(data.lifecycleStatus !== undefined
          ? { lifecycleStatus: data.lifecycleStatus }
          : {}),
      },
    });
    return toProductRecord(product);
  }

  async findProduct(
    id: string,
    tx?: DbClient,
  ): Promise<ProductRecord | null> {
    const product = await this.client(tx).product.findUnique({ where: { id } });
    return product ? toProductRecord(product) : null;
  }

  async createOffer(
    data: CreateOfferData,
    tx?: DbClient,
  ): Promise<OfferRecord> {
    const offer = await this.client(tx).offer.create({
      data: {
        productId: data.productId,
        name: data.name,
        ...(data.commercialStatus !== undefined
          ? { commercialStatus: data.commercialStatus }
          : {}),
      },
    });
    return toOfferRecord(offer);
  }

  async findOffer(id: string, tx?: DbClient): Promise<OfferRecord | null> {
    const offer = await this.client(tx).offer.findUnique({ where: { id } });
    return offer ? toOfferRecord(offer) : null;
  }

  async createFact(
    data: CreateFactData,
    tx?: DbClient,
  ): Promise<ProductFactRecord> {
    const fact = await this.client(tx).productFact.create({
      data: {
        productId: data.productId ?? null,
        offerId: data.offerId ?? null,
        key: data.key,
        valueText: data.valueText ?? null,
        valueNumeric: data.valueNumeric ?? null,
        unit: data.unit ?? null,
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.visibility !== undefined
          ? { visibility: data.visibility }
          : {}),
        sourceLabel: data.sourceLabel ?? null,
      },
    });
    return toFactRecord(fact);
  }

  async listFactsForProduct(
    productId: string,
    tx?: DbClient,
  ): Promise<ProductFactRecord[]> {
    const facts = await this.client(tx).productFact.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return facts.map(toFactRecord);
  }

  async listFactsForOffer(
    offerId: string,
    tx?: DbClient,
  ): Promise<ProductFactRecord[]> {
    const facts = await this.client(tx).productFact.findMany({
      where: { offerId },
      orderBy: { createdAt: 'asc' },
    });
    return facts.map(toFactRecord);
  }
}
