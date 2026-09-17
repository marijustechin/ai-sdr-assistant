import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { GOAL_LABELS } from "@/lib/research-requests/schema";
import type { ResearchRequestSummary } from "@/lib/research-requests/types";
import { researchRunPath } from "@/lib/research/navigation";

/**
 * Queued research requests for one product. The label is honest: submitting a
 * request only queues it — no research has started.
 */
export function ResearchRequestsList({
  productId,
  requests,
}: {
  productId: string;
  requests: ResearchRequestSummary[];
}) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queued research requests</CardTitle>
        <CardDescription>Queued — waiting for researcher.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {requests.map((request) => (
            <li key={request.runId}>
              <Link
                href={researchRunPath(
                  productId,
                  request.opportunityId,
                  request.runId,
                )}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="outline">Queued — waiting for researcher</Badge>
                  <span className="text-muted-foreground">
                    {request.countries.join(", ") || "—"}
                  </span>
                  <span className="text-muted-foreground">
                    {request.goals.map((goal) => GOAL_LABELS[goal]).join(", ")}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  Requested {formatDateTime(request.requestedAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
