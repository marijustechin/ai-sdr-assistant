import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  /**
   * Dashboard metrics have no backing endpoint yet, so they are clearly marked
   * as placeholders rather than presented as live figures.
   */
  placeholder?: boolean;
}

export function StatCard({ label, value, hint, placeholder }: StatCardProps) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {placeholder ? <Badge tone="outline">Placeholder</Badge> : null}
        </div>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
