// Tiny live 30Y mortgage rate readout for the sidebar footer.
// Async server component — runs on the server, uses Next's fetch cache.
// Renders nothing on fetch/parse failure so the sidebar can't break.

import { getMortgageRate } from "@/lib/mortgageRate";

export default async function MortgageRateTag() {
  const data = await getMortgageRate();
  if (!data) return null;

  const arrow =
    data.direction === "up" ? "▲" : data.direction === "down" ? "▼" : "–";
  // Colors are flipped from a typical stock-ticker convention because
  // we're a home builder: rates going DOWN is good news (more buyers
  // can qualify, sales pick up), rates going UP is bad news.
  const arrowClass =
    data.direction === "up"
      ? "text-red-400"
      : data.direction === "down"
        ? "text-emerald-400"
        : "text-fs-sand/60";

  return (
    <p
      className="px-4 pt-2 text-xs leading-tight text-fs-sand/70"
      title="Source: Mortgage News Daily, updated weekdays ~4pm ET"
    >
      MND 30Y Fixed: <span className="font-semibold text-fs-sand">{data.rate}%</span>{" "}
      <span className={arrowClass}>
        {arrow} {data.change}
      </span>{" "}
      today
    </p>
  );
}
