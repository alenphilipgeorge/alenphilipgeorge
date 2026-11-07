// Renders the README's images with headless Chromium, once per GitHub theme:
//   ../assets/banner-{dark,light}.avif  steps scene.html through its loop, saves
//       each frame as a PNG and encodes a looping AVIF (ffmpeg + libsvtav1)
//   ../assets/tools-{dark,light}.avif   draws the stack in tools.mjs as chips
//   node render.mjs [--only banner|tools] [--fps 24] [--width 1200] [--crf 43]
import { createServer } from "node:http";
import { mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import * as icons from "simple-icons";
import { TOOLS } from "./tools.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith("--") ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const FPS = Number(args.fps ?? 24);
const WIDTH = Number(args.width ?? 1200);
const CRF = Number(args.crf ?? 43);
// GitHub's page colour per theme. AVIF carries no transparency here, so both
// images are drawn on the page they sit on.
const PAGE = { dark: "0d1117", light: "ffffff" };

const here = fileURLToPath(new URL(".", import.meta.url));
const assets = join(here, "..", "assets");
const types = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2" };

async function renderBanner(browser, origin, theme) {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error("page error:", error.message));
  await page.goto(`${origin}/scene.html?still&width=${WIDTH}&corner=${PAGE[theme]}&theme=${theme}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60_000 });

  const loop = await page.evaluate(async () => (await import("./scene.js")).LOOP);
  const count = Math.round(loop * FPS);
  const frames = join(here, ".frames", theme);
  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });

  const started = Date.now();
  for (let i = 0; i < count; i++) {
    const url = await page.evaluate((t) => window.frame(t), i / FPS);
    await writeFile(join(frames, `${String(i).padStart(4, "0")}.png`), Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  }
  await page.close();

  // Full colour range, so the page colour survives encoding exactly and the
  // image edge doesn't show as a faint box on the page.
  const target = join(assets, `banner-${theme}.avif`);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS), "-i", join(frames, "%04d.png"),
    "-vf", "scale=out_range=full", "-color_range", "pc",
    "-c:v", "libsvtav1", "-crf", String(CRF), "-preset", "4", "-pix_fmt", "yuv420p10le",
    "-g", String(count), "-loop", "0",
    target,
  ]);
  const { size } = await stat(target);
  console.log(`banner-${theme}: ${count} frames at ${WIDTH}px, ${(size / 1e6).toFixed(2)} MB, ${((Date.now() - started) / 1000).toFixed(0)}s`);
}

// A brand colour that would vanish against the page (near-black on the dark
// theme, pale yellow on the light one) has its lightness moved, keeping the
// hue, until it stands out; every other brand keeps its colour exactly.
function visible(hex, on) {
  const [r, g, b] = hex.match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(max + min - 1));
  // A black or white mark has no hue to keep, so it takes the page's text colour.
  if (s0 < 0.08) return on === "light" ? "#1f2328" : "#e6e9ee";
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const fromHsl = (l) => {
    const c = (1 - Math.abs(2 * l - 1)) * s0;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const [r1, g1, b1] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h) % 6];
    return [r1, g1, b1].map((v) => v + l - c / 2);
  };
  const lum = (rgb) => {
    const [lr, lg, lb] = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  const contrast = (rgb) => {
    const [a, b2] = [lum(rgb), on === "light" ? 1 : 0.0058].sort((x, y) => y - x);
    return (a + 0.05) / (b2 + 0.05);
  };
  const step = on === "light" ? -0.02 : 0.02;
  let rgb = [r, g, b];
  const floor = on === "light" ? 3.2 : 2.6;
  for (let l = (max + min) / 2; contrast(rgb) < floor && l >= 0 && l <= 1; l += step) rgb = fromHsl(l);
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

// Chip and label colours per GitHub theme; the card has no box of its own and
// is drawn on the page colour, so the chips look native to the README.
const TOOL_THEMES = {
  dark: { label: "#8b93a1", rule: "#1d232d", chipBase: "#10141b", text: "#f1f3f6", tint: 14, edge: 48, ink: 28 },
  light: { label: "#59636e", rule: "#d8dee4", chipBase: "#ffffff", text: "#1f2328", tint: 9, edge: 42, ink: 45 },
};

async function renderTools(browser, theme) {
  const t = TOOL_THEMES[theme];
  const bySlug = new Map(Object.values(icons).filter((i) => i?.slug).map((i) => [i.slug, i]));
  const font = (await readFile(join(here, "fonts", "schibsted-grotesk.woff2"))).toString("base64");
  const chip = ([label, slug, colour]) => {
    const icon = slug && bySlug.get(slug);
    if (slug && !icon) throw new Error(`simple-icons has no "${slug}"`);
    if (!icon && !colour) throw new Error(`"${label}" needs a brand colour`);
    const c = visible(colour ?? `#${icon.hex}`, theme);
    const mark = icon ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon.path}"/></svg>` : `<i aria-hidden="true"></i>`;
    return `<span class="chip" style="--c:${c}">${mark}${label}</span>`;
  };
  const rows = TOOLS.map(([group, tools]) => `<section><h3>${group}</h3><div class="chips">${tools.map(chip).join("")}</div></section>`).join("");

  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1.5 });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: "Schibsted"; font-weight: 400 900; src: url(data:font/woff2;base64,${font}) format("woff2"); }
    * { box-sizing: border-box; margin: 0; }
    html, body { background: #${PAGE[theme]}; width: 1200px; }
    .card { padding: 6px 4px 10px; font-family: "Schibsted", system-ui, sans-serif; }
    section { display: grid; grid-template-columns: 190px 1fr; gap: 18px; padding: 16px 0; border-top: 1px solid ${t.rule}; }
    section:first-child { border-top: 0; padding-top: 4px; }
    h3 { font-size: 18px; font-weight: 500; color: ${t.label}; padding-top: 10px; line-height: 1.3; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; }
    .chip { display: inline-flex; align-items: center; gap: 10px; height: 44px; padding: 0 16px 0 13px; border-radius: 11px;
      background: color-mix(in srgb, var(--c) ${t.tint}%, ${t.chipBase});
      border: 1px solid color-mix(in srgb, var(--c) ${t.edge}%, transparent);
      color: color-mix(in srgb, var(--c) ${t.ink}%, ${t.text}); font-size: 18px; font-weight: 500; letter-spacing: -0.1px; }
    .chip svg { width: 21px; height: 21px; fill: var(--c); flex: none; }
    .chip i { width: 9px; height: 9px; margin: 0 2px 0 3px; border-radius: 50%; background: var(--c); flex: none; }
  </style><div class="card">${rows}</div>`);
  await page.evaluate(() => document.fonts.ready);
  await mkdir(join(here, ".frames"), { recursive: true });
  const png = join(here, ".frames", `tools-${theme}.png`);
  await page.locator(".card").screenshot({ path: png });
  await page.close();
  // A still AVIF is a fraction of the PNG's size with the text just as sharp.
  const target = join(assets, `tools-${theme}.avif`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", png, "-frames:v", "1", "-vf", "scale=out_range=full", "-color_range", "pc", "-c:v", "libsvtav1", "-crf", "22", "-preset", "4", "-pix_fmt", "yuv420p10le", "-f", "avif", target]);
  const { size } = await stat(target);
  const count = TOOLS.reduce((n, [, tools]) => n + tools.length, 0);
  console.log(`tools-${theme}: ${count} tools in ${TOOLS.length} groups, ${(size / 1e3).toFixed(0)} KB`);
}

const server = createServer(async (req, res) => {
  const path = normalize(join(here, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!path.startsWith(here)) return res.writeHead(403).end();
  try {
    res.writeHead(200, { "Content-Type": types[extname(path)] ?? "application/octet-stream" }).end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] });

for (const theme of ["dark", "light"]) {
  if (args.only !== "tools") await renderBanner(browser, `http://127.0.0.1:${server.address().port}`, theme);
  if (args.only !== "banner") await renderTools(browser, theme);
}

await browser.close();
server.close();
