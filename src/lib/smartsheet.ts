/**
 * Smartsheet API client for fetching plan data.
 * Uses the Smartsheet REST API with a bearer token.
 */

const SMARTSHEET_API_BASE = "https://api.smartsheet.com/2.0";
const PLAN_SHEET_ID = process.env.SMARTSHEET_PLAN_SHEET_ID || "6500181601111940";

export interface SmartsheetCell {
  columnId: number;
  value: string | number | boolean | null;
  displayValue?: string;
}

export interface SmartsheetRow {
  id: number;
  cells: SmartsheetCell[];
}

export interface SmartsheetColumn {
  id: number;
  title: string;
  type: string;
  index: number;
}

export interface SmartsheetSheet {
  id: number;
  name: string;
  columns: SmartsheetColumn[];
  rows: SmartsheetRow[];
}

export interface PlanData {
  planName: string;
  planStatus: string;
  planLink: string;
  communityName: string[];
  buildingType: string[];
  planFeatures: string[];
  baseWidth: number | null;
  baseDepth: number | null;
  bedroomCount: number | null;
  bathCount: number | null;
  appraiserLevel1: number | null;
  appraiserLevel2: number | null;
  appraiserTotalFinished: number | null;
  appraiserBasement: number | null;
  appraiserTotalSqFt: number | null;
  appraiserOpenToBelow: number | null;
  appraiserAduOpt: number | null;
  constructionLevel1: number | null;
  constructionLevel2: number | null;
  constructionLevel3: number | null;
  constructionTotal: number | null;
  constructionBasement: number | null;
  // Derived fields
  storyType: string;
  foundationType: string;
  hasAdu: boolean;
  hasMainMaster: boolean;
}

// Column name -> PlanData field mapping
const COLUMN_MAP: Record<string, keyof PlanData> = {
  "Plan Name": "planName",
  "Plan Status": "planStatus",
  "Plan Link": "planLink",
  "Community Name": "communityName",
  "Bldg. Type": "buildingType",
  "Plan Features": "planFeatures",
  "Base Width": "baseWidth",
  "Base Depth": "baseDepth",
  "Bedroom Count": "bedroomCount",
  "Bath Count": "bathCount",
  "Appraiser Level 1": "appraiserLevel1",
  "Appraiser Level 2": "appraiserLevel2",
  "Appraiser Total Finished (Level 1 + Level 2)": "appraiserTotalFinished",
  "Appraiser Basement": "appraiserBasement",
  "Appraiser Total Sq Ft": "appraiserTotalSqFt",
  "Appraiser Open to Below": "appraiserOpenToBelow",
  "Appraiser ADU Opt.": "appraiserAduOpt",
  "Construction Level 1 SQ. FT.": "constructionLevel1",
  "Construction Level 2 SQ. FT.": "constructionLevel2",
  "Construction Level 3 SQ. FT.": "constructionLevel3",
  "Construction Total SQ. FT.": "constructionTotal",
  "Construction Basement SQ. FT.": "constructionBasement",
};

function parseNumber(val: string | number | boolean | null): number | null {
  if (val === null || val === undefined || val === "") return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function parseMultiValue(val: string | number | boolean | null): string[] {
  if (!val || val === "") return [];
  return String(val)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Fetches all plan data from Smartsheet.
 * Caches in memory for 5 minutes to avoid excessive API calls.
 */
let cachedPlans: PlanData[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchPlansFromSmartsheet(): Promise<PlanData[]> {
  const now = Date.now();
  if (cachedPlans && now - cacheTimestamp < CACHE_TTL) {
    return cachedPlans;
  }

  const token = process.env.SMARTSHEET_API_TOKEN;
  if (!token) {
    throw new Error("SMARTSHEET_API_TOKEN environment variable is not set");
  }

  const response = await fetch(
    `${SMARTSHEET_API_BASE}/sheets/${PLAN_SHEET_ID}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // Don't cache at the fetch level — we manage our own cache
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Smartsheet API error ${response.status}: ${text}`);
  }

  const sheet: SmartsheetSheet = await response.json();

  // Build column ID → title map
  const colMap = new Map<number, string>();
  for (const col of sheet.columns) {
    colMap.set(col.id, col.title);
  }

  // Parse rows into PlanData
  const plans: PlanData[] = [];

  for (const row of sheet.rows) {
    const raw: Record<string, string | number | boolean | null> = {};
    for (const cell of row.cells) {
      const colTitle = colMap.get(cell.columnId);
      if (colTitle) {
        // Prefer displayValue for formula columns, fall back to value
        raw[colTitle] = cell.displayValue ?? cell.value;
      }
    }

    const planName = String(raw["Plan Name"] || "").trim();
    if (!planName) continue;

    const features = parseMultiValue(raw["Plan Features"]);
    const level2 = parseNumber(raw["Appraiser Level 2"]);

    const plan: PlanData = {
      planName,
      planStatus: String(raw["Plan Status"] || ""),
      planLink: String(raw["Plan Link"] || ""),
      communityName: parseMultiValue(raw["Community Name"]),
      buildingType: parseMultiValue(raw["Bldg. Type"]),
      planFeatures: features,
      baseWidth: parseNumber(raw["Base Width"]),
      baseDepth: parseNumber(raw["Base Depth"]),
      bedroomCount: parseNumber(raw["Bedroom Count"]),
      bathCount: parseNumber(raw["Bath Count"]),
      appraiserLevel1: parseNumber(raw["Appraiser Level 1"]),
      appraiserLevel2: level2,
      appraiserTotalFinished: parseNumber(
        raw["Appraiser Total Finished (Level 1 + Level 2)"]
      ),
      appraiserBasement: parseNumber(raw["Appraiser Basement"]),
      appraiserTotalSqFt: parseNumber(raw["Appraiser Total Sq Ft"]),
      appraiserOpenToBelow: parseNumber(raw["Appraiser Open to Below"]),
      appraiserAduOpt: parseNumber(raw["Appraiser ADU Opt."]),
      constructionLevel1: parseNumber(raw["Construction Level 1 SQ. FT."]),
      constructionLevel2: parseNumber(raw["Construction Level 2 SQ. FT."]),
      constructionLevel3: parseNumber(raw["Construction Level 3 SQ. FT."]),
      constructionTotal: parseNumber(raw["Construction Total SQ. FT."]),
      constructionBasement: parseNumber(raw["Construction Basement SQ. FT."]),
      // Derived
      storyType: level2 && level2 > 0 ? "2 Story" : "Rambler",
      foundationType: features.includes("Slab on Grade")
        ? "Slab on Grade"
        : features.includes("Crawlspace")
          ? "Crawlspace"
          : "Basement",
      hasAdu: features.includes("ADU"),
      hasMainMaster: features.includes("Main Floor Master Bedroom"),
    };

    plans.push(plan);
  }

  cachedPlans = plans;
  cacheTimestamp = now;
  return plans;
}

/** Force-clear the cache (e.g., after admin refresh) */
export function clearPlanCache() {
  cachedPlans = null;
  cacheTimestamp = 0;
}
