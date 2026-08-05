import type { Metadata } from "next";
import { Cinzel, Crimson_Text, Oswald } from "next/font/google";
import { Toaster } from "sonner";
import { SiteChromeGuard } from "@/components/layout/SiteChromeGuard";
import { getSessionUser, getAdminUser } from "@/lib/auth/guard";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sessionUser, adminUser] = await Promise.all([getSessionUser(), getAdminUser()]);
  return (
    <html lang="es" className={`${cinzel.variable} ${crimson.variable} ${oswald.variable}`}>
      <body className="antialiased">
        <SiteChromeGuard sessionUser={sessionUser} isAdmin={!!adminUser}>{children}</SiteChromeGuard>
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
