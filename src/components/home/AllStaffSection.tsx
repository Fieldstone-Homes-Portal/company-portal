"use client";

import { useEffect, useState } from "react";
import { Megaphone, X } from "lucide-react";
import type { AllStaffEmail } from "@/lib/allStaff";

/** Short, relative-when-recent label for the card. */
function formatWhen(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" });
}

/** Full date for the open email. */
function formatFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver",
  });
}

export default function AllStaffSection({
  emails,
  error,
}: {
  emails: AllStaffEmail[];
  error?: string | null;
}) {
  const [open, setOpen] = useState<AllStaffEmail | null>(null);

  // Close on Escape and lock background scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-fs-copper" />
          <h2 className="font-display text-xl font-bold text-fs-espresso">From All Staff</h2>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fs-copper-light">
          via Microsoft 365
        </span>
      </div>

      {error ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <p className="text-sm text-fs-copper">All Staff announcements aren&apos;t available right now.</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <p className="text-sm text-fs-copper">No recent announcements.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email, i) => (
            <button
              key={`${email.date}-${i}`}
              onClick={() => setOpen(email)}
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border-l-2 border-fs-copper/40 bg-white p-5 text-left shadow-sm ring-1 ring-fs-warm-gray transition-all hover:shadow-md hover:ring-fs-copper/30"
            >
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-bold leading-snug text-fs-espresso group-hover:text-fs-copper">
                  {email.subject}
                </h3>
                {email.senderName && (
                  <p className="mt-0.5 text-xs font-medium text-fs-copper">{email.senderName}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-fs-copper-light">{formatWhen(email.date)}</span>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fs-espresso/40 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.subject}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-fs-warm-gray px-6 py-4">
              <div className="min-w-0">
                <h3 className="font-display text-xl font-bold leading-snug text-fs-espresso">
                  {open.subject}
                </h3>
                <p className="mt-1 text-xs text-fs-copper">
                  {open.senderName}
                  {open.senderName && open.date ? " · " : ""}
                  {formatFull(open.date)}
                </p>
              </div>
              <button
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1.5 text-fs-copper transition-colors hover:bg-fs-warm-white hover:text-fs-espresso"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto whitespace-pre-line px-6 py-5 text-sm leading-relaxed text-fs-charcoal">
              {open.bodyText || "(No message body.)"}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
