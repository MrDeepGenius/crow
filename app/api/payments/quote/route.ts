// POST /api/payments/quote — cotización firmada (server, sin secretos al cliente)
import { NextResponse } from "next/server";
import { getPaymentsConfig } from "@/app/services/payments/config";
import { issueQuote } from "@/app/services/payments/quotes";
import { randomUUID } from "node:crypto";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = (await req.json()) as { orderId?: unknown; amount?: unknown; currency?: unknown };
    if (typeof body.orderId !== "string" || !/^[A-Za-z0-9-]{4,64}$/.test(body.orderId)) {
      return NextResponse.json({ ok: false, reason: "INVALID_ORDER" }, { status: 400 });
    }
    if (typeof body.amount !== "number" || !(body.amount > 0) || !Number.isFinite(body.amount)) {
      return NextResponse.json({ ok: false, reason: "INVALID_AMOUNT" }, { status: 400 });
    }
    if (typeof body.currency !== "string" || body.currency.trim().length === 0) {
      return NextResponse.json({ ok: false, reason: "INVALID_CURRENCY" }, { status: 400 });
    }
    const config = getPaymentsConfig();
    if (config.usingDevSecret) {
      console.warn("[payments] PAYMENT_QUOTE_SECRET no configurada: usando secreto de desarrollo. NO usar en producción.");
    }
    const quote = issueQuote(
      {
        orderId: body.orderId,
        amount: body.amount,
        currency: body.currency.trim().slice(0, 8),
        treasury: config.treasury,
        chainId: config.chainId,
        ttlMinutes: config.orderTtlMinutes,
      },
      config.quoteSecret,
      randomUUID()
    );
    return NextResponse.json({
      ok: true,
      quote,
      payment: {
        provider: "usdt-bep20",
        chain: "BNB Smart Chain",
        chainId: config.chainId,
        token: "USDT",
        tokenContract: config.usdtContract,
        treasury: config.treasury,
        minConfirmations: config.minConfirmations,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "SERVER_ERROR" }, { status: 500 });
  }
}
