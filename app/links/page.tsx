import type { Metadata } from "next";
import Image from "next/image";
import { SOCIALS } from "@/components/layout/SocialLinks";

export const metadata: Metadata = { title: "Links — Story Hunters Guild" };

// Link-in-bio page: one big button per guild account. Same parchment look as
// /about (the crest disappears on the leather background).
const BLURBS: Record<string, string> = {
  Instagram: "Fotos y novedades de cada noche de juego",
  YouTube: "Reseñas, partidas y tutoriales",
  TikTok: "Clips cortos del gremio",
  WhatsApp: "Sumate a la comunidad",
  Discord: "Charlá con el gremio y armá mesas",
};

export default function LinksPage() {
  return (
    <main className="page-light page-fill bg-parchment">
      <div className="max-w-md mx-auto px-4 py-12">
        <Image src="/images/crest.png" alt="" width={120} height={120} className="mx-auto mb-6 object-contain" priority />
        <h1 className="font-display text-3xl text-ink text-center mb-2">Story Hunters Guild</h1>
        <p className="font-body text-ink-light text-center mb-8">Encontranos en todas partes</p>
        <ul className="flex flex-col gap-3">
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a
                href={s.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 rounded-lg border border-ink/20 bg-white/40 px-4 py-3 text-ink transition-colors hover:border-crimson hover:text-crimson"
              >
                <svg
                  viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0"
                >
                  {s.icon}
                </svg>
                <span className="flex flex-col">
                  <span className="font-display text-lg leading-tight">{s.label}</span>
                  {BLURBS[s.label] && <span className="font-body text-sm text-ink-light">{BLURBS[s.label]}</span>}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
