/**
 * Deterministic, offline artwork.
 *
 * The prototype ships no photo assets and makes no network calls for images:
 * every product, shop cover and logo is an SVG generated from its id, so the
 * demo renders identically with or without an internet connection.
 *
 *   /api/art/product/prod_014
 *   /api/art/shop/shop_01?c=cat_fashion
 *   /api/art/logo/shop_01
 */

/** Stable 32-bit hash so the same id always yields the same tile. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Warm palette pairs that sit next to the AddisSuq green / terracotta brand. */
const PALETTES = [
  ["#d86b46", "#8f3d28"],
  ["#e2a04a", "#a45f24"],
  ["#3b6d60", "#183d36"],
  ["#7b8f52", "#3f5230"],
  ["#c9573f", "#6d2a20"],
  ["#4d7c8a", "#22434e"],
  ["#b0714c", "#5f3823"],
  ["#8a6ea8", "#40305a"],
  ["#2f7d62", "#134536"],
  ["#cf8a5c", "#7a4526"],
];

const GLYPHS: Record<string, string> = {
  cat_fashion:
    "M8 3 L5 5 L3 9 L6 10.2 L6 21 L18 21 L18 10.2 L21 9 L19 5 L16 3 L14.2 5.2 A3 3 0 0 1 9.8 5.2 Z",
  cat_electronics: "M13 2 L4 14 H10.6 L9.6 22 L20 9 H13 Z",
  cat_beauty: "M12 2 C12 2 5 10.2 5 15 A7 7 0 0 0 19 15 C19 10.2 12 2 12 2 Z",
  cat_stationery: "M3 21 L4.6 16 L16 4.6 L19.4 8 L8 19.4 Z M14.6 6 L18 9.4",
  cat_groceries: "M3 8 H21 L19 20.5 H5 Z M8.5 8 L10.5 3 M15.5 8 L13.5 3",
  cat_home: "M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3 Z",
};

const CATEGORY_KEYS = Object.keys(GLYPHS);

function svg(kind: string, seed: string, category: string | null) {
  const h = hash(seed);
  const [from, to] = PALETTES[h % PALETTES.length];
  const glyphKey = category && GLYPHS[category] ? category : CATEGORY_KEYS[h % CATEGORY_KEYS.length];
  const glyph = GLYPHS[glyphKey];

  const wide = kind === "shop";
  const w = wide ? 1200 : 900;
  const hgt = wide ? 800 : 900;
  const variant = h % 4;
  const angle = ((h >> 3) % 24) - 12;

  // Glyph is drawn on a 24x24 grid, so scale it into place.
  const scale = (kind === "logo" ? 0.34 : [0.5, 0.44, 0.56, 0.46][variant]) * Math.min(w, hgt) / 24;
  const gx = w * (kind === "logo" ? 0.5 : [0.5, 0.62, 0.42, 0.55][variant]);
  const gy = hgt * (kind === "logo" ? 0.5 : [0.52, 0.46, 0.58, 0.5][variant]);

  const blobs =
    kind === "logo"
      ? ""
      : `
    <circle cx="${w * 0.18}" cy="${hgt * 0.2}" r="${w * 0.3}" fill="url(#glow)" />
    <circle cx="${w * 0.85}" cy="${hgt * 0.88}" r="${w * 0.26}" fill="#000" opacity=".13" />
    <circle cx="${w * (0.2 + (h % 5) * 0.13)}" cy="${hgt * 0.82}" r="${w * 0.05}" fill="#fff" opacity=".1" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff" stop-opacity=".28"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="lines" width="26" height="26" patternTransform="rotate(35)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="26" stroke="#fff" stroke-opacity=".07" stroke-width="9"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${hgt}" fill="url(#bg)"/>
  <rect width="${w}" height="${hgt}" fill="url(#lines)"/>${blobs}
  <g transform="translate(${gx} ${gy}) rotate(${angle}) scale(${scale}) translate(-12 -12)">
    <path d="${glyph}" fill="none" stroke="#fff" stroke-opacity="${kind === "logo" ? ".9" : ".62"}"
      stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>
  </g>
</svg>`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; seed: string }> }
) {
  const { kind, seed } = await params;
  const category = new URL(request.url).searchParams.get("c");
  return new Response(svg(kind, seed, category), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
