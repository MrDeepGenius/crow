import type { Metadata } from "next";
import { JoinClient } from "../../JoinClient";

export const metadata: Metadata = {
  title: "Invitación · Crow Market",
};

export default function JoinCreatorPage() {
  return <JoinClient kind="creator" />;
}
