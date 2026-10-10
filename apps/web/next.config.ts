import path from "node:path";
import type { NextConfig } from "next";

// The browser talks to the API through this same-origin proxy, so it works from localhost, 127.0.0.1 or any port without CORS setup.
const apiOrigin = process.env.QUANTARIS_API_ORIGIN ?? "http://127.0.0.1:8000";
const nextConfig: NextConfig = {
  agentRules: false, // stop the dev server writing AGENTS.md and CLAUDE.md into this folder
  devIndicators: false, // the dev badge sat on top of the language switch
  allowedDevOrigins: ["127.0.0.1", "localhost"], // dev server otherwise blocks client scripts when opened via 127.0.0.1
  experimental: { proxyTimeout: 120_000 }, // AI drafting can take a while; the default proxy timeout is 30 s
  turbopack: { root: path.resolve(import.meta.dirname, "../..") },
  // One unified workspace: the old stand-alone scenario pages now live inside the chat (map, sources, constraints and opportunities).
  async redirects() { return [{ source: "/scenarios/:path*", destination: "/", permanent: false }, { source: "/classic", destination: "/", permanent: false }, { source: "/demo", destination: "/", permanent: false }]; },
  async rewrites() { return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }]; },
};
export default nextConfig;
