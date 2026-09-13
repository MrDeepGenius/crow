// ============================================
// BACK BUTTON - botón "Volver" reutilizable
// ============================================

"use client";

import { useRouter } from "next/navigation";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export function BackButton({ fallback = "/marketplace" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "10px",
        color: "#c4c4cc",
        padding: "8px 14px",
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 600,
        fontFamily: FONT,
        transition: "border-color 0.15s ease, color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
        e.currentTarget.style.color = "#fff";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
        e.currentTarget.style.color = "#c4c4cc";
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Volver
    </button>
  );
}
