import QRCode from "qrcode";

// Error correction Q (~25% recoverable): printed cards get handled, folded
// and splashed at the table, so trade a little density for robustness.
const BASE = { errorCorrectionLevel: "Q" as const, margin: 2 };

/** Scalable black-on-white SVG, for screens and the SVG download. */
export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { ...BASE, type: "svg" });
}

/** ~1024 px black-on-white PNG — print quality for the PNG/ZIP downloads. */
export function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...BASE, width: 1024 });
}

/** Dark ink on a transparent background, so it prints straight onto the
 * parchment card template without a white box behind it. */
export function qrCardPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...BASE, width: 600, color: { dark: "#2E1A0EFF", light: "#00000000" } });
}
