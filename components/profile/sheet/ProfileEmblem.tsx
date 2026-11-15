"use client";

import * as React from "react";
import Image from "next/image";
import { Camera, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_BYTES = 2 * 1024 * 1024;

/** What fills the diamond: the player's photo, else the rank emblem, else a shield. */
function DiamondContent({ src, emblemUrl, emblemAlt, size }: {
  src: string | null; emblemUrl: string | null; emblemAlt: string; size: string;
}) {
  if (src) {
    // Counter-rotated and scaled by √2 so the square photo covers the whole diamond.
    // eslint-disable-next-line @next/next/no-img-element -- blob: previews and storage URLs alike
    return <img src={src} alt="Tu foto de perfil" className="absolute inset-0 size-full object-cover -rotate-45 scale-[1.42]" />;
  }
  return (
    <div className={cn("-rotate-45 relative flex items-center justify-center", size)}>
      {emblemUrl ? (
        <Image src={emblemUrl} alt={emblemAlt} fill className="object-contain" sizes="72px" />
      ) : (
        <Shield size={48} className="text-crimson" strokeWidth={1.25} aria-hidden />
      )}
    </div>
  );
}

const DIAMOND = "relative overflow-hidden rotate-45 border-2 border-brass bg-gradient-to-br from-parchment-dark to-parchment-deep shadow-[inset_0_0_0_4px_rgba(239,228,204,0.6)] flex items-center justify-center";

/** The diamond on the character card, with a button to upload/change/remove
 * the player's profile picture. */
export function ProfileEmblem({ avatarUrl, emblemUrl, emblemAlt }: {
  avatarUrl: string | null;
  /** Rank emblem shown when there's no photo. */
  emblemUrl: string | null;
  emblemAlt: string;
}) {
  const [current, setCurrent] = React.useState(avatarUrl);
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<"save" | "remove" | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function close() {
    setOpen(false);
    setFile(null);
    setPreview(null);
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) { toast.error("Formatos permitidos: JPG, PNG o WebP."); return; }
    if (f.size > MAX_BYTES) { toast.error("La imagen no puede superar los 2MB."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    if (!file) return;
    setBusy("save");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "No se pudo subir la foto."); return; }
      setCurrent(json.data.avatar_url);
      toast.success("Foto actualizada.");
      close();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("remove");
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "No se pudo quitar la foto."); return; }
      setCurrent(null);
      toast.success("Foto quitada.");
      close();
    } finally {
      setBusy(null);
    }
  }

  const shown = preview ?? current;

  return (
    <>
      <div className="relative mt-3 mb-1.5">
        <div className={cn(DIAMOND, "size-24 sm:size-28")}>
          <DiamondContent src={current} emblemUrl={emblemUrl} emblemAlt={emblemAlt} size="size-16 sm:size-[72px]" />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={current ? "Cambiar foto de perfil" : "Subir foto de perfil"}
          className="absolute -bottom-3 -right-3 size-9 rounded-full border-[1.5px] border-brass bg-parchment text-brass-dark shadow-parchment flex items-center justify-center hover:bg-parchment-dark transition-colors"
        >
          <Camera size={16} aria-hidden />
        </button>
      </div>

      <Modal
        open={open}
        onClose={close}
        title="Foto de perfil"
        className="max-w-sm"
        footer={
          <div className="flex flex-wrap gap-2 justify-end">
            {current && !file && (
              <Button variant="danger" size="sm" onClick={remove} loading={busy === "remove"} disabled={busy !== null}>
                Quitar foto
              </Button>
            )}
            <Button size="sm" onClick={save} loading={busy === "save"} disabled={!file || busy !== null}>
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-5">
          <div className={cn(DIAMOND, "size-32 my-4")}>
            <DiamondContent src={shown} emblemUrl={emblemUrl} emblemAlt={emblemAlt} size="size-20" />
          </div>
          <input ref={inputRef} type="file" accept={ACCEPT} onChange={pick} className="hidden" />
          <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={busy !== null}>
            <Camera size={14} aria-hidden /> {shown ? "Elegir otra foto" : "Elegir una foto"}
          </Button>
          <p className="font-body text-sm text-ink-light text-center">
            JPG, PNG o WebP, hasta 2MB. Se muestra en tu ficha en lugar del emblema de tu rango; si la quitás, vuelve el emblema.
          </p>
        </div>
      </Modal>
    </>
  );
}
