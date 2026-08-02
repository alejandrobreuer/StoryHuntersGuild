import { Crosshair } from "lucide-react";

export function StudioCreditFooter() {
  return (
    <footer className="bg-gradient-to-b from-leather to-[#0c0904] border-t-2 border-brass text-center py-9 px-6">
      <div className="flex items-center justify-center gap-2.5 mb-2">
        <Crosshair size={18} className="text-brass-light" />
        <span className="font-display text-base text-brass-light">Story Hunters Guild</span>
      </div>
      <p className="font-label text-2xs tracking-widest text-leather-lighter uppercase">
        Creado por Story Hunters
      </p>
      <p className="font-label text-2xs tracking-widest text-leather-lighter/70 uppercase mt-1">
        © {new Date().getFullYear()} Story Hunters Guild. Todos los derechos reservados.
      </p>
    </footer>
  );
}
