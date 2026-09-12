// ============================================
// CHECKOUT USDT BEP20 - pago real verificado on-chain
// ============================================
// Usuario AUTENTICADO: la orden la crea el servidor con el userId de la
// sesión. El frontend nunca elige ni manipula identidad, montos ni estados.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { getPublicationBySlug, logEvent } from "@/app/services/marketplace/marketStore";
import type { ProductPublication } from "@/app/services/marketplace/marketTypes";
import { AccountMenu } from "@/app/components/AccountMenu";

const FONT: string = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface Quote {
  qid: string;
  orderId: string;
  amount: number;
  currency: string;
  treasury: string;
  chainId: number;
  issuedAt: string;
  exp: string;
  sig: string;
}

interface PaymentInfo {
  provider: string;
  chain: string;
  network?: string;
  chainId: number;
  token: string;
  standard?: string;
  tokenContract: string;
  treasury: string;
  expectedRecipient?: string;
  minConfirmations: number;
}

interface ServerOrder {
  id: string;
  amount: number;
  currency: string;
  expiresAt: string;
  status: string;
}

const REASON_MESSAGES: Record<string, string> = {
  TX_NOT_FOUND: "No encontramos esa transacción en BNB Smart Chain. Verificá el hash.",
  WRONG_CHAIN: "La transacción no pertenece a BNB Smart Chain (chain 56).",
  WRONG_TOKEN: "La transacción no interactúa con el contrato oficial de USDT.",
  NOT_A_TRANSFER: "La transacción no es una transferencia de tokens.",
  WRONG_RECIPIENT: "El destinatario no es la wallet de Crow Market. Necesitás enviar a la dirección indicada.",
  INSUFFICIENT_AMOUNT: "El monto transferido es menor al requerido.",
  TX_PENDING: "La transacción aún no fue minada. Esperá unos segundos y reintentá.",
  TX_FAILED: "La transacción falló en blockchain (revertida).",
  NEED_MORE_CONFIRMATIONS: "Faltan confirmaciones de red. Esperá y reintentá.",
  TX_ALREADY_USED: "Ese hash ya fue utilizado en otra orden.",
  QUOTE_REQUIRED: "Falta la cotización. Creá la orden nuevamente.",
  INVALID_QUOTE: "Cotización inválida. Creá la orden nuevamente.",
  QUOTE_EXPIRED: "La orden venció. Creá una nueva orden.",
  QUOTE_ORDER_MISMATCH: "La cotización no corresponde a esta orden.",
  AMOUNT_MISMATCH: "El monto no coincide con la cotización.",
  QUOTE_ALREADY_USED: "Esta cotización ya fue utilizada.",
  INVALID_BUYER: "Ingresá un identificador de comprador válido.",
  UNAUTHENTICATED: "Iniciá sesión para continuar con la compra.",
  FORBIDDEN: "Esta orden no pertenece a tu usuario.",
  ORDER_NOT_ACTIVE: "La orden ya no está activa.",
  RPC_ERROR: "No pudimos consultar la red. Reintentá en unos segundos.",
  RATE_LIMITED: "Demasiados intentos. Esperá un minuto.",
  SERVER_ERROR: "Error del servidor. Reintentá en unos segundos.",
};

export function CheckoutClient() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductPublication | null>(null);
  const [missing, setMissing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [order, setOrder] = useState<ServerOrder | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [paidTx, setPaidTx] = useState<string | null>(null);
  const [paidBlock, setPaidBlock] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  // Detección automática: el TXID es opcional, el monitor server detecta solo.
  const [searching, setSearching] = useState(false);
  const [serverStatus, setServerStatus] = useState<string | null>(null);
  const [serverTx, setServerTx] = useState<string | null>(null);
  const [serverBlock, setServerBlock] = useState<number | null>(null);
  const [showManual, setShowManual] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const found = getPublicationBySlug(params.slug);
    if (!found || found.status !== "PUBLISHED") {
      setMissing(true);
      return;
    }
    setProduct(found);
    logEvent("checkout_started", found.id, null);
    void fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ ok: boolean; user?: { email: string } | null }>)
      .then((data) => {
        setUserEmail(data.user?.email ?? null);
        setAuthChecked(true);
      })
      .catch(() => {
        setUserEmail(null);
        setAuthChecked(true);
      });
    // Carga post-montaje a propósito: evita hydration mismatch (localStorage
    // no existe en servidor). Patrón usado en todo el codebase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
  }, [params.slug]);

  useEffect(() => {
    if (!order || paid) return;
    timer.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [order, paid]);

  useEffect(() => {
    if (!paid) return;
    redirectTimer.current = setTimeout(() => {
      router.push("/my-products");
    }, 2500);
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, [paid, router]);
  const expiresAt = order?.expiresAt ? new Date(order.expiresAt).getTime() : 0;
  const remainingMs = Math.max(0, expiresAt - now);
  const isExpired = !!order && !paid && remainingMs <= 0;

  useEffect(() => {
    if (isExpired && order) {
      setOrder({ ...order, status: "EXPIRED" });
      setSearching(false);
    }
    // Sincronización de expiración post-montaje (ver nota arriba).
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  }, [isExpired]);

  /** Quote + QR para una orden del servidor. Idempotente por orderId. */
  const setupQuote = async (orderId: string): Promise<void> => {
    const res = await fetch("/api/payments/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await res.json()) as { ok: boolean; quote?: Quote; payment?: PaymentInfo; reason?: string };
    if (res.status === 401 || data.reason === "UNAUTHENTICATED") {
      throw new Error("UNAUTHENTICATED");
    }
    if (!data.ok || !data.quote || !data.payment) {
      throw new Error("No se pudo iniciar el pago. Reintentá.");
    }
    setQuote(data.quote);
    setPaymentInfo(data.payment);
    setQr(await QRCode.toDataURL(data.payment.treasury, { width: 220, margin: 1 }));
  };

  // Al volver (pestaña cerrada / refresh): retoma MI orden activa del servidor.
  useEffect(() => {
    if (!product || !userEmail || order || working) return;
    void fetch(`/api/payments/orders/mine?productId=${encodeURIComponent(product.id)}`)
      .then((r) => r.json() as Promise<{ ok: boolean; order?: ServerOrder | null }>)
      .then((data) => {
        if (!data.ok || !data.order) return;
        setWorking(true);
        setOrder(data.order);
        setupQuote(data.order.id)
          .catch(() => {
            // sin quote no hay panel de pago; se reintenta con "Continuar al pago"
          })
          .finally(() => {
            setWorking(false);
          });
      })
      .catch(() => {
        // sin orden retomable
      });
    // Solo al montar con producto+usuario conocidos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, userEmail]);

  const confirm = async (): Promise<void> => {
    if (!product) return;
    setWorking(true);
    setError(null);
    try {
      // La orden la crea el SERVIDOR con el userId de la sesión.
      // creatorId es informativo del catálogo (inmutable tras crear).
      const reg = await fetch("/api/payments/orders/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          creatorId: product.creatorId,
          amount: product.price.amount,
          currency: product.price.currency,
        }),
      });
      const regData = (await reg.json()) as {
        ok: boolean;
        orderId?: string;
        status?: string;
        amount?: number;
        currency?: string;
        expiresAt?: string;
        reason?: string;
      };
      if (reg.status === 401 || regData.reason === "UNAUTHENTICATED") {
        router.push(`/login?return=${encodeURIComponent(`/marketplace/checkout/${product.slug}`)}`);
        return;
      }
      if (!regData.ok || !regData.orderId) {
        throw new Error("No se pudo crear la orden. Reintentá.");
      }
      setOrder({
        id: regData.orderId,
        amount: regData.amount ?? product.price.amount,
        currency: regData.currency ?? product.price.currency,
        expiresAt: regData.expiresAt ?? new Date(Date.now() + 30 * 60000).toISOString(),
        status: regData.status ?? "PENDING",
      });
      logEvent("checkout_started", product.id, userEmail, { orderId: regData.orderId });
      await setupQuote(regData.orderId);
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        router.push(`/login?return=${encodeURIComponent(product ? `/marketplace/checkout/${product.slug}` : "/marketplace")}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Error creando la orden");
    } finally {
      setWorking(false);
    }
  };

  const verifyPayment = async (): Promise<void> => {
    if (!order || !quote || !product) return;
    const hash = txHash.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      setError("El hash debe tener formato 0x + 64 caracteres hexadecimales.");
      return;
    }
    setVerifying(true);
    setError(null);
    setOrder({ ...order, status: "VERIFYING" });
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id, txHash: hash, quote }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        idempotent?: boolean;
        reason?: string;
        retryable?: boolean;
        reviewRequired?: boolean;
        expired?: boolean;
        receipt?: { hash: string; amount: number; confirmations: number; blockNumber: number };
        confirmation?: { signature: string };
      };
      if (res.status === 401) {
        router.push(`/login?return=${encodeURIComponent(`/marketplace/checkout/${product.slug}`)}`);
        return;
      }
      if (!data.ok || !data.receipt || !data.confirmation) {
        if (data.reviewRequired) {
          setOrder({ ...order, status: "REVIEW_REQUIRED" });
          setError(
            "La transacción no coincide con esta orden y quedó en revisión manual excepcional (REVIEW_REQUIRED). Nunca se marcó como pagada."
          );
          return;
        }
        setError(reasonMessage(data.reason));
        return;
      }
      // Confirmación VÁLIDA del backend (entitlement creado en DB atómicamente).
      applyPaid(data.receipt.hash, data.receipt.blockNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error verificando el pago");
    } finally {
      setVerifying(false);
    }
  };

  /** Marca la UI como pagada con datos confirmados por el servidor. */
  const applyPaid = (tx: string, block: number | null): void => {
    if (!order || !product) return;
    setPaidTx(tx.toLowerCase());
    setPaidBlock(block);
    setOrder({ ...order, status: "PAID" });
    if (product) {
      logEvent("purchase_completed", product.id, userEmail, {
        orderId: order.id,
        txHash: tx.toLowerCase(),
      });
    }
    // Registro de comisiones server-side (best-effort, no bloquea la UI).
    // El backend reconstruye cadena, montos y riesgo desde la DB.
    try {
      let deviceId = window.localStorage.getItem("crow_device_id");
      if (!deviceId) {
        deviceId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem("crow_device_id", deviceId);
      }
      const affiliateCode = window.localStorage.getItem("crow_server_affiliate_code");
      void fetch("/api/commissions/record", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          affiliateCode: affiliateCode ?? undefined,
          deviceId,
        }),
      }).catch(() => undefined);
    } catch {
      // best-effort
    }
    setPaid(true);
    setSearching(false);
  };

  // Polling al SERVIDOR (nunca a la blockchain): el monitor detecta solo.
  useEffect(() => {
    if (!searching || !order || paid) return;
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch(
          `/api/payments/orders/status?orderId=${encodeURIComponent(order.id)}`
        );
        if (res.status === 401) {
          setSearching(false);
          router.push(`/login?return=${encodeURIComponent(product ? `/marketplace/checkout/${product.slug}` : "/marketplace")}`);
          return;
        }
        const data = (await res.json()) as {
          ok: boolean;
          status?: string;
          txHash?: string | null;
          blockNumber?: number | null;
        };
        if (!data.ok) return;
        setServerStatus(data.status ?? null);
        setServerTx(data.txHash ?? null);
        setServerBlock(typeof data.blockNumber === "number" ? data.blockNumber : null);
        if (data.status === "PAID" && data.txHash) {
          applyPaid(data.txHash, typeof data.blockNumber === "number" ? data.blockNumber : null);
        } else if (
          data.status === "EXPIRED" ||
          data.status === "REVIEW_REQUIRED" ||
          data.status === "FAILED" ||
          data.status === "CANCELLED"
        ) {
          setOrder({ ...order, status: data.status });
          setSearching(false);
        } else if (data.status) {
          setOrder({ ...order, status: data.status });
        }
      } catch {
        // reintenta en el próximo ciclo
      }
    };
    void poll();
    pollTimer.current = setInterval(() => {
      void poll();
    }, 5000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // Polling de estado server mientras se busca el pago.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, order?.id, paid]);

  if (missing) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px" }}>
        <h1 style={{ fontSize: "24px" }}>Producto no disponible</h1>
        <button onClick={() => router.push("/marketplace")} style={{ marginTop: "16px", padding: "12px 24px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>
          Volver
        </button>
      </main>
    );
  }

  if (!product) {
    return (
      <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#888" }}>Cargando...</div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: FONT }}>
      <header style={{ height: "72px", padding: "0 4%", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", background: "rgba(5,5,5,0.85)" }}>
        <Link href={`/marketplace/product/${product.slug}`} style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
          ← Volver al producto
        </Link>
        <div style={{ marginLeft: "auto" }}>
          <AccountMenu />
        </div>
      </header>
      <section style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {!order || paid ? (
          paid && order ? (
            <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "20px", padding: "40px 32px", textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", color: "#22c55e", margin: "0 auto 16px" }}>
                ✓
              </div>
              <h1 style={{ fontSize: "30px", margin: "0 0 8px" }}>Pago confirmado</h1>
              <p style={{ color: "#aaa", margin: "0 0 8px" }}>Tu compra ya está disponible en Mis productos.</p>
              <p style={{ color: "#666", fontSize: "12px", margin: "0 0 8px" }}>
                TX {paidTx?.slice(0, 18)}... · {order.amount} {order.currency}
                {typeof paidBlock === "number" ? ` · bloque ${paidBlock}` : ""}
              </p>
              <p style={{ color: "#666", fontSize: "12px", margin: "0 0 24px" }}>
                Redirigiendo automáticamente a Mis productos…
              </p>
              <Link href="/my-products" style={{ display: "inline-block", padding: "14px 32px", borderRadius: "12px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "15px" }}>
                Ir a Mis productos
              </Link>
            </div>
          ) : (
            <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px" }}>
              <h1 style={{ fontSize: "24px", margin: "0 0 6px" }}>Checkout · {product.title}</h1>
              <p style={{ color: "#888", fontSize: "14px", margin: "0 0 4px" }}>
                {product.price.amount} {product.price.currency} · USDT · BNB Smart Chain · BEP-20
              </p>
              <p style={{ color: "#666", fontSize: "12px", margin: "0 0 20px" }}>
                Pagás con USDT BEP-20 en BNB Smart Chain a la wallet de Crow.
              </p>
              {!authChecked ? (
                <div style={{ color: "#888", fontSize: "14px" }}>Verificando tu sesión...</div>
              ) : !userEmail ? (
                <>
                  <p style={{ color: "#aaa", fontSize: "14px", margin: "0 0 16px" }}>
                    Iniciá sesión para comprar. Tu identidad protege tu acceso al producto.
                  </p>
                  <Link
                    href={`/login?return=${encodeURIComponent(`/marketplace/checkout/${product.slug}`)}`}
                    style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: "12px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "15px" }}
                  >
                    Iniciar sesión para comprar
                  </Link>
                </>
              ) : (
                <>
                  <p style={{ color: "#888", fontSize: "13px", margin: "0 0 16px" }}>
                    Comprando como <strong style={{ color: "#fff" }}>{userEmail}</strong>
                  </p>
                  {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
                  <button onClick={() => void confirm()} disabled={working} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "15px", opacity: working ? 0.6 : 1 }}>
                    {working ? "Creando orden..." : "Continuar al pago"}
                  </button>
                </>
              )}
            </div>
          )
        ) : (
          <PaymentPanel
            product={product}
            order={order}
            quote={quote}
            paymentInfo={paymentInfo}
            qr={qr}
            txHash={txHash}
            setTxHash={setTxHash}
            verifying={verifying}
            error={error}
            copied={copied}
            setCopied={setCopied}
            copiedAmount={copiedAmount}
            setCopiedAmount={setCopiedAmount}
            searching={searching}
            serverStatus={serverStatus}
            serverTx={serverTx}
            serverBlock={serverBlock}
            showManual={showManual}
            setShowManual={setShowManual}
            remainingMs={remainingMs}
            isExpired={isExpired}
            onSearch={() => {
              setError(null);
              setServerStatus(null);
              setSearching(true);
            }}
            onVerify={() => void verifyPayment()}
          />
        )}
      </section>
    </main>
  );

  function reasonMessage(reason?: string): string {
    if (!reason) return "No se pudo verificar el pago.";
    return REASON_MESSAGES[reason] ?? `No se pudo verificar el pago (${reason}).`;
  }
}

function formatCountdown(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PaymentPanel(props: {
  product: ProductPublication;
  order: ServerOrder;
  quote: Quote | null;
  paymentInfo: PaymentInfo | null;
  qr: string | null;
  txHash: string;
  setTxHash: (v: string) => void;
  verifying: boolean;
  error: string | null;
  copied: boolean;
  setCopied: (v: boolean) => void;
  copiedAmount: boolean;
  setCopiedAmount: (v: boolean) => void;
  searching: boolean;
  serverStatus: string | null;
  serverTx: string | null;
  serverBlock: number | null;
  showManual: boolean;
  setShowManual: (v: boolean) => void;
  remainingMs: number;
  isExpired: boolean;
  onSearch: () => void;
  onVerify: () => void;
}) {
  const { product, order, quote, paymentInfo, qr, txHash, setTxHash, verifying, error, copied, setCopied, copiedAmount, setCopiedAmount, searching, serverStatus, serverTx, serverBlock, showManual, setShowManual, remainingMs, isExpired, onSearch, onVerify } = props;
  const treasury = paymentInfo?.treasury ?? "";
  const amountText = String(quote?.amount ?? order.amount);

  const copyAddress = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(treasury);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin portapapeles
    }
  };

  const copyAmount = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(amountText);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {
      // sin portapapeles
    }
  };

  if (order.status === "REVIEW_REQUIRED") {
    return (
      <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontSize: "22px", margin: "0 0 8px" }}>Pago en revisión</h2>
        <p style={{ color: "#888", fontSize: "14px" }}>
          La transacción no coincide con esta orden y quedó en revisión manual excepcional.
          Nunca se marcó como pagada. El equipo la revisará en /admin/payments.
        </p>
      </div>
    );
  }

  if (isExpired || order.status === "EXPIRED") {
    return (
      <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontSize: "22px", margin: "0 0 8px" }}>Orden vencida</h2>
        <p style={{ color: "#888", fontSize: "14px" }}>El tiempo de pago terminó. Creá una nueva orden para intentarlo de nuevo.</p>
      </div>
    );
  }

  const hasServerTx = !!serverTx;
  const autoTitle =
    serverStatus === "VERIFYING"
      ? hasServerTx
        ? "Pago detectado. Esperando confirmaciones de la red..."
        : "Pago encontrado. Verificando en BNB Smart Chain..."
      : "Buscando tu pago automáticamente...";
  const autoDetail =
    "Estamos buscando tu pago... Puede tardar unos segundos mientras confirmamos la transacción en BNB Smart Chain.";

  return (
    <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div>
          <div style={{ color: "#a855f7", fontSize: "12px", fontWeight: "bold" }}>ORDEN {order.id}</div>
          <h2 style={{ fontSize: "22px", margin: "6px 0 0" }}>{product.title}</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#666", fontSize: "11px" }}>TIEMPO RESTANTE</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: remainingMs < 5 * 60000 ? "#f87171" : "#fff" }}>
            {formatCountdown(remainingMs)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "center", padding: "16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "6px" }}>
            <span style={{ color: "#888" }}>Precio</span>
            <span>{product.price.amount} {product.price.currency}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "bold" }}>
            <span>Monto a pagar</span>
            <span>{quote?.amount ?? order.amount} USDT</span>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", background: "rgba(124,58,237,0.15)", color: "#c084fc", fontWeight: "bold" }}>USDT</span>
            <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", color: "#aaa" }}>
              BNB Smart Chain
            </span>
            <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", color: "#aaa" }}>
              BEP-20
            </span>
            <button onClick={() => void copyAmount()} style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#aaa", cursor: "pointer", fontWeight: "bold" }}>
              {copiedAmount ? "Monto copiado" : "Copiar monto"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR de la wallet receptora" style={{ width: "200px", height: "200px", borderRadius: "12px", background: "#fff", padding: "8px" }} />
        ) : (
          <div style={{ color: "#666", fontSize: "13px" }}>Generando QR...</div>
        )}
        <div style={{ color: "#888", fontSize: "12px", marginTop: "10px" }}>Escaneá para pagar el monto exacto</div>
      </div>

      <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>Wallet de Crow (BNB Smart Chain)</label>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <input readOnly value={treasury} aria-label="Dirección receptora" style={{ flex: 1, minWidth: 0, background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#aaa", padding: "12px 14px", fontSize: "12px", fontFamily: "monospace" }} />
        <button onClick={() => void copyAddress()} style={{ padding: "12px 18px", borderRadius: "10px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "13px", whiteSpace: "nowrap" }}>
          {copied ? "Copiado" : "Copiar dirección"}
        </button>
      </div>
      <a
        href={`https://bscscan.com/address/${treasury}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", color: "#a855f7", fontSize: "13px", marginBottom: "20px" }}
      >
        Abrir wallet en BscScan →
      </a>

      {!searching ? (
        <>
          <p style={{ color: "#888", fontSize: "13px", margin: "0 0 12px" }}>Esperando tu pago...</p>
          <button
            onClick={onSearch}
            style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "15px" }}
          >
            YA REALICÉ EL PAGO
          </button>
          <p style={{ color: "#666", fontSize: "12px", marginTop: "12px", lineHeight: 1.6 }}>
            Detectamos tu transferencia automáticamente en BNB Smart Chain. No necesitás pegar ningún hash.
          </p>
        </>
      ) : (
        <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.3)", marginBottom: "12px" }}>
          <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "6px" }}>{autoTitle}</div>
          <p style={{ color: "#aaa", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>{autoDetail}</p>
          {serverTx && (
            <p style={{ color: "#666", fontSize: "11px", margin: "8px 0 0", wordBreak: "break-all", fontFamily: "monospace" }}>
              TX {serverTx.slice(0, 20)}...{typeof serverBlock === "number" ? ` · bloque ${serverBlock}` : ""}
            </p>
          )}
          <div style={{ height: "4px", borderRadius: "2px", background: "rgba(124,58,237,0.2)", overflow: "hidden", marginTop: "12px" }}>
            <div style={{ height: "100%", width: "40%", background: "#7c3aed", borderRadius: "2px", animation: "verifySlide 1.2s ease-in-out infinite" }} />
            <style>{`@keyframes verifySlide { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
          </div>
        </div>
      )}

      {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}

      <button
        onClick={() => setShowManual(!showManual)}
        style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#888", cursor: "pointer", fontSize: "13px", marginTop: searching ? "4px" : "12px" }}
      >
        {showManual ? "Ocultar opción manual" : "¿Querés ingresar el TXID manualmente? [ Tengo un TXID ]"}
      </button>

      {showManual && (
        <div style={{ marginTop: "12px" }}>
          <label htmlFor="txhash" style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>
            Pegá el TX Hash después de enviar el pago (método alternativo)
          </label>
          <input
            id="txhash"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value.trim())}
            placeholder="0x..."
            spellCheck={false}
            style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "13px", marginBottom: "12px", fontFamily: "monospace" }}
          />
          <button
            onClick={onVerify}
            disabled={verifying || !txHash}
            style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: verifying ? "#42206b" : "#7c3aed", color: "#fff", fontWeight: "bold", cursor: verifying ? "wait" : "pointer", fontSize: "15px", opacity: verifying || !txHash ? 0.7 : 1 }}
          >
            {verifying ? "Estamos verificando tu pago en BNB Smart Chain..." : "Verificar pago"}
          </button>
        </div>
      )}
      <p style={{ color: "#666", fontSize: "12px", marginTop: "12px", lineHeight: 1.6 }}>
        Verificamos on-chain: existencia, red BSC, token USDT oficial, destinatario, monto ≥ requerido y confirmaciones.
        El acceso se otorga solo si la blockchain confirma.
      </p>
    </div>
  );
}
