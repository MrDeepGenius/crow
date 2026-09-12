import type { Metadata } from "next";
import { AffiliateRedirectClient } from "./AffiliateRedirectClient";

export const metadata: Metadata = {
  title: "Redirigiendo · Crow Market",
};

export default function AffiliateRedirectPage() {
  return <AffiliateRedirectClient />;
}
