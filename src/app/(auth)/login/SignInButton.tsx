"use client";

export default function SignInButton() {
  async function handleSignIn() {
    const res = await fetch("/api/auth/csrf");
    const { csrfToken } = await res.json();

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signin/microsoft-entra-id";

    const csrfInput = document.createElement("input");
    csrfInput.type = "hidden";
    csrfInput.name = "csrfToken";
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);

    const callbackInput = document.createElement("input");
    callbackInput.type = "hidden";
    callbackInput.name = "callbackUrl";
    // Home is the landing page after sign-in (tools live one click away).
    callbackInput.value = "/home";
    form.appendChild(callbackInput);

    document.body.appendChild(form);
    form.submit();
  }

  return (
    <button
      onClick={handleSignIn}
      className="flex w-full items-center justify-center gap-3 rounded-full bg-fs-espresso px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-fs-copper focus:outline-none focus:ring-2 focus:ring-fs-copper focus:ring-offset-2"
    >
      <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
      </svg>
      Sign in with Microsoft
    </button>
  );
}
