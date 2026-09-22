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
  UpdateProductData,
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
    senderProfileId: product.senderProfileId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
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
        senderProfileId: data.senderProfileId ?? null,
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

  /** Most recently updated first; `id` breaks any timestamp tie deterministically. */
  async listProducts(tx?: DbClient): Promise<ProductRecord[]> {
    const products = await this.client(tx).product.findMany({
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    return products.map(toProductRecord);
  }

  /**
   * Product counts per lifecycle state (read-only dashboard aggregation).
   * `DRAFT`/`ACTIVE`/`ARCHIVED` are all present (zero when absent).
   */
  async countProductsByLifecycle(
    tx?: DbClient,
  ): Promise<Record<Product['lifecycleStatus'], number>> {
    const grouped = await this.client(tx).product.groupBy({
      by: ['lifecycleStatus'],
      _count: { _all: true },
    });
    const counts: Record<Product['lifecycleStatus'], number> = {
      DRAFT: 0,
      ACTIVE: 0,
      ARCHIVED: 0,
    };
    for (const row of grouped) {
      counts[row.lifecycleStatus] = row._count._all;
    }
    return counts;
  }

  async updateProduct(
    id: string,
    data: UpdateProductData,
    tx?: DbClient,
  ): Promise<ProductRecord> {
    const update: Prisma.ProductUpdateInput = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.scientificName !== undefined) {
      update.scientificName = data.scientificName;
    }
    if (data.description !== undefined) update.description = data.description;
    if (data.category !== undefined) update.category = data.category;
    if (data.lifecycleStatus !== undefined) {
      update.lifecycleStatus = data.lifecycleStatus;
    }
    if (data.senderProfileId !== undefined) {
      update.senderProfile =
        data.senderProfileId === null
          ? { disconnect: true }
          : { connect: { id: data.senderProfileId } };
    }

    const product = await this.client(tx).product.update({
      where: { id },
      data: update,
    });
    return toProductRecord(product);
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

  /**
   * Case-insensitive lookup of one product's offer by name. May return more than
   * one match only if names differ by case, so callers treat multiple matches as
   * ambiguous.
   */
  async findOfferByNameForProduct(
    productId: string,
    name: string,
    tx?: DbClient,
  ): Promise<OfferRecord | null> {
    const offer = await this.client(tx).offer.findFirst({
      where: { productId, name: { equals: name, mode: 'insensitive' } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return offer ? toOfferRecord(offer) : null;
  }

  /** Offers belonging to one product; creation order, `id` breaks ties. */
  async listOffersForProduct(
    productId: string,
    tx?: DbClient,
  ): Promise<OfferRecord[]> {
    const offers = await this.client(tx).offer.findMany({
      where: { productId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return offers.map(toOfferRecord);
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
