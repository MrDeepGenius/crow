// ============================================
// CREATOR PROFILE - perfil público real
// ============================================

import type { Metadata } from "next";
import { CreatorClient } from "./CreatorClient";

export const metadata: Metadata = {
  title: "Creador · Crow Market",
  description: "Perfil público de un creador de Crow Market.",
};

export default function CreatorPage() {
  return <CreatorClient />;
}
