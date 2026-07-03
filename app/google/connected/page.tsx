"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Shown in the OAuth popup tab after Google redirects back. Kept outside the
// embed gate so it renders in the top-level tab (which isn't the tools iframe).
function Confirmation() {
  const sp = useSearchParams();
  const ok = sp.get("status") === "connected";
  const reason = sp.get("reason");

  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "radial-gradient(1200px 600px at 50% -10%, #1e293b 0%, #0f172a 55%, #020617 100%)",
    color: "#e2e8f0",
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  };

  return (
    <main style={wrap}>
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(148,163,184,0.18)",
          borderRadius: "18px",
          padding: "40px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 20px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            background: ok ? "rgba(16,185,129,0.14)" : "rgba(239,68,68,0.14)",
            border: `1px solid ${
              ok ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"
            }`,
          }}
          aria-hidden
        >
          {ok ? "✓" : "!"}
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px" }}>
          {ok ? "Google connected" : "Couldn’t connect"}
        </h1>
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#94a3b8",
            margin: "0 0 24px",
          }}
        >
          {ok
            ? "This account is now linked for this project. You can close this tab and refresh your dashboard to see live data."
            : `Something went wrong${
                reason ? ` (${reason})` : ""
              }. Close this tab and try connecting again from the project settings.`}
        </p>
        <button
          type="button"
          onClick={() => window.close()}
          style={{
            display: "inline-block",
            padding: "12px 22px",
            borderRadius: "10px",
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%)",
            color: "#04202e",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Close this tab
        </button>
      </div>
    </main>
  );
}

export default function GoogleConnectedPage() {
  return (
    <Suspense fallback={null}>
      <Confirmation />
    </Suspense>
  );
}
