"use client";

import { getAccessToken } from "@privy-io/react-auth";

/**
 * fetch wrapper for calling our API as the logged-in user. Attaches the Privy
 * access token as a Bearer header (the server verifies it via getCurrentUser)
 * and defaults to JSON. Throws on non-2xx so callers can surface errors.
 */
export async function authedFetch<T = unknown>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
