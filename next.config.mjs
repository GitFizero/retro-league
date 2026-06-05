/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export: the game is 100% client-side, so it deploys as plain static
  // files (Cloudflare, GitHub Pages, any CDN). No server runtime required.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
