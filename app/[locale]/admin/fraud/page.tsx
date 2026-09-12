import type { Metadata } from "next";
import { FraudAdminClient } from "./FraudAdminClient";

export const metadata: Metadata = {
  title: "Fraude · Admin Crow",
  description: "Prevención de fraude en afiliados: riesgo, casos y comisiones retenidas.",
};

export default function FraudAdminPage() {
  return <FraudAdminClient />;
}
