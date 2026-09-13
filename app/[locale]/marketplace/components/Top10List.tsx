"use client";

import Link from "next/link";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { MK, FONT, RatingStars, FormatBadge } from "./market-ui";

export function Top10List({ products }: { products: ProductPublication[] }) {
  const top10 = [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 10);

  if (top10.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "18px" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "6px" }}>Sin productos en el ranking todavía</div>
        <div style={{ color: MK.muted, fontSize: "13px" }}>Los productos más vendidos aparecerán aquí automáticamente.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {top10.map((p, i) => {
        const rank = i + 1;
        const isPodium = rank <= 3;
        const medalColor = rank === 1 ? "#f5c86e" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : MK.faint;
        return (
          <Link
            key={p.id}
            href={`/marketplace/product/${p.slug}`}
            className="mk-card"
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "center",
              padding: "14px 18px",
              borderRadius: "16px",
              border: isPodium ? `1px solid ${medalColor}55` : "1px solid rgba(255,255,255,0.08)",
              background: isPodium
                ? `linear-gradient(135deg, ${medalColor}11 0%, rgba(13,13,18,1) 60%)`
                : "#0D0D12",
              textDecoration: "none",
              color: "#fff",
              transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            {/* Rank badge */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "bold",
                flexShrink: 0,
                background: isPodium ? `${medalColor}22` : "rgba(255,255,255,0.05)",
                color: isPodium ? medalColor : MK.muted,
                border: isPodium ? `1px solid ${medalColor}44` : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {rank}
            </div>

            {/* Cover thumbnail */}
            <div style={{ width: "64px", height: "48px", borderRadius: "10px", overflow: "hidden", flexShrink: 0, background: "#111118" }}>
              {p.coverSvg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/svg+xml;utf8,${encodeURIComponent(p.coverSvg)}`}
                  alt={`Portada de ${p.title}`}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: MK.violetBright, fontSize: "10px", fontWeight: "bold", letterSpacing: "2px" }}>
                  CROW
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <FormatBadge format={p.format} />
                {isPodium && (
                  <span style={{ fontSize: "10px", fontWeight: "bold", padding: "2px 8px", borderRadius: "8px", background: `${medalColor}22`, color: medalColor }}>
                    {rank === 1 ? "#1 BESTSELLER" : `TOP ${rank}`}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: MK.muted, fontSize: "12px" }}>
                <span>Por {p.creatorName}</span>
                <RatingStars sum={p.ratingSum} count={p.ratingCount} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>{p.price.amount} {p.price.currency}</div>
              <div style={{ color: MK.faint, fontSize: "12px" }}>
                {p.salesCount > 0 ? `${formatSales(p.salesCount)} ventas` : "Sin ventas"}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function formatSales(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}
