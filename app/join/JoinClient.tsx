"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  createAffiliateProfile,
  findReferralByCode,
  recordReferralClick,
  registerReferral,
  saveAffiliateProfile,
} from "@/app/services/marketplace/marketLedger";
import { getCreatorProfile, saveCreatorProfile } from "@/app/services/marketplace/marketStore";
import type { ReferralKind } from "@/app/services/marketplace/marketTypes";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function JoinClient({ kind }: { kind: ReferralKind }) {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [valid, setValid] = useState<boolean | null>(null);
  const [userId, setUserId] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = findReferralByCode(params.code);
    if (!ref || ref.kind !== kind) {
      setValid(false);
      return;
    }
    setValid(true);
    recordReferralClick(params.code);
  }, [params.code, kind]);

  const register = (): void => {
    const clean = userId.trim();
    if (!clean) {
      setError("Ingresá tu usuario o email.");
      return;
    }
    setError(null);
    const reg = registerReferral(params.code, clean);
    if (!reg) {
      setError("Código inválido.");
      return;
    }
    if (kind === "affiliate") {
      const profile = createAffiliateProfile(clean);
      if (!profile.referredByCode) {
        saveAffiliateProfile({ ...profile, referredByCode: params.code });
      }
      try {
        window.localStorage.setItem("crow_affiliate_id", clean);
      } catch {
        // no bloquea
      }
    } else {
      const username = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const existing = getCreatorProfile();
      if (!existing || existing.username !== username) {
        saveCreatorProfile({
          id: `creator-${username}`,
          username,
          displayName: clean,
          bio: "",
          referredByCode: params.code,
          createdAt: new Date().toISOString(),
        });
      }
      try {
        window.localStorage.setItem("crow_creator_hint", username);
      } catch {
        // no bloquea
      }
    }
    setDone(true);
  };

  if (valid === false) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#888", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        Código de invitación inválido.
      </main>
    );
  }

  if (valid === null) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#888", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
        Verificando invitación...
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "480px", width: "100%", background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "32px", textAlign: "center" }}>
        {!done ? (
          <>
            <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px", marginBottom: "12px" }}>
              INVITACIÓN · {kind === "affiliate" ? "AFILIADO" : "CREADOR"}
            </div>
            <h1 style={{ fontSize: "26px", margin: "0 0 8px" }}>
              {kind === "affiliate" ? "Sumate como afiliado a Crow" : "Publicá como creador en Crow"}
            </h1>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>
              Te invitaron con el código <strong style={{ color: "#fff" }}>{params.code}</strong>. Tu registro quedará atribuido.
            </p>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Tu usuario o email"
              style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "14px", marginBottom: "12px", fontFamily: FONT }}
            />
            {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
            <button onClick={register} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}>
              Registrarme
            </button>
          </>
        ) : (
          <>
            <div style={{ color: "#22c55e", fontWeight: "bold", fontSize: "18px", marginBottom: "8px" }}>Registro completo</div>
            <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>
              {kind === "affiliate" ? "Ya podés operar desde tu Affiliate Center." : "Ya podés crear y publicar tus productos."}
            </p>
            <Link
              href={kind === "affiliate" ? "/affiliates" : "/create"}
              style={{ display: "inline-block", padding: "12px 28px", borderRadius: "10px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none" }}
            >
              {kind === "affiliate" ? "Ir al Affiliate Center" : "Ir a Create Studio"}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
