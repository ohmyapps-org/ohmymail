import { marked } from 'marked';
import juice from 'juice';
import { APP_CONFIG } from '../config/app.config';
import { ICON_SVGS, FONT_SIZE_MAP, FOOTER_PADDING, HEADER_PADDING, DIVIDER_COLOR } from '../constants';
import { escapeHtml, getFontStacks, getFontUrls, normalizeHex, resolveFooterStyle, resolveHeaderStyle, resolveRadius } from '../utils';
import type {
  Block, BrandingConfig,
  MarkdownBlock, HeaderBlock, FooterBlock, BadgeBlock, DividerBlock,
  ImageBlock, ButtonBlock, IconBlock, FontBlock, SpacerBlock,
  ColumnsBlock, SocialBlock, InlineBlock,
} from '../types';

// ── Icon SVG lookup (adapted from ICON_SVGS in constants) ────

function renderIconSvg(name: string, size: number, color: string): string {
  const svg = ICON_SVGS[name.toLowerCase()];
  if (svg) {
    // Replace the hardcoded width/height/stroke color with block-specific values
    return svg
      .replace(/width="\d+"/, `width="${size}"`)
      .replace(/height="\d+"/, `height="${size}"`)
      .replace(/stroke="currentColor"/, `stroke="${color}"`);
  }
  // Social platform fallback SVGs (minimal paths for email-safe rendering)
  const socialSvgs: Record<string, string> = {
    twitter:   `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>`,
    linkedin:  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>`,
    instagram: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`,
    github:    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
    youtube:   `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg>`,
    tiktok:    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>`,
  };
  return socialSvgs[name.toLowerCase()] ?? `<span style="font-size:11px;opacity:0.5;">[icon:${name}]</span>`;
}

// ── Per-block renderers ───────────────────────────────────────

function renderMarkdown(block: MarkdownBlock, branding: BrandingConfig): string {
  const html = String(marked.parse(block.content));
  const fontSize = FONT_SIZE_MAP[branding.fontSize] ?? FONT_SIZE_MAP.medium;
  return `<div style="font-family:${getFontStacks(branding).text};font-size:${fontSize};color:${branding.bodyText};background:${branding.bodyBg};padding:0 0 8px;line-height:1.7;">${html}</div>`;
}

function renderHeader(block: HeaderBlock, branding: BrandingConfig): string {
  const { bg, textColor, radius, innerRadius } = resolveHeaderStyle(block, branding);
  const img = block.logoUrl
    ? `<img src="${block.logoUrl}" alt="Logo" style="height:${block.height}px;display:inline-block;border-radius:${innerRadius};" />`
    : '';
  const title = block.title?.trim()
    ? `<div style="color:${textColor};font-family:${getFontStacks(branding).heading};font-size:22px;font-weight:700;margin-top:${img ? 8 : 0}px;">${escapeHtml(block.title.trim())}</div>`
    : '';
  return `<div style="background:${bg};padding:${HEADER_PADDING}px;text-align:${block.align};border-radius:${radius};">${img}${title}</div>`;
}

function renderFooter(block: FooterBlock, branding: BrandingConfig): string {
  const { bg, textColor, radius } = resolveFooterStyle(block, branding);
  // Inject inline color on <p>/<a> tags so CSS class rules (like .mf-b p) cannot override them
  const html = String(marked.parse(block.text))
    .replace(/<p>/g, `<p style="margin:4px 0;color:${textColor};">`)
    .replace(/<a /g, `<a style="color:${textColor};" `);
  return `<div style="background:${bg};color:${textColor};padding:${FOOTER_PADDING}px 24px;text-align:${block.align ?? 'center'};font-size:12px;border-radius:${radius};">${html}</div>`;
}

function renderBadge(block: BadgeBlock, branding: BrandingConfig): string {
  return `<div style="padding:4px 0;"><span style="display:inline-block;background:${block.bg};color:${block.color};border-radius:${resolveRadius(block.radius, branding, 'badgeRadius')};font-size:${block.fontSize};padding:2px 10px;font-weight:600;">${block.label}</span></div>`;
}

function renderDivider(block: DividerBlock): string {
  return `<hr style="border:none;border-top:${block.thickness}px solid ${normalizeHex(block.color, DIVIDER_COLOR)};margin:${block.margin};" />`;
}

function renderImage(block: ImageBlock, branding: BrandingConfig): string {
  return `<div style="text-align:${block.align};padding:8px 0;"><img src="${block.src}" alt="${block.alt}" style="width:${block.width};border-radius:${resolveRadius(block.radius, branding, 'imageRadius')};display:inline-block;max-width:100%;height:auto;" /></div>`;
}

function renderButton(block: ButtonBlock, branding: BrandingConfig): string {
  return `<div style="text-align:center;margin:16px 0;"><a href="${block.href}" style="display:inline-block;background:${block.bg};color:${block.color};border-radius:${resolveRadius(block.radius, branding, 'buttonRadius')};font-size:${block.fontSize};padding:12px 28px;text-decoration:none;font-weight:600;">${block.label}</a></div>`;
}

function renderIcon(block: IconBlock): string {
  const svg = renderIconSvg(block.name, block.size, block.color);
  return `<div style="text-align:${block.align};padding:8px 0;">${svg}</div>`;
}

function renderFont(block: FontBlock): string {
  // NOTE: Many email clients (Gmail, Outlook) strip <style> tags.
  // This block works best in web previews; for email delivery, rely on system fonts.
  const targetSelector = block.target === 'all' ? '*' : block.target;
  return `<style>@import url('${block.url}');${targetSelector}{font-family:'${block.family}',sans-serif;font-size:${block.size};font-weight:${block.weight};}</style>`;
}

function renderSpacer(block: SpacerBlock): string {
  return `<div style="height:${block.height}px;line-height:${block.height}px;">&nbsp;</div>`;
}

function renderInlineBlock(block: InlineBlock, branding: BrandingConfig): string {
  switch (block.type) {
    case 'markdown': return renderMarkdown(block, branding);
    case 'badge':    return renderBadge(block, branding);
    case 'image':    return renderImage(block, branding);
    case 'icon':     return renderIcon(block);
    case 'button':   return renderButton(block, branding);
    default: {
      const _exhaustive: never = block;
      return String(_exhaustive);
    }
  }
}

function renderColumns(block: ColumnsBlock, branding: BrandingConfig): string {
  // Email-safe two-column layout using table (NOT flexbox/grid)
  const rightWidth = `${100 - parseInt(block.leftWidth)}%`;
  const leftHtml  = block.left.map(b  => renderInlineBlock(b, branding)).join('');
  const rightHtml = block.right.map(b => renderInlineBlock(b, branding)).join('');

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td width="${block.leftWidth}" valign="top" style="padding-right:${block.gap};">${leftHtml}</td>
    <td width="${rightWidth}" valign="top">${rightHtml}</td>
  </tr>
</table>`;
}

function renderSocial(block: SocialBlock): string {
  const icons = block.links.map(link => {
    const svg = renderIconSvg(link.platform, block.iconSize, block.color);
    return `<a href="${link.url}" style="display:inline-block;margin:0 6px;text-decoration:none;">${svg}</a>`;
  }).join('');
  return `<div style="text-align:${block.align};padding:12px 0;">${icons}</div>`;
}

// ── Email shell ───────────────────────────────────────────────

/**
 * Font-family rules per typographic role (headings, quotes, code).
 * `scope` prefixes every selector (e.g. ".mf-b" for the in-app preview).
 */
export function typographyCss(branding: BrandingConfig, scope = ''): string {
  const stacks = getFontStacks(branding);
  const sel = (tags: string[]) => tags.map(t => (scope ? `${scope} ${t}` : t)).join(',');
  return [
    `${sel(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])}{font-family:${stacks.heading}}`,
    `${sel(['blockquote'])}{font-family:${stacks.quote}}`,
    `${sel(['code', 'pre', 'kbd'])}{font-family:${stacks.mono}}`,
    `${sel(['pre code'])}{font-family:inherit}`,
  ].join('\n  ');
}

function emailShell(body: string, branding: BrandingConfig, title: string): string {
  const { attribution } = APP_CONFIG;
  const fontLinks = getFontUrls(branding).map(url => `<link href="${url}" rel="stylesheet">`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
${fontLinks}
<style>
  body { margin:0; padding:24px 16px; background:#f0f4f8; font-family:${getFontStacks(branding).text}; color:${branding.bodyText}; }
  .mf-frame { max-width:600px; margin:0 auto; background:${branding.bodyBg}; border-radius:10px; box-shadow:0 4px 24px rgba(0,0,0,.12); overflow:hidden; }
  .mf-body  { padding:32px; line-height:1.7; background:${branding.bodyBg}; color:${branding.bodyText}; }
  h1 { font-size:26px; margin:0 0 16px; } h2 { font-size:20px; margin:24px 0 12px; }
  h3 { font-size:16px; margin:20px 0 8px; } p { margin:0 0 16px; }
  a  { color:${branding.linkColor}; } hr { border:none; border-top:1px solid ${DIVIDER_COLOR}; margin:24px 0; }
  ${typographyCss(branding)}
  img { max-width:100%; height:auto; }
  blockquote { border-left:4px solid ${branding.primaryColor}; margin:16px 0; padding:12px 16px; background:rgba(73,136,196,0.07); border-radius:0 6px 6px 0; }
  code { background:rgba(0,0,0,0.06); padding:2px 6px; border-radius:3px; font-size:13px; }
  pre  { background:#1a1a2e; color:#c8dff5; padding:16px; border-radius:8px; overflow-x:auto; }
  pre code { background:none; color:inherit; padding:0; }
  ul,ol { margin:0 0 16px; padding-left:24px; } li { margin-bottom:6px; }
  table { border-collapse:collapse; width:100%; margin-bottom:16px; }
  th,td { border:1px solid rgba(0,0,0,0.1); padding:8px 12px; }
  th { background:rgba(0,0,0,0.04); font-weight:600; }
  .mf-watermark { padding:12px; text-align:center; font-size:11px; color:#aab8c8; border-top:1px solid rgba(0,0,0,0.08); background:rgba(0,0,0,0.02); }
</style>
</head>
<body>
<div class="mf-frame">
  <div class="mf-body">${body}</div>
  <div class="mf-watermark">Built with ${attribution.label} · <a href="${attribution.url}" style="color:#aab8c8;">${attribution.url.replace('https://github.com/', '')}</a> · ${attribution.license}</div>
</div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────

export function renderBlocksToEmailHtml(blocks: Block[], branding: BrandingConfig, title = 'Email'): string {
  const bodyParts = blocks.map(block => {
    switch (block.type) {
      case 'markdown': return renderMarkdown(block, branding);
      case 'header':   return renderHeader(block, branding);
      case 'footer':   return renderFooter(block, branding);
      case 'badge':    return renderBadge(block, branding);
      case 'divider':  return renderDivider(block);
      case 'image':    return renderImage(block, branding);
      case 'button':   return renderButton(block, branding);
      case 'icon':     return renderIcon(block);
      case 'font':     return renderFont(block);
      case 'spacer':   return renderSpacer(block);
      case 'columns':  return renderColumns(block, branding);
      case 'social':   return renderSocial(block);
      default: {
        const _exhaustive: never = block;
        return String(_exhaustive);
      }
    }
  });

  return emailShell(bodyParts.join('\n'), branding, title);
}

/**
 * Renders a preview-safe HTML snippet (no outer shell) for live preview use.
 * Does NOT inline styles — the browser handles class-based styling fine in preview.
 */
export function renderBlocksToPreviewHtml(blocks: Block[], branding: BrandingConfig): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'markdown': return renderMarkdown(block, branding);
      case 'header':   return renderHeader(block, branding);
      case 'footer':   return renderFooter(block, branding);
      case 'badge':    return renderBadge(block, branding);
      case 'divider':  return renderDivider(block);
      case 'image':    return renderImage(block, branding);
      case 'button':   return renderButton(block, branding);
      case 'icon':     return renderIcon(block);
      case 'font':     return renderFont(block);
      case 'spacer':   return renderSpacer(block);
      case 'columns':  return renderColumns(block, branding);
      case 'social':   return renderSocial(block);
      default: {
        const _exhaustive: never = block;
        return String(_exhaustive);
      }
    }
  }).join('\n');
}

// ── CSS inliner for export ────────────────────────────────────

/**
 * Minimal Tailwind utility → CSS lookup table for email-relevant classes.
 * NOTE: Expand this table as new Tailwind classes are used in email output.
 * This is intentionally limited — most email output uses inline styles already.
 */
const TAILWIND_LOOKUP: Record<string, string> = {
  'text-center':   'text-align:center',
  'text-left':     'text-align:left',
  'text-right':    'text-align:right',
  'font-bold':     'font-weight:700',
  'font-semibold': 'font-weight:600',
  'font-medium':   'font-weight:500',
  'underline':     'text-decoration:underline',
  'italic':        'font-style:italic',
  'p-4':           'padding:16px',
  'p-6':           'padding:24px',
  'px-4':          'padding-left:16px;padding-right:16px',
  'py-2':          'padding-top:8px;padding-bottom:8px',
  'mt-4':          'margin-top:16px',
  'mb-4':          'margin-bottom:16px',
  'mx-auto':       'margin-left:auto;margin-right:auto',
  'w-full':        'width:100%',
  'max-w-lg':      'max-width:32rem',
  'rounded':       'border-radius:4px',
  'rounded-full':  'border-radius:9999px',
  'rounded-lg':    'border-radius:8px',
  'flex':          'display:flex',
  'inline-block':  'display:inline-block',
  'block':         'display:block',
  'hidden':        'display:none',
};

function extractTailwindCss(html: string): string {
  const classPattern = /class="([^"]+)"/g;
  const allClasses   = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = classPattern.exec(html)) !== null) {
    m[1].split(/\s+/).forEach(cls => allClasses.add(cls));
  }
  const rules: string[] = [];
  for (const cls of allClasses) {
    if (TAILWIND_LOOKUP[cls]) {
      rules.push(`.${cls.replace(/:/g, '\\:')} { ${TAILWIND_LOOKUP[cls]}; }`);
    }
  }
  return rules.join('\n');
}

export async function inlineEmailStyles(html: string): Promise<string> {
  const extraCss = extractTailwindCss(html);
  // Inject the generated CSS into the HTML before inlining
  const htmlWithCss = extraCss
    ? html.replace('</head>', `<style>${extraCss}</style></head>`)
    : html;
  return juice(htmlWithCss, { removeStyleTags: false, preserveImportant: true });
}
