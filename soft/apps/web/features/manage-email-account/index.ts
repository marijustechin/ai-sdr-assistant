/**
 * Public API of the `manage-email-account` feature: the create/edit form and the
 * bounded mailbox verification panel. Server Actions, write API and payload
 * builder are internal to the slice; the server-only verification client is the
 * explicit `./server` entry.
 */
export { EmailAccountForm } from "./form";
export { MailboxVerificationPanel } from "./mailbox-verification-panel";
