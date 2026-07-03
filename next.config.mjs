/** @type {import('next').NextConfig} */
const nextConfig = {
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
