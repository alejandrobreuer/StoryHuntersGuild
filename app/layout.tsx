import type { Metadata } from "next";
import { Cinzel, Crimson_Text, Oswald } from "next/font/google";
import { Toaster } from "sonner";
import { SiteChromeGuard } from "@/components/layout/SiteChromeGuard";
import { getSessionUser, getAdminUser } from "@/lib/auth/guard";
import { getFeatureFlags } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase/admin";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const crimson = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-oswald",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Story Hunters Guild",
  description:
    "Eventos de juegos de mesa para todos — reservá tu lugar en la próxima aventura del grupo.",
};

// At most one event is ever live at a time — if the session user has a
// confirmed booking for it, Nav gets a "jump to your event" pill.
async function getMyLiveEvent(userId: string | undefined): Promise<{ id: string; title: string } | null> {
  if (!userId) return null;
  const admin = createAdminClient();
  const { data: liveEvent } = await admin
    .from("shg_events")
    .select("id, title")
    .not("started_at", "is", null)
    .is("ended_at", null)
    .limit(1)
    .maybeSingle();
  if (!liveEvent) return null;

  const { data: booking } = await admin
    .from("shg_bookings")
    .select("id")
    .eq("event_id", liveEvent.id).eq("user_id", userId).eq("status", "approved")
    .maybeSingle();
  return booking ? liveEvent : null;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sessionUser, adminUser, features] = await Promise.all([getSessionUser(), getAdminUser(), getFeatureFlags()]);
  const myLiveEvent = await getMyLiveEvent(sessionUser?.id);
  return (
    <html lang="es" className={`${cinzel.variable} ${crimson.variable} ${oswald.variable}`}>
      <body className="antialiased">
        <SiteChromeGuard sessionUser={sessionUser} isAdmin={!!adminUser} questsEnabled={features.quests} myLiveEvent={myLiveEvent}>
          {children}
        </SiteChromeGuard>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background:  "#f2e8d5",
              border:      "1px solid #c9b07a",
              color:       "#2b1d0e",
              fontFamily:  "var(--font-crimson)",
              fontSize:    "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
