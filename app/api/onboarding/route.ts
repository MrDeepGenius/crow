// /api/onboarding — estado y guardado del onboarding (sesión requerida)
// GET: { roles, onboardingCompleted, perfiles existentes }
// POST { step: "roles", roles: [...] } → activa (aditivo)
// POST { step: "affiliate"|"buyer"|"creator", data } → guarda perfil (requiere rol)
// POST { step: "complete" } → valida todo y marca completo
import { NextResponse } from "next/server";
import { checkOrigin, getAuthUserFromRequest } from "@/app/services/auth/auth";
import {
  addRoles,
  completeOnboarding,
  getAffiliateProfile,
  getBuyerProfile,
  getCreatorProfile,
  getOnboarding,
  saveAffiliateProfile,
  saveBuyerProfile,
  saveCreatorProfile,
  type Role,
} from "@/app/services/db/profiles";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const state = getOnboarding(user.id);
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      ...state,
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

export async function POST(req: Request): Promise<NextResponse> {
  if (!checkOrigin(req)) {
    return NextResponse.json({ ok: false, reason: "BAD_ORIGIN" }, { status: 403 });
  }
  try {
    const user = getAuthUserFromRequest(req);
    if (!user) return NextResponse.json({ ok: false, reason: "UNAUTHENTICATED" }, { status: 401 });
    const body = (await req.json()) as { step?: unknown; roles?: unknown; data?: unknown };
    if (body.step === "roles") {
      if (!Array.isArray(body.roles)) {
        return NextResponse.json({ ok: false, reason: "EMPTY_ROLES" }, { status: 400 });
      }
      try {
        const roles = addRoles(user.id, body.roles as string[]);
        return NextResponse.json({ ok: true, roles });
      } catch (err) {
        const code = err instanceof Error ? err.message : "INVALID_ROLES";
        return NextResponse.json({ ok: false, reason: code }, { status: 400 });
      }
    }
    if (body.step === "affiliate" || body.step === "buyer" || body.step === "creator") {
      const role = body.step as Role;
      const state = getOnboarding(user.id);
      if (!state.roles.includes(role)) {
        return NextResponse.json({ ok: false, reason: "ROLE_NOT_ACTIVE" }, { status: 403 });
      }
      try {
        const saved =
          role === "affiliate"
            ? saveAffiliateProfile(user.id, (body.data ?? {}) as Parameters<typeof saveAffiliateProfile>[1])
            : role === "buyer"
              ? saveBuyerProfile(user.id, (body.data ?? {}) as Parameters<typeof saveBuyerProfile>[1])
              : saveCreatorProfile(user.id, (body.data ?? {}) as Parameters<typeof saveCreatorProfile>[1]);
        return NextResponse.json({ ok: true, profile: saved });
      } catch (err) {
        const code = err instanceof Error ? err.message : "INVALID_PROFILE";
        return NextResponse.json({ ok: false, reason: code }, { status: 400 });
      }
    }
    if (body.step === "complete") {
      try {
        completeOnboarding(user.id);
        return NextResponse.json({ ok: true });
      } catch (err) {
        const code = err instanceof Error ? err.message : "INCOMPLETE";
        return NextResponse.json({ ok: false, reason: code }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: false, reason: "INVALID_STEP" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
