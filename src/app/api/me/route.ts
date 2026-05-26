import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// GET /api/me — provisions the User row on first call and returns the profile.
// The client hits this right after Privy login so a DB user always exists.
export async function GET(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
    },
  });
}
