// Tests de autenticación (DB temporal, sin tocar datos reales).
process.env.DATABASE_PATH = "C:\\Users\\gabii\\AppData\\Local\\Temp\\opencode\\crow-auth-test.db";

import { beforeEach, describe, expect, it } from "vitest";
import { existsSync, unlinkSync } from "node:fs";
import {
  getTokenFromCookieHeader,
  getUserFromToken,
  loginUser,
  logoutToken,
  registerUser,
} from "./auth";
import { closeDb } from "../db/database";

const DB = process.env.DATABASE_PATH as string;

beforeEach(() => {
  closeDb(DB);
  try {
    if (existsSync(DB)) unlinkSync(DB);
    if (existsSync(`${DB}-wal`)) unlinkSync(`${DB}-wal`);
    if (existsSync(`${DB}-shm`)) unlinkSync(`${DB}-shm`);
  } catch {
    // sigue
  }
});

describe("auth", () => {
  it("registra y loguea un usuario", () => {
    const reg = registerUser("Ana@Example.com", "Ana", "password123");
    expect(reg.ok).toBe(true);
    if (!reg.ok) return;
    expect(reg.user.email).toBe("ana@example.com");
    const login = loginUser("ana@example.com", "password123");
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    expect(login.user.id).toBe(reg.user.id);
    expect(login.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rechaza email duplicado, email inválido y password débil", () => {
    expect(registerUser("a@b.co", "Ana", "password123").ok).toBe(true);
    expect(registerUser("a@b.co", "Otra", "password123")).toEqual({ ok: false, error: "EMAIL_TAKEN" });
    expect(registerUser("no-email", "Ana", "password123")).toEqual({ ok: false, error: "INVALID_EMAIL" });
    expect(registerUser("c@d.co", "Ana", "corta")).toEqual({ ok: false, error: "WEAK_PASSWORD" });
  });

  it("credenciales incorrectas no autentican", () => {
    registerUser("a@b.co", "Ana", "password123");
    expect(loginUser("a@b.co", "otra-clave")).toEqual({ ok: false, error: "INVALID_CREDENTIALS" });
    expect(loginUser("nadie@b.co", "password123")).toEqual({ ok: false, error: "INVALID_CREDENTIALS" });
  });

  it("token inválido o cerrado no devuelve usuario", () => {
    expect(getUserFromToken("no-es-token")).toBeNull();
    const reg = registerUser("x@y.co", "Xuli", "password123");
    if (!reg.ok) throw new Error("registro falló en test");
    const login = loginUser("x@y.co", "password123");
    if (!login.ok) throw new Error("login falló en test");
    expect(getUserFromToken(login.token)?.id).toBe(login.user.id);
    logoutToken(login.token);
    expect(getUserFromToken(login.token)).toBeNull();
  });

  it("extrae el token de la cookie de sesión", () => {
    expect(getTokenFromCookieHeader("a=1; crow_session=abc123; b=2")).toBe("abc123");
    expect(getTokenFromCookieHeader(null)).toBeNull();
    expect(getTokenFromCookieHeader("sin-sesion=1")).toBeNull();
  });
});
