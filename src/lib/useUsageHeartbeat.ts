"use client";

import { useEffect } from "react";

/** How often a visible embed pings /api/track-usage. Keep well under the
 *  server's MAX_DELTA_SECONDS (90) so every normal interval is fully counted. */
const HEARTBEAT_MS = 60_000;

/**
 * Time-on-app heartbeat for the app embed page (analytics only).
 *
 * On mount, generates a random session key and sends a heartbeat to
 * /api/track-usage, then repeats every minute — but ONLY while the tab is
 * visible. When the tab is hidden or the page unloads, one final beacon is
 * sent (via sendBeacon so it survives navigation) and the timer stops; it
 * resumes when the tab becomes visible again. The server turns the gaps
 * between heartbeats into `activeSeconds`, clamped so invisible time never
 * counts.
 *
 * Deliberately low-noise: at most one small POST per minute per open embed.
 * Fire-and-forget — failures are swallowed, tracking must never affect the
 * user. Records only that this app's embed was open and visible; nothing
 * from inside the iframe is observed.
 */
export function useUsageHeartbeat(appId: string) {
  useEffect(() => {
    // crypto.randomUUID is available in all modern browsers; skip quietly
    // where it isn't rather than break the embed.
    if (typeof crypto === "undefined" || !crypto.randomUUID) return;
    const sessionKey = crypto.randomUUID();
    const payload = () =>
      JSON.stringify({ kind: "app", id: appId, sessionKey });

    const ping = () => {
      try {
        fetch("/api/track-usage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload(),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    };

    // Final beacon when the tab hides or the page goes away — sendBeacon is
    // the reliable way to get a request out during unload.
    const flush = () => {
      try {
        const blob = new Blob([payload()], { type: "application/json" });
        if (!navigator.sendBeacon?.("/api/track-usage", blob)) ping();
      } catch {
        /* ignore */
      }
    };

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null) timer = setInterval(ping, HEARTBEAT_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        ping(); // resume: marks a fresh lastSeenAt so hidden time stays clamped
        start();
      } else {
        flush();
        stop();
      }
    };

    ping(); // opening heartbeat (creates the session row)
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [appId]);
}
