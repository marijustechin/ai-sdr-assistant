"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Copies a value to the operator's clipboard. Kept deliberately small and
 * accessible; it never sends anything anywhere.
 */
export function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="cursor-pointer"
      onClick={copy}
      aria-label={`Copy ${label}`}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
