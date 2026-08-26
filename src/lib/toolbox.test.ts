import { describe, expect, it } from "vitest";
import {
  COMPANY_HITS_CAP,
  MY_MOST_USED_CAP,
  SMART_COMPANY_HITS,
  SMART_FAVORITES,
  SMART_MOST_USED,
  buildTagSets,
  coOccurringTags,
  filterByTags,
  restingTagList,
  searchApps,
  selectionHeading,
  slugifyTag,
  topAppsByOpens,
  type NavApp,
} from "./toolbox";

/** Terse fixture builder: app("a1", "map", "sales") */
function app(
  id: string,
  ...tagSlugs: string[]
): NavApp & { name: string; description: string } {
  return {
    id,
    name: `App ${id}`,
    description: `Description of ${id}`,
    tags: tagSlugs.map((s) => ({ name: s, displayName: s })),
  };
}

describe("slugifyTag", () => {
  it("lowercases, hyphenates, trims", () => {
    expect(slugifyTag("Customer Service ")).toBe("customer-service");
    expect(slugifyTag("  AP / AR!! ")).toBe("ap-ar");
    expect(slugifyTag("!!!")).toBe("");
  });
});

describe("filterByTags (AND semantics)", () => {
  const apps = [
    app("a", "map", "sales"),
    app("b", "map", "construction"),
    app("c", "sales"),
  ];
  const sets = buildTagSets(apps);

  it("empty selection returns everything", () => {
    expect(filterByTags(apps, [], sets)).toHaveLength(3);
  });

  it("single tag filters to members", () => {
    expect(filterByTags(apps, ["map"], sets).map((a) => a.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("multiple tags require ALL of them", () => {
    expect(filterByTags(apps, ["map", "sales"], sets).map((a) => a.id)).toEqual(
      ["a"],
    );
  });

  it("unknown tag key matches nothing (no silent widening)", () => {
    expect(filterByTags(apps, ["map", "nope"], sets)).toHaveLength(0);
  });

  it("smart tags combine with publisher tags", () => {
    const s = buildTagSets(apps, { companyHits: new Set(["b", "c"]) });
    expect(
      filterByTags(apps, [SMART_COMPANY_HITS, "map"], s).map((a) => a.id),
    ).toEqual(["b"]);
  });
});

describe("searchApps (tokenized, cross-field)", () => {
  const plat = {
    id: "plat",
    name: "Plat Studio",
    description: "Interactive lot mapping",
    tags: [
      { name: "sales", displayName: "Sales" },
      { name: "map", displayName: "Map" },
    ],
  };
  const flyer = {
    id: "flyer",
    name: "Flyer Builder",
    description: "Print-ready listing flyers",
    tags: [{ name: "marketing", displayName: "Marketing" }],
  };
  const apps = [plat, flyer];

  it("each word may hit a DIFFERENT field", () => {
    // "sales" only in tags, "map" in tags/description — no single field
    // contains "sales map".
    expect(searchApps(apps, "sales map").map((a) => a.id)).toEqual(["plat"]);
  });

  it("matches name and description substrings, case-insensitive", () => {
    expect(searchApps(apps, "FLY").map((a) => a.id)).toEqual(["flyer"]);
    expect(searchApps(apps, "listing flyers").map((a) => a.id)).toEqual([
      "flyer",
    ]);
  });

  it("a word matching nothing excludes the app", () => {
    expect(searchApps(apps, "plat zebra")).toHaveLength(0);
  });

  it("empty/whitespace query returns everything", () => {
    expect(searchApps(apps, "   ")).toHaveLength(2);
  });
});

describe("restingTagList (top-N by usage + coverage guarantee)", () => {
  it("ranks by real usage of member apps, not raw tag frequency", () => {
    const apps = [app("a", "rare"), app("b", "common"), app("c", "common")];
    const sets = buildTagSets(apps);
    // "rare" has 1 member with 100 opens; "common" has 2 members, 5 opens.
    const opens = new Map([
      ["a", 100],
      ["b", 3],
      ["c", 2],
    ]);
    const list = restingTagList(apps, sets, opens, 1);
    expect(list[0].key).toBe("rare");
  });

  it("falls back to tag frequency when analytics are empty", () => {
    const apps = [app("a", "solo"), app("b", "popular"), app("c", "popular")];
    const sets = buildTagSets(apps);
    const list = restingTagList(apps, sets, new Map(), 1);
    expect(list[0].key).toBe("popular");
  });

  it("greedily adds tags until every accessible app is reachable", () => {
    // Top-2 by usage will be big1/big2; apps x and y are only reachable via
    // "rescue" (covers both) and z only via "solo-z". Greedy should add
    // "rescue" first (rescues 2), then "solo-z".
    const apps = [
      app("a1", "big1"),
      app("a2", "big1"),
      app("b1", "big2"),
      app("b2", "big2"),
      app("x", "rescue"),
      app("y", "rescue"),
      app("z", "solo-z"),
    ];
    const sets = buildTagSets(apps);
    const opens = new Map([
      ["a1", 50],
      ["a2", 50],
      ["b1", 40],
      ["b2", 40],
      ["x", 1],
      ["y", 1],
      ["z", 1],
    ]);
    const list = restingTagList(apps, sets, opens, 2);
    const keys = list.map((t) => t.key);
    expect(keys.slice(0, 2)).toEqual(["big1", "big2"]);
    expect(keys).toContain("rescue");
    expect(keys).toContain("solo-z");
    // Coverage-added tags are marked, top-N are not.
    expect(list.find((t) => t.key === "big1")!.coverage).toBe(false);
    expect(list.find((t) => t.key === "rescue")!.coverage).toBe(true);
    // Greedy order: rescue (2 apps) before solo-z (1 app).
    expect(keys.indexOf("rescue")).toBeLessThan(keys.indexOf("solo-z"));
    // Every tagged app is now reachable.
    const reachable = new Set(keys.flatMap((k) => [...(sets.get(k) ?? [])]));
    for (const a of apps) expect(reachable.has(a.id)).toBe(true);
  });

  it("smart tags never count toward coverage", () => {
    const apps = [app("a", "t1"), app("b", "t2")];
    const sets = buildTagSets(apps, { companyHits: new Set(["a", "b"]) });
    const list = restingTagList(apps, sets, new Map(), 1);
    // Even though Company Hits covers both apps, publisher tags alone must
    // cover them — so both t1 and t2 surface.
    expect(list.map((t) => t.key).sort()).toEqual(["t1", "t2"]);
  });

  it("type tags never take top-N slots but can still rescue coverage", () => {
    // "tool" spans everything (heaviest usage); departments split the rest.
    const apps = [
      app("a", "tool", "sales"),
      app("b", "tool", "land"),
      app("c", "tool"), // only reachable via the type tag
    ];
    const sets = buildTagSets(apps);
    const opens = new Map([
      ["a", 90],
      ["b", 80],
      ["c", 70],
    ]);
    const list = restingTagList(apps, sets, opens, 2);
    // Top-2 are the departmental tags despite "tool" ranking first by usage…
    expect(list.slice(0, 2).map((t) => t.key)).toEqual(["sales", "land"]);
    // …and "tool" comes back only as a coverage add (app c needs it).
    const tool = list.find((t) => t.key === "tool");
    expect(tool?.coverage).toBe(true);
  });

  it("untagged apps don't loop coverage forever", () => {
    const apps = [app("a", "t1"), app("naked")];
    const sets = buildTagSets(apps);
    const list = restingTagList(apps, sets, new Map(), 5);
    expect(list.map((t) => t.key)).toEqual(["t1"]);
  });
});

describe("coOccurringTags (active-state reveal)", () => {
  const apps = [
    app("a", "map", "sales", "land"),
    app("b", "map", "construction"),
    app("c", "sales"),
  ];

  it("shows only tags carried by the current result set, ranked by count", () => {
    const sets = buildTagSets(apps);
    const results = filterByTags(apps, ["map"], sets); // a, b
    const co = coOccurringTags(results, sets, ["map"]);
    const keys = co.map((r) => r.key);
    expect(keys).toContain("sales"); // via a
    expect(keys).toContain("construction"); // via b
    expect(keys).toContain("land"); // via a
    expect(keys).not.toContain("map"); // selected → pinned, not repeated
    expect(co.find((r) => r.key === "sales")!.count).toBe(1);
  });

  it("never returns a tag that would produce zero results", () => {
    const sets = buildTagSets(apps);
    const results = filterByTags(apps, ["construction"], sets); // b only
    const keys = coOccurringTags(results, sets, ["construction"]).map(
      (r) => r.key,
    );
    expect(keys).toEqual(["map"]); // sales/land co-occur with nothing here
  });

  it("smart tags follow the same rule", () => {
    const sets = buildTagSets(apps, { companyHits: new Set(["c"]) });
    // Filtering by map → {a, b}; Company Hits = {c} → no intersection.
    const resultsMap = filterByTags(apps, ["map"], sets);
    expect(
      coOccurringTags(resultsMap, sets, ["map"]).map((r) => r.key),
    ).not.toContain(SMART_COMPANY_HITS);
    // Filtering by sales → {a, c}; intersection with hits = {c} → shown.
    const resultsSales = filterByTags(apps, ["sales"], sets);
    expect(
      coOccurringTags(resultsSales, sets, ["sales"]).map((r) => r.key),
    ).toContain(SMART_COMPANY_HITS);
  });
});

describe("smart tag computation", () => {
  it("topAppsByOpens ranks by count and honors the cap", () => {
    const opens = new Map([
      ["a", 5],
      ["b", 9],
      ["c", 1],
      ["d", 0], // zero-open apps never qualify
    ]);
    expect(topAppsByOpens(opens, 2)).toEqual(["b", "a"]);
    expect(topAppsByOpens(opens, 10)).toEqual(["b", "a", "c"]);
  });

  it("personal cap and company cap are distinct constants", () => {
    expect(MY_MOST_USED_CAP).toBe(8);
    expect(COMPANY_HITS_CAP).toBe(10);
  });

  it("Company Hits never leaks apps the user cannot access", () => {
    // Org-wide hits include "hidden", but the accessible app list doesn't.
    const accessible = [app("a", "t"), app("b", "t")];
    const sets = buildTagSets(accessible, {
      companyHits: new Set(["hidden", "a"]),
    });
    expect([...sets.get(SMART_COMPANY_HITS)!]).toEqual(["a"]);
  });

  it("empty smart sets are omitted so the sidebar hides them", () => {
    const apps = [app("a", "t")];
    const sets = buildTagSets(apps, {
      favorites: new Set(),
      mostUsed: new Set(["gone-app"]), // usage history for a lost app
    });
    expect(sets.has(SMART_FAVORITES)).toBe(false);
    expect(sets.has(SMART_MOST_USED)).toBe(false);
  });
});

describe("access-scoped counts", () => {
  // The same portal, two users with different department access. Everything
  // downstream (buildTagSets) receives each user's OWN accessible list, so
  // counts differ per user by construction.
  const allApps = [
    app("sales-1", "sales"),
    app("sales-2", "sales"),
    app("land-1", "land", "sales"),
  ];
  const userA = allApps; // sees everything
  const userB = allApps.filter((a) => a.id !== "land-1"); // no land access

  it("user A and user B see different tag counts", () => {
    const setsA = buildTagSets(userA);
    const setsB = buildTagSets(userB);
    expect(setsA.get("sales")!.size).toBe(3);
    expect(setsB.get("sales")!.size).toBe(2);
    expect(setsA.get("land")!.size).toBe(1);
    expect(setsB.has("land")).toBe(false); // tag disappears entirely
  });
});

describe("selectionHeading", () => {
  it("joins display names with a middle dot", () => {
    const label = (k: string) =>
      k === SMART_COMPANY_HITS ? "Company Hits" : "Construction";
    expect(selectionHeading([SMART_COMPANY_HITS, "construction"], label)).toBe(
      "Company Hits · Construction",
    );
  });
});
