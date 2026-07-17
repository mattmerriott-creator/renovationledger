"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

declare global {
  interface Window {
    posthog?: { capture: (event: string) => void };
  }
}

// Fires a PostHog event once when `active` is true (driven by a one-shot
// query param the server action sets on redirect), then strips that param
// so a page refresh doesn't re-fire the event.
export default function PosthogCapture({ event, active }: { event: string; active: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!active) return;
    window.posthog?.capture(event);
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return null;
}
