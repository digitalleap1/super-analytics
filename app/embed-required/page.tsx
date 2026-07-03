import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open via the Digital Leap hub",
  robots: { index: false, follow: false },
};

// Shown when the app is opened directly at its Vercel URL instead of inside the
// Digital Leap tools hub iframe. Self-contained inline styles so it renders the
// same no matter which path the request was rewritten from.
export default function EmbedRequiredPage() {
  return (
    <main
      style={{
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
      }}
    >
      <div
        style={{
          maxWidth: "460px",
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
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(56,189,248,0.12)",
            border: "1px solid rgba(56,189,248,0.35)",
            fontSize: "26px",
          }}
          aria-hidden
        >
          🔒
        </div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 10px" }}>
          This tool opens inside the Digital Leap hub
        </h1>
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#94a3b8",
            margin: "0 0 24px",
          }}
        >
          The SEO Dashboard can only be used from your secure tools hub. Please
          open it there — direct access to this address is disabled.
        </p>
        <a
          href="https://tools.digitalleapmarketing.com/seodashboard.html"
          style={{
            display: "inline-block",
            padding: "12px 22px",
            borderRadius: "10px",
            background: "linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%)",
            color: "#04202e",
            fontWeight: 600,
            fontSize: "14px",
            textDecoration: "none",
          }}
        >
          Open the SEO Dashboard →
        </a>
        <p
          style={{
            fontSize: "12px",
            color: "#64748b",
            margin: "22px 0 0",
          }}
        >
          Digital Leap Marketing
        </p>
      </div>
    </main>
  );
}
