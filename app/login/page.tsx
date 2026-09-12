// ============================================
// LOGIN - entrada premium Crow
// ============================================

"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthShell,
  Divider,
  ErrorBox,
  Field,
  GoogleButton,
  PasswordField,
  PrimaryButton,
} from "@/app/components/auth-ui";

const REASONS: Record<string, string> = {
  INVALID_EMAIL: "Ingresá un email válido.",
  INVALID_CREDENTIALS: "Email o contraseña incorrectos.",
  SERVER_ERROR: "Error del servidor. Reintentá en unos segundos.",
};

function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const ret = search.get("return") ?? "/marketplace";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [forgot, setForgot] = useState(false);

  const submit = async (): Promise<void> => {
    if (!email.trim() || !password) {
      setError("Ingresá tu email y contraseña.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        user?: { onboardingCompleted?: boolean };
      };
      if (!data.ok) {
        setError(REASONS[data.reason ?? ""] ?? "No se pudo entrar. Reintentá.");
        return;
      }
      if (data.user && data.user.onboardingCompleted === false) {
        router.push("/onboarding");
        return;
      }
      router.push(ret.startsWith("/") ? ret : "/marketplace");
    } catch {
      setError("Error de red. Reintentá.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <AuthShell variant="login">
      <div className="crow-fade">
        <h1 style={{ fontSize: "30px", margin: "0 0 8px", letterSpacing: "-0.5px" }}>Bienvenido de nuevo</h1>
        <p style={{ color: "#9a9aa3", fontSize: "14px", margin: "0 0 8px", lineHeight: 1.6 }}>
          Entra a tu cuenta de Crow y continúa donde lo dejaste.
        </p>
      </div>
      <div className="crow-fade-1">
        <Field label="Email" id="login-email" value={email} onChange={setEmail} type="email" placeholder="vos@email.com" autoComplete="email" />
        <PasswordField label="Contraseña" id="login-pass" value={password} onChange={setPassword} autoComplete="current-password" />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <button
            type="button"
            onClick={() => setForgot(!forgot)}
            style={{ background: "transparent", border: "none", color: "#a855f7", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "8px 0" }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        {forgot && (
          <div style={{ marginTop: "4px", padding: "12px 14px", borderRadius: "11px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", fontSize: "13px", color: "#c4b5fd", lineHeight: 1.6 }}>
            La recuperación de contraseña estará disponible pronto. Si no puedes entrar, crea una cuenta nueva o contáctanos por el canal oficial de Crow.
          </div>
        )}
        <ErrorBox message={error} />
        <PrimaryButton onClick={() => void submit()} disabled={working} loading={working}>
          Iniciar sesión
        </PrimaryButton>
      </div>
      <div className="crow-fade-2">
        <GoogleButton />
        <Divider label="o" />
        <div style={{ textAlign: "center", fontSize: "14px", color: "#9a9aa3", marginTop: "14px" }}>
          ¿Todavía no tienes una cuenta?{" "}
          <Link href="/register" style={{ color: "#a855f7", fontWeight: 700, textDecoration: "none" }}>
            Crear cuenta
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}
