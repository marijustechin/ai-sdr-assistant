import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@ai-sdr/database';
import type {
  QuoteInboundMessage,
  QuoteOutboundMessage,
  SupplierQuote,
} from '@ai-sdr/database';
import type {
  PersistInboundData,
  PersistOutboundData,
  PersistQuoteData,
  QuoteInboundRecord,
  QuoteOutboundRecord,
  SupplierQuoteRecord,
} from '../domain/types.js';

function toOutbound(row: QuoteOutboundMessage): QuoteOutboundRecord {
  return {
    id: row.id,
    priceInquiryDraftId: row.priceInquiryDraftId,
    opportunityId: row.opportunityId,
    leadId: row.leadId,
    companyId: row.companyId,
    productId: row.productId,
    senderProfileId: row.senderProfileId,
    emailAccountId: row.emailAccountId,
    fromEmail: row.fromEmail,
    replyToEmail: row.replyToEmail,
    recipientEmail: row.recipientEmail,
    subject: row.subject,
    body: row.body,
    messageId: row.messageId,
    providerMessageId: row.providerMessageId,
    submissionStatus: row.submissionStatus,
    failureCode: row.failureCode,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  };
}

function toInbound(row: QuoteInboundMessage): QuoteInboundRecord {
  return {
    id: row.id,
    emailAccountId: row.emailAccountId,
    outboundMessageId: row.outboundMessageId,
    priceInquiryDraftId: row.priceInquiryDraftId,
    mailboxUid: row.mailboxUid,
    providerMessageId: row.providerMessageId,
    inReplyTo: row.inReplyTo,
    references: row.references,
    fromEmail: row.fromEmail,
    toEmail: row.toEmail,
    subject: row.subject,
    bodyText: row.bodyText,
    receivedAt: row.receivedAt,
    processingStatus: row.processingStatus,
    matchConfidence: row.matchConfidence,
    researchRunId: row.researchRunId,
    sourceReferenceId: row.sourceReferenceId,
    evidenceId: row.evidenceId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toQuote(row: SupplierQuote): SupplierQuoteRecord {
  return {
    id: row.id,
    inboundMessageId: row.inboundMessageId,
    outboundMessageId: row.outboundMessageId,
    priceInquiryDraftId: row.priceInquiryDraftId,
    researchRunId: row.researchRunId,
    priceText: row.priceText,
    priceAmount: row.priceAmount === null ? null : Number(row.priceAmount),
    currency: row.currency,
    priceUnit: row.priceUnit,
    moqText: row.moqText,
    incoterm: row.incoterm,
    loadingLocationText: row.loadingLocationText,
    leadTimeText: row.leadTimeText,
    validityText: row.validityText,
    vatIncluded: row.vatIncluded,
    qualificationText: row.qualificationText,
    fieldProvenance:
      (row.fieldProvenance as Record<string, string> | null) ?? null,
    warnings: row.warnings,
    sourceReferenceId: row.sourceReferenceId,
    evidenceId: row.evidenceId,
    createdAt: row.createdAt,
  };
}

/**
 * Typed repository for the three tables owned by `quote-collection`. It never
 * touches other modules' tables and never stores transport credentials.
 */
@Injectable()
export class QuoteCollectionRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async createOutbound(data: PersistOutboundData): Promise<QuoteOutboundRecord> {
    return toOutbound(
      await this.prisma.db.quoteOutboundMessage.create({
        data: {
          priceInquiryDraftId: data.priceInquiryDraftId,
          opportunityId: data.opportunityId,
          leadId: data.leadId,
          companyId: data.companyId,
          productId: data.productId,
          senderProfileId: data.senderProfileId,
          emailAccountId: data.emailAccountId,
          fromEmail: data.fromEmail,
          replyToEmail: data.replyToEmail,
          recipientEmail: data.recipientEmail,
          subject: data.subject,
          body: data.body,
          messageId: data.messageId,
          providerMessageId: data.providerMessageId,
          submissionStatus: data.submissionStatus,
          failureCode: data.failureCode,
          sentAt: data.sentAt,
        },
      }),
    );
  }

  async findLatestOutboundForDraft(
    draftId: string,
  ): Promise<QuoteOutboundRecord | null> {
    const row = await this.prisma.db.quoteOutboundMessage.findFirst({
      where: { priceInquiryDraftId: draftId },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return row ? toOutbound(row) : null;
  }

  /** A successful submission for this draft (used to prevent a duplicate send). */
  async findSubmittedOutboundForDraft(
    draftId: string,
  ): Promise<QuoteOutboundRecord | null> {
    const row = await this.prisma.db.quoteOutboundMessage.findFirst({
      where: { priceInquiryDraftId: draftId, submissionStatus: 'SUBMITTED' },
    });
    return row ? toOutbound(row) : null;
  }

  async listOutboundsForAccount(
    emailAccountId: string,
    onlySubmitted = true,
  ): Promise<QuoteOutboundRecord[]> {
    const rows = await this.prisma.db.quoteOutboundMessage.findMany({
      where: {
        emailAccountId,
        ...(onlySubmitted ? { submissionStatus: 'SUBMITTED' } : {}),
      },
      orderBy: [{ sentAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toOutbound);
  }

  async listOutboundsForDrafts(
    draftIds: string[],
  ): Promise<QuoteOutboundRecord[]> {
    if (draftIds.length === 0) return [];
    const rows = await this.prisma.db.quoteOutboundMessage.findMany({
      where: { priceInquiryDraftId: { in: draftIds } },
      orderBy: [{ sentAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toOutbound);
  }

  async findInboundByMailboxUid(
    emailAccountId: string,
    mailboxUid: string,
  ): Promise<QuoteInboundRecord | null> {
    const row = await this.prisma.db.quoteInboundMessage.findUnique({
      where: { emailAccountId_mailboxUid: { emailAccountId, mailboxUid } },
    });
    return row ? toInbound(row) : null;
  }

  async createInbound(data: PersistInboundData): Promise<QuoteInboundRecord> {
    return toInbound(
      await this.prisma.db.quoteInboundMessage.create({
        data: {
          emailAccountId: data.emailAccountId,
          outboundMessageId: data.outboundMessageId,
          priceInquiryDraftId: data.priceInquiryDraftId,
          mailboxUid: data.mailboxUid,
          providerMessageId: data.providerMessageId,
          inReplyTo: data.inReplyTo,
          references: data.references,
          fromEmail: data.fromEmail,
          toEmail: data.toEmail,
          subject: data.subject,
          bodyText: data.bodyText,
          receivedAt: data.receivedAt,
          processingStatus: data.processingStatus,
          matchConfidence: data.matchConfidence,
          researchRunId: data.researchRunId,
          sourceReferenceId: data.sourceReferenceId,
          evidenceId: data.evidenceId,
        },
      }),
    );
  }

  async updateInboundMatch(
    id: string,
    data: {
      outboundMessageId: string | null;
      priceInquiryDraftId: string | null;
      processingStatus: QuoteInboundRecord['processingStatus'];
      matchConfidence: QuoteInboundRecord['matchConfidence'];
      researchRunId?: string | null;
      sourceReferenceId?: string | null;
      evidenceId?: string | null;
    },
  ): Promise<QuoteInboundRecord> {
    return toInbound(
      await this.prisma.db.quoteInboundMessage.update({
        where: { id },
        data: {
          outboundMessageId: data.outboundMessageId,
          priceInquiryDraftId: data.priceInquiryDraftId,
          processingStatus: data.processingStatus,
          matchConfidence: data.matchConfidence,
          ...(data.researchRunId !== undefined
            ? { researchRunId: data.researchRunId }
            : {}),
          ...(data.sourceReferenceId !== undefined
            ? { sourceReferenceId: data.sourceReferenceId }
            : {}),
          ...(data.evidenceId !== undefined
            ? { evidenceId: data.evidenceId }
            : {}),
        },
      }),
    );
  }

  async listInboundsForDrafts(
    draftIds: string[],
  ): Promise<QuoteInboundRecord[]> {
    if (draftIds.length === 0) return [];
    const rows = await this.prisma.db.quoteInboundMessage.findMany({
      where: { priceInquiryDraftId: { in: draftIds } },
      orderBy: [{ receivedAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toInbound);
  }

  async createQuote(data: PersistQuoteData): Promise<SupplierQuoteRecord> {
    return toQuote(
      await this.prisma.db.supplierQuote.create({
        data: {
          inboundMessageId: data.inboundMessageId,
          outboundMessageId: data.outboundMessageId,
          priceInquiryDraftId: data.priceInquiryDraftId,
          researchRunId: data.researchRunId,
          priceText: data.priceText,
          priceAmount: data.priceAmount,
          currency: data.currency,
          priceUnit: data.priceUnit,
          moqText: data.moqText,
          incoterm: data.incoterm,
          loadingLocationText: data.loadingLocationText,
          leadTimeText: data.leadTimeText,
          validityText: data.validityText,
          vatIncluded: data.vatIncluded,
          qualificationText: data.qualificationText,
          fieldProvenance:
            data.fieldProvenance === null
              ? Prisma.DbNull
              : (data.fieldProvenance as unknown as Prisma.InputJsonValue),
          warnings: data.warnings,
          sourceReferenceId: data.sourceReferenceId,
          evidenceId: data.evidenceId,
        },
      }),
    );
  }

  async findQuoteByInbound(
    inboundMessageId: string,
  ): Promise<SupplierQuoteRecord | null> {
    const row = await this.prisma.db.supplierQuote.findUnique({
      where: { inboundMessageId },
    });
    return row ? toQuote(row) : null;
  }

  async listQuotesForDrafts(draftIds: string[]): Promise<SupplierQuoteRecord[]> {
    if (draftIds.length === 0) return [];
    const rows = await this.prisma.db.supplierQuote.findMany({
      where: { priceInquiryDraftId: { in: draftIds } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toQuote);
  }
}
