import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BriefContentSchema,
  type BriefContent,
  type BriefFinding,
  type BriefSectionKey,
  type BriefSource,
  type SubmitCompanyEnrichmentInput,
} from '@ai-sdr/contracts';
import { ContactDiscoveryService } from '../../contact-discovery/application/contact-discovery.service.js';
import { ResearchContextService } from '../../control-plane/application/research-context.service.js';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import type { LeadRecord } from '../../lead-discoverer/domain/types.js';
import { OutreachDrafterService } from '../../outreach-drafter/application/outreach-drafter.service.js';
import { OutreachResultsService } from '../../outreach-results/application/outreach-results.service.js';
import { OutreachSenderService } from '../../outreach-sender/application/outreach-sender.service.js';
import type {
  CompanyBriefRecord,
  CompanyBriefSnapshotRecord,
  CompanyBriefView,
} from '../domain/types.js';
import { CompanyBriefRepository } from '../infrastructure/company-brief.repository.js';

const SECTION_FIELD: Record<BriefSectionKey, keyof BriefContent> = {
  COMPANY_OVERVIEW: 'companyOverview',
  RELEVANT_PRODUCTS_OPERATIONS: 'relevantProductsOperations',
  WHY_THIS_ACCOUNT_FITS: 'whyThisAccountFits',
  EXISTING_RELATIONSHIP_OUTREACH: 'existingRelationshipOutreach',
  KEY_PEOPLE_CONTACTS: 'keyPeopleContacts',
  FINANCIAL_SIZE_SIGNALS: 'financialSizeSignals',
  MARKETS_CUSTOMERS_CHANNELS: 'marketsCustomersChannels',
  RECENT_ACTIVITY: 'recentActivity',
  REPUTATION_PUBLIC_FEEDBACK: 'reputationPublicFeedback',
  COMMERCIAL_HYPOTHESES: 'commercialHypotheses',
  THINGS_TO_KNOW_BEFORE_MEETING: 'thingsToKnowBeforeMeeting',
};

function countSources(content: BriefContent): number {
  const urls = new Set<string>();
  for (const key of Object.values(SECTION_FIELD)) {
    const section = content[key];
    if (!Array.isArray(section)) continue;
    for (const finding of section as BriefFinding[]) {
      for (const source of finding.sources ?? []) urls.add(source.url);
    }
  }
  return urls.size;
}

/**
 * Account Intelligence / Company Brief. Stage 1 compiles a dossier from
 * already-persisted platform intelligence; Stage 2 enriches it with the research
 * harness's source-backed findings. Facts, recent enrichment and commercial
 * hypotheses stay distinct; unknown financials/headcount are never invented.
 * Historical snapshots are preserved.
 */
@Injectable()
export class AccountIntelligenceService {
  constructor(
    @Inject(CompanyBriefRepository)
    private readonly repository: CompanyBriefRepository,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(ContactDiscoveryService)
    private readonly contacts: ContactDiscoveryService,
    @Inject(OutreachDrafterService)
    private readonly drafter: OutreachDrafterService,
    @Inject(OutreachSenderService)
    private readonly sender: OutreachSenderService,
    @Inject(OutreachResultsService)
    private readonly results: OutreachResultsService,
    @Inject(ResearchContextService)
    private readonly context: ResearchContextService,
  ) {}

  /** Validates brief content, mapping schema violations to a 400 (never a 500). */
  private validateContent(content: BriefContent): BriefContent {
    try {
      return BriefContentSchema.parse(content);
    } catch (error) {
      throw new BadRequestException({
        error: 'brief_content_invalid',
        detail: error instanceof Error ? error.message : 'invalid',
      });
    }
  }

  private platformSource(retrievedAt: Date): BriefSource {    return {
      url: 'urn:platform:outreach-assistant',
      publisher: 'Platform',
      retrievedAt,
      kind: 'PLATFORM',
    };
  }

  private evidenceSource(lead: LeadRecord): BriefSource[] {
    const source = lead.evidence?.source;
    if (!source?.url) return [];
    return [
      {
        url: source.url,
        ...(source.title ? { title: source.title } : {}),
        ...(source.publisher ? { publisher: source.publisher } : {}),
        retrievedAt: lead.evidence.retrievedAt ?? lead.createdAt,
        kind: 'MARKET_RESEARCH',
      },
    ];
  }

  private async buildStage1(
    opportunityId: string,
    companyId: string,
  ): Promise<{ content: BriefContent; sourceCount: number }> {
    const leads = await this.leads.listLeads(opportunityId);
    const lead = leads.find((candidate) => candidate.companyId === companyId) ?? null;
    const decision = await this.drafter.getDecisionForCompany(
      opportunityId,
      companyId,
    );
    if (!lead && !decision) {
      throw new ConflictException({
        error: 'company_not_linked_to_opportunity',
      });
    }
    const company = lead?.company ?? (await this.leads.getCompany(companyId));
    const now = new Date();
    const platform = this.platformSource(now);
    const evidence = lead ? this.evidenceSource(lead) : [];

    let offerName: string | null = null;
    try {
      const context = await this.context.getResearchContext(opportunityId);
      offerName = context.offer.name;
    } catch {
      offerName = null;
    }

    const contactList = await this.contacts.listContacts(companyId);
    const { sent, replies } = await this.gatherOutreach(opportunityId, companyId);
    const latestReply = replies[replies.length - 1] ?? null;

    const atAGlance: string[] = [
      `${company.name}${company.country ? ` — ${company.country}` : ''}`,
      offerName ? `Offer context: ${offerName}` : 'Offer context: (not available)',
    ];
    if (lead) atAGlance.push(`Observed roles: ${lead.observedRoles.join(', ')}`);
    if (lead) {
      atAGlance.push(
        `Agent qualification: ${lead.agentQualificationStatus}${lead.agentQualificationStale ? ' (stale)' : ''}`,
      );
    }
    atAGlance.push(`Outreach decision: ${decision?.decision ?? 'none recorded'}`);
    atAGlance.push(
      `Latest reply: ${latestReply ? latestReply.classification : 'no reply recorded'}`,
    );

    const companyOverview: BriefFinding[] = [
      {
        statement: `${company.name} is recorded as a company${company.country ? ` in ${company.country}` : ''}.`,
        kind: 'KNOWN_FACT',
        ...(evidence.length ? { sources: evidence } : { sources: [platform] }),
      },
    ];
    if (company.website) {
      companyOverview.push({
        statement: `Website: ${company.website}`,
        kind: 'KNOWN_FACT',
        sources: [platform],
      });
    }

    const relevantProductsOperations: BriefFinding[] = lead
      ? [
          {
            statement: lead.observedActivityText,
            kind: 'KNOWN_FACT',
            ...(evidence.length ? { sources: evidence } : {}),
          },
        ]
      : [];

    const whyThisAccountFits: BriefFinding[] = [];
    if (lead?.agentQualificationReason) {
      // The agent's qualification *rationale* is an interpretation, not a
      // persisted fact: reuse it as context but keep it labelled as inference.
      whyThisAccountFits.push({
        statement: `Agent qualification rationale (inference): ${lead.agentQualificationReason}`,
        kind: 'COMMERCIAL_HYPOTHESIS',
      });
    }
    if (lead?.buyerFitHypothesisText) {
      whyThisAccountFits.push({
        statement: lead.buyerFitHypothesisText,
        kind: 'COMMERCIAL_HYPOTHESIS',
      });
    }

    const existingRelationshipOutreach: BriefFinding[] = [];
    existingRelationshipOutreach.push({
      statement: `Outreach decision: ${decision?.decision ?? 'none recorded'}.`,
      kind: 'KNOWN_FACT',
      sources: [platform],
    });
    for (const row of sent) {
      existingRelationshipOutreach.push({
        statement: `Sent ${row.sentAt ? row.sentAt.toISOString() : 'unknown time'}: "${row.subject}" to ${row.recipientEmail}.`,
        kind: 'KNOWN_FACT',
        sources: [platform],
      });
    }
    for (const reply of replies) {
      existingRelationshipOutreach.push({
        statement: `Reply (${reply.classification})${reply.receivedAt ? ` on ${reply.receivedAt.toISOString()}` : ''}${reply.excerpt ? `: ${reply.excerpt}` : '.'}`,
        kind: 'KNOWN_FACT',
        sources: [platform],
      });
    }

    const keyPeopleContacts: BriefFinding[] = contactList.map((contact) => {
      const label =
        contact.contactType === 'NAMED_PERSON' && contact.personName
          ? `${contact.personName}${contact.personJobTitle ? ` (${contact.personJobTitle})` : ''}`
          : 'General company contact';
      const value =
        contact.email ?? contact.phone ?? contact.contactPageUrl ?? '(no channel)';
      const sources = contact.sources
        .map((source) => source.url)
        .filter((url): url is string => Boolean(url));
      return {
        statement: `${label}: ${value}`,
        kind: 'KNOWN_FACT' as const,
        ...(sources.length
          ? {
              sources: sources.map((url) => ({
                url,
                retrievedAt: contact.createdAt,
                kind: 'FIRST_PARTY' as const,
              })),
            }
          : {}),
      };
    });

    const commercialHypotheses: BriefFinding[] = lead?.buyerFitHypothesisText
      ? [
          {
            statement: lead.buyerFitHypothesisText,
            kind: 'COMMERCIAL_HYPOTHESIS',
          },
        ]
      : [];

    const thingsToKnowBeforeMeeting: BriefFinding[] = [];
    if (latestReply && latestReply.classification) {
      thingsToKnowBeforeMeeting.push({
        statement: `The account replied "${latestReply.classification}" and was handed off to a human; a human should respond personally.`,
        kind: 'KNOWN_FACT',
        sources: [platform],
      });
    }

    const questionsWorthAsking: string[] = [
      'Which product range/profile and volumes are relevant for this account?',
      'What are their current cladding/sauna material requirements and lead times?',
    ];
    const unknownsGaps: string[] = [];
    for (const label of [
      'company size / headcount signals',
      'financials (turnover/revenue/profit)',
      'markets served / export orientation',
      'factories / warehouses / facilities',
      'brands / partnerships / distribution',
      'recent news / announcements',
      'public reviews / reputation',
    ]) {
      unknownsGaps.push(`Not yet gathered: ${label}.`);
    }

    const content = this.validateContent({
      atAGlance,
      companyOverview,
      relevantProductsOperations,
      whyThisAccountFits,
      existingRelationshipOutreach,
      keyPeopleContacts,
      financialSizeSignals: [],
      marketsCustomersChannels: [],
      recentActivity: [],
      reputationPublicFeedback: [],
      commercialHypotheses,
      thingsToKnowBeforeMeeting,
      questionsWorthAsking,
      unknownsGaps,
    });
    return { content, sourceCount: countSources(content) };
  }

  private async gatherOutreach(opportunityId: string, companyId: string) {
    const batches = await this.drafter.listBatches(opportunityId);
    const sent: Array<{
      subject: string;
      recipientEmail: string;
      sentAt: Date | null;
    }> = [];
    const replies: Array<{
      classification: string;
      receivedAt: Date | null;
      excerpt: string | null;
    }> = [];
    for (const batch of batches) {
      const rows = await this.sender.listSentOutbound(batch.id);
      for (const row of rows) {
        if (row.companyId !== companyId) continue;
        sent.push({
          subject: row.subject,
          recipientEmail: row.recipientEmail,
          sentAt: row.smtpSubmittedAt ?? row.queuedAt,
        });
      }
      const batchResults = await this.results.getBatchResults(
        opportunityId,
        batch.id,
      );
      for (const reply of batchResults.replies) {
        if (reply.companyId !== companyId) continue;
        replies.push({
          classification: reply.classification,
          receivedAt: reply.receivedAt,
          excerpt: reply.excerpt,
        });
      }
    }
    return { sent, replies };
  }

  private toView(
    brief: CompanyBriefRecord,
    snapshots: CompanyBriefSnapshotRecord[],
  ): CompanyBriefView {
    const latest = snapshots[0];
    if (!latest) throw new NotFoundException({ error: 'company_brief_empty' });
    return {
      brief,
      latest,
      history: snapshots.map((snapshot) => ({
        version: snapshot.version,
        status: snapshot.status,
        preparedAt: snapshot.preparedAt,
        lastRefreshedAt: snapshot.lastRefreshedAt,
        sourceCount: snapshot.sourceCount,
      })),
    };
  }

  /** Stage 1: compile a brief from persisted platform intelligence. */
  async prepareBrief(
    opportunityId: string,
    companyId: string,
    options: { refresh?: boolean } = {},
  ): Promise<CompanyBriefView> {
    const compiled = await this.buildStage1(opportunityId, companyId);
    let brief = await this.repository.findBrief(opportunityId, companyId);
    if (!brief) {
      brief = await this.repository.createBrief(opportunityId, companyId);
    } else if (!options.refresh) {
      const snapshots = await this.repository.listSnapshots(brief.id);
      if (snapshots.length > 0) return this.toView(brief, snapshots);
    }
    const now = new Date();
    const version = await this.repository.nextVersion(brief.id);
    await this.repository.createSnapshot({
      briefId: brief.id,
      version,
      status: 'COMPILED',
      preparedAt: now,
      lastRefreshedAt: now,
      sourceCount: compiled.sourceCount,
      content: compiled.content,
      enrichmentNote: options.refresh ? 'Refreshed from platform data' : null,
    });
    const all = await this.repository.listSnapshots(brief.id);
    return this.toView(brief, all);
  }

  async getBrief(
    opportunityId: string,
    companyId: string,
  ): Promise<CompanyBriefView> {
    const brief = await this.repository.findBrief(opportunityId, companyId);
    if (!brief) throw new NotFoundException({ error: 'company_brief_not_found' });
    const snapshots = await this.repository.listSnapshots(brief.id);
    return this.toView(brief, snapshots);
  }

  /** Human action: mark the current snapshot as awaiting targeted enrichment. */
  async requestEnrichment(
    opportunityId: string,
    companyId: string,
    note: string | null,
  ): Promise<CompanyBriefView> {
    const brief = await this.repository.findBrief(opportunityId, companyId);
    if (!brief) throw new NotFoundException({ error: 'company_brief_not_found' });
    const snapshots = await this.repository.listSnapshots(brief.id);
    const latest = snapshots[0];
    if (!latest) throw new NotFoundException({ error: 'company_brief_empty' });
    await this.repository.updateSnapshotStatus(
      latest.id,
      'ENRICHMENT_REQUESTED',
      note,
    );
    const refreshed = await this.repository.listSnapshots(brief.id);
    return this.toView(brief, refreshed);
  }

  /** Harness submission: merge source-backed Stage-2 findings into a fresh snapshot. */
  async submitEnrichment(
    briefId: string,
    input: SubmitCompanyEnrichmentInput,
  ): Promise<CompanyBriefView> {
    const brief = await this.repository.findBriefById(briefId);
    if (!brief) throw new NotFoundException({ error: 'company_brief_not_found' });
    const snapshots = await this.repository.listSnapshots(brief.id);
    const latest = snapshots[0];
    if (!latest) throw new NotFoundException({ error: 'company_brief_empty' });

    const merged: BriefContent = JSON.parse(JSON.stringify(latest.content));
    for (const finding of input.findings) {
      const field = SECTION_FIELD[finding.section];
      const section = merged[field] as BriefFinding[];
      section.push({
        statement: finding.statement,
        ...(finding.detail ? { detail: finding.detail } : {}),
        kind: finding.kind,
        ...(finding.sources ? { sources: finding.sources } : {}),
      });
    }
    if (input.atAGlance) merged.atAGlance.push(...input.atAGlance);
    if (input.questionsWorthAsking) {
      merged.questionsWorthAsking.push(...input.questionsWorthAsking);
    }
    if (input.resolvedUnknowns && input.resolvedUnknowns.length > 0) {
      const resolved = new Set(input.resolvedUnknowns);
      merged.unknownsGaps = merged.unknownsGaps.filter(
        (gap) => !resolved.has(gap),
      );
    }
    if (input.unknownsGaps) {
      const existing = new Set(merged.unknownsGaps);
      for (const gap of input.unknownsGaps) {
        if (!existing.has(gap)) merged.unknownsGaps.push(gap);
      }
    }
    const validated = this.validateContent(merged);
    const now = new Date();
    const version = await this.repository.nextVersion(brief.id);
    await this.repository.createSnapshot({
      briefId: brief.id,
      version,
      status: 'ENRICHED',
      preparedAt: latest.preparedAt,
      lastRefreshedAt: now,
      sourceCount: countSources(validated),
      content: validated,
      enrichmentNote: input.notes ?? null,
    });
    const after = await this.repository.listSnapshots(brief.id);
    return this.toView(brief, after);
  }
}
