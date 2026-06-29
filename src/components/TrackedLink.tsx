"use client";

import type { ReactNode } from "react";

/**
 * Fire-and-forget "record that I opened this" ping to /api/track-open.
 * `keepalive` lets it complete even if the click triggers navigation; failures
 * are swallowed so tracking can never block or break the user's click.
 */
export function trackOpen(kind: "app" | "link", id: string) {
  try {
    fetch("/api/track-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

interface TrackedLinkProps {
  /** Where the click navigates (for links this is the external URL). */
  href: string;
  /** Identifier recorded in the user's "recently opened" history (the URL). */
  trackId: string;
  className?: string;
  children: ReactNode;
}

/**
 * An external anchor (opens in a new tab) that records the open before
 * navigating. Used for company links on /links and on the Home page.
 */
export default function TrackedLink({ href, trackId, className, children }: TrackedLinkProps) {
  return (
    <a
      href={href}
      onClick={() => trackOpen("link", trackId)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
