export const jarColorOrder = [
  "coral",
  "mint",
  "lavender",
  "butter",
  "sky",
  "peach",
  "lilac",
  "sage",
] as const;

export type JarColorKey = (typeof jarColorOrder)[number];

export type JarColorStyle = {
  label: string;
  solid: string;
  fill: string;
  border: string;
  borderSoft: string;
  tint: string;
  jarFill: string;
  preview: string;
};

export const jarColors: Record<JarColorKey, JarColorStyle> = {
  coral: {
    label: "Coral",
    solid: "bg-coral",
    fill: "bg-coral/35",
    border: "border-coral/70",
    borderSoft: "border-coral/60",
    tint: "bg-coral/10",
    jarFill: "bg-coral/30",
    preview: "bg-coral/20",
  },
  mint: {
    label: "Mint",
    solid: "bg-mint",
    fill: "bg-mint/35",
    border: "border-mint/70",
    borderSoft: "border-mint/60",
    tint: "bg-mint/10",
    jarFill: "bg-mint/30",
    preview: "bg-mint/20",
  },
  lavender: {
    label: "Lavender",
    solid: "bg-lavender",
    fill: "bg-lavender/35",
    border: "border-lavender/70",
    borderSoft: "border-lavender/60",
    tint: "bg-lavender/10",
    jarFill: "bg-lavender/30",
    preview: "bg-lavender/20",
  },
  butter: {
    label: "Butter",
    solid: "bg-butter",
    fill: "bg-butter/45",
    border: "border-butter/70",
    borderSoft: "border-butter/70",
    tint: "bg-butter/15",
    jarFill: "bg-butter/30",
    preview: "bg-butter/20",
  },
  sky: {
    label: "Sky",
    solid: "bg-sky",
    fill: "bg-sky/35",
    border: "border-sky/70",
    borderSoft: "border-sky/60",
    tint: "bg-sky/10",
    jarFill: "bg-sky/30",
    preview: "bg-sky/20",
  },
  peach: {
    label: "Peach",
    solid: "bg-peach",
    fill: "bg-peach/35",
    border: "border-peach/70",
    borderSoft: "border-peach/60",
    tint: "bg-peach/10",
    jarFill: "bg-peach/30",
    preview: "bg-peach/20",
  },
  lilac: {
    label: "Lilac",
    solid: "bg-lilac",
    fill: "bg-lilac/35",
    border: "border-lilac/70",
    borderSoft: "border-lilac/60",
    tint: "bg-lilac/10",
    jarFill: "bg-lilac/30",
    preview: "bg-lilac/20",
  },
  sage: {
    label: "Sage",
    solid: "bg-sage",
    fill: "bg-sage/35",
    border: "border-sage/70",
    borderSoft: "border-sage/60",
    tint: "bg-sage/10",
    jarFill: "bg-sage/30",
    preview: "bg-sage/20",
  },
};

export const jarColorList = jarColorOrder.map((key) => ({
  key,
  ...jarColors[key],
}));

export const jarColorSolids = jarColorOrder.map((key) => jarColors[key].solid);

export function getJarColor(color: string): JarColorStyle {
  return jarColors[color as JarColorKey] ?? jarColors.coral;
}
