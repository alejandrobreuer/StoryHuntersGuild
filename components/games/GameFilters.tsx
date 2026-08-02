"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function GameFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-leather-light pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar un juego…"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full h-11 pl-9 pr-3 font-body text-sm text-ink bg-parchment/90 border border-border focus:border-brass focus:ring-1 focus:ring-brass/40 outline-none"
        />
      </div>
      <Select
        defaultValue={searchParams.get("complexity") ?? ""}
        onChange={(e) => updateParam("complexity", e.target.value)}
        wrapperClassName="w-44"
      >
        <option value="">Toda dificultad</option>
        <option value="light">Fácil</option>
        <option value="medium">Intermedio</option>
        <option value="heavy">Avanzado</option>
      </Select>
      <label className="flex items-center gap-2 font-body text-sm text-parchment-dark px-2">
        <input
          type="checkbox"
          defaultChecked={searchParams.get("beginner") === "1"}
          onChange={(e) => updateParam("beginner", e.target.checked ? "1" : "")}
          className="accent-moss size-4"
        />
        Ideal para empezar
      </label>
    </div>
  );
}
