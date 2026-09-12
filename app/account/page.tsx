// ============================================
// MI CUENTA - perfil, roles y activación posterior
// ============================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AUTH_CSS, C, FONT, IconBag, IconGrowth, IconSpark } from "@/app/components/auth-ui";
import { AccountMenu } from "@/app/components/AccountMenu";
import { CreatorPageEditor } from "@/app/components/CreatorPageEditor";
interface AccountData {
  user: { id: string; email: string; name: string; firstName: string; lastName: string; isAdmin: boolean; createdAt: string };
  roles: string[];
  onboardingCompleted: boolean;
}

const ALL_ROLES = [
  { id: "buyer", title: "Comprador", desc: "Marketplace y tus productos.", icon: <IconBag /> },
  { id: "affiliate", title: "Afiliado", desc: "Comisiones por promocionar.", icon: <IconGrowth /> },
  { id: "creator", title: "Creador", desc: "Creator Studio y ventas.", icon: <IconSpark /> },
];

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    void fetch("/api/account")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login?return=/account");
          return null;
        }
        return r.json() as Promise<AccountData & { ok: boolean }>;
      })
      .then((d) => {
        if (!d) return;
        if (!d.ok) {
          setDenied(true);
          return;
        }
        setData(d);
      })
      .catch(() => setDenied(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // igual sale
    }
    router.push("/marketplace");
    router.refresh();
  };

  if (denied) {
    return (
      <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "22px" }}>No pudimos cargar tu cuenta</h1>
          <Link href="/marketplace" style={{ color: C.violetBright }}>Volver al Marketplace</Link>
        </div>
        <style>{AUTH_CSS}</style>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.muted }}>Cargando tu cuenta...</div>
        <style>{AUTH_CSS}</style>
      </main>
    );
  }

  const initial = (data.user.name || data.user.email).trim().charAt(0).toUpperCase();

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "68px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "16px" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: 800, fontSize: "17px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crowlogo.png" alt="Crow" style={{ width: "32px", height: "32px", objectFit: "contain" }} />
          CROW
        </Link>
        <div style={{ marginLeft: "auto" }}>
          <AccountMenu />
        </div>
      </header>
      <section style={{ maxWidth: "760px", margin: "0 auto", padding: "44px 24px 80px" }}>
        <div className="crow-fade" style={{ display: "flex", gap: "18px", alignItems: "center", marginBottom: "32px", flexWrap: "wrap" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", fontWeight: 800 }}>
            {initial}
          </div>
          <div>
            <h1 style={{ fontSize: "26px", margin: 0, letterSpacing: "-0.5px" }}>{data.user.name}</h1>
            <div style={{ color: C.muted, fontSize: "13px", marginTop: "4px" }}>{data.user.email} · en Crow desde {data.user.createdAt.slice(0, 10)}</div>
          </div>
        </div>

        <h2 style={{ fontSize: "18px", margin: "0 0 6px" }}>Tus capacidades</h2>
        <p style={{ color: C.muted, fontSize: "13px", margin: "0 0 16px" }}>Una sola cuenta, un solo ID. Activa más cuando quieras, sin crear otra cuenta.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {ALL_ROLES.map((r) => {
            const active = data.roles.includes(r.id);
            return (
              <div key={r.id} style={{ display: "flex", gap: "14px", alignItems: "center", padding: "18px", borderRadius: "15px", border: active ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.08)", background: active ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.02)" }}>
                <span style={{ color: active ? C.violetBright : C.faint }}>{r.icon}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 800, fontSize: "15px" }}>{r.title}</span>
                  <span style={{ display: "block", color: C.muted, fontSize: "13px", marginTop: "2px" }}>{active ? "Activo en tu cuenta." : r.desc}</span>
                </span>
                {!active && (
                  <Link
                    href={`/onboarding?add=${r.id}`}
                    style={{ padding: "10px 18px", borderRadius: "10px", background: "#7c3aed", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: "13px", whiteSpace: "nowrap" }}
                  >
                    Activar
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {!data.onboardingCompleted && (
          <Link href="/onboarding" style={{ display: "block", textAlign: "center", marginTop: "20px", padding: "14px", borderRadius: "12px", border: "1px solid rgba(124,58,237,0.5)", color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: "14px" }}>
            Completar mi onboarding
          </Link>
        )}

        {data.roles.includes("creator") && <CreatorPageEditor />}

        <div style={{ display: "flex", gap: "10px", marginTop: "28px", flexWrap: "wrap" }}>
          <Link href="/marketplace" style={{ padding: "12px 22px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.12)", color: "#ddd", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>
            Marketplace
          </Link>
          <button onClick={() => void logout()} style={{ padding: "12px 22px", borderRadius: "11px", border: "1px solid rgba(239,68,68,0.4)", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: "14px", fontWeight: 700, fontFamily: FONT }}>
            Cerrar sesión
          </button>
        </div>
      </section>
      <style>{AUTH_CSS}</style>
    </main>
  );
}
