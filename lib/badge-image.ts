import { jarColorOrder, type JarColorKey } from "./jar-colors";
import {
  formatWeekRange,
  getWeekYear,
  type JarWeek,
  type Week,
} from "./week";

// One badge model drives both the DOM preview and the exported PNG, so the
// picture the user saves always matches what the sheet shows.

export type BadgeModel = {
  kind: "full" | "starter";
  ribbon: string;
  name: string;
  count: number;
  slots: number;
  caption: string;
  sub: string;
  color: JarColorKey;
};

export const BADGE_WIDTH = 1080;
export const BADGE_HEIGHT = 1350;
export const HIDDEN_NAME = "A habit, kept";

const JAR_GLYPH_PATH =
  "M11.5 4.5h9M12.75 7.5h6.5v3.25l3.25 3.75v9.25a3.75 3.75 0 0 1-3.75 3.75h-5.5a3.75 3.75 0 0 1-3.75-3.75V14.5l3.25-3.75V7.5Z";

function toColorKey(color: string): JarColorKey {
  return (jarColorOrder as readonly string[]).includes(color)
    ? (color as JarColorKey)
    : "coral";
}

export function getBadgeModel(
  jarWeek: JarWeek,
  week: Week,
  showName: boolean,
): BadgeModel {
  const kind = jarWeek.isFirstWeek ? "starter" : "full";
  const slots = kind === "starter" ? jarWeek.daysInScope : 7;

  return {
    kind,
    ribbon: kind === "starter" ? "✓ Starter week" : "✓ Full week",
    name: showName ? jarWeek.jar.name : HIDDEN_NAME,
    count: jarWeek.marbles,
    slots,
    caption: `of ${slots} days`,
    sub: `${formatWeekRange(week)}, ${getWeekYear(week)} · 🔥 ${jarWeek.longestStreak}-day streak`,
    color: toColorKey(jarWeek.jar.color),
  };
}

export function getBadgeLabel(model: BadgeModel): string {
  return `Badge preview: ${model.kind === "starter" ? "Starter" : "Full"} week, ${model.name}, ${model.count} ${model.caption}, ${model.sub.replace("🔥 ", "")}`;
}

function getNameSlug(jarName: string, showName: boolean) {
  if (!showName || !/^[\x20-\x7e]+$/.test(jarName)) {
    return "habit";
  }

  const slug = jarName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "habit";
}

function getRangeSlug(week: Week) {
  // "Nov 2 – 8" -> "nov-2-8"; "Oct 30 – Nov 5" -> "oct-30-nov-5".
  return formatWeekRange(week)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

export function getBadgeFileName(
  jarName: string,
  showName: boolean,
  week: Week,
): string {
  return `streak-jar-${getNameSlug(jarName, showName)}-${getRangeSlug(week)}.png`;
}

export function getShareText(jarName: string, showName: boolean): string {
  return `I kept ${showName ? jarName : "a habit"} going all week with Streak Jar.`;
}

// Fallbacks only apply when the tokens from app/globals.css are not loaded.
const fallbackTokens: Record<string, string> = {
  cream: "#faf7f2",
  glass: "#dcefea",
  coral: "#f47c6b",
  mint: "#7bcfb6",
  lavender: "#a99be8",
  butter: "#f6d86b",
  sky: "#78b9e8",
  peach: "#f3ad7b",
  lilac: "#d59bdc",
  sage: "#9fbe8f",
  ink: "#31261f",
  "soft-ink": "#7c6a5f",
  line: "#eadfd2",
};

function readToken(style: CSSStyleDeclaration, name: string) {
  return style.getPropertyValue(`--${name}`).trim() || fallbackTokens[name];
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : value;

  return [0, 2, 4].map((index) => parseInt(full.slice(index, index + 2), 16));
}

// Same result as CSS `color-mix(in srgb, color pct%, base)`.
function mix(color: string, pct: number, base: string) {
  const a = hexToRgb(color);
  const b = hexToRgb(base);

  return `rgb(${a.map((channel, index) => Math.round(channel * pct + b[index] * (1 - pct))).join(", ")})`;
}

function drawMarble(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
) {
  context.save();
  context.shadowColor = "rgba(49, 38, 31, 0.24)";
  context.shadowBlur = radius * 0.6;
  context.shadowOffsetY = radius * 0.35;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.restore();

  const shade = context.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.35,
    radius * 0.1,
    x,
    y,
    radius,
  );
  shade.addColorStop(0, "rgba(255, 255, 255, 0.35)");
  shade.addColorStop(0.6, "rgba(255, 255, 255, 0)");
  shade.addColorStop(1, "rgba(49, 38, 31, 0.22)");
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = shade;
  context.fill();

  context.beginPath();
  context.ellipse(
    x - radius * 0.25,
    y - radius * 0.4,
    radius * 0.3,
    radius * 0.22,
    0,
    0,
    Math.PI * 2,
  );
  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.fill();
}

function pillPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const radius = height / 2;

  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  let fitted = text;

  while (context.measureText(fitted).width > maxWidth && fitted.length > 1) {
    fitted = `${fitted.slice(0, -2)}…`;
  }

  return fitted;
}

function setLetterSpacing(context: CanvasRenderingContext2D, value: string) {
  // Not supported everywhere yet; spacing is decorative only.
  (context as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
    value;
}

async function loadFonts(doc: Document, fonts: string[]) {
  if (!doc.fonts) {
    return;
  }

  try {
    await Promise.all(fonts.map((font) => doc.fonts.load(font)));
  } catch {
    // The CSS fallback families still draw a readable badge.
  }
}

// Draws the badge at 1080×1350 entirely on the device and encodes it as PNG.
export async function renderBadgePng(
  model: BadgeModel,
  doc: Document = document,
): Promise<Blob> {
  const style = doc.defaultView
    ? doc.defaultView.getComputedStyle(doc.documentElement)
    : doc.documentElement.style;
  const sans = `${style.getPropertyValue("--font-inter").trim() || "Inter"}, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  const heading = `${style.getPropertyValue("--font-fraunces").trim() || "Fraunces"}, Georgia, serif`;
  const fonts = {
    big: `600 158px ${heading}`,
    name: `600 94px ${heading}`,
    wordmark: `600 50px ${heading}`,
    label: `700 40px ${sans}`,
    sub: `400 47px ${sans}`,
  };

  await loadFonts(doc, Object.values(fonts));

  const canvas = doc.createElement("canvas");
  canvas.width = BADGE_WIDTH;
  canvas.height = BADGE_HEIGHT;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas 2D is not available");
  }

  const color = readToken(style, model.color);
  const ink = readToken(style, "ink");
  const softInk = readToken(style, "soft-ink");
  const cream = readToken(style, "cream");
  const line = readToken(style, "line");
  const centerX = BADGE_WIDTH / 2;
  // The preview is 300×375 CSS px; the export is the same layout at 3.6×.
  const scale = BADGE_WIDTH / 300;

  context.fillStyle = mix(color, 0.14, cream);
  context.fillRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT);
  context.fillStyle = "rgba(49, 38, 31, 0.09)";
  for (let y = scale; y < BADGE_HEIGHT; y += 22 * scale) {
    for (let x = scale; x < BADGE_WIDTH; x += 22 * scale) {
      context.beginPath();
      context.arc(x, y, scale, 0, Math.PI * 2);
      context.fill();
    }
  }

  // Ribbon
  context.font = fonts.label;
  setLetterSpacing(context, "3px");
  const ribbonText = model.ribbon.toUpperCase();
  const ribbonWidth = context.measureText(ribbonText).width + 86;
  pillPath(context, (BADGE_WIDTH - ribbonWidth) / 2, 80, ribbonWidth, 92);
  context.fillStyle = ink;
  context.fill();
  context.fillStyle = cream;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(ribbonText, centerX, 128);
  setLetterSpacing(context, "0px");

  // Medal with a ring of marbles
  const medalY = 600;
  const medalRadius = 238;
  context.save();
  context.shadowColor = "rgba(49, 38, 31, 0.16)";
  context.shadowBlur = 80;
  context.shadowOffsetY = 36;
  context.beginPath();
  context.arc(centerX, medalY, medalRadius, 0, Math.PI * 2);
  context.fillStyle = mix(color, 0.35, "#ffffff");
  context.fill();
  context.restore();
  context.beginPath();
  context.arc(centerX, medalY, medalRadius - 11, 0, Math.PI * 2);
  context.lineWidth = 22;
  context.strokeStyle = "rgba(255, 255, 255, 0.7)";
  context.stroke();

  for (let index = 0; index < model.slots; index += 1) {
    const angle = (index / model.slots) * Math.PI * 2 - Math.PI / 2;

    drawMarble(
      context,
      centerX + medalRadius * 0.92 * Math.cos(angle),
      medalY + medalRadius * 0.92 * Math.sin(angle),
      29,
      index < model.count ? color : line,
    );
  }

  context.fillStyle = ink;
  context.font = fonts.big;
  context.textBaseline = "alphabetic";
  context.fillText(String(model.count), centerX, medalY + 40);
  context.font = fonts.label;
  setLetterSpacing(context, "3px");
  context.fillStyle = softInk;
  context.fillText(model.caption.toUpperCase(), centerX, medalY + 104);
  setLetterSpacing(context, "0px");

  // Name and sub line
  context.fillStyle = ink;
  context.font = fonts.name;
  context.fillText(fitText(context, model.name, 940), centerX, 1010);
  context.fillStyle = softInk;
  context.font = fonts.sub;
  context.fillText(fitText(context, model.sub, 980), centerX, 1086);

  // Wordmark footer: the header jar glyph plus "Streak Jar"
  context.font = fonts.wordmark;
  const wordmarkWidth = context.measureText("Streak Jar").width;
  const glyphSize = 72;
  const gap = 22;
  const footerX = (BADGE_WIDTH - (glyphSize + gap + wordmarkWidth)) / 2;
  const footerY = 1222;
  context.save();
  context.translate(footerX, footerY - glyphSize / 2 - 14);
  context.scale(glyphSize / 32, glyphSize / 32);
  const glyph = new Path2D(JAR_GLYPH_PATH);
  context.fillStyle = readToken(style, "glass");
  context.fill(glyph);
  context.lineWidth = 1.5;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.strokeStyle = ink;
  context.stroke(glyph);
  for (const [token, x, y] of [
    ["coral", 13, 22],
    ["mint", 18.5, 21],
    ["butter", 16, 17],
  ] as const) {
    context.beginPath();
    context.arc(x, y, 2, 0, Math.PI * 2);
    context.fillStyle = readToken(style, token);
    context.fill();
  }
  context.restore();
  context.fillStyle = ink;
  context.textAlign = "left";
  context.fillText("Streak Jar", footerX + glyphSize + gap, footerY);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not encode the badge image"));
      }
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before releasing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareFiles(): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }

  try {
    return navigator.canShare({
      files: [new File([""], "badge.png", { type: "image/png" })],
    });
  } catch {
    return false;
  }
}

export async function shareBadge(
  blob: Blob,
  fileName: string,
  text: string,
): Promise<"shared" | "dismissed"> {
  try {
    await navigator.share({
      files: [new File([blob], fileName, { type: "image/png" })],
      text,
    });

    return "shared";
  } catch (error) {
    // The user closed the share sheet. DOMException is not an Error subclass
    // in every runtime, so match on the name.
    if ((error as { name?: unknown } | null)?.name === "AbortError") {
      return "dismissed";
    }

    throw error;
  }
}
