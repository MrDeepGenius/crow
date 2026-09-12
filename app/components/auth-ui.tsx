// ============================================
// AUTH UI - sistema visual premium compartido
// ============================================
// Login, Register y Onboarding comparten identidad: negro + violeta,
// split desktop / stacked mobile, animaciones sutiles. Sin fotos, sin emojis.

"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

export const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const C = {
  bg: "#050505",
  surface: "rgba(13,13,18,0.92)",
  border: "rgba(255,255,255,0.08)",
  input: "#0c0c0f",
  violet: "#7c3aed",
  violetDeep: "#6d28d9",
  violetBright: "#a855f7",
  muted: "#9a9aa3",
  faint: "#5b5b63",
  green: "#22c55e",
  red: "#f87171",
};

export const AUTH_CSS = `
@keyframes crowFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes crowFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes crowPulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes crowWords { 0%,100% { opacity: 0.35; } 50% { opacity: 1; } }
.crow-fade { animation: crowFadeUp 0.5s ease both; }
.crow-fade-1 { animation: crowFadeUp 0.5s ease 0.06s both; }
.crow-fade-2 { animation: crowFadeUp 0.5s ease 0.12s both; }
.crow-fade-3 { animation: crowFadeUp 0.5s ease 0.18s both; }
.crow-split { display: grid; grid-template-columns: 1.05fr 1fr; min-height: 100vh; }
.crow-brandcol { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; padding: 64px 56px; }
.crow-formcol { display: flex; align-items: center; justify-content: center; padding: 48px 32px; }
.crow-card { width: 100%; max-width: 440px; }
.crow-brand-mini { display: none; }
@media (max-width: 900px) {
  .crow-split { grid-template-columns: 1fr; }
  .crow-brandcol { display: none; }
  .crow-brand-mini { display: flex; }
  .crow-formcol { padding: 32px 20px 56px; align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .crow-fade, .crow-fade-1, .crow-fade-2, .crow-fade-3 { animation: none; }
}
`;

// ---------- Iconos lineales SVG (sin emojis) ----------

function Svg(props: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={props.size ?? 22}
      height={props.size ?? 22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function IconGrowth({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </Svg>
  );
}

export function IconBag({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M6 8h15l-1.5 12.5a1 1 0 0 1-1 .5H8.5a1 1 0 0 1-1-.5L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

export function IconSpark({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6" />
      <circle cx="12" cy="12" r="3.2" />
    </Svg>
  );
}

export function IconCheck({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M4 12.5l5 5L20 6.5" />
    </Svg>
  );
}

export function IconEye({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function IconEyeOff({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.9 3.9M6.6 6.6A16.6 16.6 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4.4-1" />
    </Svg>
  );
}

export function IconArrow({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  );
}

// ---------- Panel de branding ----------

const WORDS = ["Create.", "Sell.", "Grow."];

export function BrandPanel({ variant }: { variant: "login" | "register" }) {
  const [wi, setWi] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWi((i) => (i + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="crow-brandcol" style={{ background: "#07070b" }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(600px 420px at 30% 25%, rgba(124,58,237,0.22), transparent 65%), radial-gradient(500px 380px at 75% 80%, rgba(168,85,247,0.12), transparent 65%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(70% 70% at 40% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(70% 70% at 40% 40%, black, transparent)",
        }}
      />
      <div style={{ position: "relative", maxWidth: "460px" }}>
        <div style={{ marginBottom: "28px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crowlogo.png" alt="Crow Market" style={{ width: "76px", height: "76px", objectFit: "contain" }} />
        </div>
        <h2 style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: 1.25, margin: "0 0 12px", letterSpacing: "-0.5px" }}>
          {variant === "login" ? (
            <>El ecosistema para crear, vender y descubrir productos digitales.</>
          ) : (
            <>Crea tu cuenta. Construye tu próximo proyecto.</>
          )}
        </h2>
        <div style={{ display: "flex", gap: "18px", margin: "18px 0 34px", fontSize: "15px", fontWeight: 600, color: C.muted }}>
          {WORDS.map((w, i) => (
            <span
              key={w}
              style={{
                color: i === wi ? C.violetBright : C.faint,
                animation: i === wi ? "crowWords 2.2s ease infinite" : undefined,
                transition: "color 0.4s ease",
              }}
            >
              {w}
            </span>
          ))}
        </div>
        {variant === "login" ? <LoginVisual /> : <RegisterVisual />}
      </div>
    </div>
  );
}

function MiniCard({ top, left, title, sub, delay }: { top: string; left: string; title: string; sub: string; delay: string }) {
  return (
    <div
      className="crow-fade-2"
      style={{
        position: "absolute",
        top,
        left,
        background: "rgba(16,16,22,0.78)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: "14px",
        padding: "12px 16px",
        backdropFilter: "blur(10px)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.45)",
        animation: `crowFloat 6s ease-in-out infinite`,
        animationDelay: delay,
        minWidth: "168px",
      }}
    >
      <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff" }}>{title}</div>
      <div style={{ fontSize: "12px", color: C.muted, marginTop: "2px" }}>{sub}</div>
    </div>
  );
}

function LoginVisual() {
  return (
    <div style={{ position: "relative", height: "230px" }}>
      <div
        style={{
          position: "absolute",
          top: "24px",
          left: "8px",
          right: "8px",
          height: "150px",
          borderRadius: "18px",
          border: "1px solid rgba(124,58,237,0.25)",
          background: "linear-gradient(135deg, rgba(124,58,237,0.16), rgba(124,58,237,0.02))",
          boxShadow: "0 0 80px rgba(124,58,237,0.18)",
        }}
      />
      <MiniCard top="0" left="0" title="+38% ventas" sub="Marketplace · este mes" delay="0s" />
      <MiniCard top="78px" left="200px" title="Comisión $120" sub="Affiliate Center" delay="1.4s" />
      <MiniCard top="150px" left="60px" title="Nuevo curso" sub="Creator Studio" delay="2.6s" />
    </div>
  );
}

function RegisterVisual() {
  const cards = ["Creator Studio", "Marketplace", "Affiliate Center"];
  return (
    <div style={{ position: "relative", padding: "8px 0 8px 26px" }}>
      <div
        style={{
          position: "absolute",
          left: "8px",
          top: "22px",
          bottom: "22px",
          width: "2px",
          background: "linear-gradient(180deg, rgba(124,58,237,0.6), rgba(124,58,237,0.08))",
        }}
      />
      {cards.map((c, i) => (
        <div key={c} className={i === 0 ? "crow-fade-1" : i === 1 ? "crow-fade-2" : "crow-fade-3"} style={{ position: "relative", marginBottom: i < 2 ? "14px" : 0 }}>
          <div
            style={{
              position: "absolute",
              left: "-24px",
              top: "16px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#7c3aed",
              boxShadow: "0 0 16px rgba(124,58,237,0.9)",
              animation: "crowPulse 2.4s ease infinite",
            }}
          />
          <div
            style={{
              background: "rgba(16,16,22,0.78)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "14px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 700,
              backdropFilter: "blur(10px)",
              boxShadow: "0 14px 36px rgba(0,0,0,0.4)",
            }}
          >
            {c}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Shell / campos / botones ----------

export function AuthShell({ variant, children }: { variant: "login" | "register"; children: ReactNode }) {
  return (
    <main className="crow-split" style={{ background: C.bg, color: "#fff", fontFamily: FONT }}>
      <BrandPanel variant={variant} />
      <div className="crow-formcol">
        <div className="crow-card">
          <div className="crow-brand-mini" style={{ alignItems: "center", marginBottom: "24px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/crowlogo.png" alt="Crow Market" style={{ width: "56px", height: "56px", objectFit: "contain" }} />
          </div>
          {children}
        </div>
      </div>
      <style>{AUTH_CSS}</style>
    </main>
  );
}

export const labelStyle: React.CSSProperties = { display: "block", color: C.muted, fontSize: "12px", fontWeight: 600, marginBottom: "7px", marginTop: "14px" };

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label htmlFor={props.id} style={labelStyle}>{props.label}</label>
      <input
        id={props.id}
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: C.input,
          border: focus ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px",
          color: "#fff",
          padding: "13px 15px",
          fontSize: "15px",
          fontFamily: FONT,
          outline: "none",
          boxShadow: focus ? "0 0 0 3px rgba(124,58,237,0.22)" : "none",
          transition: "border 0.15s ease, box-shadow 0.15s ease",
        }}
      />
    </div>
  );
}

export function PasswordField(props: { label: string; value: string; onChange: (v: string) => void; autoComplete?: string; id?: string }) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <div>
      <label htmlFor={props.id} style={labelStyle}>{props.label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={props.id}
          type={show ? "text" : "password"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={props.autoComplete}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: C.input,
            border: focus ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            color: "#fff",
            padding: "13px 48px 13px 15px",
            fontSize: "15px",
            fontFamily: FONT,
            outline: "none",
            boxShadow: focus ? "0 0 0 3px rgba(124,58,237,0.22)" : "none",
            transition: "border 0.15s ease, box-shadow 0.15s ease",
          }}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: C.faint, cursor: "pointer", padding: "8px", minWidth: "44px", minHeight: "44px" }}
        >
          {show ? <IconEyeOff size={19} /> : <IconEye size={19} />}
        </button>
      </div>
    </div>
  );
}

export function PrimaryButton(props: { children: ReactNode; onClick: () => void; disabled?: boolean; loading?: boolean; noMargin?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        marginTop: props.noMargin ? 0 : "22px",
        padding: "15px",
        borderRadius: "13px",
        border: "none",
        background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
        color: "#fff",
        fontWeight: 800,
        cursor: props.disabled ? "not-allowed" : "pointer",
        fontSize: "15px",
        fontFamily: FONT,
        opacity: props.disabled ? 0.55 : 1,
        transform: hover && !props.disabled ? "translateY(-1px)" : "none",
        boxShadow: hover && !props.disabled ? "0 14px 36px rgba(124,58,237,0.45)" : "0 8px 24px rgba(124,58,237,0.28)",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
        minHeight: "52px",
      }}
    >
      {props.loading ? "Procesando..." : props.children}
    </button>
  );
}

export function GoogleButton() {
  return (
    <div style={{ marginTop: "12px" }}>
      <button
        disabled
        title="Disponible próximamente"
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "13px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
          color: C.faint,
          fontWeight: 700,
          cursor: "not-allowed",
          fontSize: "14px",
          fontFamily: FONT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          minHeight: "52px",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#8a8a93" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.2c1.9-1.8 3-4.4 3-7.5z" />
          <path fill="#6b6b74" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.7A10 10 0 0 0 12 22z" />
          <path fill="#55555e" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.4H3.1a10 10 0 0 0 0 9.2l3.3-2.7z" />
          <path fill="#8a8a93" d="M12 5.9c1.5 0 2.8.5 3.8 1.5L18.7 4A10 10 0 0 0 3.1 7.4l3.3 2.7c.8-2.4 3-4.2 5.6-4.2z" />
        </svg>
        Continuar con Google
      </button>
      <div style={{ textAlign: "center", color: C.faint, fontSize: "11px", marginTop: "6px" }}>Login con Google disponible próximamente</div>
    </div>
  );
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" style={{ marginTop: "14px", padding: "12px 14px", borderRadius: "11px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "13px", color: "#fca5a5" }}>
      {message}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0 4px" }}>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
      <span style={{ color: C.faint, fontSize: "12px" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div style={{ marginBottom: "26px" }}>
      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        {steps.map((s, i) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: "4px",
              borderRadius: "2px",
              background: i < current ? "#7c3aed" : i === current ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)",
              boxShadow: i <= current ? "0 0 12px rgba(124,58,237,0.4)" : "none",
              transition: "background 0.3s ease",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {steps.map((s, i) => (
          <span
            key={s}
            style={{
              fontSize: "11px",
              fontWeight: i === current ? 800 : 400,
              color: i === current ? C.violetBright : i < current ? C.muted : C.faint,
              marginRight: "12px",
            }}
          >
            {String(i + 1).padStart(2, "0")} {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RoleCard(props: {
  selected: boolean;
  onToggle: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={props.onToggle}
      aria-pressed={props.selected}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "18px",
        borderRadius: "15px",
        border: props.selected ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.09)",
        background: props.selected ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)",
        color: "#fff",
        cursor: "pointer",
        fontFamily: FONT,
        boxShadow: props.selected ? "0 0 28px rgba(124,58,237,0.22)" : hover ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
        transform: hover ? "translateY(-1px)" : "none",
        transition: "all 0.15s ease",
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
      }}
    >
      <span style={{ color: props.selected ? C.violetBright : C.faint, marginTop: "2px", flexShrink: 0 }}>{props.icon}</span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 800, fontSize: "15px" }}>{props.title}</span>
        <span style={{ display: "block", color: C.muted, fontSize: "13px", marginTop: "4px", lineHeight: 1.5 }}>{props.desc}</span>
      </span>
      <span
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          border: props.selected ? "none" : "1.5px solid rgba(255,255,255,0.2)",
          background: props.selected ? "#7c3aed" : "transparent",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {props.selected && <IconCheck size={14} />}
      </span>
    </button>
  );
}

export function ChipGroup(props: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  label: string;
}) {
  const toggle = (opt: string): void => {
    props.onChange(
      props.selected.includes(opt) ? props.selected.filter((s) => s !== opt) : [...props.selected, opt]
    );
  };
  return (
    <div style={{ marginTop: "18px" }}>
      <div style={{ color: "#fff", fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>{props.label}</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} role="group" aria-label={props.label}>
        {props.options.map((opt) => {
          const active = props.selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              aria-pressed={active}
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                border: active ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
                background: active ? "rgba(124,58,237,0.16)" : "rgba(255,255,255,0.02)",
                color: active ? "#fff" : C.muted,
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: FONT,
                boxShadow: active ? "0 0 18px rgba(124,58,237,0.25)" : "none",
                transition: "all 0.13s ease",
                minHeight: "44px",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SingleGroup(props: {
  options: readonly string[];
  selected: string;
  onChange: (next: string) => void;
  label: string;
}) {
  return (
    <div style={{ marginTop: "18px" }}>
      <div style={{ color: "#fff", fontSize: "14px", fontWeight: 700, marginBottom: "10px" }}>{props.label}</div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} role="radiogroup" aria-label={props.label}>
        {props.options.map((opt) => {
          const active = props.selected === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => props.onChange(opt)}
              style={{
                padding: "10px 16px",
                borderRadius: "12px",
                border: active ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
                background: active ? "rgba(124,58,237,0.16)" : "rgba(255,255,255,0.02)",
                color: active ? "#fff" : C.muted,
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: FONT,
                boxShadow: active ? "0 0 18px rgba(124,58,237,0.25)" : "none",
                transition: "all 0.13s ease",
                minHeight: "44px",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: C.violetBright, fontSize: "13px", textDecoration: "none", fontWeight: 600 }}>
      {children}
    </Link>
  );
}
