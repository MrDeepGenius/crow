// ============================================
// REGISTRY - persistencia server (dev, archivo)
// ============================================
// PROD REQUIERE DB: este archivo JSON es para desarrollo. Hay condición
// de carrera en escrituras concurrentes; documentado, no apto para prod.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { PaymentQuote } from "./quotes";

export interface RegistryData {
  usedTx: Record<string, { orderId: string; usedAt: string }>;
  usedQuotes: Record<string, { orderId: string; usedAt: string }>;
  events: { timestamp: string; kind: string; detail: string }[];
}

const EMPTY: RegistryData = { usedTx: {}, usedQuotes: {}, events: [] };

export function loadRegistry(path: string): RegistryData {
  try {
    if (!existsSync(path)) return structuredClone(EMPTY);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<RegistryData>;
    return {
      usedTx: parsed.usedTx ?? {},
      usedQuotes: parsed.usedQuotes ?? {},
      events: parsed.events ?? [],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

export function saveRegistry(path: string, data: RegistryData): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

export function logRegistryEvent(path: string, kind: string, detail: string): void {
  const data = loadRegistry(path);
  data.events.push({ timestamp: new Date().toISOString(), kind, detail });
  saveRegistry(path, data.events.length > 2000 ? { ...data, events: data.events.slice(-2000) } : data);
}

export type { PaymentQuote };
