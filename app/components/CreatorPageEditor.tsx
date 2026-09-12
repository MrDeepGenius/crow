// ============================================
// PHOTO UPLOADER + CREATOR PAGE EDITOR (compartidos)
// ============================================
// Se usan en Mi cuenta, panel de creador y panel de afiliado: una sola
// implementación de subida para toda la app.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { C, FONT } from "@/app/components/auth-ui";

export function PhotoUploader(props: {
  currentUrl: string | null;
  name: string;
  uploadUrl: string;
  compact?: boolean;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const upload = async (file: File): Promise<void> => {
    if (file.size > 2 * 1024 * 1024) {
      setMsg("La imagen debe pesar como máximo 2MB.");
      return;
    }
    setUploading(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(props.uploadUrl, { method: "POST", body: form });
      const data = (await res.json()) as { ok: boolean; reason?: string; avatarUrl?: string };
      if (!data.ok || !data.avatarUrl) {
        setMsg(
          data.reason === "FILE_TOO_LARGE"
            ? "La imagen debe pesar como máximo 2MB."
            : data.reason === "INVALID_IMAGE"
              ? "Subí una imagen JPG, PNG o WebP válida."
              : data.reason === "ROLE_REQUIRED"
                ? "Necesitas el rol creador para esta foto."
                : "No se pudo subir la foto."
        );
        return;
      }
      props.onUploaded(data.avatarUrl);
      setMsg("Foto actualizada.");
    } catch {
      setMsg("Error de red. Reintentá.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
      {props.currentUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={props.currentUrl} alt={`Foto de ${props.name}`} style={{ width: props.compact ? "56px" : "72px", height: props.compact ? "56px" : "72px", borderRadius: "50%", objectFit: "cover", border: "2px solid #7c3aed" }} />
      ) : (
        <div style={{ width: props.compact ? "56px" : "72px", height: props.compact ? "56px" : "72px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: props.compact ? "22px" : "28px", fontWeight: 800 }}>
          {(props.name || "?").charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <label style={{ display: "inline-block", padding: "11px 20px", borderRadius: "11px", border: "1px solid rgba(255,255,255,0.14)", background: "transparent", color: "#ddd", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
          {uploading ? "Subiendo..." : "Subir foto"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
            style={{ display: "none" }}
          />
        </label>
        <div style={{ color: C.faint, fontSize: "12px", marginTop: "6px" }}>JPG, PNG o WebP · máx 2MB</div>
      </div>
      {msg && <div style={{ width: "100%", fontSize: "13px", color: msg === "Foto actualizada." ? "#22c55e" : "#f87171" }}>{msg}</div>}
    </div>
  );
}

export function CreatorPageEditor() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    void fetch("/api/account/creator-page")
      .then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<{ ok: boolean; page?: { slug: string; displayName: string; bio: string; avatarUrl: string | null } }>;
      })
      .then((data) => {
        if (data?.ok && data.page) {
          setDisplayName(data.page.displayName);
          setBio(data.page.bio);
          setSlug(data.page.slug);
          setAvatarUrl(data.page.avatarUrl);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = async (): Promise<void> => {
    if (displayName.trim().length < 2) {
      setMsg("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    setWorking(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/creator-page", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, bio }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; page?: { slug: string; avatarUrl: string | null } };
      if (!data.ok || !data.page) {
        setMsg(
          data.reason === "ROLE_REQUIRED"
            ? "Necesitas el rol creador: activalo en Mi cuenta → Tus capacidades."
            : "No se pudo guardar. Reintentá."
        );
        return;
      }
      setSlug(data.page.slug);
      setAvatarUrl(data.page.avatarUrl);
      setMsg("Página pública guardada.");
    } catch {
      setMsg("Error de red. Reintentá.");
    } finally {
      setWorking(false);
    }
  };

  if (!loaded) return null;

  return (
    <div style={{ marginTop: "32px", padding: "22px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <h2 style={{ fontSize: "18px", margin: "0 0 6px", fontFamily: FONT }}>Tu página pública de creador</h2>
      <p style={{ color: C.muted, fontSize: "13px", margin: "0 0 18px", lineHeight: 1.6 }}>
        Así te ven los compradores desde tus productos.
        {slug && (
          <> <Link href={`/marketplace/creator/${slug}`} style={{ color: C.violetBright, fontWeight: 700 }}>Ver mi página →</Link></>
        )}
      </p>
      <div style={{ marginBottom: "18px" }}>
        <PhotoUploader currentUrl={avatarUrl} name={displayName} uploadUrl="/api/account/creator-page/avatar" onUploaded={setAvatarUrl} />
      </div>
      <label style={{ display: "block", color: C.muted, fontSize: "12px", fontWeight: 600, marginBottom: "7px" }}>Nombre público</label>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Tu nombre o marca"
        maxLength={60}
        style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "11px", color: "#fff", padding: "12px 14px", fontSize: "14px", fontFamily: FONT, outline: "none", marginBottom: "12px" }}
      />
      <label style={{ display: "block", color: C.muted, fontSize: "12px", fontWeight: 600, marginBottom: "7px" }}>Descripción</label>
      <textarea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Contá quién eres y qué creas..."
        maxLength={500}
        rows={3}
        style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "11px", color: "#fff", padding: "12px 14px", fontSize: "14px", fontFamily: FONT, outline: "none", resize: "vertical" }}
      />
      {msg && <div style={{ fontSize: "13px", marginTop: "10px", color: msg === "Página pública guardada." ? "#22c55e" : "#f87171" }}>{msg}</div>}
      <button
        onClick={() => void save()}
        disabled={working}
        style={{ marginTop: "14px", padding: "12px 26px", borderRadius: "11px", border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "#fff", fontWeight: 800, cursor: working ? "wait" : "pointer", fontSize: "14px", opacity: working ? 0.6 : 1 }}
      >
        {working ? "Guardando..." : "Guardar página pública"}
      </button>
    </div>
  );
}
