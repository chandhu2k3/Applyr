/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // V1 free-first: no serverless browser workers. Playwright runs locally.
  // pdfjs must run from node_modules (worker file resolution breaks when bundled).
  experimental: { serverComponentsExternalPackages: ["pdfjs-dist"] },
};

export default nextConfig;
