/**
 * Canonical list of company links shown on the /links page.
 *
 * Extracted into a shared module so other surfaces can reuse it — notably the
 * /api/track-open route, which validates a clicked link against this list
 * before recording it (so a user can't inject arbitrary entries into their own
 * "recently opened" history), and looks up its display name/icon from here.
 */
export interface CompanyLink {
  name: string;
  description: string;
  url: string;
  icon: string;
  category: string;
}

export const companyLinks: CompanyLink[] = [
  {
    name: "Outlook",
    description: "Email and calendar",
    url: "https://outlook.office.com/mail/",
    icon: "📧",
    category: "Communication",
  },
  {
    name: "SharePoint",
    description: "Company documents and intranet",
    url: "https://fieldstonehomes.sharepoint.com/SitePages/Home.aspx",
    icon: "📁",
    category: "Communication",
  },
  {
    name: "HubSpot",
    description: "CRM and marketing dashboard",
    url: "https://app-na2.hubspot.com/reports-dashboard/21077855/view/138909404",
    icon: "🧲",
    category: "Sales & Marketing",
  },
  {
    name: "Pipeline",
    description: "Construction project management",
    url: "https://ps.pipelinebt.app",
    icon: "🏗️",
    category: "Sales & Marketing",
  },
  {
    name: "Builder Portal",
    description: "Builder management portal",
    url: "https://fieldstone.builderportal.net/Login",
    icon: "🏠",
    category: "Sales & Marketing",
  },
  {
    name: "ThinkLodge",
    description: "Sales enablement platform",
    url: "https://thinklodge.app",
    icon: "💡",
    category: "Sales & Marketing",
  },
  {
    name: "Novi Home",
    description: "Home builder sales platform",
    // ?redirectUrl=… is Novi's "after login, jump to dashboard" param.
    // We deliberately don't include an applicationToken because those
    // are per-user session credentials that expire and can't be shared.
    url: "https://login.novihome.com/?redirectUrl=https%3A%2F%2Fdashboard.novihome.com%2F",
    icon: "🏘️",
    category: "Sales & Marketing",
  },
  {
    name: "Domo",
    description: "Business intelligence and data analytics",
    url: "https://fieldstonehomes.domo.com/home",
    icon: "📊",
    category: "Data & Analytics",
  },
  {
    name: "Smartsheet",
    description: "Project tracking and collaboration",
    url: "https://app.smartsheet.com/login",
    icon: "📋",
    category: "Operations",
  },
  {
    name: "Continia",
    description: "Purchase order approvals",
    url: "http://vpn.fieldstonehomes.com:8085/live-fsh/purchase/approval",
    icon: "✅",
    category: "Operations",
  },
  {
    name: "Paylocity",
    description: "Payroll and HR",
    url: "https://access.paylocity.com",
    icon: "💰",
    category: "Operations",
  },
  {
    name: "Empower",
    description: "Retirement and 401(k) account",
    url: "https://participant.empower-retirement.com/participant/#/login?accu=Empower",
    icon: "🏦",
    category: "Benefits & HR",
  },
  {
    name: "Navigator",
    description: "Open Enrollment and benefits",
    url: "https://www.employeenavigator.com/",
    icon: "📝",
    category: "Benefits & HR",
  },
  {
    name: "SelectHealth",
    description: "Health insurance",
    url: "https://selecthealth.org/",
    icon: "🏥",
    category: "Benefits & HR",
  },
  {
    name: "SunLife",
    description: "Dental insurance",
    url: "https://account.sunlifeconnect.com/commonlogin/#/login/10",
    icon: "🦷",
    category: "Benefits & HR",
  },
  {
    name: "MetLife",
    description: "Vision insurance",
    url: "https://www.metlife.com/",
    icon: "👓",
    category: "Benefits & HR",
  },
];

/** Look up a company link by its exact URL (used to validate tracked clicks). */
export function findCompanyLink(url: string): CompanyLink | undefined {
  return companyLinks.find((l) => l.url === url);
}
