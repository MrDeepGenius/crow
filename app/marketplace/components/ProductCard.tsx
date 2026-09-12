// ============================================
// PRODUCT CARD PREMIUM - misma props, nuevo diseño
// ============================================

import Link from "next/link";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { FavoriteButton, FormatBadge, MK, RatingStars } from "./market-ui";

export function ProductCard({ product: p, badge }: { product: ProductPublication; badge?: "Bestseller" | "Nuevo" | null }) {
  const computed: "Bestseller" | "Nuevo" | null =
    badge ?? (isNew(p.publishedAt) ? "Nuevo" : null);
  const discount =
    p.previousPrice && p.previousPrice.amount > p.price.amount
      ? Math.round((1 - p.price.amount / p.previousPrice.amount) * 100)
      : 0;
  return (
    <Link
      href={`/marketplace/product/${p.slug}`}
      className="mk-card"
      style={{
        display: "block",
        borderRadius: "18px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#0D0D12",
        textDecoration: "none",
        color: "#fff",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "16 / 10", background: "#111118", overflow: "hidden" }}>
        {p.coverSvg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`data:image/svg+xml;utf8,${encodeURIComponent(p.coverSvg)}`}
            alt={`Portada de ${p.title}`}
            loading="lazy"
            className="mk-zoom"
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(80% 100% at 50% 0%, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0) 70%)" }}>
            <span style={{ color: MK.violetBright, fontWeight: "bold", fontSize: "13px", letterSpacing: "3px" }}>
              CROW
            </span>
          </div>
        )}
        <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px" }}>
          <span style={{ fontSize: "10px", fontWeight: "bold", padding: "4px 10px", borderRadius: "10px", background: "rgba(0,0,0,0.55)", color: "#fff", letterSpacing: "0.5px" }}>
            <FormatBadge format={p.format} />
          </span>
          {computed && (
            <span style={{ fontSize: "10px", fontWeight: "bold", padding: "4px 10px", borderRadius: "10px", background: computed === "Bestseller" ? "rgba(245,158,11,0.85)" : "rgba(34,197,94,0.85)", color: computed === "Bestseller" ? "#000" : "#fff" }}>
              {computed}
            </span>
          )}
        </div>
        <div style={{ position: "absolute", top: "8px", right: "8px" }}>
          <FavoriteButton productId={p.id} />
        </div>
      </div>
      <div style={{ padding: "16px 16px 18px" }}>
        <div style={{ fontWeight: "bold", fontSize: "15px", marginBottom: "4px", lineHeight: 1.4 }}>{p.title}</div>
        <div style={{ color: MK.muted, fontSize: "13px", marginBottom: "10px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {p.shortDescription}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <RatingStars sum={p.ratingSum} count={p.ratingCount} />
          {p.salesCount > 0 && (
            <span style={{ fontSize: "12px", color: MK.faint }}>{formatSales(p.salesCount)} ventas</span>
          )}
        </div>
        <div style={{ color: MK.faint, fontSize: "12px", marginBottom: "12px" }}>Por {p.creatorName}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span style={{ fontWeight: "bold", fontSize: "17px" }}>{p.price.amount} {p.price.currency}</span>
          {discount > 0 && p.previousPrice && (
            <>
              <span style={{ fontSize: "12px", color: MK.faint, textDecoration: "line-through" }}>
                {p.previousPrice.amount} {p.previousPrice.currency}
              </span>
              <span style={{ fontSize: "11px", fontWeight: "bold", color: MK.green }}>-{discount}%</span>
            </>
          )}
        </div>
        <div style={{ marginTop: "12px", textAlign: "center", fontSize: "13px", fontWeight: "bold", color: MK.violetBright }}>
          Ver producto
        </div>
      </div>
    </Link>
  );
}

function isNew(publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  return Date.now() - new Date(publishedAt).getTime() < 14 * 24 * 3600 * 1000;
}

function formatSales(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}
