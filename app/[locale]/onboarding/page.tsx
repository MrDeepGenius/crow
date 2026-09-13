// ============================================
// ONBOARDING - ¿Cómo quieres usar Crow?
// ============================================

"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AUTH_CSS,
  C,
  ChipGroup,
  ErrorBox,
  Field,
  FONT,
  IconBag,
  IconGrowth,
  IconSpark,
  PrimaryButton,
  RoleCard,
  SingleGroup,
  Stepper,
} from "@/app/components/auth-ui";
import {
  AFFILIATE_CHANNELS,
  AFFILIATE_EXPERIENCE,
  AFFILIATE_GOALS,
  BUYER_FORMATS,
  BUYER_GOALS,
  CATEGORIES,
  CREATOR_EXPERIENCE,
  CREATOR_HAS_BRAND,
  CREATOR_HAS_PRODUCTS,
  CREATOR_TYPES,
} from "@/app/components/onboarding-options";

type Role = "buyer" | "affiliate" | "creator";

interface Profiles {
  affiliate?: Record<string, unknown> | null;
  buyer?: Record<string, unknown> | null;
  creator?: Record<string, unknown> | null;
}

const STEPS = ["Cuenta", "Tu experiencia", "Personalización", "Listo"];

const ROLE_META: { id: Role; title: string; desc: string; icon: ReactNode }[] = [
  { id: "affiliate", title: "Quiero ganar como afiliado", desc: "Promociona productos de otros creadores y gana comisiones.", icon: <IconGrowth /> },
  { id: "buyer", title: "Quiero comprar", desc: "Descubre cursos, ebooks, herramientas, PDFs y productos digitales.", icon: <IconBag /> },
  { id: "creator", title: "Quiero crear y vender", desc: "Crea productos digitales con Crow Create Studio y véndelos en Crow Market.", icon: <IconSpark /> },
];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function OnboardingClient() {
  const router = useRouter();
  const search = useSearchParams();
  const addParam = search.get("add");
  const addRole: Role | null = addParam === "affiliate" || addParam === "buyer" || addParam === "creator" ? addParam : null;

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeTab, setActiveTab] = useState<Role>("buyer");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // Formularios
  const [affCategories, setAffCategories] = useState<string[]>([]);
  const [affExp, setAffExp] = useState("");
  const [affChannels, setAffChannels] = useState<string[]>([]);
  const [affGoal, setAffGoal] = useState("");
  const [buyCategories, setBuyCategories] = useState<string[]>([]);
  const [buyFormats, setBuyFormats] = useState<string[]>([]);
  const [buyGoals, setBuyGoals] = useState<string[]>([]);
  const [creTypes, setCreTypes] = useState<string[]>([]);
  const [creNiche, setCreNiche] = useState("");
  const [creHasProducts, setCreHasProducts] = useState("");
  const [creExp, setCreExp] = useState("");
  const [creHasBrand, setCreHasBrand] = useState("");
  const [creBrandName, setCreBrandName] = useState("");
  const [creBrandDesc, setCreBrandDesc] = useState("");

  const hydrate = (p: Profiles): void => {
    const aff = p.affiliate ?? {};
    setAffCategories(arr(aff.categories));
    setAffExp(str(aff.experience));
    setAffChannels(arr(aff.channels));
    setAffGoal(str(aff.goal));
    const buy = p.buyer ?? {};
    setBuyCategories(arr(buy.categories));
    setBuyFormats(arr(buy.formats));
    setBuyGoals(arr(buy.goals));
    const cre = p.creator ?? {};
    setCreTypes(arr(cre.productTypes));
    setCreNiche(str(cre.niche));
    setCreHasProducts(str(cre.hasProducts));
    setCreExp(str(cre.experience));
    setCreHasBrand(str(cre.hasBrand));
    setCreBrandName(str(cre.brandName));
    setCreBrandDesc(str(cre.brandDescription));
  };

  useEffect(() => {
    void fetch("/api/onboarding")
      .then((r) => {
        if (r.status === 401) {
          router.push("/login?return=/onboarding");
          return null;
        }
        return r.json() as Promise<{
          ok: boolean;
          user?: { name: string; email: string };
          roles?: Role[];
          onboardingCompleted?: boolean;
          profiles?: Profiles;
        }>;
      })
      .then((data) => {
        if (!data || !data.ok) return;
        setUserName(data.user?.name ?? "");
        setUserEmail(data.user?.email ?? "");
        const serverRoles = (data.roles ?? []).filter((r): r is Role => r === "buyer" || r === "affiliate" || r === "creator");
        const serverProfiles = data.profiles ?? {};
        hydrate(serverProfiles);
        if (addRole) {
          const next = [...new Set([...serverRoles, addRole])];
          setRoles(next);
          setActiveTab(addRole);
          setStep(1);
        } else if (serverRoles.length > 0) {
          setRoles(serverRoles);
          setActiveTab(serverRoles[0] ?? "buyer");
          setStep(data.onboardingCompleted ? 3 : 1);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const post = async (payload: Record<string, unknown>): Promise<{ ok: boolean; reason?: string; roles?: Role[] }> => {
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      router.push("/login?return=/onboarding");
      return { ok: false, reason: "UNAUTHENTICATED" };
    }
    return (await res.json()) as { ok: boolean; reason?: string; roles?: Role[] };
  };

  const toggleRole = (r: Role): void => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    setError(null);
  };

  const saveRoles = async (): Promise<boolean> => {
    if (roles.length === 0) {
      setError("Elegí al menos una opción para continuar.");
      return false;
    }
    setWorking(true);
    setError(null);
    try {
      const data = await post({ step: "roles", roles });
      if (!data.ok) {
        setError("No se pudieron guardar tus opciones. Reintentá.");
        return false;
      }
      if (data.roles) setRoles(data.roles.filter((r): r is Role => r === "buyer" || r === "affiliate" || r === "creator"));
      return true;
    } catch {
      setError("Error de red. Reintentá.");
      return false;
    } finally {
      setWorking(false);
    }
  };

  const saveCurrentProfile = async (): Promise<boolean> => {
    const role = activeTab;
    setWorking(true);
    setError(null);
    try {
      let payload: Record<string, unknown>;
      if (role === "affiliate") {
        if (affCategories.length === 0 || !affExp || affChannels.length === 0 || !affGoal) {
          setError("Completá todas las preguntas de afiliado.");
          return false;
        }
        payload = { step: "affiliate", data: { categories: affCategories, experience: affExp, channels: affChannels, goal: affGoal } };
      } else if (role === "buyer") {
        if (buyCategories.length === 0 || buyFormats.length === 0 || buyGoals.length === 0) {
          setError("Elegí al menos una opción en cada pregunta.");
          return false;
        }
        payload = { step: "buyer", data: { categories: buyCategories, formats: buyFormats, goals: buyGoals } };
      } else {
        if (creTypes.length === 0 || !creNiche.trim() || !creHasProducts || !creExp || !creHasBrand) {
          setError("Completá todas las preguntas de creador.");
          return false;
        }
        if (creHasBrand === "Sí" && !creBrandName.trim()) {
          setError("Ingresá el nombre de tu marca o proyecto.");
          return false;
        }
        payload = {
          step: "creator",
          data: {
            productTypes: creTypes,
            niche: creNiche.trim(),
            hasProducts: creHasProducts,
            experience: creExp,
            hasBrand: creHasBrand,
            brandName: creBrandName.trim(),
            brandDescription: creBrandDesc.trim(),
          },
        };
      }
      const data = await post(payload);
      if (!data.ok) {
        setError("No se pudo guardar. Revisá los campos e intentá de nuevo.");
        return false;
      }
      return true;
    } catch {
      setError("Error de red. Reintentá.");
      return false;
    } finally {
      setWorking(false);
    }
  };

  const nextFromPersonalization = async (): Promise<void> => {
    const ok = await saveCurrentProfile();
    if (!ok) return;
    const idx = roles.indexOf(activeTab);
    if (idx < roles.length - 1) {
      const next = roles[idx + 1] as Role;
      setActiveTab(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const finish = async (): Promise<void> => {
    setWorking(true);
    setError(null);
    try {
      const data = await post({ step: "complete" });
      if (!data.ok) {
        setError("Todavía falta completar algún perfil.");
        return;
      }
      router.push(addRole ? "/account" : "/marketplace");
    } catch {
      setError("Error de red. Reintentá.");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: C.muted }}>Cargando tu experiencia...</div>
        <style>{AUTH_CSS}</style>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: C.bg, color: "#fff", fontFamily: FONT }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 24px 80px" }}>
        <div className="crow-fade" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crowlogo.png" alt="Crow" style={{ width: "34px", height: "34px", objectFit: "contain" }} />
          <span style={{ fontWeight: 800, fontSize: "17px", letterSpacing: "3px" }}>CROW</span>
        </div>
        <Stepper steps={STEPS} current={step} />

        {step === 0 && (
          <div className="crow-fade-1">
            <h1 style={{ fontSize: "30px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Tu cuenta está creada{userName ? `, ${userName.split(" ")[0]}` : ""}.</h1>
            <p style={{ color: C.muted, fontSize: "14px", margin: "0 0 8px", lineHeight: 1.6 }}>
              Usás Crow como <strong style={{ color: "#fff" }}>{userEmail}</strong>. Ahora personalicemos tu experiencia: una sola cuenta para todo.
            </p>
            <ErrorBox message={error} />
            <PrimaryButton onClick={() => setStep(1)} disabled={working}>
              Continuar
            </PrimaryButton>
          </div>
        )}

        {step === 1 && (
          <div className="crow-fade-1">
            <h1 style={{ fontSize: "30px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>¿Cómo quieres usar Crow?</h1>
            <p style={{ color: C.muted, fontSize: "14px", margin: "0 0 22px", lineHeight: 1.6 }}>
              Puedes elegir una o varias opciones. Siempre podrás cambiarlo después.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ROLE_META.map((r) => (
                <RoleCard
                  key={r.id}
                  selected={roles.includes(r.id)}
                  onToggle={() => toggleRole(r.id)}
                  icon={r.icon}
                  title={r.title}
                  desc={r.desc}
                />
              ))}
            </div>
            <ErrorBox message={error} />
            <PrimaryButton
              onClick={() => void saveRoles().then((ok) => {
                if (ok) {
                  setActiveTab(roles[0] ?? "buyer");
                  setStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              })}
              disabled={working || roles.length === 0}
              loading={working}
            >
              Continuar
            </PrimaryButton>
          </div>
        )}

        {step === 2 && (
          <div className="crow-fade-1">
            {roles.length > 1 && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }} role="tablist" aria-label="Perfiles">
                {roles.map((r) => (
                  <button
                    key={r}
                    role="tab"
                    aria-selected={activeTab === r}
                    onClick={() => setActiveTab(r)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: activeTab === r ? "1px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
                      background: activeTab === r ? "rgba(124,58,237,0.16)" : "transparent",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: activeTab === r ? 700 : 400,
                      fontFamily: FONT,
                      minHeight: "44px",
                    }}
                  >
                    {r === "affiliate" ? "Afiliado" : r === "buyer" ? "Comprador" : "Creador"}
                  </button>
                ))}
              </div>
            )}

            {activeTab === "affiliate" && (
              <div>
                <h1 style={{ fontSize: "28px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Cuéntanos sobre tu experiencia como afiliado</h1>
                <ChipGroup label="¿Qué categorías te interesa promocionar?" options={CATEGORIES} selected={affCategories} onChange={setAffCategories} />
                <SingleGroup label="Experiencia" options={AFFILIATE_EXPERIENCE} selected={affExp} onChange={setAffExp} />
                <ChipGroup label="¿Dónde piensas promocionar productos?" options={AFFILIATE_CHANNELS} selected={affChannels} onChange={setAffChannels} />
                <SingleGroup label="¿Cuál es tu objetivo?" options={AFFILIATE_GOALS} selected={affGoal} onChange={setAffGoal} />
              </div>
            )}

            {activeTab === "buyer" && (
              <div>
                <h1 style={{ fontSize: "28px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Personalicemos tu experiencia</h1>
                <ChipGroup label="¿Qué categorías te interesan?" options={CATEGORIES} selected={buyCategories} onChange={setBuyCategories} />
                <ChipGroup label="¿Qué productos buscas?" options={BUYER_FORMATS} selected={buyFormats} onChange={setBuyFormats} />
                <ChipGroup label="¿Qué quieres conseguir usando Crow?" options={BUYER_GOALS} selected={buyGoals} onChange={setBuyGoals} />
              </div>
            )}

            {activeTab === "creator" && (
              <div>
                <h1 style={{ fontSize: "28px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Vamos a construir algo increíble</h1>
                <ChipGroup label="¿Qué tipo de productos quieres crear?" options={CREATOR_TYPES} selected={creTypes} onChange={setCreTypes} />
                <Field label="¿Cuál es tu nicho o temática?" id="cre-niche" value={creNiche} onChange={setCreNiche} placeholder="Ej: finanzas personales para jóvenes" />
                <SingleGroup label="¿Ya tienes productos creados?" options={CREATOR_HAS_PRODUCTS} selected={creHasProducts} onChange={setCreHasProducts} />
                <SingleGroup label="¿Tienes experiencia vendiendo productos digitales?" options={CREATOR_EXPERIENCE} selected={creExp} onChange={setCreExp} />
                <SingleGroup label="¿Tienes una marca o proyecto?" options={CREATOR_HAS_BRAND} selected={creHasBrand} onChange={setCreHasBrand} />
                {creHasBrand === "Sí" && (
                  <div className="crow-fade-1">
                    <Field label="Nombre de marca/proyecto" id="cre-brand" value={creBrandName} onChange={setCreBrandName} placeholder="Mi marca" />
                    <Field label="Descripción breve (opcional)" id="cre-brand-desc" value={creBrandDesc} onChange={setCreBrandDesc} placeholder="Qué haces y para quién" />
                    <p style={{ color: C.faint, fontSize: "12px", marginTop: "8px" }}>El logo podrás configurarlo después desde tu cuenta.</p>
                  </div>
                )}
              </div>
            )}

            <ErrorBox message={error} />
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                onClick={() => setStep(1)}
                style={{ padding: "15px 22px", borderRadius: "13px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#aaa", cursor: "pointer", fontSize: "14px", fontWeight: 700, fontFamily: FONT, minHeight: "52px" }}
              >
                Atrás
              </button>
              <div style={{ flex: 1 }}>
                <PrimaryButton noMargin onClick={() => void nextFromPersonalization()} disabled={working} loading={working}>
                  Continuar
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="crow-fade-1" style={{ textAlign: "center", paddingTop: "24px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#22c55e", fontSize: "30px", fontWeight: 800 }}>
              ✓
            </div>
            <h1 style={{ fontSize: "30px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Tu espacio Crow está listo.</h1>
            <p style={{ color: C.muted, fontSize: "14px", margin: "0 0 24px", lineHeight: 1.6 }}>
              Ahora puedes explorar el marketplace, crear productos o empezar a generar ingresos como afiliado.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "8px" }}>
              {roles.includes("buyer") && <Capability label="Marketplace" href="/marketplace" />}
              {roles.includes("affiliate") && <Capability label="Affiliate Center" href="/affiliates" />}
              {roles.includes("creator") && <Capability label="Creator Studio" href="/create" />}
            </div>
            <ErrorBox message={error} />
            <PrimaryButton onClick={() => void finish()} disabled={working} loading={working}>
              Entrar a Crow
            </PrimaryButton>
          </div>
        )}
      </div>
      <style>{AUTH_CSS}</style>
    </main>
  );
}

function Capability({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "11px 18px",
        borderRadius: "12px",
        border: "1px solid rgba(124,58,237,0.4)",
        background: "rgba(124,58,237,0.1)",
        color: "#fff",
        fontSize: "13px",
        fontWeight: 700,
        textDecoration: "none",
      }}
    >
      <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span> {label}
    </a>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingClient />
    </Suspense>
  );
}
