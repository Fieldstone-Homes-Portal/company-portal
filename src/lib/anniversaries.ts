/**
 * Work anniversaries for the company calendar.
 *
 * Sourced from the Fieldstone Brain's "Work Anniversaries & Tenure" reference,
 * itself digested from the full All Staff email history. Hire dates are
 * **month-level approximate** (e.g. "~Jul 2021") — good for an "anniversaries
 * this month" view, not an exact day. Exact dates would require Paylocity.
 *
 * This is a point-in-time snapshot (June 2026); refresh it from the Brain /
 * All Staff history as the roster changes. Departed/retired people are omitted.
 * A few long-tenured folks (e.g. Brett Woodland ~2006) are omitted until a
 * hire month is confirmed.
 */

export interface AnniversaryPerson {
  name: string;
  role: string;
  month: number; // 1-12, approximate
  year: number; // hire year, approximate
}

export const ANNIVERSARIES: AnniversaryPerson[] = [
  { name: "Lynne Merendino", role: "Senior A/P Specialist", month: 1, year: 2014 },
  { name: "Daniel Smith", role: "Senior Staff Accountant", month: 1, year: 2025 },
  { name: "Mike Shaw", role: "Field Construction Manager", month: 1, year: 2026 },
  { name: "Laurie Rentmeister", role: "Regional Operations Manager", month: 2, year: 2016 },
  { name: "Dylan Christopher", role: "Regional Construction Manager", month: 2, year: 2024 },
  { name: "Rachelle Coburn", role: "Operations Systems Administrator", month: 2, year: 2024 },
  { name: "Erik Jensen", role: "Land & Finance Analyst", month: 3, year: 2015 },
  { name: "Brooke Carrig", role: "Design Manager", month: 3, year: 2018 },
  { name: "Mitchell Lindeman", role: "Field Construction Manager", month: 3, year: 2024 },
  { name: "Rodger Larsen", role: "Customer Service Rep", month: 3, year: 2025 },
  { name: "Skyler Brown", role: "IT & Data Analyst", month: 3, year: 2026 },
  { name: "Elizabeth Samaniego", role: "Purchasing Supervisor", month: 4, year: 2021 },
  { name: "Amy Kreitzer", role: "Operations Systems Manager", month: 4, year: 2002 },
  { name: "Kelsey Mauch", role: "Marketing Coordinator", month: 4, year: 2024 },
  { name: "Ryan Llewelyn", role: "Customer Service Rep", month: 4, year: 2026 },
  { name: "Hallie Dufour", role: "Interior Designer", month: 4, year: 2026 },
  { name: "Phillip Van Otten", role: "Mgr Strategic Pricing & Analytics", month: 5, year: 2026 },
  { name: "Tonya Lee", role: "Customer Service Coordinator", month: 5, year: 2026 },
  { name: "Justin Hamilton", role: "Land Acquisition Manager", month: 6, year: 2022 },
  { name: "Joseph Spencer", role: "Field Construction Manager", month: 6, year: 2023 },
  { name: "Jared Payne", role: "Land Acquisition (MRED)", month: 6, year: 2024 },
  { name: "Charity Worthington", role: "Production Supervisor", month: 7, year: 2021 },
  { name: "Kammy McLachlan", role: "Controller", month: 7, year: 2022 },
  { name: "Camberleigh Harris", role: "Construction Project Supervisor", month: 7, year: 2024 },
  { name: "Joshua Walton", role: "FP&A Manager", month: 7, year: 2024 },
  { name: "Colton Howard", role: "Field Construction Manager", month: 8, year: 2020 },
  { name: "Randy Smith", role: "VP Planning & Entitlement", month: 9, year: 2018 },
  { name: "George Taylor", role: "Fieldstone Service Rep", month: 10, year: 2020 },
  { name: "Hannah Welch", role: "Interior Designer", month: 10, year: 2023 },
  { name: "Jason Tischner", role: "Regional Construction Manager", month: 10, year: 2024 },
  { name: "Elsa Jahanbin", role: "Architecture Dept Supervisor", month: 11, year: 2016 },
  { name: "Mindy Dansie", role: "Land Operation Specialist", month: 12, year: 2020 },
];

export interface AnniversaryMilestone {
  name: string;
  role: string;
  years: number;
}

/** People with a work anniversary in `month` (1-12), as of calendar year `inYear`. */
export function anniversariesForMonth(month: number, inYear: number): AnniversaryMilestone[] {
  return ANNIVERSARIES.filter((a) => a.month === month)
    .map((a) => ({ name: a.name, role: a.role, years: inYear - a.year }))
    .filter((a) => a.years >= 1)
    .sort((a, b) => b.years - a.years);
}
