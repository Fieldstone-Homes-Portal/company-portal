// Tiny live 30Y mortgage rate readout for the sidebar footer.
// Async server component — runs on the server, uses Next's fetch cache.
// Renders nothing on fetch/parse failure so the sidebar can't break.

import { getMortgageRate } from "@/lib/mortgageRate";

export default async function MortgageRateTag() {
  const data = await getMortgageRate();
  if (!data) return null;

  const arrow =
    data.direction === "up" ? "▲" : data.direction === "down" ? "▼" : "–";
  const arrowClass =
    data.direction === "up"
      ? "text-emerald-400"
      : data.direction === "down"
        ? "text-red-400"
        : "text-fs-sand/60";

  return (
    <p
      className="px-4 pt-2 text-[10px] leading-tight text-fs-sand/60"
      title="Source: Mortgage News Daily, updated weekdays ~4pm ET"
    >
      MND 30Y Fixed: <span className="text-fs-sand/90">{data.rate}%</span>{" "}
      <span className={arrowClass}>
        {arrow} {data.change}
      </span>{" "}
      today
    </p>
  );
}
