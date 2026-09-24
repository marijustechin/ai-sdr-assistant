import type { PrismaClient } from '@ai-sdr/database';

const TABLES = [
  'quote_follow_ups',
  'research_results',
  'supplier_quotes',
  'quote_inbound_messages',
  'quote_outbound_messages',
  'price_inquiry_drafts',
  'outreach_drafts',
  'sender_profiles',
  'email_accounts',
  'contact_sources',
  'contacts',
  'opportunity_companies',
  'companies',
  'research_offerings',
  'claim_evidence',
  'evidence',
  'claims',
  'source_references',
  'research_queries',
  'research_run_target_markets',
  'research_runs',
  'opportunity_target_markets',
  'target_markets',
  'product_facts',
  'opportunities',
  'offers',
  'products',
] as const;

/** Truncate every domain table between tests (no leakage into the next test). */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}
