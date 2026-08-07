import type { Metadata } from "next";
import { Cinzel, EB_Garamond, IM_Fell_English_SC } from "next/font/google";
import "./fu.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-fu-display",
  display: "swap",
});

const imFell = IM_Fell_English_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fu-label",
  display: "swap",
});

const garamond = EB_Garamond({
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
    <div className={`fu-root ${cinzel.variable} ${imFell.variable} ${garamond.variable}`}>
      {children}
    </div>
  );
}
