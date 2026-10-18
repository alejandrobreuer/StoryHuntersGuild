import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getSessionUser } from "@/lib/auth/guard";
import { evaluateCheckin } from "@/lib/qr/checkin";
import { CheckinView } from "@/components/qr/CheckinView";

// The URL inside an event's entrance QR. Reads only — attendance is written
// by the POST CheckinView sends (see app/api/qr/checkin/[token]/route.ts).

export const dynamic = "force-dynamic";
export const metadata = { title: "Check-in — Story Hunters Guild", robots: { index: false, follow: false } };

export default async function CheckinPage({ params }: { params: { token: string } }) {
  noStore();
  const user = await getSessionUser();
  const outcome = await evaluateCheckin(params.token, user?.id ?? null);

  if (outcome.kind === "login_required") {
    redirect(`/sign-in?next=${encodeURIComponent(`/checkin/${params.token}`)}`);
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <CheckinView token={params.token} initial={outcome} />
    </main>
  );
}
