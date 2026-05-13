// ============================================================
// Dashboard Data — Real data from Domo queries (May 2026)
// Items marked with isSample: true are mock/sample data
// ============================================================

export interface MonthlyMetric {
  month: string;
  plan: number;
  actual: number;
  isSample?: boolean;
}

export interface CommunityData {
  name: string;
  region: string;
  totalUnits: number;
  projectedSales: number;
  actualSales: number;
  certified: number;
  spec: number;
  model: number;
  available: number;
  sold: number;
  avgBasePrice: number;
  avgOptionPrice: number;
  traffic2026: number;
  cycleTimeGoal: number | null;
  type: string;
  isSample?: boolean;
}

export interface AgentData {
  name: string;
  communities: { name: string; sales: number }[];
  totalSales: number;
  avgResponseTime?: string;
  taskCompletion?: number;
  leadsAssigned?: number;
  tourConversion?: number;
  isSampleExtras?: boolean;
}

export interface MarketingMonthly {
  month: string;
  planSpend: number;
  actualSpend: number;
  isSample?: boolean;
}

// Real data from Domo
export const salesVsPlan: MonthlyMetric[] = [
  { month: "Jan", plan: 14, actual: 13 },
  { month: "Feb", plan: 20, actual: 14 },
  { month: "Mar", plan: 22, actual: 16 },
  { month: "Apr", plan: 21, actual: 9 },
  { month: "May", plan: 20, actual: 3 },
  { month: "Jun", plan: 18, actual: 0, isSample: false },
  { month: "Jul", plan: 13, actual: 0, isSample: false },
  { month: "Aug", plan: 14, actual: 0, isSample: false },
  { month: "Sep", plan: 17, actual: 0, isSample: false },
  { month: "Oct", plan: 14, actual: 0, isSample: false },
  { month: "Nov", plan: 10, actual: 0, isSample: false },
  { month: "Dec", plan: 8, actual: 0, isSample: false },
];

export const closingsVsPlan: MonthlyMetric[] = [
  { month: "Jan", plan: 5, actual: 1 },
  { month: "Feb", plan: 11, actual: 16 },
  { month: "Mar", plan: 16, actual: 19 },
  { month: "Apr", plan: 16, actual: 11 },
  { month: "May", plan: 15, actual: 4 },
  { month: "Jun", plan: 22, actual: 0 },
  { month: "Jul", plan: 16, actual: 0 },
  { month: "Aug", plan: 14, actual: 0 },
  { month: "Sep", plan: 19, actual: 0 },
  { month: "Oct", plan: 21, actual: 0 },
  { month: "Nov", plan: 17, actual: 0 },
  { month: "Dec", plan: 17, actual: 0 },
];

export const startsVsPlan: MonthlyMetric[] = [
  { month: "Jan", plan: 11, actual: 10, isSample: false },
  { month: "Feb", plan: 17, actual: 11, isSample: false },
  { month: "Mar", plan: 14, actual: 12, isSample: false },
  { month: "Apr", plan: 18, actual: 13, isSample: false },
  { month: "May", plan: 17, actual: 3, isSample: false },
  { month: "Jun", plan: 18, actual: 0 },
  { month: "Jul", plan: 15, actual: 0 },
  { month: "Aug", plan: 14, actual: 0 },
  { month: "Sep", plan: 12, actual: 0 },
  { month: "Oct", plan: 11, actual: 0 },
  { month: "Nov", plan: 9, actual: 0 },
  { month: "Dec", plan: 9, actual: 0 },
];

export const trafficByMonth: { month: string; count: number }[] = [
  { month: "Jan", count: 245 },
  { month: "Feb", count: 316 },
  { month: "Mar", count: 333 },
  { month: "Apr", count: 251 },
  { month: "May", count: 88 },
];

export const cancellationsByMonth: { month: string; count: number }[] = [
  { month: "Jan", count: 0 },
  { month: "Feb", count: 0 },
  { month: "Mar", count: 1 },
  { month: "Apr", count: 2 },
  { month: "May", count: 0 },
];

export const communities: CommunityData[] = [
  { name: "Antelope Meadows", region: "North", totalUnits: 164, projectedSales: 34, actualSales: 7, certified: 9, spec: 10, model: 2, available: 1, sold: 1, avgBasePrice: 609186, avgOptionPrice: 158693, traffic2026: 135, cycleTimeGoal: 95, type: "Single Family Detached" },
  { name: "Canyon Point", region: "South", totalUnits: 113, projectedSales: 17, actualSales: 8, certified: 7, spec: 8, model: 2, available: 0, sold: 0, avgBasePrice: 878025, avgOptionPrice: 244061, traffic2026: 104, cycleTimeGoal: 110, type: "Luxury" },
  { name: "Cedar Grove", region: "South", totalUnits: 55, projectedSales: 19, actualSales: 10, certified: 5, spec: 9, model: 1, available: 0, sold: 0, avgBasePrice: 464344, avgOptionPrice: 42256, traffic2026: 83, cycleTimeGoal: 95, type: "Single Family Detached" },
  { name: "Crossings Front Load", region: "South", totalUnits: 29, projectedSales: 17, actualSales: 2, certified: 2, spec: 9, model: 1, available: 0, sold: 0, avgBasePrice: 999900, avgOptionPrice: 198273, traffic2026: 131, cycleTimeGoal: 110, type: "Luxury" },
  { name: "Crossings Rear Load", region: "South", totalUnits: 28, projectedSales: 21, actualSales: 0, certified: 0, spec: 7, model: 0, available: 1, sold: 0, avgBasePrice: 0, avgOptionPrice: 0, traffic2026: 0, cycleTimeGoal: 110, type: "Luxury" },
  { name: "Holladay 9", region: "North", totalUnits: 7, projectedSales: 3, actualSales: 2, certified: 2, spec: 1, model: 0, available: 0, sold: 0, avgBasePrice: 1500000, avgOptionPrice: 410859, traffic2026: 0, cycleTimeGoal: 140, type: "Custom" },
  { name: "Prominence", region: "South", totalUnits: 12, projectedSales: 7, actualSales: 8, certified: 0, spec: 0, model: 0, available: 0, sold: 0, avgBasePrice: 408471, avgOptionPrice: 9092, traffic2026: 19, cycleTimeGoal: 95, type: "Single Family Detached" },
  { name: "Riverside Estates", region: "North", totalUnits: 49, projectedSales: 28, actualSales: 8, certified: 6, spec: 8, model: 1, available: 1, sold: 1, avgBasePrice: 653471, avgOptionPrice: 136255, traffic2026: 284, cycleTimeGoal: 95, type: "Single Family Detached" },
  { name: "Rosalia Ridge", region: "South", totalUnits: 46, projectedSales: 21, actualSales: 4, certified: 2, spec: 5, model: 1, available: 3, sold: 1, avgBasePrice: 583650, avgOptionPrice: 93895, traffic2026: 159, cycleTimeGoal: 105, type: "Southern Region" },
  { name: "Willow Estates", region: "South", totalUnits: 55, projectedSales: 23, actualSales: 9, certified: 10, spec: 7, model: 1, available: 4, sold: 2, avgBasePrice: 830456, avgOptionPrice: 291771, traffic2026: 318, cycleTimeGoal: 110, type: "Luxury" },
  { name: "Hafen Estates", region: "South", totalUnits: 35, projectedSales: 0, actualSales: 0, certified: 0, spec: 4, model: 1, available: 0, sold: 0, avgBasePrice: 0, avgOptionPrice: 0, traffic2026: 0, cycleTimeGoal: null, type: "Luxury" },
  { name: "Teton Reserve", region: "South", totalUnits: 44, projectedSales: 0, actualSales: 0, certified: 0, spec: 0, model: 0, available: 0, sold: 0, avgBasePrice: 0, avgOptionPrice: 0, traffic2026: 0, cycleTimeGoal: null, type: "Single Family Detached" },
];

export const agents: AgentData[] = [
  { name: "TJ Buckley", communities: [{ name: "Willow Estates", sales: 9 }], totalSales: 9, avgResponseTime: "1.2 hrs", taskCompletion: 94, leadsAssigned: 47, tourConversion: 38, isSampleExtras: true },
  { name: "Travis Schloderer", communities: [{ name: "Cedar Grove", sales: 9 }], totalSales: 9, avgResponseTime: "0.8 hrs", taskCompletion: 97, leadsAssigned: 52, tourConversion: 42, isSampleExtras: true },
  { name: "Joshua Lee", communities: [{ name: "Canyon Point", sales: 8 }], totalSales: 8, avgResponseTime: "1.5 hrs", taskCompletion: 91, leadsAssigned: 38, tourConversion: 34, isSampleExtras: true },
  { name: "Nicholas Strong", communities: [{ name: "Antelope Meadows", sales: 2 }, { name: "Prominence", sales: 7 }], totalSales: 9, avgResponseTime: "1.1 hrs", taskCompletion: 88, leadsAssigned: 55, tourConversion: 31, isSampleExtras: true },
  { name: "Melody Klein", communities: [{ name: "Riverside Estates", sales: 6 }, { name: "Prominence", sales: 1 }], totalSales: 7, avgResponseTime: "2.1 hrs", taskCompletion: 82, leadsAssigned: 41, tourConversion: 29, isSampleExtras: true },
  { name: "Rachel Housekeeper", communities: [{ name: "Antelope Meadows", sales: 5 }], totalSales: 5, avgResponseTime: "0.9 hrs", taskCompletion: 96, leadsAssigned: 33, tourConversion: 36, isSampleExtras: true },
  { name: "Quynh Wall", communities: [{ name: "Rosalia Ridge", sales: 4 }], totalSales: 4, avgResponseTime: "1.8 hrs", taskCompletion: 85, leadsAssigned: 28, tourConversion: 25, isSampleExtras: true },
  { name: "Brianne Benson", communities: [{ name: "Cedar Grove", sales: 1 }, { name: "Crossings Front Load", sales: 2 }], totalSales: 3, avgResponseTime: "1.4 hrs", taskCompletion: 90, leadsAssigned: 22, tourConversion: 32, isSampleExtras: true },
  { name: "Jeff Lee", communities: [{ name: "Riverside Estates", sales: 1 }], totalSales: 1, avgResponseTime: "3.2 hrs", taskCompletion: 78, leadsAssigned: 15, tourConversion: 20, isSampleExtras: true },
];

// Marketing spend - real data from Domo (Jan Update 2026-Budget for plan, NAV Actuals for actual)
export const marketingSpend: MarketingMonthly[] = [
  { month: "Jan", planSpend: 462008, actualSpend: 142301 },
  { month: "Feb", planSpend: 916854, actualSpend: 653092 },
  { month: "Mar", planSpend: 1052640, actualSpend: 682942 },
  { month: "Apr", planSpend: 1234444, actualSpend: 471945 },
  { month: "May", planSpend: 1293118, actualSpend: 0 },
  { month: "Jun", planSpend: 1013594, actualSpend: 0 },
  { month: "Jul", planSpend: 1501320, actualSpend: 0 },
  { month: "Aug", planSpend: 1273886, actualSpend: 0 },
  { month: "Sep", planSpend: 1619206, actualSpend: 0 },
  { month: "Oct", planSpend: 1945390, actualSpend: 0 },
  { month: "Nov", planSpend: 1579650, actualSpend: 0 },
  { month: "Dec", planSpend: 1378700, actualSpend: 0 },
];

// Sample marketing channel data (from HubSpot — not yet connected)
export const marketingChannels = [
  { channel: "Google Ads", leads: 187, tours: 42, sales: 12, spend: 85400, isSample: true },
  { channel: "Facebook Ads", leads: 156, tours: 31, sales: 8, spend: 62300, isSample: true },
  { channel: "KSL.com", leads: 98, tours: 28, sales: 9, spend: 34500, isSample: true },
  { channel: "Organic/SEO", leads: 234, tours: 51, sales: 14, spend: 0, isSample: true },
  { channel: "Referrals", leads: 67, tours: 22, sales: 7, spend: 0, isSample: true },
  { channel: "Walk-ins", leads: 89, tours: 89, sales: 5, spend: 0, isSample: true },
  { channel: "Digital Signage", leads: 45, tours: 15, sales: 3, spend: 12800, isSample: true },
];

// WIP/Pipeline data — real from lot status query
export const wipSummary = {
  certified: 43,
  spec: 73,
  model: 10,
  available: 10,
  dirtSale: 8,
  sold: 5,
  closed2026: 51,
};

// QTD Revenue by community — sample (closings revenue not in queried columns)
export const qtdRevenue = [
  { community: "Antelope Meadows", budgetTotal: 4089472, actualsTotal: 4867335, variance: 777863, isSample: true },
  { community: "Canyon Point", budgetTotal: 6502784, actualsTotal: 9775856, variance: 3273072, isSample: true },
  { community: "Cedar Grove", budgetTotal: 4726472, actualsTotal: 1735000, variance: -2991472, isSample: true },
  { community: "Holladay 9", budgetTotal: 1705556, actualsTotal: 0, variance: -1705556, isSample: true },
  { community: "Prominence", budgetTotal: 2569299, actualsTotal: 2139700, variance: -429599, isSample: true },
  { community: "Riverside Estates", budgetTotal: 2907646, actualsTotal: 3544695, variance: 637049, isSample: true },
  { community: "Rosalia Ridge", budgetTotal: 2131298, actualsTotal: 1378405, variance: -752893, isSample: true },
  { community: "The Crossings", budgetTotal: 5883007, actualsTotal: 4879880, variance: -1003127, isSample: true },
  { community: "Willow Estates", budgetTotal: 4000900, actualsTotal: 9248099, variance: 5247199, isSample: true },
];

// KPI headline numbers
export const kpiSummary = {
  ytdCertifiedSales: 55,
  ytdPlanSales: 97,
  ytdClosings: 51,
  ytdPlanClosings: 63,
  ytdStarts: 49,
  ytdPlanStarts: 71,
  ytdTraffic: 1233,
  ytdCancellations: 3,
  cancellationRate: 5.5,
  preferredLenderPct: 68,
  preferredLenderTrend: 23,
  realtorCoopPct: 76,
  realtorCoopTrend: 15,
  avgConcessions: 53500,
  concessionsTrend: -31,
  preferredLenderIsSample: true,
  realtorCoopIsSample: true,
  avgConcessionsIsSample: true,
  lotsInWip: 149,
  qmiPercentage: 50,
};
