// Tests de páginas públicas de creador (DB temporal).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-creator-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import { closeDb } from "./database";
import { loginUser, registerUser } from "../auth/auth";
import { addRoles } from "./profiles";
import {
  getCreatorPageBySlug,
  getCreatorPageByUser,
  saveCreatorPage,
  setCreatorAvatar,
  slugifyName,
  uniqueSlug,
} from "./creatorPages";
import { PUT as creatorPagePUT } from "@/app/api/account/creator-page/route";
import { GET as publicGET } from "@/app/api/creators/[slug]/route";
import { POST as accountAvatarPOST } from "@/app/api/account/avatar/route";
import { setUserAvatar } from "@/app/services/auth/auth";
import { checkAvatarBytes } from "@/app/services/auth/avatars";

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

function makeCreator(email: string, name = "Ada"): { id: string; token: string } {
  const reg = registerUser(email, name, "password123", { lastName: "Lovelace", termsAccepted: true });
  if (!reg.ok) throw new Error("registro falló en test");
  addRoles(reg.user.id, ["creator"]);
  const login = loginUser(email, "password123");
  if (!login.ok) throw new Error("login falló en test");
  return { id: login.user.id, token: login.token };
}

function authed(url: string, token: string | null, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { cookie: `crow_session=${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("creator pages", () => {
  it("crea página con slug único y la lee por slug", () => {
    const a = makeCreator("a@t.co");
    const page = saveCreatorPage(a.id, { displayName: "Ada Creadora", bio: "Cursos de IA" });
    expect(page.slug).toBe("ada-creadora");
    expect(getCreatorPageBySlug("ada-creadora")?.displayName).toBe("Ada Creadora");
    expect(getCreatorPageByUser(a.id)?.bio).toBe("Cursos de IA");
    expect(getCreatorPageBySlug("no-existe")).toBeNull();
    expect(getCreatorPageBySlug("../../../etc")).toBeNull();
  });

  it("dos nombres iguales generan slugs distintos", () => {
    const a = makeCreator("a@t.co");
    const b = makeCreator("b@t.co", "Ada");
    saveCreatorPage(a.id, { displayName: "Ada", bio: "" });
    const second = saveCreatorPage(b.id, { displayName: "Ada", bio: "" });
    expect(second.slug).toBe("ada-2");
    expect(uniqueSlug("Ada")).toBe("ada-3");
  });

  it("editar no cambia el slug y valida el nombre", () => {
    const a = makeCreator("a@t.co");
    const first = saveCreatorPage(a.id, { displayName: "Ada", bio: "v1" });
    const second = saveCreatorPage(a.id, { displayName: "Ada Nueva Marca", bio: "v2" });
    expect(second.slug).toBe(first.slug);
    expect(second.bio).toBe("v2");
    expect(() => saveCreatorPage(a.id, { displayName: "X", bio: "" })).toThrowError("INVALID_NAME");
    expect(() => saveCreatorPage("usr-nope", { displayName: "Ada", bio: "" })).toThrowError("USER_NOT_FOUND");
  });

  it("slugify normaliza acentos y símbolos", () => {
    expect(slugifyName("Diseño Gráfico & Marketing!")).toBe("diseno-grafico-marketing");
    expect(slugifyName("  ")).toBe("creador");
  });

  it("avatar se asocia y expone como URL pública", () => {
    const a = makeCreator("a@t.co");
    saveCreatorPage(a.id, { displayName: "Ada", bio: "" });
    setCreatorAvatar(a.id, "/uploads/avatars/xyz.png");
    expect(getCreatorPageBySlug("ada")?.avatarUrl).toBe("/uploads/avatars/xyz.png");
    expect(() => setCreatorAvatar("usr-nope", "/x.png")).toThrowError("PAGE_NOT_FOUND");
  });

  it("PUT exige sesión y rol creator", async () => {
    const anon = await creatorPagePUT(authed("http://localhost/api/account/creator-page", null, "PUT", { displayName: "Ada", bio: "" }));
    expect(anon.status).toBe(401);
    const reg = registerUser("c@t.co", "Comprador", "password123", { termsAccepted: true });
    if (!reg.ok) throw new Error("setup falló");
    const buyer = loginUser("c@t.co", "password123");
    if (!buyer.ok) throw new Error("setup falló");
    const noRole = await creatorPagePUT(authed("http://localhost/api/account/creator-page", buyer.token, "PUT", { displayName: "Ada", bio: "" }));
    expect(noRole.status).toBe(403);
  });

  it("lectura pública no expone email ni requiere sesión", async () => {
    const a = makeCreator("a@t.co");
    saveCreatorPage(a.id, { displayName: "Ada Pública", bio: "Hola" });
    const res = await publicGET({} as Request, { params: Promise.resolve({ slug: "ada-publica" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; page?: Record<string, unknown> };
    expect(data.ok).toBe(true);
    expect(data.page).not.toHaveProperty("email");
    expect(data.page).not.toHaveProperty("userId");
    const missing = await publicGET({} as Request, { params: Promise.resolve({ slug: "nadie" }) });
    expect(missing.status).toBe(404);
  });
});

describe("foto de cuenta", () => {
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const FAKE = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09]);

  it("validador rechaza bytes falsos y acepta PNG real", () => {
    expect(checkAvatarBytes(FAKE).ok).toBe(false);
    expect(checkAvatarBytes(new Uint8Array(0)).ok).toBe(false);
    expect(checkAvatarBytes(new Uint8Array(3 * 1024 * 1024)).ok).toBe(false);
    expect(checkAvatarBytes(PNG).ok).toBe(true);
  });

  it("POST /api/account/avatar exige sesión", async () => {
    const form = new FormData();
    form.append("avatar", new File([PNG], "a.png", { type: "image/png" }));
    const res = await accountAvatarPOST(
      new Request("http://localhost/api/account/avatar", { method: "POST", body: form })
    );
    expect(res.status).toBe(401);
  });

  it("cualquier rol puede subir foto de cuenta y la página la usa de fallback", async () => {
    // Usuario solo comprador (sin rol creator).
    const reg = registerUser("buyer@t.co", "Comprador", "password123", { termsAccepted: true });
    if (!reg.ok) throw new Error("setup falló");
    const login = loginUser("buyer@t.co", "password123");
    if (!login.ok) throw new Error("setup falló");
    const form = new FormData();
    form.append("avatar", new File([PNG], "a.png", { type: "image/png" }));
    const res = await accountAvatarPOST(
      new Request("http://localhost/api/account/avatar", {
        method: "POST",
        headers: { cookie: `crow_session=${login.token}` },
        body: form,
      })
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; avatarUrl?: string };
    expect(data.ok).toBe(true);
    expect(data.avatarUrl ?? "").toContain("/uploads/avatars/");
    // Limpia el archivo real creado en public/uploads (gitignored).
    try {
      const { unlinkSync } = await import("node:fs");
      const { join } = await import("node:path");
      const name = (data.avatarUrl as string).split("?")[0]?.split("/").pop();
      if (name) unlinkSync(join(process.cwd(), "public", "uploads", "avatars", name));
    } catch {
      // best-effort
    }

    // Página de creador sin foto propia → fallback a la foto de cuenta.
    const c = makeCreator("c@t.co");
    setUserAvatar(c.id, "/uploads/avatars/u-demo.png");
    saveCreatorPage(c.id, { displayName: "Creadora Demo", bio: "" });
    expect(getCreatorPageBySlug("creadora-demo")?.avatarUrl).toBe("/uploads/avatars/u-demo.png");
  });

  it("archivo inválido se rechaza con 400", async () => {
    const u = makeCreator("d@t.co");
    const form = new FormData();
    form.append("avatar", new File([FAKE], "a.png", { type: "image/png" }));
    const res = await accountAvatarPOST(
      new Request("http://localhost/api/account/avatar", {
        method: "POST",
        headers: { cookie: `crow_session=${u.token}` },
        body: form,
      })
    );
    expect(res.status).toBe(400);
  });
});
