// ============================================
// CHECKOUT USDT BEP20 - pago real verificado on-chain
// ============================================

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import QRCode from "qrcode";
import { getPublicationBySlug, logEvent } from "@/app/services/marketplace/marketStore";
import {
  createOrder,
  getOrder,
  markExpiredOrders,
  markPaidWithTx,
  setOrderStatus,
  type CreateOrderInput,
} from "@/app/services/marketplace/marketOrders";
import { grantEntitlement, postSaleToLedger } from "@/app/services/marketplace/marketLedger";
import { readAttribution } from "@/app/services/marketplace/marketLedger";
import { savePayment, updatePaymentStatus } from "@/app/services/marketplace/marketPayments";
import type { Order, ProductPublication } from "@/app/services/marketplace/marketTypes";

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
  chainId: number;
  token: string;
  tokenContract: string;
  treasury: string;
  minConfirmations: number;
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
  RPC_ERROR: "No pudimos consultar la red. Reintentá en unos segundos.",
  RATE_LIMITED: "Demasiados intentos. Esperá un minuto.",
  SERVER_ERROR: "Error del servidor. Reintentá en unos segundos.",
};

export function CheckoutClient() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductPublication | null>(null);
  const [missing, setMissing] = useState(false);
  const [buyerId, setBuyerId] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const found = getPublicationBySlug(params.slug);
    if (!found || found.status !== "PUBLISHED") {
      setMissing(true);
      return;
    }
    setProduct(found);
    logEvent("checkout_started", found.id, null);
    try {
      const saved = window.localStorage.getItem("crow_buyer_id");
      if (saved) setBuyerId(saved);
    } catch {
      // sin comprador guardado
    }
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

  const expiresAt = order?.expiresAt ? new Date(order.expiresAt).getTime() : 0;
  const remainingMs = Math.max(0, expiresAt - now);
  const isExpired = !!order && !paid && remainingMs <= 0;

  useEffect(() => {
    if (isExpired && order && order.status !== "EXPIRED") {
      markExpiredOrders(Date.now());
      setOrder({ ...order, status: "EXPIRED" });
    }
    // Sincronización de expiración post-montaje (ver nota arriba).
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  }, [isExpired]);

  const confirm = async (): Promise<void> => {
    if (!product) return;
    if (!buyerId.trim()) {
      setError("Ingresá un identificador de comprador para crear la orden.");
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const attribution = readAttribution(product.id);
      const input: CreateOrderInput = {
        buyerId: buyerId.trim(),
        productId: product.id,
        creatorId: product.creatorId,
        affiliateId: attribution?.affiliateId ?? null,
        amount: product.price,
        affiliatePercent: product.affiliatePercent,
      };
      const created = createOrder(input);
      try {
        window.localStorage.setItem("crow_buyer_id", buyerId.trim());
      } catch {
        // no bloquea
      }
      logEvent("checkout_started", product.id, buyerId.trim(), { orderId: created.id });

      // Cotización firmada por el backend (monto/tesorería no confían en el cliente).
      const res = await fetch("/api/payments/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: created.id, amount: created.amount.amount, currency: created.amount.currency }),
      });
      const data = (await res.json()) as { ok: boolean; quote?: Quote; payment?: PaymentInfo; reason?: string };
      if (!data.ok || !data.quote || !data.payment) {
        throw new Error("No se pudo iniciar el pago. Reintentá.");
      }
      setOrder(created);
      setQuote(data.quote);
      setPaymentInfo(data.payment);
      setQr(await QRCode.toDataURL(data.payment.treasury, { width: 220, margin: 1 }));
      savePayment({
        id: `pay-${created.id}`,
        orderId: created.id,
        provider: "usdt-bep20",
        chain: "BNB Smart Chain",
        txHash: null,
        amount: created.amount,
        status: "CREATED",
        attempts: 0,
        lastError: null,
        confirmedAt: null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
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
    setOrderStatus(order.id, "VERIFYING", "system");
    setOrder({ ...order, status: "VERIFYING" });
    updatePaymentStatus(`pay-${order.id}`, "VERIFYING", { txHash: hash.toLowerCase(), attempts: 1 });
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: order.id, txHash: hash, expectedAmount: quote.amount, quote }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        retryable?: boolean;
        receipt?: { hash: string; amount: number; confirmations: number };
        confirmation?: { signature: string };
      };
      if (!data.ok || !data.receipt || !data.confirmation) {
        updatePaymentStatus(`pay-${order.id}`, "FAILED", {
          lastError: data.reason ?? "UNKNOWN",
        });
        setError(reasonMessage(data.reason));
        const current = getOrder(order.id);
        if (current) setOrder(current);
        return;
      }
      // Confirmación VÁLIDA del backend: recién ahí se aplica localmente.
      if (!markPaidWithTx(order.id, data.receipt.hash)) {
        throw new Error("La orden cambió de estado durante la verificación.");
      }
      updatePaymentStatus(`pay-${order.id}`, "CONFIRMED", {
        txHash: data.receipt.hash,
        confirmedAt: new Date().toISOString(),
      });
      const paidOrder = { ...order, status: "PAID" as const, paidAt: new Date().toISOString() };
      grantEntitlement(paidOrder);
      postSaleToLedger(paidOrder);
      logEvent("purchase_completed", product.id, order.buyerId, {
        orderId: order.id,
        txHash: data.receipt.hash,
      });
      setOrder(paidOrder);
      setPaid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error verificando el pago");
    } finally {
      setVerifying(false);
    }
  };

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
      </header>
      <section style={{ maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" }}>
        {!order || paid ? (
          paid && order ? (
            <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "20px", padding: "40px 32px", textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", color: "#22c55e", margin: "0 auto 16px" }}>
                ✓
              </div>
              <h1 style={{ fontSize: "30px", margin: "0 0 8px" }}>¡Pago confirmado!</h1>
              <p style={{ color: "#aaa", margin: "0 0 8px" }}>Tu compra ya está disponible.</p>
              <p style={{ color: "#666", fontSize: "12px", margin: "0 0 24px" }}>
                TX {order.paymentReference?.slice(0, 18)}... · {order.amount.amount} {order.amount.currency}
              </p>
              <Link href="/my-products" style={{ display: "inline-block", padding: "14px 32px", borderRadius: "12px", background: "#7c3aed", color: "#fff", fontWeight: "bold", textDecoration: "none", fontSize: "15px" }}>
                Ir a Mis productos
              </Link>
            </div>
          ) : (
            <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "24px" }}>
              <h1 style={{ fontSize: "24px", margin: "0 0 6px" }}>Checkout · {product.title}</h1>
              <p style={{ color: "#888", fontSize: "14px", margin: "0 0 20px" }}>
                {product.price.amount} {product.price.currency} · Red USDT BEP20
              </p>
              <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>Identificador de comprador</label>
              <input
                value={buyerId}
                onChange={(e) => setBuyerId(e.target.value)}
                placeholder="Ej: tu email o usuario"
                style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "14px", marginBottom: "16px", fontFamily: FONT }}
              />
              {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={() => void confirm()} disabled={working} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "#7c3aed", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "15px", opacity: working ? 0.6 : 1 }}>
                {working ? "Creando orden..." : "Continuar al pago"}
              </button>
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
            remainingMs={remainingMs}
            isExpired={isExpired}
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
  order: Order;
  quote: Quote | null;
  paymentInfo: PaymentInfo | null;
  qr: string | null;
  txHash: string;
  setTxHash: (v: string) => void;
  verifying: boolean;
  error: string | null;
  copied: boolean;
  setCopied: (v: boolean) => void;
  remainingMs: number;
  isExpired: boolean;
  onVerify: () => void;
}) {
  const { product, order, quote, paymentInfo, qr, txHash, setTxHash, verifying, error, copied, setCopied, remainingMs, isExpired, onVerify } = props;
  const treasury = paymentInfo?.treasury ?? "";

  const copyAddress = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(treasury);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // sin portapapeles
    }
  };

  if (isExpired || order.status === "EXPIRED") {
    return (
      <div style={{ background: "rgba(15,15,18,0.9)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontSize: "22px", margin: "0 0 8px" }}>Orden vencida</h2>
        <p style={{ color: "#888", fontSize: "14px" }}>El tiempo de pago terminó. Creá una nueva orden para intentarlo de nuevo.</p>
      </div>
    );
  }

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
            <span>Total en USDT</span>
            <span>{quote?.amount ?? order.amount.amount} USDT</span>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", background: "rgba(124,58,237,0.15)", color: "#c084fc", fontWeight: "bold" }}>USDT</span>
            <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", color: "#aaa" }}>
              BEP20 · BNB Smart Chain
            </span>
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

      <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>Dirección receptora de Crow</label>
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

      <label htmlFor="txhash" style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px" }}>
        Pegá el TX Hash después de enviar el pago
      </label>
      <input
        id="txhash"
        value={txHash}
        onChange={(e) => setTxHash(e.target.value.trim())}
        placeholder="0x..."
        spellCheck={false}
        style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", padding: "12px 14px", fontSize: "13px", marginBottom: "12px", fontFamily: "monospace" }}
      />
      {error && <div style={{ color: "#f87171", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
      <button
        onClick={onVerify}
        disabled={verifying || !txHash}
        style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: verifying ? "#42206b" : "#7c3aed", color: "#fff", fontWeight: "bold", cursor: verifying ? "wait" : "pointer", fontSize: "15px", opacity: verifying || !txHash ? 0.7 : 1 }}
      >
        {verifying ? "Verificando en blockchain..." : "Verificar pago"}
      </button>
      <p style={{ color: "#666", fontSize: "12px", marginTop: "12px", lineHeight: 1.6 }}>
        Verificamos on-chain: existencia, red BSC, token USDT oficial, destinatario, monto ≥ requerido y confirmaciones.
        El acceso se otorga solo si la blockchain confirma.
      </p>
      {verifying && (
        <div style={{ height: "4px", borderRadius: "2px", background: "rgba(124,58,237,0.2)", overflow: "hidden", marginTop: "12px" }}>
          <div style={{ height: "100%", width: "40%", background: "#7c3aed", borderRadius: "2px", animation: "verifySlide 1.2s ease-in-out infinite" }} />
          <style>{`@keyframes verifySlide { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
        </div>
      )}
    </div>
  );
}
