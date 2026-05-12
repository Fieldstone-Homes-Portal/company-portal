import PageHeader from "@/components/PageHeader";
import RefreshButton from "./RefreshButton";

export default function PlansAdminPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        label="Administration"
        title="Plan App Settings"
        subtitle="Manage data source and configuration for the Plans app"
      />

      <div className="space-y-6">
        {/* Data Source Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fs-copper">
            Data Source
          </h2>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-fs-espresso">
                Smartsheet &mdash; FSH Master Floor Plans V3
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-fs-sage">Connected</span>
              </div>
            </div>
            <RefreshButton />
          </div>
        </div>

        {/* Environment Variables Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-fs-copper">
            Required Environment Variables
          </h2>
          <div className="space-y-3">
            <EnvVarRow
              name="SMARTSHEET_API_TOKEN"
              description="API token for reading plan data from Smartsheet"
            />
            <EnvVarRow
              name="ANTHROPIC_API_KEY"
              description="API key for AI-powered plan analysis features"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvVarRow({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-fs-warm-white p-3">
      <code className="shrink-0 rounded bg-fs-espresso/5 px-2 py-0.5 text-xs font-semibold text-fs-espresso">
        {name}
      </code>
      <p className="text-xs text-fs-charcoal">{description}</p>
    </div>
  );
}
