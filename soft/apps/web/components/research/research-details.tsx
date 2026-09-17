import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { ResearchQueryRead } from "@/lib/research/types";

/**
 * Low-level run detail (usage/limits, checkpoint notes and the discovery log)
 * lives behind a collapsed control. The discovery-query total is shown in the
 * summary line; the full query table only appears when expanded.
 */
export function ResearchDetails({
  notes,
  hasCheckpoint,
  queries,
}: {
  notes: string | null;
  hasCheckpoint: boolean;
  queries: ResearchQueryRead[];
}) {
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-5">
          <span className="text-base font-semibold">Research details</span>
          <span className="text-sm text-muted-foreground">
            {queries.length} recorded{" "}
            {queries.length === 1 ? "discovery query" : "discovery queries"} ·
            show usage, limits, notes and the query log
          </span>
        </summary>
        <CardContent className="space-y-4 border-t border-border pt-5">
          <div>
            <CardTitle className="text-sm">Usage, limits &amp; notes</CardTitle>
            <CardDescription className="mt-1">
              Structured usage/limit fields are not persisted; this is the run&apos;s
              recorded checkpoint note, shown verbatim. Unrecorded values stay
              unknown — no cost is assumed to be zero.
            </CardDescription>
            <div className="mt-2">
              {!hasCheckpoint ? (
                <p className="text-sm text-muted-foreground">
                  Unavailable: no checkpoint recorded.
                </p>
              ) : notes ? (
                <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-sm">
                  {notes}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No notes recorded in the checkpoint.
                </p>
              )}
            </div>
          </div>

          <div>
            <CardTitle className="text-sm">Discovery query log</CardTitle>
            <div className="mt-2">
              {queries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No discovery queries recorded.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Query</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Recorded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queries.map((query) => (
                      <TableRow key={query.id}>
                        <TableCell className="max-w-md">
                          {query.queryText}
                        </TableCell>
                        <TableCell>{query.provider ?? "—"}</TableCell>
                        <TableCell>{query.status}</TableCell>
                        <TableCell>
                          {query.resultCount === null ? "—" : query.resultCount}
                        </TableCell>
                        <TableCell>{formatDateTime(query.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </details>
    </Card>
  );
}
