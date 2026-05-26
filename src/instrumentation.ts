// Runs once when the Next.js server boots (both dev and production).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Node 18's fetch (undici) connects IPv6-first and stalls ~10s when a host's
    // IPv6 route is dead, intermittently throwing UND_ERR_CONNECT_TIMEOUT
    // ("fetch failed") on outbound calls — which left the OpenLibrary/Google
    // Books shelves empty under the burst the /browse page fires. Enabling Happy
    // Eyeballs races IPv4 and IPv6 so the reachable family wins immediately.
    const net = await import("node:net");
    net.setDefaultAutoSelectFamily?.(true);
  }
}
