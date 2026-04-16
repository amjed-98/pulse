"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { Button } from "@/components/ui/Button";

export function AnalyticsPresetActions({ shareUrl }: { shareUrl: string }) {
  const { showToast } = useToast();

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showToast({
            tone: "success",
            message: "Copied report link.",
          });
        } catch {
          showToast({
            tone: "error",
            message: "Could not copy the report link.",
          });
        }
      }}
    >
      Copy report link
    </Button>
  );
}
