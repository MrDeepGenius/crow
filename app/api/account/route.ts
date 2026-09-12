// GET /api/account — Mi cuenta: identidad + roles + perfiles (sesión requerida)
// Nunca expone passwordHash. Los roles mostrados salen de la DB, no del cliente.
import { NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/app/services/auth/auth";
import {
  getAffiliateProfile,
  getBuyerProfile,
  getCreatorProfile,
  getOnboarding,
} from "@/app/services/db/profiles";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const state = getOnboarding(user.id);
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarPath: user.avatarPath,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
      roles: state.roles,
      onboardingCompleted: state.onboardingCompleted,
      profiles: {
        affiliate: getAffiliateProfile(user.id),
        buyer: getBuyerProfile(user.id),
        creator: getCreatorProfile(user.id),
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
