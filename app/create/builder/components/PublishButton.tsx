// Botón compartido "Publicar en Marketplace" (mismo flujo, sin duplicar).

import Link from "next/link";

export function PublishButton({ from, label }: { from: string; label?: string }) {
  return (
    <Link
      href={`/marketplace/publish?from=${from}`}
      style={{
        display: "inline-block",
        padding: "14px 22px",
        borderRadius: "12px",
        border: "none",
        background: "rgba(124,58,237,0.2)",
        color: "#a855f7",
        fontWeight: "bold",
        textDecoration: "none",
        fontSize: "14px",
      }}
    >
      {label ?? "Publicar en Marketplace"}
    </Link>
  );
}
