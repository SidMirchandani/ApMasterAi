/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
