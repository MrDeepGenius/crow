// ============================================
// REGISTER - cuenta única Crow
// ============================================

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthShell,
  Divider,
  ErrorBox,
  Field,
  GoogleButton,
  PasswordField,
  PrimaryButton,
  C,
} from "@/app/components/auth-ui";

const REASONS: Record<string, string> = {
  INVALID_EMAIL: "Ingresá un email válido.",
  INVALID_NAME: "Ingresá tu nombre (mín. 2 caracteres).",
  WEAK_PASSWORD: "La contraseña debe tener al menos 8 caracteres.",
  PASSWORD_MISMATCH: "Las contraseñas no coinciden.",
  TERMS_REQUIRED: "Debes aceptar los términos y condiciones.",
  EMAIL_TAKEN: "Ese email ya tiene cuenta. Iniciá sesión.",
  SERVER_ERROR: "Error del servidor. Reintentá en unos segundos.",
};

function RegisterClient() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const valid =
    firstName.trim().length >= 2 &&
    /.+@.+\..+/.test(email.trim()) &&
    password.length >= 8 &&
    password === confirm &&
    terms;

  const submit = async (): Promise<void> => {
    if (!valid) {
      if (!terms) setError(REASONS.TERMS_REQUIRED ?? "Acepta los términos.");
      else if (password !== confirm) setError(REASONS.PASSWORD_MISMATCH ?? "No coinciden.");
      else setError("Revisá los campos marcados.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, password, confirmPassword: confirm, termsAccepted: terms }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (!data.ok) {
        setError(REASONS[data.reason ?? ""] ?? "No se pudo crear la cuenta. Reintentá.");
        return;
      }
      router.push("/onboarding");
    } catch {
      setError("Error de red. Reintentá.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <AuthShell variant="register">
      <div className="crow-fade">
        <h1 style={{ fontSize: "30px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Crea tu cuenta</h1>
        <p style={{ color: "#9a9aa3", fontSize: "14px", margin: "0 0 8px", lineHeight: 1.6 }}>
          Tu ecosistema digital empieza acá.
        </p>
      </div>
      <div className="crow-fade-1">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
          <Field label="Nombre" id="reg-first" value={firstName} onChange={setFirstName} placeholder="Ada" autoComplete="given-name" />
          <Field label="Apellido" id="reg-last" value={lastName} onChange={setLastName} placeholder="Lovelace" autoComplete="family-name" />
        </div>
        <Field label="Email" id="reg-email" value={email} onChange={setEmail} type="email" placeholder="vos@email.com" autoComplete="email" />
        <PasswordField label="Contraseña" id="reg-pass" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Confirmar contraseña" id="reg-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "16px", cursor: "pointer", fontSize: "13px", color: "#9a9aa3", lineHeight: 1.6 }}>
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            style={{ width: "20px", height: "20px", marginTop: "1px", accentColor: "#7c3aed", cursor: "pointer", flexShrink: 0 }}
          />
          <span>
            Acepto los términos y condiciones y la política de privacidad.
          </span>
        </label>
        <ErrorBox message={error} />
        <PrimaryButton onClick={() => void submit()} disabled={working || !valid} loading={working}>
          Crear mi cuenta
        </PrimaryButton>
      </div>
      <div className="crow-fade-2">
        <GoogleButton />
        <Divider label="o" />
        <div style={{ textAlign: "center", fontSize: "14px", color: "#9a9aa3", marginTop: "14px" }}>
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" style={{ color: "#a855f7", fontWeight: 700, textDecoration: "none" }}>
            Iniciar sesión
          </Link>
        </div>
        <div style={{ textAlign: "center", fontSize: "12px", color: C.faint, marginTop: "14px" }}>
          Una sola cuenta para comprar, promocionar y crear.
        </div>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterClient />
    </Suspense>
  );
}
