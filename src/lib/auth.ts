import { PrivyClient } from "@privy-io/server-auth";
import { db } from "@/lib/db";
import type { User } from "@prisma/client";

// Server-side bridge between Privy (who the browser says it is) and our own
// User table. The client sends its Privy access token as a Bearer header; we
// verify it offline, then lazily provision a matching User row keyed by the
// Privy DID. Everything that acts "as the current user" goes through here.

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

const privy = appId && appSecret ? new PrivyClient(appId, appSecret) : null;

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

// Derive a unique, URL-safe username from an email, retrying with a numeric
// suffix on collision (username is unique in the schema).
async function uniqueUsername(email: string): Promise<string> {
  const base =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 20) || "reader";
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${attempt}`;
    const taken = await db.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }
  return `${base}${Date.now().toString(36)}`;
}

// Pull the best email + display name we can from a Privy user's linked accounts.
function profileFromPrivy(linkedAccounts: { type: string; [k: string]: unknown }[]) {
  const email = linkedAccounts.find((a) => a.type === "email");
  const google = linkedAccounts.find((a) => a.type === "google_oauth");
  const address =
    (email?.address as string | undefined) ?? (google?.email as string | undefined);
  const displayName = (google?.name as string | undefined) ?? undefined;
  return { email: address, displayName };
}

/**
 * Returns the User for the request's Privy token, provisioning one on first
 * sight. Returns null when there's no valid token (caller should 401).
 */
export async function getCurrentUser(req: Request): Promise<User | null> {
  if (!privy) return null;
  const token = bearerToken(req);
  if (!token) return null;

  let privyId: string;
  try {
    const claims = await privy.verifyAuthToken(token);
    privyId = claims.userId;
  } catch {
    return null;
  }

  // Fast path: already provisioned.
  const existing = await db.user.findUnique({ where: { privyId } });
  if (existing) return existing;

  // First authenticated request for this Privy account — provision a User.
  const privyUser = await privy.getUser(privyId);
  const { email, displayName } = profileFromPrivy(
    (privyUser.linkedAccounts ?? []) as { type: string }[],
  );
  const resolvedEmail = email ?? `${privyId.replace(/[^a-zA-Z0-9]/g, "")}@privy.local`;

  // If a row already exists for this email (e.g. the seeded user), adopt it by
  // linking the Privy id rather than creating a duplicate.
  const byEmail = await db.user.findUnique({ where: { email: resolvedEmail } });
  if (byEmail) {
    return db.user.update({ where: { id: byEmail.id }, data: { privyId } });
  }

  return db.user.create({
    data: {
      privyId,
      email: resolvedEmail,
      username: await uniqueUsername(resolvedEmail),
      displayName,
    },
  });
}
