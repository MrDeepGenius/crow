// ============================================
// ACCOUNT MENU - avatar + dropdown por sesión
// ============================================

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { C, FONT } from "@/app/components/auth-ui";

interface Me {
  email: string;
  name: string;
  avatarPath?: string | null;
  roles?: string[];
}

export function AccountMenu() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ ok: boolean; user?: Me | null }>)
      .then((data) => {
        setMe(data.user ?? null);
        setChecked(true);
      })
      .catch(() => {
        setMe(null);
        setChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent): void => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open ]);

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // igual se cierra la vista local
    }
    setMe(null);
    setOpen(false);
    router.push("/marketplace");
    router.refresh();
  };

  if (!checked) return <span style={{ width: "90px" }} />;

  if (!me) {
    return (
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <Link href="/login" style={{ color: C.muted, textDecoration: "none", fontSize: "14px", fontFamily: FONT, whiteSpace: "nowrap" }}>
          Iniciar sesión
        </Link>
        <Link
          href="/register"
          style={{ padding: "10px 18px", borderRadius: "10px", background: C.violet, color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "13px", fontFamily: FONT, whiteSpace: "nowrap" }}
        >
          Crear cuenta
        </Link>
      </div>
    );
  }

  const roles = me.roles ?? [];
  const initial = (me.name || me.email).trim().charAt(0).toUpperCase() || "C";
  const items: { href: string; label: string }[] = [
    { href: "/account", label: "Mi cuenta" },
    { href: "/my-products", label: "Mis productos" },
    { href: "/marketplace", label: "Marketplace" },
  ];
  if (roles.includes("affiliate")) items.push({ href: "/affiliates", label: "Affiliate Center" });
  if (roles.includes("creator")) items.push({ href: "/create", label: "Creator Studio" });
  items.push({ href: "/account", label: "Configuración" });

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Abrir menú de cuenta"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: open ? "2px solid #7c3aed" : "1px solid rgba(255,255,255,0.15)",
          background: me.avatarPath ? "transparent" : "linear-gradient(135deg, #7c3aed, #4c1d95)",
          color: "#fff",
          fontWeight: 800,
          fontSize: "16px",
          cursor: "pointer",
          fontFamily: FONT,
          boxShadow: open ? "0 0 18px rgba(124,58,237,0.5)" : "none",
          transition: "box-shadow 0.15s ease",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {me.avatarPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.avatarPath} alt="Tu foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "48px",
            minWidth: "230px",
            background: "rgba(13,13,18,0.98)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "14px",
            padding: "8px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            zIndex: 100,
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: "6px" }}>
            <div style={{ fontWeight: 800, fontSize: "14px", color: "#fff", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis" }}>{me.name}</div>
            <div style={{ color: C.muted, fontSize: "12px", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis" }}>{me.email}</div>
          </div>
          {items.map((it) => (
            <Link
              key={it.label + it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              role="menuitem"
              style={{ display: "block", padding: "11px 14px", borderRadius: "9px", color: "#ddd", textDecoration: "none", fontSize: "14px", fontFamily: FONT }}
            >
              {it.label}
            </Link>
          ))}
          <button
            onClick={() => void logout()}
            role="menuitem"
            style={{ display: "block", width: "100%", textAlign: "left", padding: "11px 14px", borderRadius: "9px", background: "transparent", border: "none", color: "#f87171", cursor: "pointer", fontSize: "14px", fontFamily: FONT }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
