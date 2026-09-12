// ============================================
// CROW CREATOR OS - centro de operaciones del creador
// ============================================

import type { Metadata } from "next";
import { CreatorOsClient } from "./CreatorOsClient";

export const metadata: Metadata = {
  title: "Creator OS · Crow Market",
  description: "Creá, publicá, vendé y hacé crecer tus productos digitales.",
};

export default function CreatorOsPage() {
  return <CreatorOsClient />;
}
