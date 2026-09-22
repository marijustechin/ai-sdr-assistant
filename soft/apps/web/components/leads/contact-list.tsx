import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "./copy-button";
import { ContactUsabilityForm } from "./contact-usability-form";
import { formatDateTime } from "@shared/lib/format";
import {
  contactChannels,
  contactDeliverabilityLabel,
  contactHeading,
  contactTypeLabel,
  summarizeContacts,
} from "@/lib/contacts/display";
import type { ContactRead } from "@/lib/contacts/types";

function ContactBlock({
  productId,
  opportunityId,
  leadId,
  companyId,
  contact,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  contact: ContactRead;
}) {
  const channels = contactChannels(contact);
  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{contactHeading(contact)}</span>
          <Badge tone="outline">{contactTypeLabel(contact.contactType)}</Badge>
          {contact.contactType === "NAMED_PERSON" &&
          contact.personJobTitle ? (
            <span className="text-xs text-muted-foreground">
              {contact.personJobTitle}
            </span>
          ) : null}
        </div>
        {contact.usabilityStatus === "UNUSABLE" ? (
          <Badge tone="danger">Unusable</Badge>
        ) : null}
      </div>

      <ul className="mt-3 space-y-2 text-sm">
        {channels.map((channel) => (
          <li
            key={channel.key}
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {channel.label}
            </span>
            {channel.href ? (
              <a
                href={channel.href}
                className="break-all rounded text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                {...(channel.key === "contactPageUrl"
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                {channel.display}
              </a>
            ) : (
              <span className="break-all">{channel.display}</span>
            )}
            <CopyButton value={channel.copyValue} label={channel.label} />
          </li>
        ))}
      </ul>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <p>{contactDeliverabilityLabel(contact.deliverabilityStatus)}</p>
        {contact.unknownsText ? <p>{contact.unknownsText}</p> : null}
        <ul className="space-y-1">
          {contact.sources.map((source) => (
            <li key={source.id}>
              Source:{" "}
              <a
                href={source.url}
                className="break-all rounded text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                target="_blank"
                rel="noreferrer"
              >
                {source.title ?? source.url}
              </a>{" "}
              · checked {formatDateTime(source.retrievedAt)}
              {source.publisher ? ` · ${source.publisher}` : ""}
            </li>
          ))}
        </ul>
      </div>

      {contact.usabilityStatus === "UNUSABLE" && contact.unusableReason ? (
        <p className="mt-2 text-xs text-destructive">{contact.unusableReason}</p>
      ) : null}

      <div className="mt-3">
        <ContactUsabilityForm
          productId={productId}
          opportunityId={opportunityId}
          leadId={leadId}
          companyId={companyId}
          contact={contact}
        />
      </div>
    </li>
  );
}

export function ContactList({
  productId,
  opportunityId,
  leadId,
  companyId,
  contacts,
  unavailable = false,
}: {
  productId: string;
  opportunityId: string;
  leadId: string;
  companyId: string;
  contacts: ContactRead[];
  unavailable?: boolean;
}) {
  const summary = summarizeContacts(contacts);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
        <CardDescription>
          Public business contacts published on a source. Finding an address does
          not confirm it works or that it reaches purchasing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {unavailable ? (
          <p className="text-sm text-muted-foreground">
            Contacts could not be loaded right now.
          </p>
        ) : contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No contacts recorded yet. Contacts are added for qualified candidates
            from their own pages.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {summary.total} contact{summary.total === 1 ? "" : "s"} ·{" "}
              {summary.general} general · {summary.named} named
              {summary.unusable > 0
                ? ` · ${summary.unusable} marked unusable`
                : ""}
            </p>
            <ul className="space-y-3">
              {contacts.map((contact) => (
                <ContactBlock
                  key={contact.id}
                  productId={productId}
                  opportunityId={opportunityId}
                  leadId={leadId}
                  companyId={companyId}
                  contact={contact}
                />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
