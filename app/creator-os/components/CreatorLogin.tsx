"use client";

import { useState } from "react";
import AnimatedBackground from "@/app/components/AnimatedBackground";
import { GOLD, GOLD_SOFT, CREATOR_CSS } from "../theme";

const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function CreatorLogin({ onLogin }: { onLogin: (name: string) => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const submit = (): void => {
    if (!user.trim()) {
      setError("Ingresá tu nombre o marca");
      return;
    }
    if (!pass.trim()) {
      setError("Ingresá tu contraseña");
      return;
    }
    setError("");
    onLogin(user.trim());
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#fff",
        fontFamily: FONT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <AnimatedBackground />
      <style>{CREATOR_CSS}</style>
      <div
        className="aff-fadein"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "440px",
          width: "100%",
          background:
            "radial-gradient(120% 140% at 50% 0%, rgba(232,163,61,0.14) 0%, rgba(232,163,61,0) 55%), #0c0c10",
          border: "1px solid rgba(232,163,61,0.18)",
          borderRadius: "24px",
          padding: "40px 36px",
          boxShadow: "0 0 80px rgba(232,163,61,0.08)",
        }}
      >
        {/* Logo + título */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <img
            src="/crowlogo.png"
            alt="Crow"
            style={{ width: "56px", height: "56px", objectFit: "contain", marginBottom: "14px" }}
          />
          <h1 style={{ fontSize: "26px", margin: "0 0 6px", fontWeight: 800, letterSpacing: "-0.5px" }}>
            Creator <span className="creator-gold-text">OS</span>
          </h1>
          <p style={{ color: "#9c9ca6", margin: 0, fontSize: "14px" }}>
            Creá, publicá y vendé tus productos digitales.
          </p>
        </div>

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label
              htmlFor="creator-user"
              style={{ display: "block", color: "#9c9ca6", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}
            >
              Nombre o marca
            </label>
            <input
              id="creator-user"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Tu nombre o marca"
              autoComplete="username"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#050508",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px",
                color: "#fff",
                padding: "13px 16px",
                fontSize: "14px",
                fontFamily: FONT,
                outline: "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(232,163,61,0.5)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,163,61,0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label
              htmlFor="creator-pass"
              style={{ display: "block", color: "#9c9ca6", fontSize: "12px", marginBottom: "6px", fontWeight: 600 }}
            >
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="creator-pass"
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#050508",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "12px",
                  color: "#fff",
                  padding: "13px 16px",
                  fontSize: "14px",
                  fontFamily: FONT,
                  outline: "none",
                  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(232,163,61,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(232,163,61,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "#666",
                  cursor: "pointer",
                  fontSize: "13px",
                  padding: "4px",
                }}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ color: "#f87171", fontSize: "13px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            onClick={submit}
            style={{
              marginTop: "4px",
              padding: "14px",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(90deg, #e8a33d, #d4881f)",
              color: "#1a1a1a",
              fontWeight: "bold",
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 0 30px rgba(232,163,61,0.25)",
              transition: "filter 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
          >
            Entrar al estudio →
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <p style={{ color: "#5c5c66", fontSize: "12px", margin: 0 }}>
            ¿No tenés cuenta?{" "}
            <a href="/create" style={{ color: GOLD_SOFT, textDecoration: "none" }}>
              Crear una cuenta
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
