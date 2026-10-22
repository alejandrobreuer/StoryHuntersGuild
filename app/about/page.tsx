import type { Metadata } from "next";
import Image from "next/image";
import { SocialLinks } from "@/components/layout/SocialLinks";

export const metadata: Metadata = { title: "Nosotros — Story Hunters Guild" };

// A light page on purpose: the crest's dark reds and blacks disappear on the
// site's leather background. `page-light` also paints the space down to the
// footer on short screens (see SiteChromeGuard).
export default function AboutPage() {
  return (
    <main className="page-light bg-parchment">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Image src="/images/crest.png" alt="" width={160} height={160} className="mx-auto mb-8 object-contain" priority />
        <h1 className="font-display text-3xl text-ink text-center mb-8">Nosotros</h1>
        <div className="font-body text-lg text-ink leading-relaxed flex flex-col gap-5">
          <p className="font-display text-xl text-crimson">
            Descubrí los juegos de mesa modernos casi a los 30.
          </p>
          <p>
            De chico, los libros eran mi puerta a otros mundos. Con D&amp;D, Scythe y Bargain Quest encontré algo
            parecido, pero distinto: ya no leía la historia, la vivía. Fui aventurero, estratega, mercader.
          </p>
          <p>
            Me llevó casi 30 años encontrar esto. Story Hunters existe para que a vos no te lleve tanto.
          </p>
          <p>
            Cada noche de juego es una historia nueva: otro juego, otro rol, gente nueva alrededor de la mesa.
            Y mientras jugamos, el gremio también va escribiendo la suya.
          </p>
          <p className="italic">
            Si alguna vez un libro te llevó lejos, te esperamos en la mesa. 🎲
          </p>
        </div>
        <div className="mt-12 border-t border-parchment-deep pt-8 text-center">
          <p className="font-label text-2xs uppercase tracking-widest text-ink-light mb-3">Seguinos</p>
          <SocialLinks className="justify-center text-ink [&_a:hover]:text-crimson" />
        </div>
      </div>
    </main>
  );
}
