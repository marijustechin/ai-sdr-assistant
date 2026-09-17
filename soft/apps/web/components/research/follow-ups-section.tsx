import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PendingFollowUp } from "@/lib/research/checkpoint";

export function FollowUpsSection({
  followUps,
  hasCheckpoint,
}: {
  followUps: PendingFollowUp[];
  hasCheckpoint: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending follow-ups</CardTitle>
        <CardDescription>
          Recorded in the checkpoint. These are open items, not findings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasCheckpoint ? (
          <p className="text-sm text-muted-foreground">
            Follow-ups are unavailable: no checkpoint recorded.
          </p>
        ) : followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending follow-ups recorded.
          </p>
        ) : (
          <ul className="space-y-3">
            {followUps.map((item) => (
              <li
                key={`${item.kind}-${item.ref}`}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="outline">{item.kind}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.ref}
                  </span>
                </div>
                {item.note ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {item.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
