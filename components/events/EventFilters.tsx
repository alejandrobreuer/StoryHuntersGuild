"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";

interface EventFiltersProps {
  venues: { id: string; name: string }[];
}

export function EventFilters({ venues }: EventFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-8 surface-parchment p-4">
      <Input
        type="date"
        label="Desde"
        defaultValue={searchParams.get("from") ?? ""}
        onChange={(e) => updateParam("from", e.target.value)}
        wrapperClassName="w-40"
      />
      <Select
        label="Lugar"
        defaultValue={searchParams.get("venueId") ?? ""}
        onChange={(e) => updateParam("venueId", e.target.value)}
        wrapperClassName="min-w-[200px]"
      >
        <option value="">Todos los lugares</option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </Select>
      <Select
        label="Estado"
        defaultValue={searchParams.get("lifecycle") ?? ""}
        onChange={(e) => updateParam("lifecycle", e.target.value)}
        wrapperClassName="min-w-[180px]"
      >
        <option value="">Todos</option>
        <option value="pending">Pendiente de iniciar</option>
        <option value="active">En vivo</option>
        <option value="closed">Finalizado</option>
      </Select>
    </div>
  );
}
