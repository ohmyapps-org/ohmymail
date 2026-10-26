import type { BrandingConfig, FooterBlock, HeaderBlock } from './types';
import { FONT_LABELS, ICON_SVGS, HEADER_PADDING, FOOTER_PADDING } from './constants';

// ── Identity ─────────────────────────────────────────────────

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Storage ───────────────────────────────────────────────────

export function getFromStorage<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function setToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded or private browsing */ }
}

// ── File I/O ─────────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Fuzzy matching ────────────────────────────────────────────

export function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase(), t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) if (t[i] === q[qi]) qi++;
  return qi === q.length;
}

// ── Caret coordinates (for slash palette positioning) ─────────

export function getCaretCoordinates(el: HTMLTextAreaElement, pos: number) {
  const div      = document.createElement('div');
  const computed = window.getComputedStyle(el);
  const props    = [
    'direction','boxSizing','width','height','overflowX','overflowY',
    'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
    'paddingTop','paddingRight','paddingBottom','paddingLeft',
    'fontStyle','fontVariant','fontWeight','fontStretch','fontSize',
    'lineHeight','fontFamily','textAlign','textTransform','textIndent',
    'textDecoration','letterSpacing','wordSpacing','tabSize',
  ];
  Object.assign(div.style, { position:'absolute', visibility:'hidden', whiteSpace:'pre-wrap', wordWrap:'break-word', overflow:'hidden' });
  props.forEach(p => { (div.style as unknown as Record<string,string>)[p] = computed.getPropertyValue(p); });
  document.body.appendChild(div);
  div.textContent = el.value.substring(0, pos);
  const span = document.createElement('span');
  span.textContent = el.value.substring(pos) || '.';
  div.appendChild(span);
  const result = {
    top:    span.offsetTop  + parseInt(computed.borderTopWidth),
    left:   span.offsetLeft + parseInt(computed.borderLeftWidth),
    height: parseInt(computed.lineHeight) || 22,
  };
  document.body.removeChild(div);
  return result;
}

// ── Font helpers ──────────────────────────────────────────────

export function extractFontNameFromUrl(url: string): string {
  const m = url.match(/family=([^:&]+)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
}

/**
 * Google Fonts URL for a family name typed by hand. No weight axis is requested:
 * static families that lack 600/700 would otherwise make the whole request 400.
 * Paste a full URL in settings to control weights.
 */
export function googleFontUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}&display=swap`;
}

/** Strips characters that could break out of a CSS string or an HTML style attribute. */
function cssFamily(name: string): string {
  return name.replace(/['"<>;{}\\]/g, '').trim();
}

export function getActiveFontUrl(b: BrandingConfig): string {
  const name = b.customFontName.trim();
  return b.customFontUrl.trim()
    || (name ? googleFontUrl(name) : `https://fonts.googleapis.com/css2?family=${b.font}:wght@400;600;700&display=swap`);
}

export function getActiveFontFamily(b: BrandingConfig): string {
  return b.customFontName.trim() || FONT_LABELS[b.font] || b.font;
}

function roleUrl(name: string, url: string): string {
  return url.trim() || (name.trim() ? googleFontUrl(name) : '');
}

/** Every stylesheet URL needed to render the current typography (deduplicated). */
export function getFontUrls(b: BrandingConfig): string[] {
  const urls = [
    getActiveFontUrl(b),
    roleUrl(b.headingFontName, b.headingFontUrl),
    roleUrl(b.quoteFontName,   b.quoteFontUrl),
    roleUrl(b.monoFontName,    b.monoFontUrl),
  ].filter(Boolean);
  return [...new Set(urls)];
}

/** CSS `font-family` values per typographic role. Roles without a custom font inherit the text font. */
export function getFontStacks(b: BrandingConfig): { text: string; heading: string; quote: string; mono: string } {
  const text = `'${cssFamily(getActiveFontFamily(b))}', sans-serif`;
  const withFallback = (name: string, fallback: string) => {
    const family = cssFamily(name);
    return family ? `'${family}', ${fallback}` : fallback;
  };
  return {
    text,
    heading: withFallback(b.headingFontName, text),
    quote:   withFallback(b.quoteFontName,   text),
    mono:    withFallback(b.monoFontName,    'monospace'),
  };
}

// ── Colors ────────────────────────────────────────────────────

/**
 * Coerces a CSS color to `#rrggbb`. `rgb()/rgba()` values are flattened over white;
 * anything unparseable returns `fallback`.
 */
export function normalizeHex(color: string, fallback: string): string {
  const c = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const short = c.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : Math.min(1, Number(rgb[4]));
    return '#' + [rgb[1], rgb[2], rgb[3]]
      .map(v => Math.min(255, Math.round(Number(v) * alpha + 255 * (1 - alpha))).toString(16).padStart(2, '0'))
      .join('');
  }
  return fallback;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Concentric corners ────────────────────────────────────────
//
// The config stores the *inner* corner radius the user wants to perceive
// inside an element. The actual CSS border-radius applied to the container
// element must be larger so that the inner content appears with that radius.
//
//   outer_radius = inner_radius + padding

export function concentricRadius(innerRadius: number, padding: number): number {
  return innerRadius + padding;
}

// ── Header / footer theme resolution ──────────────────────────
//
// Block props are overrides. When a prop is undefined the block follows the
// branding theme, so changing Settings updates existing header/footer blocks.

export type RadiusKey = 'headerRadius' | 'footerRadius' | 'buttonRadius' | 'badgeRadius' | 'imageRadius';

/** Effective radius (px) for a component: its own setting, else the global corner radius. */
export function componentRadius(b: BrandingConfig, key: RadiusKey): number {
  return b[key] ?? b.cornerRadius;
}

/** CSS radius for a leaf component: block override first, then branding. */
export function resolveRadius(blockRadius: string | undefined, b: BrandingConfig, key: RadiusKey): string {
  return blockRadius ?? `${componentRadius(b, key)}px`;
}

export function resolveHeaderStyle(block: HeaderBlock, b: BrandingConfig) {
  const inner = componentRadius(b, 'headerRadius');
  const outer = concentricRadius(inner, HEADER_PADDING);
  return {
    bg:          block.bg ?? b.headerBg,
    textColor:   block.textColor ?? b.headerText,
    // Explicit block radius is a legacy/manual override; keep it sane relative to the block height.
    radius:      block.radius === undefined
      ? `${outer}px ${outer}px 0 0`
      : block.radius.includes('min(') ? block.radius : `min(${block.radius}, ${Math.round(block.height / 2)}px)`,
    /** Radius the content inside the header (logo) shows: the configured "inner" radius. */
    innerRadius: `${inner}px`,
  };
}

export function resolveFooterStyle(block: FooterBlock, b: BrandingConfig) {
  const outer = concentricRadius(componentRadius(b, 'footerRadius'), FOOTER_PADDING);
  return {
    bg:        block.bg ?? b.footerBg,
    textColor: block.textColor ?? b.footerText,
    radius:    block.radius ?? `0 0 ${outer}px ${outer}px`,
  };
}

// ── HTML processing (lucide-icon replacement for inline markdown) ─

export function processPreviewHtml(html: string, branding: BrandingConfig): string {
  return html
    .replace(/<lucide-icon\s+name="([^"]+)"\s*\/?>/gi, (_, name: string) => {
      const svg = ICON_SVGS[name.toLowerCase()];
      return svg ?? `<span style="font-size:11px;opacity:0.5;">[icon:${name}]</span>`;
    })
    .replace(/LOGO_URL/g, branding.logoUrl || 'https://placehold.co/120x40/0F2854/BDE8F5?text=Logo')
    .replace(/COMPANY NAME/g, branding.companyName || 'Your Company');
}
