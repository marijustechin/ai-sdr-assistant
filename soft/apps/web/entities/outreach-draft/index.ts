/**
 * Public client-safe API of the `outreach-draft` entity: read model, types,
 * display helpers and read-only UI. The server-only read API is a separate entry
 * point: `@entities/outreach-draft/api`.
 */
export * from "./types";
export * from "./display";
export { OutreachDraftList } from "./ui/outreach-draft-list";
