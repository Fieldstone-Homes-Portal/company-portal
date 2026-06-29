import { Megaphone } from "lucide-react";
import type { AllStaffEmail } from "@/lib/allStaff";

/** Format a Graph ISO date as a friendly Mountain-time label, relative when recent. */
function formatWhen(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Denver",
  });
}

export default function AllStaffSection({
  emails,
  error,
}: {
  emails: AllStaffEmail[];
  error?: string | null;
}) {
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
          <p className="text-sm text-fs-copper">
            All Staff announcements aren&apos;t available right now.
          </p>
        </div>
      ) : emails.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-fs-warm-gray">
          <p className="text-sm text-fs-copper">No recent announcements.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emails.map((email, i) => (
            <article
              key={`${email.date}-${i}`}
              className="rounded-2xl border-l-2 border-fs-copper/40 bg-white p-5 shadow-sm ring-1 ring-fs-warm-gray"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-lg font-bold leading-snug text-fs-espresso">
                  {email.subject}
                </h3>
                <span className="shrink-0 text-xs text-fs-copper-light">
                  {formatWhen(email.date)}
                </span>
              </div>
              {email.senderName && (
                <p className="mt-0.5 text-xs font-medium text-fs-copper">
                  {email.senderName}
                </p>
              )}
              {email.bodyText && (
                <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-fs-charcoal/80">
                  {email.bodyText}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
