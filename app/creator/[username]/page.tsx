// ============================================
// CREATOR PROFILE - redirige a la página canónica
// ============================================
// La página pública vive en /marketplace/creator/[slug] (foto, bio, stats).
// Esta ruta legacy redirige para no duplicar ni romper enlaces existentes.

import { redirect } from "next/navigation";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/marketplace/creator/${encodeURIComponent(username)}`);
}
