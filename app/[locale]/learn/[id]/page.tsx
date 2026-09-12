// ============================================
// LEARN - curso con entitlement + progreso real
// ============================================

import type { Metadata } from "next";
import { LearnClient } from "./LearnClient";

export const metadata: Metadata = {
  title: "Aprender · Crow Market",
  description: "Tu curso comprado en Crow Market.",
};

export default function LearnPage() {
  return <LearnClient />;
}
