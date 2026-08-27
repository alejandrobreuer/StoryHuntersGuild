import sharp from "sharp";

// Bakes a colored outline around a location marker icon's actual silhouette
// (from its alpha channel) — not a square border around the bounding box.
// Runs once per upload / regeneration, never at render time: app/rol/map's
// LocationMarker and LocationsManager's LocationPin just <img src={icon_url}>
// the already-outlined PNG this produces.

export type IconOutlineColor = "black" | "red" | "white";

const OUTLINE_RGB: Record<IconOutlineColor, [number, number, number]> = {
  black: [0x00, 0x00, 0x00],
  red:   [0xe6, 0x39, 0x2a],
  white: [0xff, 0xff, 0xff],
};

// A marker's on-screen size never changes with map zoom — zoom only spreads
// pins further apart (they're absolutely positioned by x_pct/y_pct inside the
// zoomed container; their own box is a fixed CSS size). The largest tier is
// city/fortress at scale 1.35 in lib/rol/locationTypes.ts, i.e. ~60px. 256px
// supersamples that ~4x over, well past any real device pixel ratio.
const DISPLAY_BOX_PX = 64;
const OUTPUT_SIZE = 256;
const SUPERSAMPLE = OUTPUT_SIZE / DISPLAY_BOX_PX;

// Upscaling the source (see below) runs it through a resampling kernel that
// can leave faint "ringing" pixels — alpha of 1-20/255, visually invisible —
// well outside the real silhouette. Treating any alpha>0 as "opaque" made the
// outline bulge unpredictably wherever ringing happened to land; this cutoff
// (~12% opacity) is low enough to keep genuine soft/antialiased edges the
// source art actually intends, while ignoring resize noise.
const ALPHA_THRESHOLD = 32;

export interface OutlineOptions {
  /** Outline thickness in on-screen px at the marker's real display size — not raw output pixels. */
  radius?: number;
  color?: IconOutlineColor;
}

/**
 * Upscales the source art to OUTPUT_SIZE first, then computes the outline
 * directly at that resolution (never stretches a low-res outline afterward),
 * and composites the original art back on top of it.
 */
export async function generateOutlinedIcon(source: Buffer, opts: OutlineOptions = {}): Promise<Buffer> {
  const radiusPx = Math.max(1, Math.round((opts.radius ?? 3) * SUPERSAMPLE));
  const [r, g, b] = OUTLINE_RGB[opts.color ?? "black"];

  const { data, info } = await sharp(source)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const srcAlpha = new Uint8Array(width * height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      srcAlpha[y * width + x] = a;
      if (a > ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const out = Buffer.from(data);
  if (maxX === -1) {
    // Fully transparent source — nothing to outline, nothing to composite.
    return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
  }

  // Below-threshold pixels aren't "the art" (see ALPHA_THRESHOLD) — clear them
  // so resize-ringing noise doesn't survive into the output; the loop below
  // repaints the ones that do qualify as outline.
  for (let i = 0; i < srcAlpha.length; i++) {
    if (srcAlpha[i] > 0 && srcAlpha[i] <= ALPHA_THRESHOLD) out.fill(0, i * 4, i * 4 + 4);
  }

  // Circular neighborhood, nearest-first, so a transparent pixel can stop
  // checking as soon as it finds one opaque source pixel within radiusPx.
  const offsets: [number, number][] = [];
  for (let dy = -radiusPx; dy <= radiusPx; dy++) {
    for (let dx = -radiusPx; dx <= radiusPx; dx++) {
      if (dx * dx + dy * dy <= radiusPx * radiusPx) offsets.push([dx, dy]);
    }
  }
  offsets.sort((a, b2) => a[0] * a[0] + a[1] * a[1] - (b2[0] * b2[0] + b2[1] * b2[1]));

  // Only pixels within radiusPx of the artwork's bounding box can ever grow
  // an outline — skip the (usually large) transparent padding around it.
  const bx0 = Math.max(0, minX - radiusPx);
  const bx1 = Math.min(width - 1, maxX + radiusPx);
  const by0 = Math.max(0, minY - radiusPx);
  const by1 = Math.min(height - 1, maxY + radiusPx);

  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const idx = y * width + x;
      if (srcAlpha[idx] > ALPHA_THRESHOLD) continue; // keep original art untouched
      for (const [dx, dy] of offsets) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (srcAlpha[ny * width + nx] > ALPHA_THRESHOLD) {
          const p = idx * 4;
          out[p] = r;
          out[p + 1] = g;
          out[p + 2] = b;
          out[p + 3] = 255;
          break;
        }
      }
    }
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}
