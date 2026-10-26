// ============================================================
// Types & Interfaces
// ============================================================

export interface Template {
  id: string;
  name: string;
  /** Serialized block array (JSON string) or legacy markdown string */
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  font: string;
  fontSize: 'small' | 'medium' | 'large';
  customFontUrl: string;
  customFontName: string;
  /**
   * Per-role typography. Empty name = inherit the text font.
   * With a name only, the font is loaded from Google Fonts by name;
   * a URL gives control over weights/styles.
   */
  headingFontName: string;
  headingFontUrl: string;
  quoteFontName: string;
  quoteFontUrl: string;
  monoFontName: string;
  monoFontUrl: string;
  headerBg: string;
  headerText: string;
  /** Global corner radius (px) followed by every component whose own radius is null. */
  cornerRadius: number;
  /**
   * Per-component radius (px); null = follow `cornerRadius`.
   * Header/footer: inner radius, outer CSS = inner + padding (concentric corners rule).
   */
  headerRadius: number | null;
  footerBg: string;
  footerText: string;
  footerRadius: number | null;
  buttonRadius: number | null;
  badgeRadius: number | null;
  imageRadius: number | null;
  bodyBg: string;
  bodyText: string;
  linkColor: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SlashCommandDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  special?: 'icon-picker';
  insert: (branding: BrandingConfig) => string;
}

export interface SlashCommandState {
  query: string;
  startIndex: number;
  x: number;
  y: number;
  selectedIndex: number;
}

/**
 * User-defined inline HTML tag slash command — configure in app.config.ts.
 * Each entry appears in the "/" palette and wraps placeholder text in a styled tag.
 */
export interface CustomTagCommand {
  id: string;
  label: string;
  description: string;
  /** HTML tag name, e.g. "span", "mark", "kbd" */
  tag: string;
  /** Inline CSS string applied to the element */
  style: string;
  /** Default inner text inserted with the command */
  placeholder: string;
}

// ============================================================
// Block ADT
// ============================================================

export type BlockId = string; // nanoid(8)

export type MarkdownBlock = {
  id: BlockId;
  type: 'markdown';
  content: string;
};

export type HeaderBlock = {
  id: BlockId;
  type: 'header';
  logoUrl: string;
  /** Company name / title shown under the logo. */
  title?: string;
  /** bg, textColor and radius are overrides: when undefined they follow the branding theme. */
  bg?: string;
  textColor?: string;
  height: number;
  radius?: string;
  align: 'left' | 'center' | 'right';
};

export type FooterBlock = {
  id: BlockId;
  type: 'footer';
  /** bg, textColor and radius are overrides: when undefined they follow the branding theme. */
  bg?: string;
  text: string;
  textColor?: string;
  radius?: string;
  align?: 'left' | 'center' | 'right';
};

export type BadgeBlock = {
  id: BlockId;
  type: 'badge';
  label: string;
  color: string;
  bg: string;
  /** Override; undefined follows the branding corner config. */
  radius?: string;
  fontSize: string;
};

export type DividerBlock = {
  id: BlockId;
  type: 'divider';
  color: string;
  thickness: number;
  margin: string;
};

export type ImageBlock = {
  id: BlockId;
  type: 'image';
  src: string;
  alt: string;
  width: string;
  align: 'left' | 'center' | 'right';
  /** Override; undefined follows the branding corner config. */
  radius?: string;
};

export type ButtonBlock = {
  id: BlockId;
  type: 'button';
  label: string;
  href: string;
  bg: string;
  color: string;
  /** Override; undefined follows the branding corner config. */
  radius?: string;
  fontSize: string;
};

export type IconBlock = {
  id: BlockId;
  type: 'icon';
  name: string;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
};

export type FontBlock = {
  id: BlockId;
  type: 'font';
  family: string;
  url: string;
  target: 'h1' | 'h2' | 'h3' | 'body' | 'footer' | 'all';
  size: string;
  weight: string;
};

export type SpacerBlock = {
  id: BlockId;
  type: 'spacer';
  height: number;
};

export type ColumnsBlock = {
  id: BlockId;
  type: 'columns';
  left: InlineBlock[];
  right: InlineBlock[];
  gap: string;
  leftWidth: string;
};

export type SocialLink = {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'github' | 'youtube' | 'tiktok';
  url: string;
};

export type SocialBlock = {
  id: BlockId;
  type: 'social';
  links: SocialLink[];
  iconSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
};

/** Blocks allowed inside columns (no nesting columns/social/font/spacer) */
export type InlineBlock = MarkdownBlock | BadgeBlock | ImageBlock | IconBlock | ButtonBlock;

export type Block =
  | MarkdownBlock
  | HeaderBlock
  | FooterBlock
  | BadgeBlock
  | DividerBlock
  | ImageBlock
  | ButtonBlock
  | IconBlock
  | FontBlock
  | SpacerBlock
  | ColumnsBlock
  | SocialBlock;

export type BlockType = Block['type'];
