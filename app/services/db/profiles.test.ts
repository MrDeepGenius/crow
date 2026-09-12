// Tests de cuenta única multi-rol + onboarding (DB temporal).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-profiles-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb } from "./database";
import { loginUser, registerUser } from "../auth/auth";
import {
  addRoles,
  completeOnboarding,
  getAffiliateProfile,
  getBuyerProfile,
  getCreatorProfile,
  getOnboarding,
  getRoles,
  requireRole,
  saveAffiliateProfile,
  saveBuyerProfile,
  saveCreatorProfile,
} from "./profiles";
import { POST as onboardingPOST, GET as onboardingGET } from "@/app/api/onboarding/route";
import { GET as accountGET } from "@/app/api/account/route";
import { POST as registerPOST } from "@/app/api/auth/register/route";

const DB = process.env.DATABASE_PATH as string;

function resetDb(): void {
  closeDb(DB);
  try {
    if (existsSync(DB)) unlinkSync(DB);
    if (existsSync(`${DB}-wal`)) unlinkSync(`${DB}-wal`);
    if (existsSync(`${DB}-shm`)) unlinkSync(`${DB}-shm`);
  } catch {
    // sigue
  }
}

beforeEach(() => {
  resetDb();
});

function makeUser(email: string): { id: string; token: string } {
  const reg = registerUser(email, "Ada", "password123", { lastName: "Lovelace", termsAccepted: true });
  if (!reg.ok) throw new Error("registro falló en test");
  const login = loginUser(email, "password123");
  if (!login.ok) throw new Error("login falló en test");
  return { id: login.user.id, token: login.token };
}

function reqWithSession(url: string, token: string | null, body?: unknown): Request {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { cookie: `crow_session=${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const AFF = {
  categories: ["Marketing", "Educación"],
  experience: "Estoy empezando",
  channels: ["TikTok", "Instagram"],
  goal: "Generar ingresos extra",
};

const BUY = {
  categories: ["Tecnología"],
  formats: ["Cursos", "Ebooks"],
  goals: ["Aprender"],
};

const CRE = {
  productTypes: ["Cursos"],
  niche: "Finanzas personales",
  hasProducts: "No",
  experience: "Básica",
  hasBrand: "No",
};

describe("registro extendido", () => {
  it("exige términos y guarda nombre/apellido", () => {
    expect(
      registerUser("a@t.co", "Ada", "password123", { lastName: "Lovelace", termsAccepted: false })
    ).toEqual({ ok: false, error: "TERMS_REQUIRED" });
    const ok = registerUser("a@t.co", "Ada", "password123", { lastName: "Lovelace", termsAccepted: true });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.user.firstName).toBe("Ada");
    expect(ok.user.lastName).toBe("Lovelace");
    expect(ok.user.name).toBe("Ada Lovelace");
    expect(ok.user.roles).toEqual([]);
    expect(ok.user.onboardingCompleted).toBe(false);
  });

  it("llamada legacy de 3 args sigue funcionando", () => {
    const r = registerUser("b@t.co", "Ada Lovelace", "password123");
    expect(r.ok).toBe(true);
  });

  it("API register valida mismatch y términos", async () => {
    const mismatch = await registerPOST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "c@t.co",
          firstName: "Ada",
          lastName: "L",
          password: "password123",
          confirmPassword: "otra12345",
          termsAccepted: true,
        }),
      })
    );
    expect(mismatch.status).toBe(400);
    expect(await mismatch.json()).toMatchObject({ ok: false, reason: "PASSWORD_MISMATCH" });

    const noTerms = await registerPOST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "c@t.co",
          firstName: "Ada",
          lastName: "L",
          password: "password123",
          confirmPassword: "password123",
          termsAccepted: false,
        }),
      })
    );
    expect(await noTerms.json()).toMatchObject({ ok: false, reason: "TERMS_REQUIRED" });
  });
});

describe("roles y perfiles", () => {
  it("selección de roles aditiva y validada", () => {
    const u = makeUser("a@t.co");
    expect(getRoles(u.id)).toEqual([]);
    expect(addRoles(u.id, ["buyer", "affiliate"])).toEqual(["buyer", "affiliate"]);
    // Activación posterior: agrega sin quitar ni duplicar.
    expect(addRoles(u.id, ["creator", "buyer"])).toEqual(["buyer", "affiliate", "creator"]);
    expect(() => addRoles(u.id, ["hacker"])).toThrowError("EMPTY_ROLES");
    expect(() => addRoles(u.id, [])).toThrowError("EMPTY_ROLES");
    expect(requireRole(u.id, "creator")).toBe(true);
    expect(getRoles("usr-inexistente")).toEqual([]);
  });

  it("creación de los 3 perfiles y lectura aislada por usuario", () => {
    const a = makeUser("a@t.co");
    const b = makeUser("b@t.co");
    addRoles(a.id, ["buyer", "affiliate", "creator"]);
    saveAffiliateProfile(a.id, AFF);
    saveBuyerProfile(a.id, BUY);
    saveCreatorProfile(a.id, CRE);
    expect(getAffiliateProfile(a.id)?.goal).toBe("Generar ingresos extra");
    expect(getBuyerProfile(a.id)?.formats).toEqual(["Cursos", "Ebooks"]);
    expect(getCreatorProfile(a.id)?.niche).toBe("Finanzas personales");
    expect(getAffiliateProfile(b.id)).toBeNull();
    expect(getBuyerProfile(b.id)).toBeNull();
    expect(getCreatorProfile(b.id)).toBeNull();
  });

  it("rechaza valores inventados y exige marca cuando dice tenerla", () => {
    const u = makeUser("a@t.co");
    expect(() => saveAffiliateProfile(u.id, { ...AFF, experience: "Gurú" })).toThrowError("INVALID_EXPERIENCE");
    expect(() => saveBuyerProfile(u.id, { ...BUY, formats: ["Naves"] })).toThrowError("INVALID_FORMATS");
    expect(() => saveCreatorProfile(u.id, { ...CRE, hasBrand: "Sí", brandName: "" })).toThrowError("INVALID_BRAND_NAME");
    expect(() => saveAffiliateProfile("usr-nope", AFF)).toThrowError("USER_NOT_FOUND");
  });

  it("complete exige roles y perfiles", () => {
    const u = makeUser("a@t.co");
    expect(() => completeOnboarding(u.id)).toThrowError("NO_ROLES");
    addRoles(u.id, ["buyer"]);
    expect(() => completeOnboarding(u.id)).toThrowError(/INCOMPLETE_PROFILES/);
    saveBuyerProfile(u.id, BUY);
    completeOnboarding(u.id);
    expect(getOnboarding(u.id).onboardingCompleted).toBe(true);
  });
});

describe("protección de rutas (sesión y roles)", () => {
  it("onboarding y account exigen sesión", async () => {
    const anon = reqWithSession("http://localhost/api/onboarding", null, { step: "roles", roles: ["buyer"] });
    expect((await onboardingPOST(anon)).status).toBe(401);
    const anonGet = await onboardingGET(reqWithSession("http://localhost/api/onboarding", null));
    expect(anonGet.status).toBe(401);
    const anonAccount = await accountGET(reqWithSession("http://localhost/api/account", null));
    expect(anonAccount.status).toBe(401);
  });

  it("perfil exige rol activo (no se salta pasos)", async () => {
    const u = makeUser("a@t.co");
    addRoles(u.id, ["buyer"]);
    const res = await onboardingPOST(reqWithSession("http://localhost/api/onboarding", u.token, { step: "creator", data: CRE }));
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ ok: false, reason: "ROLE_NOT_ACTIVE" });
  });

  it("flujo completo vía API: roles → perfiles → complete", async () => {
    const u = makeUser("a@t.co");
    const url = "http://localhost/api/onboarding";
    const r1 = await onboardingPOST(reqWithSession(url, u.token, { step: "roles", roles: ["buyer", "creator"] }));
    expect(await r1.json()).toMatchObject({ ok: true });
    expect((await onboardingPOST(reqWithSession(url, u.token, { step: "buyer", data: BUY }))).status).toBe(200);
    expect((await onboardingPOST(reqWithSession(url, u.token, { step: "creator", data: CRE }))).status).toBe(200);
    // Activación posterior del tercer rol por la misma cuenta.
    expect((await onboardingPOST(reqWithSession(url, u.token, { step: "roles", roles: ["affiliate"] }))).status).toBe(200);
    expect((await onboardingPOST(reqWithSession(url, u.token, { step: "affiliate", data: AFF }))).status).toBe(200);
    const done = await onboardingPOST(reqWithSession(url, u.token, { step: "complete" }));
    expect(await done.json()).toMatchObject({ ok: true });
    const me = await accountGET(reqWithSession("http://localhost/api/account", u.token));
    expect(await me.json()).toMatchObject({ ok: true, roles: ["buyer", "creator", "affiliate"] });
  });

  it("un usuario no ve perfiles de otro (IDOR)", async () => {
    const a = makeUser("a@t.co");
    const b = makeUser("b@t.co");
    addRoles(a.id, ["buyer"]);
    saveBuyerProfile(a.id, BUY);
    // B pide SU cuenta: no debe incluir nada de A.
    const bRes = await accountGET(reqWithSession("http://localhost/api/account", b.token));
    const bData = (await bRes.json()) as { roles: string[]; profiles: { buyer: unknown } };
    expect(bData.roles).toEqual([]);
    expect(bData.profiles.buyer).toBeNull();
  });
});
