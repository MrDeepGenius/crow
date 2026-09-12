import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Programa de afiliados · Crow Market",
  description: "Generá ganancias en dólares como afiliado y con tu red hasta 3 niveles.",
};

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export default function AffiliateProgramPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "20px", background: "rgba(5,5,5,0.85)" }}>
        <Link href="/marketplace" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "#fff", fontWeight: "bold", fontSize: "18px" }}>
          <img src="/crowlogo.png" alt="Crow" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          Crow Market
        </Link>
        <nav style={{ display: "flex", gap: "16px", fontSize: "14px", marginLeft: "auto" }}>
          <Link href="/affiliates" style={{ color: "#a855f7", textDecoration: "none", fontWeight: "bold" }}>Affiliate Center</Link>
          <Link href="/marketplace" style={{ color: "#aaa", textDecoration: "none" }}>Marketplace</Link>
        </nav>
      </header>

      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "72px 24px 40px", textAlign: "center" }}>
        <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "2px", marginBottom: "16px" }}>
          CONVIERTE TU RED EN UNA NUEVA FUENTE DE INGRESOS
        </div>
        <h1 style={{ fontSize: "clamp(34px, 5.5vw, 58px)", margin: "0 0 16px", letterSpacing: "-1px", lineHeight: 1.1 }}>
          Empezá a generar ganancias en dólares como afiliado
        </h1>
        <p style={{ color: "#a1a1aa", fontSize: "17px", maxWidth: "640px", margin: "0 auto 32px", lineHeight: 1.7 }}>
          Promocioná productos digitales que ya existen en Crow Market, compartí tu enlace y recibí comisiones por las ventas que generes.
        </p>
        <Link href="/affiliates" style={{ display: "inline-block", padding: "16px 36px", borderRadius: "14px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "16px", boxShadow: "0 12px 40px rgba(124,58,237,0.35)" }}>
          Convertirme en afiliado →
        </Link>
      </section>

      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 24px 40px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(24px, 3.5vw, 34px)", margin: "0 0 12px" }}>
          Y tu red también puede generar ingresos para vos.
        </h2>
        <p style={{ color: "#a1a1aa", fontSize: "15px", maxWidth: "620px", margin: "0 auto 32px", lineHeight: 1.7 }}>
          Cuando otros afiliados de tu equipo realizan ventas, recibís <strong style={{ color: "#fff" }}>comisiones residuales en hasta 3 niveles de profundidad</strong>.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", textAlign: "left" }}>
          {[
            { n: "NIVEL 1", pct: "5%", desc: "Comisión residual por cada venta de tus invitados directos.", delay: "0s" },
            { n: "NIVEL 2", pct: "3%", desc: "Cuando los invitados de tus invitados venden.", delay: "0.15s" },
            { n: "NIVEL 3", pct: "2%", desc: "Tercer nivel de profundidad de tu red.", delay: "0.3s" },
          ].map((t) => (
            <div key={t.n} className="tier-card" style={{ padding: "28px 24px", borderRadius: "20px", background: "radial-gradient(120% 140% at 50% 0%, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0) 60%), #0c0c10", border: "1px solid rgba(124,58,237,0.3)", animationDelay: t.delay }}>
              <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold", letterSpacing: "2px", marginBottom: "8px" }}>{t.n}</div>
              <div style={{ fontSize: "48px", fontWeight: "bold", marginBottom: "8px" }}>{t.pct}</div>
              <div style={{ color: "#a1a1aa", fontSize: "14px" }}>{t.desc}</div>
              <div style={{ color: "#63636b", fontSize: "12px", marginTop: "6px" }}>de comisión residual</div>
            </div>
          ))}
        </div>
        <p style={{ color: "#63636b", fontSize: "12px", marginTop: "16px" }}>
          Los residuales (5+3+2) se financian con el 10% de plataforma. Tu 40% por venta directa no cambia.
        </p>
      </section>

      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 24px 40px" }}>
        <div style={{ padding: "32px", borderRadius: "20px", background: "linear-gradient(120deg, rgba(124,58,237,0.22) 0%, rgba(76,29,149,0.15) 60%, rgba(124,58,237,0.05) 100%)", border: "1px solid rgba(124,58,237,0.3)", textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>Tú vendes. Tu red crece. Crow hace el seguimiento.</div>
          <p style={{ color: "#d8ccf5", fontSize: "14px", margin: "0 0 20px" }}>
            Cada venta se registra automáticamente y las comisiones se distribuyen según la estructura.
          </p>
          <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap", fontSize: "13px", color: "#d8ccf5" }}>
            <span>Click →</span>
            <span>Atribución →</span>
            <span>Venta →</span>
            <span>Comisión</span>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: "1000px", margin: "0 auto", padding: "8px 24px 80px", textAlign: "center" }}>
        <h2 style={{ fontSize: "26px", margin: "0 0 12px" }}>¿Querés empezar?</h2>
        <Link href="/affiliates" style={{ display: "inline-block", padding: "16px 36px", borderRadius: "14px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "16px", boxShadow: "0 12px 40px rgba(124,58,237,0.35)" }}>
          Convertirme en afiliado →
        </Link>
      </section>
      <style>{`
        .tier-card { animation: tierIn 0.6s ease both; transition: transform 0.18s ease, border-color 0.18s ease; }
        .tier-card:hover { transform: translateY(-4px); border-color: rgba(124,58,237,0.55); }
        @keyframes tierIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .tier-card { animation: none !important; } }
      `}</style>
    </main>
  );
}
