"use client";

import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@shared/lib/utils";
import { MATCH_TYPE_LABEL, MATCH_TYPE_TONE } from "@/lib/research/offerings";
import {
  toggleExpandedRow,
  UNKNOWN_CELL,
  type OfferingTableGroup,
} from "@/lib/research/offerings-table";
import { OfferingDetail } from "./offering-detail";

const COLUMN_COUNT = 8;

function CellText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        value === UNKNOWN_CELL && "text-muted-foreground/70",
        className,
      )}
    >
      {value}
    </span>
  );
}

/**
 * Compact, scan-friendly offerings table: one offering per row, grouped by
 * match class, with the whole row toggling an expandable detail row directly
 * beneath it. Lower-priority columns hide on narrow screens; the table never
 * turns back into cards.
 */
export function OfferingsTable({
  opportunityId,
  groups,
  initialExpandedId = null,
}: {
  opportunityId: string;
  groups: OfferingTableGroup[];
  /** Initial open row id — used for deep links and server-render tests. */
  initialExpandedId?: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    initialExpandedId,
  );

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <caption className="sr-only">
          Companies and offerings: one row per recorded offering
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-3 py-2 font-medium">
              Company
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Product
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Price
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 font-medium sm:table-cell"
            >
              Unit
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 font-medium lg:table-cell"
            >
              VAT
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 font-medium md:table-cell"
            >
              Market / channel
            </th>
            <th
              scope="col"
              className="hidden px-3 py-2 font-medium xl:table-cell"
            >
              Stock / availability
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Match
            </th>
          </tr>
        </thead>
        {groups.map((group) => (
          <tbody key={group.matchType}>
            <tr className="border-b border-border bg-muted/30">
              <th
                scope="colgroup"
                colSpan={COLUMN_COUNT}
                className="px-3 py-1.5 text-left"
              >
                <span className="inline-flex items-center gap-2">
                  <Badge tone={MATCH_TYPE_TONE[group.matchType]}>
                    {MATCH_TYPE_LABEL[group.matchType]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {group.rows.length}
                  </span>
                </span>
              </th>
            </tr>
            {group.rows.map((row) => {
              const isExpanded = expandedId === row.offering.id;
              const detailId = `offering-detail-${row.offering.id}`;
              const labelSubject =
                row.cells.company === UNKNOWN_CELL
                  ? "this offering"
                  : row.cells.company;
              return (
                <Fragment key={row.offering.id}>
                  <tr
                    id={`offering-${row.offering.id}`}
                    data-testid="offering-row"
                    className={cn(
                      "scroll-mt-4 cursor-pointer border-b border-border align-top transition-colors hover:bg-muted/50",
                      isExpanded && "bg-muted/30",
                    )}
                    onClick={() =>
                      setExpandedId((current) =>
                        toggleExpandedRow(current, row.offering.id),
                      )
                    }
                  >
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="flex w-full items-start gap-2 text-left"
                        aria-expanded={isExpanded}
                        aria-controls={isExpanded ? detailId : undefined}
                        aria-label={`${
                          isExpanded ? "Collapse" : "Expand"
                        } details for ${labelSubject}`}
                      >
                        <ChevronDownIcon
                          className={cn(
                            "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                        <CellText
                          value={row.cells.company}
                          className="font-medium"
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <CellText value={row.cells.product} />
                    </td>
                    <td className="px-3 py-2">
                      <CellText
                        value={row.cells.price}
                        className="font-medium tabular-nums"
                      />
                    </td>
                    <td className="hidden px-3 py-2 sm:table-cell">
                      <CellText
                        value={row.cells.unit}
                        className="text-muted-foreground"
                      />
                    </td>
                    <td className="hidden px-3 py-2 lg:table-cell">
                      <CellText
                        value={row.cells.vat}
                        className="text-muted-foreground"
                      />
                    </td>
                    <td className="hidden px-3 py-2 md:table-cell">
                      <CellText
                        value={row.cells.market}
                        className="text-muted-foreground"
                      />
                    </td>
                    <td className="hidden px-3 py-2 xl:table-cell">
                      <CellText
                        value={row.cells.stock}
                        className="text-muted-foreground"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={MATCH_TYPE_TONE[row.cells.matchType]}>
                        {MATCH_TYPE_LABEL[row.cells.matchType]}
                      </Badge>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr
                      id={detailId}
                      data-testid="offering-detail"
                      className="border-b border-border bg-muted/20"
                    >
                      <td colSpan={COLUMN_COUNT} className="px-3 py-4">
                        <OfferingDetail
                          opportunityId={opportunityId}
                          offering={row.offering}
                          claimReview={row.review}
                          linkedClaimEvidence={row.linkedClaimEvidence}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
