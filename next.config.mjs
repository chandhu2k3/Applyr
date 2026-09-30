/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dev and build NEVER share a directory. `next build` used to wipe .next
  // while `next dev` was serving from it → phantom chunks (./276.js),
  // 404'd CSS/JS, dead hydration. Separate dirs make that impossible.
  // Vercel: NEXT_DIST_DIR unset → default ".next". Local dev: ".next-dev".
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // V1 free-first: no serverless browser workers. Playwright runs locally.
  // pdfjs must run from node_modules (worker file resolution breaks when bundled).
  experimental: { serverComponentsExternalPackages: ["pdfjs-dist"] },
};

export default nextConfig;
