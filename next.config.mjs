/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // V1 free-first: no serverless browser workers. Playwright runs locally.
  // Keep server actions / route handlers stateless and cheap for Vercel Hobby.
};

export default nextConfig;
