interface PageHeaderProps {
  title: string;
  subtitle?: string;
  label?: string;
}

export default function PageHeader({ title, subtitle, label }: PageHeaderProps) {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-fs-espresso via-fs-charcoal to-fs-espresso shadow-lg">
      <div className="relative px-8 py-8">
        {/* Decorative pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="pageHeaderGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#pageHeaderGrid)" />
          </svg>
        </div>
        {/* Copper accent line */}
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-fs-copper via-fs-copper/60 to-transparent" />

        <div className="relative">
          {label && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fs-copper">
              {label}
            </p>
          )}
          <h1 className="mt-2 font-display text-3xl font-bold text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm font-light text-fs-sand">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
