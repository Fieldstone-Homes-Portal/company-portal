"use client";

import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

// Slimmed-down cousin of apps/[id]/AppEmbed for the Management-section soft
// launch: same chrome and fullscreen toggle, but no PortalApp row backs this
// embed, so there is no open-tracking or usage heartbeat.
export default function RequestCenterEmbed({ iframeSrc }: { iframeSrc: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  const header = (
    <div className="flex items-center justify-between border-b border-fs-warm-gray bg-white px-6 py-3">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-sm font-bold text-fs-espresso">
          Request Center
        </h1>
        <span className="rounded-full bg-fs-warm-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fs-copper">
          Admin preview
        </span>
      </div>
      <button
        onClick={() => setFullscreen(!fullscreen)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-fs-copper transition-colors hover:bg-fs-warm-gray hover:text-fs-espresso"
      >
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>
    </div>
  );

  const frame = (
    <iframe
      src={iframeSrc}
      className="h-0 min-h-0 flex-1 border-0"
      title="Request Center"
      allow="clipboard-read; clipboard-write"
    />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {header}
        {frame}
      </div>
    );
  }

  return (
    <div className="-m-6 flex flex-1 flex-col">
      {header}
      {frame}
    </div>
  );
}
