// Live 30-year fixed mortgage rate, scraped from Mortgage News Daily.
//
// MND publishes their rate index in static HTML, updated weekdays ~4pm ET.
// They have no public API; the official paths are a paid widget/feed product.
// For internal employee-portal use we parse the page directly. The fetch
// uses Next's persistent cache with a 15-minute revalidate so MND only
// sees ~96 requests/day from us regardless of portal traffic.
//
// If anything goes wrong (network, layout change, parse failure) we return
// null and the consuming component renders nothing — the sidebar must never
// break because of an upstream change.

export interface MortgageRate {
  rate: string; // e.g. "6.59"
  change: string; // absolute value as string, e.g. "0.02"
  direction: "up" | "down" | "unch";
}

const MND_URL = "https://www.mortgagenewsdaily.com/mortgage-rates";

export async function getMortgageRate(): Promise<MortgageRate | null> {
  try {
    const res = await fetch(MND_URL, {
      // 15-minute server-side cache. Tagged so we could revalidateTag()
      // on demand from an admin action later if we want a manual refresh.
      next: { revalidate: 900, tags: ["mortgage-rate"] },
      headers: {
        // MND serves a different (often empty) body to default fetch UAs.
        "User-Agent":
          "Mozilla/5.0 (compatible; CornerstonePortal/1.0; +https://cornerstone.fieldstonehomes.com)",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Find the first occurrence of the 30 Yr. Fixed block. MND repeats the
    // product several times on the page (mobile + desktop layouts); the first
    // hit is the canonical featured card.
    const anchor = html.indexOf("30 Yr. Fixed");
    if (anchor < 0) return null;
    const slice = html.slice(anchor, anchor + 2000);

    const rateMatch = slice.match(/class="rate">\s*([\d.]+)%/);
    const changeMatch = slice.match(
      /class="rate-daily-chg change (rate-up|rate-down|rate-unch)">\s*([+-]?[\d.]+)/,
    );
    if (!rateMatch || !changeMatch) return null;

    const direction =
      changeMatch[1] === "rate-up"
        ? "up"
        : changeMatch[1] === "rate-down"
          ? "down"
          : "unch";

    // Strip sign — direction conveys it.
    const change = changeMatch[2].replace(/^[+-]/, "");

    return { rate: rateMatch[1], change, direction };
  } catch {
    return null;
  }
}
