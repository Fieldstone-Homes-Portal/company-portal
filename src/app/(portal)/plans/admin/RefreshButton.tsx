"use client";

import { useState } from "react";

export default function RefreshButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  async function handleRefresh() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Refresh failed");
      }
      setResult({ ok: true, message: "Data refreshed successfully" });
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Refresh failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-fs-copper px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-fs-copper-light disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Refreshing...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh Data
          </>
        )}
      </button>
      {result && (
        <p
          className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
