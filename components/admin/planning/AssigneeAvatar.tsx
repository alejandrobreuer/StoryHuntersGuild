import { cn } from "@/lib/utils";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AssigneeAvatarProps {
  name?: string | null;
  size?: "sm" | "md";
  className?: string;
}

// Solid initials circle when assigned, dashed "?" outline when not — same
// visual language as the mockups' avatar chips.
export function AssigneeAvatar({ name, size = "sm", className }: AssigneeAvatarProps) {
  const dims = size === "sm" ? "size-7 text-2xs" : "size-9 text-xs";
  if (!name) {
    return (
      <span
        title="Sin asignar"
        className={cn(
          "shrink-0 flex items-center justify-center rounded-full border border-dashed border-leather-light text-leather-light font-label",
          dims, className
        )}
      >
        ?
      </span>
    );
  }
  return (
    <span
      title={name}
      className={cn("shrink-0 flex items-center justify-center rounded-full bg-ink text-parchment font-label", dims, className)}
    >
      {initialsFor(name)}
    </span>
  );
}
