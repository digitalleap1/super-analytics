// ─── Multi-Zone reverse proxy support ────────────────────────────────────────
// When this app is served under a subpath of the tools hub
// (tools.digitalleapmarketing.com/super-analytics) it must run WITH a basePath so
// every page, /_next asset, API route and server action lives under that prefix
// and never collides with the hub's own routes. This is env-gated: with
// NEXT_PUBLIC_BASE_PATH unset the build is byte-for-byte the current production
// build (served at root), so shipping this change breaks nothing until the env
// var is set on a specific deployment.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

// Hosts allowed to invoke Server Actions. Behind the proxy the browser's Origin
// is the gateway host, not this app's Vercel host, so it must be allow-listed.
const serverActionOrigins = [
  "tools.digitalleapmarketing.com",
  "tools-staging.vercel.app",
  ...(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath ? { basePath } : {}),
  experimental: {
    serverActions: { allowedOrigins: serverActionOrigins },
  },
  // Keep legacy root share links working after the app moves under a basePath:
  // super-analytics-pied.vercel.app/r/<token> → /super-analytics/r/<token>.
  // `basePath:false` opts this rule out of the automatic prefixing so it can
  // match the un-prefixed legacy path. No-op when basePath is unset.
  async redirects() {
    if (!basePath) return [];
    return [
      {
        source: "/r/:token",
        destination: `${basePath}/r/:token`,
        permanent: false,
        basePath: false,
      },
    ];
  },
  async headers() {
    // Security hardening: only the agency tools hub may embed this app, and it
    // should never be indexed by search engines (keeps the raw deployment URL
    // out of Google so it isn't casually discoverable).
    return [
      {
        source: "/:path*",
        headers: [
          {
            // Restricts who can iframe the app. Note: intentionally NOT setting
            // X-Frame-Options (which would block the tools iframe) — CSP
            // frame-ancestors is the modern, more precise control.
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://tools.digitalleapmarketing.com;",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          {
            key: "Permissions-Policy",
            value: "browsing-topics=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // pptxgenjs imports `node:fs` / `node:path` from its Node entry point.
      // The browser code path never actually executes those, but webpack's
      // static analyzer chokes on the `node:` URI scheme. Strip the prefix so
      // the next-step fallback (mapping fs/path/etc. to empty modules on the
      // client) actually applies.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        zlib: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;
