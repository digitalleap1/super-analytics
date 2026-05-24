/** @type {import('next').NextConfig} */
const nextConfig = {
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
