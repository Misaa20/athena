import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let the dev server accept requests proxied through ngrok (otherwise Next 15
  // flags them as cross-origin and can block HMR / internal dev endpoints).
  // ngrok free assigns a new hostname each restart — update this if it changes.
  allowedDevOrigins: ["covalent-hester-turgently.ngrok-free.dev"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "http", hostname: "books.google.com" },
    ],
  },
  async headers() {
    // Privy's OAuth (Google) login opens a popup that must be able to call back
    // into this window. `same-origin-allow-popups` permits that while keeping
    // cross-origin isolation otherwise. Also makes Privy's COOP check deterministic.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
  webpack: (config) => {
    // @privy-io/react-auth pulls in optional Solana/Farcaster connectors we
    // don't use. Alias the unresolved ones to `false` so webpack treats them as
    // empty modules instead of emitting "Module not found" warnings.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@farcaster/mini-app-solana": false,
    };
    // `ox` (a transitive viem dependency via Privy) uses a dynamic require in
    // its tempo VirtualMaster, which webpack flags as "Critical dependency: the
    // request of a dependency is an expression". It's harmless and we don't use
    // that code path, so suppress just that warning from that package.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules[\\/]ox[\\/]/, message: /Critical dependency/ },
    ];
    return config;
  },
};

export default nextConfig;
