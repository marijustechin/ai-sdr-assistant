import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertIcon } from "@/components/ui/icons";

export interface IntegrationNoticeProps {
  title: string;
  children: ReactNode;
}

/**
 * Inline admin notice for configuration or load problems. Callers pass an
 * already-sanitized message; backend secrets and raw exceptions never reach it.
 */
export function IntegrationNotice({ title, children }: IntegrationNoticeProps) {
  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="flex gap-3 p-5">
        <AlertIcon className="mt-0.5 size-5 shrink-0 text-warning-foreground" />
        <div className="space-y-1 text-sm">
          <p className="font-medium text-foreground">{title}</p>
          <div className="space-y-1 text-muted-foreground">{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
