/**
 * Domain types for the products-and-offers module (no NestJS, Prisma, or HTTP
 * imports). Mirrors the implemented schema but keeps the domain layer portable.
 */

export type ProductLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type OfferCommercialStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ARCHIVED';
export type FactStatus = 'PENDING' | 'CONFIRMED' | 'SUPERSEDED';
export type FactVisibility = 'OPERATIONAL' | 'RESTRICTED';
export type FactSubject = 'PRODUCT' | 'OFFER';

export interface ProductRecord {
  id: string;
  name: string;
  scientificName: string | null;
  description: string | null;
  category: string | null;
  lifecycleStatus: ProductLifecycleStatus;
  outreachSenderProfileId: string | null;
  inquirySenderProfileId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferRecord {
  id: string;
  productId: string;
  name: string;
  commercialStatus: OfferCommercialStatus;
}

export interface ProductFactRecord {
  id: string;
  productId: string | null;
  offerId: string | null;
  key: string;
  valueText: string | null;
  valueNumeric: number | null;
  unit: string | null;
  status: FactStatus;
  visibility: FactVisibility;
  sourceLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductData {
  name: string;
  scientificName?: string;
  description?: string;
  category?: string;
  lifecycleStatus?: ProductLifecycleStatus;
  outreachSenderProfileId?: string;
  inquirySenderProfileId?: string;
}

export interface CreateOfferData {
  productId: string;
  name: string;
  commercialStatus?: OfferCommercialStatus;
}

/**
 * Partial Product update. An absent key is left unchanged; `null` clears a
 * nullable text column.
 */
export interface UpdateProductData {
  name?: string;
  scientificName?: string | null;
  description?: string | null;
  category?: string | null;
  lifecycleStatus?: ProductLifecycleStatus;
  outreachSenderProfileId?: string | null;
  inquirySenderProfileId?: string | null;
}

export interface CreateFactData {
  productId?: string;
  offerId?: string;
  key: string;
  valueText?: string;
  valueNumeric?: number;
  unit?: string;
  status?: FactStatus;
  visibility?: FactVisibility;
  sourceLabel?: string;
}
