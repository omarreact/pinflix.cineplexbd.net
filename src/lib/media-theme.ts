import type { CSSProperties } from "react";

export type MediaTheme = {
  bg: string;
  bgSoft: string;
  accent: string;
  accentContrast: string;
  border: string;
  glow: string;
};

const FALLBACK_THEME: MediaTheme = {
  bg: "#0f172a",
  bgSoft: "#1a2338",
  accent: "#d9a441",
  accentContrast: "#111827",
  border: "#d7dbe4",
  glow: "#d9a44166",
};

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hslToHex(h: number, s: number, l: number): string {
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
  else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
  else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
  else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(base: string, overlay: string, weight: number): string {
  const from = base.replace("#", "");
  const to = overlay.replace("#", "");
  const parse = (hex: string) => Number.parseInt(hex, 16);
  const merged = [0, 1, 2].map((index) => {
    const a = parse(from.slice(index * 2, index * 2 + 2));
    const b = parse(to.slice(index * 2, index * 2 + 2));
    return Math.round(a * (1 - weight) + b * weight);
  });
  return `#${merged.map(value => value.toString(16).padStart(2, "0")).join("")}`;
}

export function buildMediaTheme(seed?: string | null): MediaTheme {
  if (!seed) return FALLBACK_THEME;
  const baseHue = hashString(seed) % 360;
  const accent = hslToHex(baseHue, 72, 58);
  const bg = hslToHex((baseHue + 22) % 360, 38, 18);
  const bgSoft = hslToHex((baseHue + 12) % 360, 26, 24);
  const accentContrast = "#f8fafc";
  const border = mixHex(accent, "#ffffff", 0.28);
  const glow = `${accent}66`;

  return {
    bg,
    bgSoft,
    accent,
    accentContrast,
    border,
    glow,
  };
}

export function asThemeVars(theme: MediaTheme): CSSProperties {
  return {
    "--media-bg": theme.bg,
    "--media-bg-soft": theme.bgSoft,
    "--media-accent": theme.accent,
    "--media-accent-contrast": theme.accentContrast,
    "--media-border": theme.border,
    "--media-glow": theme.glow,
  } as CSSProperties;
}
