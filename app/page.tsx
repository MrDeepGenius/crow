"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AnimatedBackground from "./components/AnimatedBackground";

const FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const VIOLET = "#7c3aed";
const VIOLET_BRIGHT = "#a855f7";
const MUTED = "#9c9ca6";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, position: "relative", overflow: "hidden" }}>
      <AnimatedBackground />
      <div style={{ position: "relative", zIndex: 1 }}>
        <LandingNav scrolled={scrolled} />
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <AffiliateSection />
        <CreatorSection />
        <CTASection />
        <LandingFooter />
      </div>
      <style>{LANDING_CSS}</style>
    </main>
  );
}

// ============ NAV ============
function LandingNav({ scrolled }: { scrolled: boolean }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: "70px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 5%",
        background: scrolled ? "rgba(5,5,5,0.88)" : "rgba(5,5,5,0.5)",
        backdropFilter: "blur(16px)",
        borderBottom: scrolled ? "1px solid rgba(124,58,237,0.15)" : "1px solid transparent",
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/crowlogo.png" alt="Crow" style={{ height: "38px", width: "auto", objectFit: "contain" }} />
      </Link>

      <div className="lp-nav-links" style={{ display: "flex", gap: "32px", fontSize: "14px" }}>
        <a href="#como-funciona" style={{ color: MUTED, textDecoration: "none", transition: "color 0.15s" }}>Cómo funciona</a>
        <a href="#afiliados" style={{ color: MUTED, textDecoration: "none", transition: "color 0.15s" }}>Afiliados</a>
        <a href="#creadores" style={{ color: MUTED, textDecoration: "none", transition: "color 0.15s" }}>Creadores</a>
        <Link href="/marketplace" style={{ color: MUTED, textDecoration: "none", transition: "color 0.15s" }}>Marketplace</Link>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <Link href="/login" className="lp-btn-ghost" style={{ color: "#fff", textDecoration: "none", fontSize: "14px", padding: "10px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", transition: "border-color 0.15s" }}>
          Iniciar sesión
        </Link>
        <Link href="/register" className="lp-btn-primary" style={{ background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_BRIGHT})`, color: "#fff", textDecoration: "none", fontSize: "14px", fontWeight: "bold", padding: "11px 22px", borderRadius: "10px", boxShadow: "0 4px 24px rgba(124,58,237,0.3)", transition: "transform 0.15s, box-shadow 0.15s" }}>
          Registrarse gratis
        </Link>
      </div>
    </nav>
  );
}

// ============ HERO ============
function HeroSection() {
  return (
    <section style={{ padding: "70px 5% 60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: "1200px", width: "100%", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "60px", alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "30px", border: "1px solid rgba(150,80,255,0.3)", background: "rgba(130,50,255,0.08)", color: "#c7a7ff", fontSize: "13px", marginBottom: "24px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
            Plataforma todo-en-uno para creadores digitales
          </div>

          <h1 style={{ fontSize: "clamp(40px, 5.5vw, 72px)", lineHeight: 1.02, margin: 0, fontWeight: 800, letterSpacing: "-2px" }}>
            Crea, vende y
            <br />
            <span style={{ background: "linear-gradient(90deg, #b88cff, #8b5cf6, #e879f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              gana con IA.
            </span>
          </h1>

          <p style={{ color: MUTED, fontSize: "18px", lineHeight: 1.7, maxWidth: "520px", marginTop: "24px" }}>
            Desde una idea hasta un producto terminado. Crea cursos, ebooks y experiencias digitales con inteligencia artificial, publícalos en el marketplace y construye tu red de afiliados.
          </p>

          <div style={{ display: "flex", gap: "14px", marginTop: "36px", flexWrap: "wrap" }}>
            <Link href="/register" className="lp-btn-primary" style={{ background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_BRIGHT})`, color: "#fff", textDecoration: "none", borderRadius: "14px", padding: "16px 30px", fontSize: "16px", fontWeight: "bold", boxShadow: "0 0 35px rgba(124,58,237,0.3)", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              Crear cuenta gratis →
            </Link>
            <a href="#como-funciona" className="lp-btn-ghost" style={{ color: "#fff", textDecoration: "none", borderRadius: "14px", padding: "16px 26px", fontSize: "15px", border: "1px solid rgba(255,255,255,0.12)", display: "inline-flex", alignItems: "center", gap: "8px" }}>
              ▶ Ver cómo funciona
            </a>
          </div>

          <div style={{ display: "flex", gap: "28px", marginTop: "40px", flexWrap: "wrap" }}>
            {[
              { n: "30%", l: "Comisión afiliado" },
              { n: "5 niveles", l: "Ganancias residuales" },
              { n: "0%", l: "Costo de inicio" },
            ].map((s) => (
              <div key={s.l}>
                <div style={{ fontSize: "26px", fontWeight: 800, color: VIOLET_BRIGHT }}>{s.n}</div>
                <div style={{ color: MUTED, fontSize: "12px", marginTop: "2px" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Studio Mockup */}
        <div className="lp-hero-card" style={{ borderRadius: "22px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,15,18,0.9)", boxShadow: "0 0 80px rgba(124,58,237,0.15)", overflow: "hidden" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>✦</div>
            <div>
              <strong style={{ fontSize: "14px" }}>Crow Create Studio</strong>
              <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>Intelligence Engine</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: "11px", color: "#4ade80" }}>● Online</div>
          </div>
          <div style={{ padding: "22px" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "16px", color: "#ddd", lineHeight: 1.6, fontSize: "14px" }}>
              <div style={{ color: "#a78bfa", fontSize: "11px", marginBottom: "6px", fontWeight: "bold" }}>CROW AI</div>
              ¡Hola! ¿Qué producto digital te gustaría crear?
            </div>
            <div style={{ marginTop: "14px", marginLeft: "12%", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "14px", padding: "16px", color: "#ddd", fontSize: "14px" }}>
              Quiero un curso de ventas en TikTok.
            </div>
            <div style={{ marginTop: "14px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "16px", fontSize: "14px" }}>
              <div style={{ color: "#a78bfa", fontSize: "11px", marginBottom: "6px", fontWeight: "bold" }}>CROW AI</div>
              ¡Perfecto! Generando estructura...
              <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                {[{ l: "Módulos", v: "4" }, { l: "Lecciones", v: "10" }, { l: "Formato", v: "Web" }].map((x) => (
                  <div key={x.l} style={{ background: "rgba(0,0,0,0.4)", padding: "10px", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#666" }}>{x.l}</div>
                    <div style={{ fontWeight: "bold", fontSize: "15px" }}>{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ STATS BAR ============
function StatsBar() {
  const stats = [
    { n: "+10K", l: "Productos creados" },
    { n: "+50K", l: "Ventas procesadas" },
    { n: "+5K", l: "Afiliados activos" },
    { n: "4.8★", l: "Rating promedio" },
  ];
  return (
    <section style={{ padding: "40px 5%", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,10,14,0.5)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: "20px" }}>
        {stats.map((s) => (
          <div key={s.l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: 800, background: "linear-gradient(90deg, #b88cff, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{s.n}</div>
            <div style={{ color: MUTED, fontSize: "13px", marginTop: "4px" }}>{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============ HOW IT WORKS ============
function HowItWorks() {
  const steps = [
    { icon: "✦", title: "Crea con IA", desc: "Describe tu idea y Crow IA genera un producto completo: estructura, contenido y diseño. Cursos, ebooks, kits y más.", color: "#8b5cf6" },
    { icon: "◈", title: "Publica en el marketplace", desc: "Sube tu producto al marketplace con un clic. Optimización automática de SEO, portadas y descripciones.", color: "#a855f7" },
    { icon: "♢", title: "Vende y gana", desc: "Recibe pagos directamente. Construye tu red de afiliados y genera ingresos residuales en 5 niveles.", color: "#e879f9" },
  ];
  return (
    <section id="como-funciona" style={{ padding: "90px 5%", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "60px" }}>
        <div style={{ color: VIOLET_BRIGHT, fontSize: "13px", fontWeight: "bold", letterSpacing: "2px" }}>CÓMO FUNCIONA</div>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 46px)", margin: "12px 0 8px", fontWeight: 800, letterSpacing: "-1px" }}>De la idea a la venta en 3 pasos</h2>
        <p style={{ color: MUTED, fontSize: "17px", maxWidth: "600px", margin: "0 auto" }}>Sin código, sin equipo técnico. Crow hace el trabajo pesado por vos.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "24px" }}>
        {steps.map((s, i) => (
          <div key={s.title} className="lp-step-card" style={{ padding: "36px 28px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: `radial-gradient(circle, ${s.color}15, transparent 70%)` }} />
            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: `linear-gradient(135deg, ${s.color}30, ${s.color}10)`, border: `1px solid ${s.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "20px" }}>{s.icon}</div>
            <div style={{ position: "absolute", top: "24px", right: "28px", fontSize: "60px", fontWeight: 800, color: "rgba(255,255,255,0.04)" }}>{i + 1}</div>
            <h3 style={{ fontSize: "20px", margin: "0 0 10px" }}>{s.title}</h3>
            <p style={{ color: MUTED, lineHeight: 1.65, fontSize: "14px", margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============ AFFILIATE SECTION ============
function AffiliateSection() {
  return (
    <section id="afiliados" style={{ padding: "90px 5%", background: "rgba(10,10,14,0.6)", borderTop: "1px solid rgba(124,58,237,0.08)", borderBottom: "1px solid rgba(124,58,237,0.08)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px", borderRadius: "30px", border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)", color: "#fbbf24", fontSize: "13px", marginBottom: "16px" }}>
            ♢ Programa de afiliados
          </div>
          <h2 style={{ fontSize: "clamp(32px, 4vw, 46px)", margin: "0 0 12px", fontWeight: 800, letterSpacing: "-1px" }}>Gana dinero recomendando productos</h2>
          <p style={{ color: MUTED, fontSize: "17px", maxWidth: "620px", margin: "0 auto" }}>El programa de afiliados más generoso del mercado. Comisiones directas del 30% y residuales de 5 niveles.</p>
        </div>

        {/* Commission split visual */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", alignItems: "center", marginBottom: "60px" }}>
          <div>
            <h3 style={{ fontSize: "22px, margin: 0 0 20px" }}>¿Cómo se reparte una venta?</h3>
            <p style={{ color: MUTED, fontSize: "15px", lineHeight: 1.7, marginBottom: "24px" }}>
              Cuando un producto se vende, la plataforma divide automáticamente el pago. Vos como afiliado directo te llevás el 30%, y si tenés una red, ganás residuales hasta 5 niveles de profundidad.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { label: "Creador del producto", pct: 45, color: "#8b5cf6" },
                { label: "Afiliado directo (vos)", pct: 30, color: "#22c55e" },
                { label: "Crow (plataforma)", pct: 10, color: "#6366f1" },
                { label: "Residuales (5 niveles)", pct: 13, color: "#f59e0b" },
                { label: "Reserva Crow", pct: 2, color: "#5c5c66" },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "120px", fontSize: "13px", color: MUTED, flexShrink: 0 }}>{r.label}</div>
                  <div style={{ flex: 1, height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", overflow: "hidden", position: "relative" }}>
                    <div style={{ height: "100%", width: `${r.pct}%`, borderRadius: "8px", background: `linear-gradient(90deg, ${r.color}, ${r.color}cc)`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "8px", fontSize: "12px", fontWeight: "bold", color: "#fff", transition: "width 0.6s ease" }}>
                      {r.pct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Residual levels visual */}
          <div className="lp-aff-card" style={{ borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,15,18,0.9)", padding: "32px" }}>
            <div style={{ fontSize: "13px", color: VIOLET_BRIGHT, fontWeight: "bold", marginBottom: "6px" }}>GANANCIAS RESIDUALES</div>
            <h3 style={{ fontSize: "20px", margin: "0 0 20px" }}>5 niveles de profundidad</h3>
            <p style={{ color: MUTED, fontSize: "13px", lineHeight: 1.6, marginBottom: "24px" }}>
              Cuando alguien de tu red hace una venta, vos también ganás. Así se distribuyen los residuales:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { lvl: "Nivel 1", pct: "5%", desc: "Venta directa de tu referido" },
                { lvl: "Nivel 2", pct: "3%", desc: "Venta del referido de tu referido" },
                { lvl: "Nivel 3", pct: "2%", desc: "Tercer nivel de tu red" },
                { lvl: "Nivel 4", pct: "2%", desc: "Cuarto nivel de tu red" },
                { lvl: "Nivel 5", pct: "1%", desc: "Quinto nivel de tu red" },
              ].map((r, i) => (
                <div key={r.lvl} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginLeft: `${i * 12}px` }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: `rgba(124,58,237,${0.25 - i * 0.04})`, border: "1px solid rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "bold", flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>{r.lvl} <span style={{ color: "#22c55e", marginLeft: "8px" }}>{r.pct}</span></div>
                    <div style={{ fontSize: "11px", color: MUTED }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CP Points system */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
          <div className="lp-feature-card" style={{ padding: "28px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🪙</div>
            <h4 style={{ fontSize: "17px", margin: "0 0 8px" }}>Crow Points (CP)</h4>
            <p style={{ color: MUTED, fontSize: "14px", lineHeight: 1.6, margin: 0 }}>Acumulás 1 CP por cada USDT válido en ventas. Los CP desbloquean recompensas, suben tu nivel y aumentan tu participación en el Rewards Pool.</p>
          </div>
          <div className="lp-feature-card" style={{ padding: "28px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>🔓</div>
            <h4 style={{ fontSize: "17px", margin: "0 0 8px" }}>Desbloqueo de niveles</h4>
            <p style={{ color: MUTED, fontSize: "14px", lineHeight: 1.6, margin: 0 }}>Tu nivel 1 nace bloqueado. Tu primera venta propia válida lo desbloquea y activa tus ganancias residuales automáticamente.</p>
          </div>
          <div className="lp-feature-card" style={{ padding: "28px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
            <div style={{ fontSize: "28px", marginBottom: "12px" }}>💎</div>
            <h4 style={{ fontSize: "17px", margin: "0 0 8px" }}>Rewards Pool</h4>
            <p style={{ color: MUTED, fontSize: "14px", lineHeight: 1.6, margin: 0 }}>Cada licencia aporta 2% al Rewards Pool. Los afiliados con más CP reclaman recompensas exclusivas del pool de forma periódica.</p>
          </div>
        </div>

        {/* License tiers */}
        <div>
          <h3 style={{ fontSize: "22px", margin: "0 0 20px", textAlign: "center" }}>Licencias que potencian tus ganancias</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            {[
              { name: "Start", price: "$20", perk: "Acceso comprador · 1 CP/USDT" },
              { name: "Basic", price: "$50", perk: "Soporte prioritario" },
              { name: "Pro", price: "$100", perk: "Herramientas pro" },
              { name: "Business", price: "$300", perk: "Uso en equipo" },
              { name: "Elite", price: "$500", perk: "Acceso anticipado" },
            ].map((t, i) => (
              <div key={t.name} className="lp-tier-card" style={{ padding: "22px 18px", borderRadius: "16px", border: i === 2 ? `1px solid ${VIOLET}55` : "1px solid rgba(255,255,255,0.08)", background: i === 2 ? `linear-gradient(135deg, ${VIOLET}15, rgba(15,15,18,1))` : "rgba(255,255,255,0.025)", textAlign: "center", position: "relative" }}>
                {i === 2 && <div style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", padding: "3px 12px", borderRadius: "10px", background: VIOLET, fontSize: "10px", fontWeight: "bold" }}>POPULAR</div>}
                <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "6px" }}>{t.name}</div>
                <div style={{ fontSize: "26px", fontWeight: 800, color: VIOLET_BRIGHT, marginBottom: "8px" }}>{t.price}</div>
                <div style={{ fontSize: "12px", color: MUTED }}>{t.perk}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <Link href="/register" className="lp-btn-primary" style={{ background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_BRIGHT})`, color: "#fff", textDecoration: "none", borderRadius: "14px", padding: "16px 36px", fontSize: "16px", fontWeight: "bold", boxShadow: "0 0 35px rgba(124,58,237,0.3)", display: "inline-block" }}>
            Quiero ser afiliado →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============ CREATOR SECTION ============
function CreatorSection() {
  return (
    <section id="creadores" style={{ padding: "90px 5%", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
        <div>
          <div style={{ color: VIOLET_BRIGHT, fontSize: "13px", fontWeight: "bold", letterSpacing: "2px", marginBottom: "12px" }}>PARA CREADORES</div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 42px), margin: 0 0 16px", fontWeight: 800, letterSpacing: "-1px" }}>Tu estudio de creación con IA</h2>
          <p style={{ color: MUTED, fontSize: "16px", lineHeight: 1.7, marginBottom: "28px" }}>
            Crow Create Studio convierte tu idea en un producto digital profesional. Estructura el contenido, genera las lecciones, crea la portada y lo publica. Todo en minutos.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { icon: "✦", t: "Generación automática", d: "Cursos, ebooks, PDFs y kits desde una idea" },
              { icon: "◈", t: "Marketplace integrado", d: "Publica con un clic y llega a miles de compradores" },
              { icon: "♢", t: "Red de afiliados", d: "Otros venden por vos y vos ganás de cada venta" },
              { icon: "◉", t: "Panel de creador", d: "Métricas, ventas y ganancias en tiempo real" },
            ].map((f) => (
              <div key={f.t} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "15px" }}>{f.t}</div>
                  <div style={{ color: MUTED, fontSize: "13px", marginTop: "2px" }}>{f.d}</div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/create" className="lp-btn-primary" style={{ marginTop: "32px", background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_BRIGHT})`, color: "#fff", textDecoration: "none", borderRadius: "14px", padding: "16px 30px", fontSize: "15px", fontWeight: "bold", display: "inline-block" }}>
            Empezar a crear →
          </Link>
        </div>

        <div className="lp-creator-card" style={{ borderRadius: "22px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,15,18,0.9)", padding: "30px", boxShadow: "0 0 60px rgba(124,58,237,0.1)" }}>
          <div style={{ fontSize: "13px", color: VIOLET_BRIGHT, fontWeight: "bold", marginBottom: "20px" }}>PANEL DEL CREADOR</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "24px" }}>
            {[
              { l: "Ventas totales", v: "$12,450", c: "#22c55e" },
              { l: "Este mes", v: "$3,200", c: "#8b5cf6" },
              { l: "Afiliados", v: "47", c: "#f59e0b" },
              { l: "Rating", v: "4.8★", c: "#fbbf24" },
            ].map((s) => (
              <div key={s.l} style={{ padding: "18px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: "11px", color: MUTED, marginBottom: "6px" }}>{s.l}</div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "13px", color: MUTED, marginBottom: "10px" }}>Ventas por día (últimos 7 días)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px", padding: "12px 0" }}>
            {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "6px 6px 0 0", background: `linear-gradient(180deg, ${VIOLET_BRIGHT}, ${VIOLET}40)`, transition: "height 0.4s ease" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: MUTED, marginTop: "4px" }}>
            {["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============ CTA ============
function CTASection() {
  return (
    <section style={{ padding: "80px 5%", background: "rgba(124,58,237,0.06)", borderTop: "1px solid rgba(124,58,237,0.1)" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(32px, 4vw, 48px), margin: 0 0 16px", fontWeight: 800, letterSpacing: "-1px" }}>
          Empezá a ganar hoy.
        </h2>
        <p style={{ color: MUTED, fontSize: "18px", lineHeight: 1.6, marginBottom: "36px" }}>
          Únete a miles de creadores y afiliados que ya están generando ingresos con Crow Market. Registrarse es gratis.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="lp-btn-primary" style={{ background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_BRIGHT})`, color: "#fff", textDecoration: "none", borderRadius: "14px", padding: "18px 40px", fontSize: "17px", fontWeight: "bold", boxShadow: "0 0 40px rgba(124,58,237,0.35)", display: "inline-block" }}>
            Registrarse gratis →
          </Link>
          <Link href="/login" className="lp-btn-ghost" style={{ color: "#fff", textDecoration: "none", borderRadius: "14px", padding: "18px 36px", fontSize: "16px", border: "1px solid rgba(255,255,255,0.15)", display: "inline-block" }}>
            Ya tengo cuenta
          </Link>
        </div>
        <div style={{ marginTop: "28px", color: MUTED, fontSize: "13px" }}>
          ✓ Sin costo de registro &nbsp; ✓ Sin tarjeta de crédito &nbsp; ✓ Listo en 2 minutos
        </div>
      </div>
    </section>
  );
}

// ============ FOOTER ============
function LandingFooter() {
  return (
    <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "40px 5%", background: "rgba(5,5,5,0.8)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crowlogo.png" alt="Crow" style={{ height: "32px", width: "auto", objectFit: "contain" }} />
            <span style={{ fontWeight: "bold", fontSize: "17px" }}>CROW</span>
          </div>
          <p style={{ color: MUTED, fontSize: "13px", lineHeight: 1.6, maxWidth: "300px" }}>La plataforma todo-en-uno para crear, vender y ganar con productos digitales e inteligencia artificial.</p>
        </div>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "14px" }}>Producto</div>
          {["Marketplace", "Crear", "Afiliados", "Precios"].map((l) => <div key={l} style={{ marginBottom: "8px" }}><a href="#" style={{ color: MUTED, fontSize: "13px", textDecoration: "none" }}>{l}</a></div>)}
        </div>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "14px" }}>Empresa</div>
          {["Sobre nosotros", "Blog", "Carreras", "Contacto"].map((l) => <div key={l} style={{ marginBottom: "8px" }}><a href="#" style={{ color: MUTED, fontSize: "13px", textDecoration: "none" }}>{l}</a></div>)}
        </div>
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "14px" }}>Legal</div>
          {["Términos", "Privacidad", "Cookies", "Soporte"].map((l) => <div key={l} style={{ marginBottom: "8px" }}><a href="#" style={{ color: MUTED, fontSize: "13px", textDecoration: "none" }}>{l}</a></div>)}
        </div>
      </div>
      <div style={{ maxWidth: "1200px", margin: "30px auto 0", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px", display: "flex", justifyContent: "space-between", color: MUTED, fontSize: "13px" }}>
        <span>Crow Market © 2026</span>
        <span>Hecho con IA ✦</span>
      </div>
    </footer>
  );
}

// ============ CSS ============
const LANDING_CSS = `
.lp-btn-primary:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 40px rgba(124,58,237,0.45) !important; }
.lp-btn-ghost:hover { border-color: rgba(124,58,237,0.4) !important; background: rgba(124,58,237,0.05); }
.lp-nav-links a:hover { color: #fff !important; }
.lp-step-card { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
.lp-step-card:hover { transform: translateY(-4px); border-color: rgba(124,58,237,0.3); box-shadow: 0 16px 44px rgba(124,58,237,0.1); }
.lp-feature-card { transition: transform 0.25s ease, border-color 0.25s ease; }
.lp-feature-card:hover { transform: translateY(-3px); border-color: rgba(124,58,237,0.25); }
.lp-tier-card { transition: transform 0.2s ease, border-color 0.2s ease; }
.lp-tier-card:hover { transform: translateY(-3px); border-color: rgba(124,58,237,0.35); }
.lp-aff-card { transition: border-color 0.25s ease, box-shadow 0.25s ease; }
.lp-aff-card:hover { border-color: rgba(124,58,237,0.25); box-shadow: 0 12px 40px rgba(124,58,237,0.08); }
.lp-creator-card { transition: border-color 0.25s ease, box-shadow 0.25s ease; }
.lp-creator-card:hover { border-color: rgba(124,58,237,0.2); }
.lp-hero-card { animation: lpFloat 6s ease-in-out infinite; }
@keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@media (prefers-reduced-motion: reduce) { .lp-hero-card, .lp-step-card, .lp-feature-card, .lp-tier-card, .lp-aff-card, .lp-creator-card { animation: none !important; transition: none !important; } }
@media (max-width: 900px) {
  .lp-nav-links { display: none !important; }
}
`;
