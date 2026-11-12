/**
 * Mal3abi design tokens: the single source of colors, shape and type for the website and the app.
 * Light mode = "green" theme, dark mode = "dark" theme (docs/ui-brief.md).
 *
 * After changing a value here, run `pnpm --filter @mal3abi/shared gen:tokens` to regenerate
 * theme.css. A test fails if theme.css is out of date.
 */

export const colorNames = [
  "bg",
  "surface",
  "ink",
  "muted",
  "line",
  "accent",
  "accent-ink",
  "accent-soft",
  "accent-2",
  "warning-soft",
  "danger",
  "danger-soft",
] as const;

export type ColorName = (typeof colorNames)[number];
export type ThemeName = "light" | "dark";
export type Palette = Record<ColorName, string>;

export const themes: Record<ThemeName, Palette> = {
  light: {
    bg: "#F5F7F4",
    surface: "#FFFFFF",
    ink: "#13201A",
    muted: "#55635B",
    line: "#DDE3DE",
    /** Buttons and primary actions only. */
    accent: "#0E7A4B",
    "accent-ink": "#FFFFFF",
    /** Light fills, active navigation. */
    "accent-soft": "#E3F2EA",
    /** Featured badge, rating star, counters. Not for text on light backgrounds. */
    "accent-2": "#C98A12",
    "warning-soft": "#FBF1DC",
    /** Errors and destructive actions. */
    danger: "#B42318",
    "danger-soft": "#FDECEA",
  },
  dark: {
    bg: "#0E1316",
    surface: "#172026",
    ink: "#E9EEF1",
    muted: "#9BA8B2",
    line: "#26313A",
    accent: "#34C98A",
    "accent-ink": "#08140E",
    "accent-soft": "#13342A",
    "accent-2": "#E9B44C",
    "warning-soft": "#3A2E12",
    danger: "#F97066",
    "danger-soft": "#3A1D1B",
  },
};

export const radius = {
  /** Buttons and inputs. */
  control: 10,
  /** Cards. */
  card: 16,
} as const;

/** Minimum height of buttons and inputs (touch target), in px. */
export const controlHeight = 44;

export const fonts = {
  arabic: "IBM Plex Sans Arabic",
  latin: "IBM Plex Sans",
} as const;

/** Type scale in px: [font size, line height]. Matches Tailwind's text-xs to text-3xl. */
export const typeScale = {
  xs: [12, 16],
  sm: [14, 20],
  base: [16, 24],
  lg: [18, 28],
  xl: [20, 28],
  "2xl": [24, 32],
  "3xl": [30, 36],
} as const;

/**
 * Text and background pairs that must reach WCAG AA contrast (4.5:1) in both modes.
 * accent-2 is used for icons and fills only, never as text on light surfaces.
 */
export const contrastPairs: ReadonlyArray<readonly [text: ColorName, background: ColorName]> = [
  ["ink", "bg"],
  ["ink", "surface"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["accent-ink", "accent"],
  ["accent", "surface"],
  ["ink", "accent-soft"],
  ["ink", "warning-soft"],
  ["ink", "danger-soft"],
  ["danger", "surface"],
  ["danger", "danger-soft"],
  ["accent-ink", "danger"],
];
