"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { trackOpen } from "@/components/TrackedLink";
import { useUsageHeartbeat } from "@/lib/useUsageHeartbeat";

interface AppEmbedProps {
  name: string;
  iframeSrc: string;
  appId: string;
}

export default function AppEmbed({ name, iframeSrc, appId }: AppEmbedProps) {
  const [fullscreen, setFullscreen] = useState(false);

  // Record the open once, when the app actually renders (not on prefetch), so
  // it surfaces in the user's "recently opened" row on the Home page.
  useEffect(() => {
    trackOpen("app", appId);
  }, [appId]);

  // Time-on-app analytics: minute-level heartbeats while this embed is
  // visible (see /admin/analytics). App-level only — the iframe's contents
  // are never observed.
  useUsageHeartbeat(appId);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        <div className="flex items-center justify-between border-b border-fs-warm-gray bg-white px-4 py-2">
          <h1 className="font-display text-sm font-bold text-fs-espresso">
            {name}
          </h1>
          <button
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
          >
            <Minimize2 size={14} />
            Exit Fullscreen
          </button>
        </div>
        <iframe
          src={iframeSrc}
          className="h-0 min-h-0 flex-1 border-0"
          title={name}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  return (
    <div className="-m-6 flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-fs-warm-gray bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="h-4 w-px bg-fs-warm-gray" />
          <h1 className="font-display text-sm font-bold text-fs-espresso">
            {name}
          </h1>
        </div>
        <button
          onClick={() => setFullscreen(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
        >
          <Maximize2 size={14} />
          Fullscreen
        </button>
      </div>
      <iframe
        src={iframeSrc}
        className="h-0 min-h-0 flex-1 border-0"
        title={name}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
