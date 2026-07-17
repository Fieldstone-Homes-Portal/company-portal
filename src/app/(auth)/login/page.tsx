import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
/* eslint-disable @next/next/no-img-element */
import SignInButton from "./SignInButton";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/home");

  return (
    <div className="flex min-h-full">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-gradient-to-br from-fs-espresso via-fs-charcoal to-fs-espresso p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="loginGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#loginGrid)" />
          </svg>
        </div>
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-fs-copper/10 blur-3xl" />
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-fs-copper/5 blur-3xl" />

        {/* Logo */}
        <div className="relative">
          <img
            src="/fieldstone-logo-white.png"
            alt="Fieldstone Homes"
            className="h-10 w-auto"
          />
        </div>

        {/* Center content — Cornerstone identity (sub-brand of Fieldstone Homes) */}
        <div className="relative">
          <img
            src="/cornerstone-icon-light.svg"
            alt=""
            aria-hidden="true"
            className="mb-5 h-20 w-auto"
          />
          <div className="mb-6 h-px w-16 bg-gradient-to-r from-fs-copper to-transparent" />
          <h2 className="font-display text-5xl font-bold leading-tight tracking-tight text-white">
            Cornerstone
          </h2>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-fs-copper">
            By Fieldstone Homes
          </p>
          <p className="mt-5 max-w-sm text-sm font-light leading-relaxed text-fs-sand">
            Your foundation for internal tools, resources, and company
            applications — all in one place.
          </p>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-xs tracking-wide text-fs-sage">
            &copy; {new Date().getFullYear()} Fieldstone Homes. Internal use only.
          </p>
        </div>
      </div>

      {/* Right sign-in panel */}
      <div className="flex flex-1 items-center justify-center bg-fs-warm-white px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo (hidden on desktop) */}
          <div className="text-center lg:hidden">
            <img
              src="/fieldstone-logo.png"
              alt="Fieldstone Homes"
              className="mx-auto h-10 w-auto"
            />
            <p className="mt-3 text-sm text-fs-copper">Employee Portal</p>
          </div>

          {/* Sign in heading */}
          <div className="text-center lg:text-left">
            <h1 className="font-display text-3xl font-bold text-fs-espresso">
              Sign in
            </h1>
            <p className="mt-2 text-sm text-fs-sage">
              Use your company Microsoft account to continue
            </p>
          </div>

          {/* Sign in card */}
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-fs-warm-gray">
            <SignInButton />
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-fs-warm-gray" />
              <span className="text-[10px] uppercase tracking-widest text-fs-sage">secured by</span>
              <div className="h-px flex-1 bg-fs-warm-gray" />
            </div>
            <p className="mt-3 text-center text-xs text-fs-sage">
              Microsoft Entra ID &middot; @fieldstonehomes.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
