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
          .catch(() => {})
          .finally(() => {
            setWorking(false);
          });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, userEmail]);

  const confirm = async (): Promise<void> => {
    if (!product) return;
    setWorking(true);
    setError(null);
    try {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, order?.id, paid]);

  if (missing) {
    return (
      <main className="ck-page">
        <div className="ck-missing">
          <h1>Producto no disponible</h1>
          <button onClick={() => router.push("/marketplace")} className="ck-btn-primary">
            Volver al marketplace
          </button>
        </div>
        <CheckoutStyles />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="ck-page">
        <div className="ck-loading">
          <div className="ck-loading-spinner" />
          <span>Cargando producto...</span>
        </div>
        <CheckoutStyles />
      </main>
    );
  }

  const ratingAvg = product.ratingCount > 0 ? (product.ratingSum / product.ratingCount).toFixed(1) : null;

  return (
    <main className="ck-page">
      <div className="ck-ambient" aria-hidden />

      <header className="ck-header">
        <Link href={`/marketplace/product/${product.slug}`} className="ck-back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver al producto
        </Link>
        <div className="ck-header-right">
          <AccountMenu />
        </div>
      </header>

      <section className="ck-content">
        {!order || paid ? (
          paid && order ? (
            /* ===== SUCCESS ===== */
            <div className="ck-success-card">
              <div className="ck-success-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h1 className="ck-success-title">¡Pago confirmado!</h1>
              <p className="ck-success-sub">Tu compra ya está disponible en Mis productos.</p>
              <div className="ck-success-receipt">
                <span>TX {paidTx?.slice(0, 18)}...</span>
                <span>{order.amount} {order.currency}</span>
                {typeof paidBlock === "number" && <span>Bloque {paidBlock}</span>}
              </div>
              <p className="ck-success-redirect">Redirigiendo automáticamente a Mis productos…</p>
              <Link href="/my-products" className="ck-btn-primary ck-success-btn">
                Ir a Mis productos
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            /* ===== PRODUCT PREVIEW + CHECKOUT ===== */
            <div className="ck-preview-layout">
              {/* Product preview card */}
              <div className="ck-product-card">
                {product.coverSvg ? (
                  <div className="ck-product-cover" dangerouslySetInnerHTML={{ __html: product.coverSvg }} />
                ) : (
                  <div className="ck-product-cover ck-product-cover-fallback">
                    <span>{product.title.charAt(0)}</span>
                  </div>
                )}
                <div className="ck-product-body">
                  <div className="ck-product-tags">
                    <span className="ck-tag-purple">{product.previewKind}</span>
                    {product.level && <span className="ck-tag-ghost">{product.level}</span>}
                  </div>
                  <h1 className="ck-product-title">{product.title}</h1>
                  <p className="ck-product-desc">{product.shortDescription || product.description}</p>

                  <div className="ck-product-meta">
                    <div className="ck-meta-item">
                      <span className="ck-meta-label">Creador</span>
                      <span className="ck-meta-value">{product.creatorName}</span>
                    </div>
                    <div className="ck-meta-item">
                      <span className="ck-meta-label">Categoría</span>
                      <span className="ck-meta-value">{product.category}</span>
                    </div>
                    {ratingAvg && (
                      <div className="ck-meta-item">
                        <span className="ck-meta-label">Rating</span>
                        <span className="ck-meta-value">★ {ratingAvg} ({product.ratingCount})</span>
                      </div>
                    )}
                    <div className="ck-meta-item">
                      <span className="ck-meta-label">Ventas</span>
                      <span className="ck-meta-value">{product.salesCount}</span>
                    </div>
                  </div>

                  {product.includes.length > 0 && (
                    <div className="ck-includes">
                      <div className="ck-includes-label">Incluye</div>
                      <ul className="ck-includes-list">
                        {product.includes.slice(0, 5).map((inc, i) => (
                          <li key={i}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {inc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Checkout summary card */}
              <div className="ck-checkout-card">
                <div className="ck-checkout-header">
                  <div className="ck-checkout-badge">CHECKOUT</div>
                  <h2 className="ck-checkout-title">Finalizar compra</h2>
                </div>

                <div className="ck-cart-item ck-cart-item-preview">
                  {product.coverSvg ? (
                    <div className="ck-cart-item-cover" dangerouslySetInnerHTML={{ __html: product.coverSvg }} />
                  ) : (
                    <div className="ck-cart-item-cover ck-cart-item-fallback">{product.title.charAt(0)}</div>
                  )}
                  <div className="ck-cart-item-info">
                    <div className="ck-cart-item-title">{product.title}</div>
                    <div className="ck-cart-item-meta">{product.previewKind} · {product.category}</div>
                  </div>
                  <div className="ck-cart-item-price">{product.price.amount} {product.price.currency}</div>
                </div>

                <div className="ck-price-box">
                  <div className="ck-price-row">
                    <span className="ck-price-label">Precio del producto</span>
                    <span className="ck-price-value">{product.price.amount} {product.price.currency}</span>
                  </div>
                  {product.previousPrice && (
                    <div className="ck-price-row ck-price-old">
                      <span>Antes</span>
                      <span className="ck-price-strike">{product.previousPrice.amount} {product.previousPrice.currency}</span>
                    </div>
                  )}
                  <div className="ck-price-divider" />
                  <div className="ck-price-row ck-price-total">
                    <span>Total a pagar</span>
                    <span>{product.price.amount} USDT</span>
                  </div>
                </div>

                <div className="ck-pay-badges">
                  <span className="ck-pay-badge ck-pay-badge-primary">USDT</span>
                  <span className="ck-pay-badge">BNB Smart Chain</span>
                  <span className="ck-pay-badge">BEP-20</span>
                </div>

                <div className="ck-pay-info">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z" />
                  </svg>
                  <span>Pagás con USDT BEP-20 en BNB Smart Chain a la wallet de Crow.</span>
                </div>

                {!authChecked ? (
                  <div className="ck-auth-checking">
                    <div className="ck-mini-spinner" />
                    Verificando tu sesión...
                  </div>
                ) : !userEmail ? (
                  <div className="ck-auth-prompt">
                    <p>Iniciá sesión para comprar. Tu identidad protege tu acceso al producto.</p>
                    <Link
                      href={`/login?return=${encodeURIComponent(`/marketplace/checkout/${product.slug}`)}`}
                      className="ck-btn-primary"
                    >
                      Iniciar sesión para comprar
                    </Link>
                  </div>
                ) : (
                  <div className="ck-auth-ready">
                    <div className="ck-user-chip">
                      <div className="ck-user-avatar">{userEmail.charAt(0).toUpperCase()}</div>
                      <span>{userEmail}</span>
                    </div>
                    {error && <div className="ck-error">{error}</div>}
                    <button onClick={() => void confirm()} disabled={working} className="ck-btn-primary ck-btn-block">
                      {working ? (
                        <>
                          <span className="ck-mini-spinner" />
                          Creando orden...
                        </>
                      ) : (
                        <>
                          Continuar al pago
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
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

      <CheckoutStyles />
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
    } catch {}
  };

  const copyAmount = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(amountText);
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } catch {}
  };

  if (order.status === "REVIEW_REQUIRED") {
    return (
      <div className="ck-payment-card ck-review-card">
        <div className="ck-review-icon">⚠</div>
        <h2>Pago en revisión</h2>
        <p>La transacción no coincide con esta orden y quedó en revisión manual excepcional. Nunca se marcó como pagada. El equipo la revisará en /admin/payments.</p>
      </div>
    );
  }

  if (isExpired || order.status === "EXPIRED") {
    return (
      <div className="ck-payment-card ck-expired-card">
        <div className="ck-expired-icon">⏱</div>
        <h2>Orden vencida</h2>
        <p>El tiempo de pago terminó. Creá una nueva orden para intentarlo de nuevo.</p>
      </div>
    );
  }

  const hasServerTx = !!serverTx;
  const autoTitle =
    serverStatus === "VERIFYING"
      ? hasServerTx
        ? "Pago detectado. Esperando confirmaciones..."
        : "Pago encontrado. Verificando en BNB Smart Chain..."
      : "Buscando tu pago automáticamente...";
  const autoDetail =
    "Estamos buscando tu pago... Puede tardar unos segundos mientras confirmamos la transacción en BNB Smart Chain.";

  return (
    <div className="ck-payment-card">
      <div className="ck-cart-bar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <span className="ck-cart-bar-text">Carrito</span>
        <span className="ck-cart-bar-count">1</span>
      </div>

      <div className="ck-cart-item">
        {product.coverSvg ? (
          <div className="ck-cart-item-cover" dangerouslySetInnerHTML={{ __html: product.coverSvg }} />
        ) : (
          <div className="ck-cart-item-cover ck-cart-item-fallback">{product.title.charAt(0)}</div>
        )}
        <div className="ck-cart-item-info">
          <div className="ck-cart-item-title">{product.title}</div>
          <div className="ck-cart-item-meta">{product.previewKind} · {product.category}</div>
        </div>
        <div className="ck-cart-item-price">{product.price.amount} {product.price.currency}</div>
      </div>

      <div className="ck-payment-header">
        <div>
          <div className="ck-order-id">ORDEN {order.id}</div>
          <h2 className="ck-payment-product-title">{product.title}</h2>
        </div>
        <div className="ck-countdown-box">
          <div className="ck-countdown-label">TIEMPO RESTANTE</div>
          <div className={`ck-countdown-value ${remainingMs < 5 * 60000 ? "ck-countdown-urgent" : ""}`}>
            {formatCountdown(remainingMs)}
          </div>
        </div>
      </div>

      <div className="ck-payment-summary">
        <div className="ck-pay-sum-row">
          <span className="ck-pay-sum-label">Precio</span>
          <span>{product.price.amount} {product.price.currency}</span>
        </div>
        <div className="ck-pay-sum-row ck-pay-sum-bold">
          <span>Monto a pagar</span>
          <span>{quote?.amount ?? order.amount} USDT</span>
        </div>
        <div className="ck-pay-sum-badges">
          <span className="ck-pay-badge ck-pay-badge-primary">USDT</span>
          <span className="ck-pay-badge">BNB Smart Chain</span>
          <span className="ck-pay-badge">BEP-20</span>
          <button onClick={() => void copyAmount()} className="ck-copy-mini">
            {copiedAmount ? "✓ Copiado" : "Copiar monto"}
          </button>
        </div>
      </div>

      <div className="ck-qr-section">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="QR de la wallet receptora" className="ck-qr-img" />
        ) : (
          <div className="ck-qr-placeholder">Generando QR...</div>
        )}
        <div className="ck-qr-hint">Escaneá para pagar el monto exacto</div>
      </div>

      <label className="ck-wallet-label">Wallet de Crow (BNB Smart Chain)</label>
      <div className="ck-wallet-row">
        <input readOnly value={treasury} aria-label="Dirección receptora" className="ck-wallet-input" />
        <button onClick={() => void copyAddress()} className="ck-btn-primary ck-copy-btn">
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
      <a
        href={`https://bscscan.com/address/${treasury}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ck-bscscan-link"
      >
        Abrir wallet en BscScan →
      </a>

      {!searching ? (
        <div className="ck-pay-action">
          <p className="ck-pay-waiting">Esperando tu pago...</p>
          <button onClick={onSearch} className="ck-btn-primary ck-btn-block ck-btn-lg">
            YA REALICÉ EL PAGO
          </button>
          <p className="ck-pay-hint">
            Detectamos tu transferencia automáticamente en BNB Smart Chain. No necesitás pegar ningún hash.
          </p>
        </div>
      ) : (
        <div className="ck-searching-box">
          <div className="ck-searching-title">{autoTitle}</div>
          <p className="ck-searching-detail">{autoDetail}</p>
          {serverTx && (
            <p className="ck-searching-tx">
              TX {serverTx.slice(0, 20)}...{typeof serverBlock === "number" ? ` · bloque ${serverBlock}` : ""}
            </p>
          )}
          <div className="ck-searching-bar">
            <div className="ck-searching-bar-fill" />
          </div>
        </div>
      )}

      {error && <div className="ck-error">{error}</div>}

      <button onClick={() => setShowManual(!showManual)} className="ck-manual-toggle">
        {showManual ? "Ocultar opción manual" : "¿Querés ingresar el TXID manualmente? [ Tengo un TXID ]"}
      </button>

      {showManual && (
        <div className="ck-manual-section">
          <label htmlFor="txhash" className="ck-manual-label">
            Pegá el TX Hash después de enviar el pago (método alternativo)
          </label>
          <input
            id="txhash"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value.trim())}
            placeholder="0x..."
            spellCheck={false}
            className="ck-manual-input"
          />
          <button
            onClick={onVerify}
            disabled={verifying || !txHash}
            className="ck-btn-primary ck-btn-block"
          >
            {verifying ? "Verificando en BNB Smart Chain..." : "Verificar pago"}
          </button>
        </div>
      )}
      <p className="ck-verify-info">
        Verificamos on-chain: existencia, red BSC, token USDT oficial, destinatario, monto ≥ requerido y confirmaciones. El acceso se otorga solo si la blockchain confirma.
      </p>
    </div>
  );
}

function CheckoutStyles() {
  return (
    <style jsx global>{`
      .ck-page {
        --c-violet: #7c3aed;
        --c-violet-bright: #a855f7;
        --c-violet-soft: #c084fc;
        --c-bg: #060408;
        --c-surface: rgba(16,12,22,0.85);
        --c-surface-2: #0c0c10;
        --c-border: rgba(255,255,255,0.08);
        --c-border-hover: rgba(124,58,237,0.4);
        --c-text: #fff;
        --c-muted: #9ca3af;
        --c-faint: #6b7280;
        min-height: 100vh;
        background: var(--c-bg);
        color: var(--c-text);
        font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        position: relative;
        overflow-x: hidden;
      }

      .ck-ambient {
        position: fixed;
        top: -150px;
        left: 50%;
        transform: translateX(-50%);
        width: 800px;
        height: 600px;
        background: radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, rgba(124,58,237,0.04) 40%, transparent 70%);
        pointer-events: none;
        z-index: 0;
      }

      /* Header */
      .ck-header {
        position: sticky;
        top: 0;
        z-index: 100;
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 24px;
        background: rgba(6,4,8,0.8);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--c-border);
      }

      .ck-back-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--c-text);
        text-decoration: none;
        font-weight: 600;
        font-size: 14px;
        transition: color 0.2s ease;
      }
      .ck-back-link:hover { color: var(--c-violet-soft); }

      /* Content */
      .ck-content {
        position: relative;
        z-index: 1;
        max-width: 920px;
        margin: 0 auto;
        padding: 40px 24px 80px;
      }

      /* ===== PRODUCT PREVIEW LAYOUT ===== */
      .ck-preview-layout {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 24px;
        align-items: start;
        animation: ckFadeUp 0.5s ease both;
      }

      /* Product card */
      .ck-product-card {
        background: var(--c-surface);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--c-border);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      }

      .ck-product-cover {
        width: 100%;
        aspect-ratio: 16 / 7;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(91,33,182,0.05));
        overflow: hidden;
      }
      .ck-product-cover svg { width: 100%; height: 100%; }
      .ck-product-cover-fallback {
        font-size: 48px;
        font-weight: 800;
        color: var(--c-violet-soft);
      }

      .ck-product-body { padding: 24px; }

      .ck-product-tags {
        display: flex;
        gap: 8px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .ck-tag-purple {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 8px;
        background: rgba(124,58,237,0.15);
        color: var(--c-violet-soft);
      }
      .ck-tag-ghost {
        font-size: 11px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        color: var(--c-muted);
      }

      .ck-product-title {
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -1px;
        margin: 0 0 10px;
        line-height: 1.2;
      }

      .ck-product-desc {
        color: var(--c-muted);
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 20px;
      }

      .ck-product-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }
      .ck-meta-item {
        background: var(--c-surface-2);
        border: 1px solid var(--c-border);
        border-radius: 10px;
        padding: 10px 14px;
      }
      .ck-meta-label {
        display: block;
        font-size: 11px;
        color: var(--c-faint);
        margin-bottom: 3px;
      }
      .ck-meta-value {
        font-size: 13px;
        font-weight: 600;
      }

      .ck-includes-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--c-faint);
        margin-bottom: 10px;
        letter-spacing: 0.5px;
      }
      .ck-includes-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ck-includes-list li {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #d1d5db;
      }
      .ck-includes-list svg { color: #4ade80; flex-shrink: 0; }

      /* Checkout card */
      .ck-checkout-card {
        background: var(--c-surface);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--c-border);
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(124,58,237,0.06);
        position: sticky;
        top: 80px;
      }

      .ck-checkout-header { margin-bottom: 20px; }
      .ck-checkout-badge {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: var(--c-violet-soft);
        margin-bottom: 6px;
      }
      .ck-checkout-title {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.5px;
        margin: 0;
      }

      .ck-price-box {
        background: var(--c-surface-2);
        border: 1px solid var(--c-border);
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .ck-price-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
        padding: 4px 0;
      }
      .ck-price-label { color: var(--c-muted); }
      .ck-price-old { font-size: 12px; color: var(--c-faint); }
      .ck-price-strike { text-decoration: line-through; }
      .ck-price-divider {
        height: 1px;
        background: var(--c-border);
        margin: 8px 0;
      }
      .ck-price-total {
        font-size: 18px;
        font-weight: 800;
      }
      .ck-price-value { font-weight: 600; }

      .ck-pay-badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .ck-pay-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: 8px;
        background: rgba(255,255,255,0.05);
        color: var(--c-muted);
      }
      .ck-pay-badge-primary {
        background: rgba(124,58,237,0.15);
        color: var(--c-violet-soft);
        font-weight: 700;
      }

      .ck-pay-info {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        font-size: 12px;
        color: var(--c-faint);
        line-height: 1.5;
        margin-bottom: 18px;
        padding: 12px;
        background: rgba(124,58,237,0.04);
        border-radius: 10px;
        border: 1px solid rgba(124,58,237,0.1);
      }
      .ck-pay-info svg { color: var(--c-violet-bright); flex-shrink: 0; margin-top: 1px; }

      .ck-auth-checking {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--c-muted);
        font-size: 14px;
        padding: 12px 0;
      }

      .ck-auth-prompt p {
        color: var(--c-muted);
        font-size: 14px;
        margin: 0 0 16px;
        line-height: 1.6;
      }

      .ck-auth-ready { display: flex; flex-direction: column; gap: 12px; }

      .ck-user-chip {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        background: var(--c-surface-2);
        border: 1px solid var(--c-border);
        border-radius: 12px;
        font-size: 13px;
        color: var(--c-muted);
      }
      .ck-user-avatar {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: linear-gradient(135deg, #7c3aed, #5b21b6);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 13px;
        color: #fff;
        flex-shrink: 0;
      }

      .ck-error {
        color: #f87171;
        font-size: 13px;
        padding: 10px 14px;
        background: rgba(239,68,68,0.08);
        border: 1px solid rgba(239,68,68,0.2);
        border-radius: 10px;
      }

      /* Buttons */
      .ck-btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: none;
        border-radius: 12px;
        padding: 13px 22px;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: #fff;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        text-decoration: none;
        font-family: inherit;
        transition: transform 0.15s ease, box-shadow 0.2s ease;
        box-shadow: 0 8px 24px rgba(124,58,237,0.3);
      }
      .ck-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(124,58,237,0.4);
      }
      .ck-btn-primary:active { transform: translateY(0); }
      .ck-btn-primary:disabled {
        opacity: 0.6;
        cursor: wait;
        transform: none;
        box-shadow: none;
      }
      .ck-btn-block { width: 100%; }
      .ck-btn-lg { padding: 15px 24px; font-size: 15px; }

      .ck-mini-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255,255,255,0.25);
        border-top-color: #fff;
        border-radius: 50%;
        animation: ckSpin 0.6s linear infinite;
        display: inline-block;
      }

      /* ===== SUCCESS ===== */
      .ck-success-card {
        max-width: 500px;
        margin: 60px auto 0;
        text-align: center;
        background: var(--c-surface);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(34,197,94,0.3);
        border-radius: 20px;
        padding: 40px 32px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(34,197,94,0.08);
        animation: ckFadeUp 0.5s ease both;
      }
      .ck-success-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(34,197,94,0.15);
        border: 1px solid rgba(34,197,94,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #22c55e;
        margin: 0 auto 16px;
      }
      .ck-success-title { font-size: 28px; font-weight: 800; margin: 0 0 8px; }
      .ck-success-sub { color: var(--c-muted); font-size: 15px; margin: 0 0 16px; }
      .ck-success-receipt {
        display: flex;
        gap: 16px;
        justify-content: center;
        flex-wrap: wrap;
        font-size: 12px;
        color: var(--c-faint);
        font-family: monospace;
        margin-bottom: 8px;
      }
      .ck-success-redirect { color: var(--c-faint); font-size: 12px; margin: 0 0 24px; }
      .ck-success-btn { margin: 0 auto; }

      /* ===== PAYMENT PANEL ===== */
      .ck-payment-card {
        max-width: 640px;
        margin: 0 auto;
        background: var(--c-surface);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid var(--c-border);
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 80px rgba(124,58,237,0.06);
        animation: ckFadeUp 0.4s ease both;
      }
      .ck-payment-header { animation: ckFadeUp 0.4s ease both; }
      .ck-payment-summary { animation: ckFadeUp 0.5s ease both; }
      .ck-qr-section { animation: ckFadeUp 0.6s ease both; }
      .ck-pay-action { animation: ckFadeUp 0.7s ease both; }
      .ck-btn-lg {
        animation: ckBtnGlow 2.5s ease-in-out infinite;
      }
      @keyframes ckBtnGlow {
        0%, 100% { box-shadow: 0 8px 24px rgba(124,58,237,0.3); }
        50% { box-shadow: 0 8px 36px rgba(124,58,237,0.5); }
      }
      .ck-countdown-value { animation: ckPulse 1s ease-in-out infinite; }
      @keyframes ckPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }

      /* Cart */
      .ck-cart-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-bottom: 14px;
        margin-bottom: 14px;
        border-bottom: 1px solid var(--c-border);
        color: var(--c-violet-soft);
        animation: ckFadeUp 0.3s ease both;
      }
      .ck-cart-bar-text { font-size: 14px; font-weight: 700; color: var(--c-text); }
      .ck-cart-bar-count {
        font-size: 11px;
        font-weight: 700;
        background: var(--c-violet);
        color: #fff;
        border-radius: 10px;
        padding: 2px 8px;
        min-width: 22px;
        text-align: center;
      }
      .ck-cart-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--c-surface-2);
        border: 1px solid var(--c-border);
        border-radius: 12px;
        margin-bottom: 18px;
        animation: ckFadeUp 0.35s ease both;
      }
      .ck-cart-item-cover {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(91,33,182,0.05));
      }
      .ck-cart-item-cover svg { width: 100%; height: 100%; }
      .ck-cart-item-fallback { font-size: 20px; font-weight: 800; color: var(--c-violet-soft); }
      .ck-cart-item-info { flex: 1; min-width: 0; }
      .ck-cart-item-title {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ck-cart-item-meta { font-size: 11px; color: var(--c-faint); margin-top: 2px; }
      .ck-cart-item-price { font-size: 14px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
      .ck-cart-item-preview { margin-bottom: 16px; }

      .ck-payment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .ck-order-id { color: var(--c-violet-bright); font-size: 12px; font-weight: 700; }
      .ck-payment-product-title { font-size: 20px; font-weight: 800; margin: 6px 0 0; letter-spacing: -0.5px; }

      .ck-countdown-box { text-align: right; }
      .ck-countdown-label { font-size: 11px; color: var(--c-faint); }
      .ck-countdown-value { font-size: 24px; font-weight: 800; }
      .ck-countdown-urgent { color: #f87171; }

      .ck-payment-summary {
        padding: 16px;
        border-radius: 12px;
        background: rgba(255,255,255,0.03);
        border: 1px solid var(--c-border);
        margin-bottom: 20px;
      }
      .ck-pay-sum-row {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        padding: 3px 0;
        color: var(--c-muted);
      }
      .ck-pay-sum-bold { font-size: 16px; font-weight: 800; color: #fff; }
      .ck-pay-sum-badges {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        margin-top: 10px;
      }
      .ck-copy-mini {
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 8px;
        border: 1px solid var(--c-border);
        background: transparent;
        color: var(--c-muted);
        cursor: pointer;
        font-weight: 600;
        font-family: inherit;
      }

      .ck-qr-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin-bottom: 20px;
      }
      .ck-qr-img {
        width: 200px;
        height: 200px;
        border-radius: 16px;
        background: #fff;
        padding: 10px;
        animation: ckQrPulse 2.5s ease-in-out infinite;
        box-shadow: 0 0 30px rgba(124,58,237,0.25);
      }
      .ck-qr-placeholder { color: var(--c-faint); font-size: 13px; }
      .ck-qr-hint { color: var(--c-muted); font-size: 12px; margin-top: 12px; }
      @keyframes ckQrPulse {
        0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.15); }
        50% { box-shadow: 0 0 40px rgba(124,58,237,0.35); }
      }

      .ck-wallet-label { display: block; color: var(--c-muted); font-size: 12px; margin-bottom: 6px; }
      .ck-wallet-row { display: flex; gap: 8px; margin-bottom: 8px; }
      .ck-wallet-input {
        flex: 1;
        min-width: 0;
        background: var(--c-surface-2);
        border: 1px solid var(--c-border);
        border-radius: 10px;
        color: #aaa;
        padding: 12px 14px;
        font-size: 12px;
        font-family: monospace;
        outline: none;
      }
      .ck-copy-btn { white-space: nowrap; padding: 12px 18px; }

      .ck-bscscan-link {
        display: inline-block;
        color: var(--c-violet-bright);
        font-size: 13px;
        margin-bottom: 20px;
        text-decoration: none;
      }
      .ck-bscscan-link:hover { color: var(--c-violet-soft); }

      .ck-pay-action { margin-top: 8px; }
      .ck-pay-waiting { color: var(--c-muted); font-size: 13px; margin: 0 0 12px; }
      .ck-pay-hint { color: var(--c-faint); font-size: 12px; margin: 12px 0 0; line-height: 1.6; }

      .ck-searching-box {
        padding: 16px;
        border-radius: 12px;
        background: rgba(124,58,237,0.08);
        border: 1px solid rgba(124,58,237,0.3);
        margin-bottom: 12px;
      }
      .ck-searching-title { font-weight: 700; font-size: 14px; margin-bottom: 6px; }
      .ck-searching-detail { color: #aaa; font-size: 13px; margin: 0; line-height: 1.6; }
      .ck-searching-tx { color: var(--c-faint); font-size: 11px; margin: 8px 0 0; word-break: break-all; font-family: monospace; }
      .ck-searching-bar {
        height: 4px;
        border-radius: 2px;
        background: rgba(124,58,237,0.2);
        overflow: hidden;
        margin-top: 12px;
      }
      .ck-searching-bar-fill {
        height: 100%;
        width: 40%;
        background: var(--c-violet);
        border-radius: 2px;
        animation: ckSlide 1.2s ease-in-out infinite;
      }

      .ck-manual-toggle {
        width: 100%;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid var(--c-border);
        background: transparent;
        color: var(--c-muted);
        cursor: pointer;
        font-size: 13px;
        font-family: inherit;
        margin-top: 4px;
        transition: border-color 0.2s ease;
      }
      .ck-manual-toggle:hover { border-color: rgba(255,255,255,0.15); }

      .ck-manual-section { margin-top: 12px; }
      .ck-manual-label { display: block; color: var(--c-muted); font-size: 12px; margin-bottom: 6px; }
      .ck-manual-input {
        width: 100%;
        box-sizing: border-box;
        background: var(--c-surface-2);
        border: 1px solid var(--c-border);
        border-radius: 10px;
        color: #fff;
        padding: 12px 14px;
        font-size: 13px;
        font-family: monospace;
        margin-bottom: 12px;
        outline: none;
      }
      .ck-manual-input:focus { border-color: var(--c-border-hover); }

      .ck-verify-info { color: var(--c-faint); font-size: 12px; margin-top: 12px; line-height: 1.6; }

      /* Review / Expired */
      .ck-review-card, .ck-expired-card {
        max-width: 500px;
        margin: 60px auto 0;
        text-align: center;
        padding: 32px;
      }
      .ck-review-card { border-color: rgba(245,158,11,0.4); }
      .ck-expired-card { border-color: rgba(239,68,68,0.3); }
      .ck-review-icon, .ck-expired-icon { font-size: 32px; margin-bottom: 12px; }
      .ck-review-card h2, .ck-expired-card h2 { font-size: 22px; margin: 0 0 8px; }
      .ck-review-card p, .ck-expired-card p { color: var(--c-muted); font-size: 14px; line-height: 1.6; }

      /* Missing / Loading */
      .ck-missing, .ck-loading {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
      }
      .ck-missing h1 { font-size: 24px; }
      .ck-loading { color: var(--c-muted); font-size: 14px; flex-direction: row; }
      .ck-loading-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(124,58,237,0.2);
        border-top-color: var(--c-violet);
        border-radius: 50%;
        animation: ckSpin 0.6s linear infinite;
      }

      /* Animations */
      @keyframes ckFadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: none; }
      }
      @keyframes ckSpin { to { transform: rotate(360deg); } }
      @keyframes ckSlide {
        0% { margin-left: -40%; }
        100% { margin-left: 100%; }
      }

      /* Mobile */
      @media (max-width: 760px) {
        .ck-header { padding: 0 16px; }
        .ck-content { padding: 24px 16px 60px; }
        .ck-preview-layout { grid-template-columns: 1fr; }
        .ck-checkout-card { position: static; }
        .ck-product-meta { grid-template-columns: 1fr; }
        .ck-payment-card { padding: 20px; }
        .ck-payment-header { flex-direction: column; align-items: flex-start; }
        .ck-countdown-box { text-align: left; }
        .ck-wallet-row { flex-direction: column; }
        .ck-copy-btn { width: 100%; }
        .ck-success-card { margin: 20px auto; padding: 28px 20px; }
      }
    `}</style>
  );
}
