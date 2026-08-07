import type { Metadata } from "next";
import { Inter, Orbitron, Press_Start_2P } from "next/font/google";
import "./fu.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-fu-display",
  display: "swap",
});

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fu-label",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fu-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Character Forge · Fabula Ultima",
  description: "Build and manage level-5 Fabula Ultima player characters.",
  robots: { index: false, follow: false },
};

export default function FULayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`fu-root ${orbitron.variable} ${pressStart.variable} ${inter.variable}`}>
      {children}
    </div>
  );
}
