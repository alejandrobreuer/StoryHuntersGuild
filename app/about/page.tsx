import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "Nosotros — Story Hunters Guild" };

export default function AboutPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-center">
      <Image src="/images/crest.png" alt="" width={120} height={120} className="mx-auto mb-6 object-contain" />
      <h1 className="font-display text-3xl text-parchment mb-4">Sobre Story Hunters Guild</h1>
      <div className="font-body text-base text-parchment-dark/85 leading-relaxed flex flex-col gap-4 text-left">
        <p>
          Story Hunters Guild organiza encuentros de juegos de mesa para cualquiera con ganas de sentarse
          a jugar — no hace falta ser un jugador habitual ni conocer a nadie de antemano.
        </p>
        <p>
          Cada evento tiene un cupo limitado, así que reservá tu lugar con anticipación. Vas a encontrar
          desde juegos livianos ideales para tu primera vez, hasta opciones más largas para los que ya
          tienen experiencia.
        </p>
        <p>
          La ambientación de aventurero es solo estética — nuestro objetivo es simple: buenos juegos,
          buena compañía, y una tarde bien aprovechada.
        </p>
      </div>
    </main>
  );
}
