/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination:
          "https://gen-lang-client-0260042933.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
  experimental: {
    esmExternals: true,
  },
  typescript: {
    // ✅ Ignore TypeScript build errors on Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // ✅ Ignore ESLint build errors on Vercel
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });
    return config;
  },
};

export default nextConfig;
