import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getSessionUser } from "@/lib/auth/guard";
import { evaluateMissionClaim } from "@/lib/qr/missionClaim";
import { MissionClaimView } from "@/components/qr/MissionClaimView";

// The URL inside every printed mission card's QR. Reads only — the claim
// itself is a POST MissionClaimView sends once the page is open in a real
// browser (see app/api/qr/missions/[token]/claim/route.ts).

export const dynamic = "force-dynamic";
export const metadata = { title: "Misión — Story Hunters Guild", robots: { index: false, follow: false } };

export default async function MissionClaimPage({ params }: { params: { token: string } }) {
  noStore();
  const user = await getSessionUser();
  const outcome = await evaluateMissionClaim(params.token, user?.id ?? null);

  if (outcome.kind === "login_required") {
    redirect(`/sign-in?next=${encodeURIComponent(`/m/${params.token}`)}`);
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <MissionClaimView token={params.token} initial={outcome} />
    </main>
  );
}
