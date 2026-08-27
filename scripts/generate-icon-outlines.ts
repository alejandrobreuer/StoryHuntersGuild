// Bulk regeneration of location marker icon outlines.
//
// Every icon a GM uploads through /rol/settings already gets its outline
// baked in at upload time (see app/api/admin/rol/locations/icon/route.ts,
// lib/rol/iconOutline.ts) — that's the normal path, this script is not part
// of it. Run this instead when you need to REGENERATE outlines already in
// the database: after tweaking the default radius/algorithm, to bulk-switch
// every location to a different outline color, or to backfill outlines for
// rows uploaded before this feature existed (icon_source_url is null there —
// this script treats the current icon_url as the one-time pristine source
// for those, then persists it as icon_source_url so a second run never
// re-outlines an already-outlined image).
//
// Usage:
//   npm run generate-icon-outlines
//   npm run generate-icon-outlines -- --radius=4
//   npm run generate-icon-outlines -- --color=red     (override every row's stored color)

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateOutlinedIcon, type IconOutlineColor } from "../lib/rol/iconOutline";

const VALID_COLORS: IconOutlineColor[] = ["black", "red", "white"];

function parseArgs() {
  const args = process.argv.slice(2);
  let radius: number | undefined;
  let colorOverride: IconOutlineColor | undefined;
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key === "radius" && value) radius = Number(value);
    if (key === "color" && value) {
      if (!VALID_COLORS.includes(value as IconOutlineColor)) {
        console.error(`Invalid --color "${value}" — must be one of: ${VALID_COLORS.join(", ")}`);
        process.exit(1);
      }
      colorOverride = value as IconOutlineColor;
    }
  }
  return { radius, colorOverride };
}

interface LocationRow {
  id: string;
  name: string;
  icon_url: string | null;
  icon_source_url: string | null;
  icon_outline_color: IconOutlineColor;
}

async function main() {
  const { radius, colorOverride } = parseArgs();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceJwt = process.env.SHG_SERVICE_ROLE_JWT;
  if (!url || !anonKey || !serviceJwt) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SHG_SERVICE_ROLE_JWT — check .env.local.");
    process.exit(1);
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${serviceJwt}` } },
  });

  const { data: locations, error } = await supabase
    .from("shg_rol_location")
    .select("id, name, icon_url, icon_source_url, icon_outline_color")
    .not("icon_url", "is", null)
    .returns<LocationRow[]>();

  if (error) {
    console.error("Failed to load locations:", error.message);
    process.exit(1);
  }
  if (!locations || locations.length === 0) {
    console.log("No locations with a custom icon — nothing to do.");
    return;
  }

  console.log(`Regenerating outlines for ${locations.length} location icon(s)…`);

  for (const loc of locations) {
    const color = colorOverride ?? loc.icon_outline_color;
    // Icons uploaded before this feature existed have no recorded source —
    // treat the current icon_url as the pristine source exactly once.
    const sourceUrl = loc.icon_source_url ?? loc.icon_url!;

    try {
      const sourceRes = await fetch(sourceUrl);
      if (!sourceRes.ok) throw new Error(`fetch ${sourceRes.status}`);
      const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer());

      const outlineBuffer = await generateOutlinedIcon(sourceBuffer, { color, radius });

      const match = /\/([0-9a-f-]{36})-(?:source|outline-\w+)\.\w+(?:$|\?)/i.exec(sourceUrl);
      const idPrefix = match?.[1] ?? crypto.randomUUID();
      const ext = sourceUrl.match(/\.(\w+)(?:$|\?)/)?.[1] ?? "png";

      const sourcePath = `rol-icons/${idPrefix}-source.${ext}`;
      const outlinePath = `rol-icons/${idPrefix}-outline-${color}.png`;

      if (!loc.icon_source_url) {
        const { error: srcErr } = await supabase.storage
          .from("shg-media")
          .upload(sourcePath, sourceBuffer, { contentType: `image/${ext === "png" ? "png" : "webp"}`, upsert: true });
        if (srcErr) throw new Error(`source upload: ${srcErr.message}`);
      }

      const { error: outErr } = await supabase.storage
        .from("shg-media")
        .upload(outlinePath, outlineBuffer, { contentType: "image/png", upsert: true });
      if (outErr) throw new Error(`outline upload: ${outErr.message}`);

      const newSourceUrl = loc.icon_source_url ?? supabase.storage.from("shg-media").getPublicUrl(sourcePath).data.publicUrl;
      const newOutlineUrl = supabase.storage.from("shg-media").getPublicUrl(outlinePath).data.publicUrl;

      const { error: updateErr } = await supabase
        .from("shg_rol_location")
        .update({ icon_url: newOutlineUrl, icon_source_url: newSourceUrl, icon_outline_color: color })
        .eq("id", loc.id);
      if (updateErr) throw new Error(`db update: ${updateErr.message}`);

      console.log(`  ✓ ${loc.name}`);
    } catch (err) {
      console.error(`  ✗ ${loc.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("Done.");
}

main();
