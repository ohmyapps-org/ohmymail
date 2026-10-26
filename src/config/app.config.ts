import type { BrandingConfig, CustomTagCommand } from '../types';

// ============================================================
// App Configuration — edit this file to customise MailForge
// ============================================================

export const APP_CONFIG = {
  /** Name displayed in the toolbar */
  name: 'OhMyMail',
  /** Used for the status-bar link */
  github: 'https://github.com/itica-lat/ohmymail',
  attribution: {
    label: 'OhMyMail by Itica Lat',
    url: 'https://github.com/itica-lat',
    license: 'Apache 2.0',
  },
} as const;

/** Default branding applied before the user saves any settings */
export const DEFAULT_BRANDING: BrandingConfig = {
  companyName:    'Your Company',
  logoUrl:        '',
  primaryColor:   '#4988C4',
  font:           'Inter',
  fontSize:       'medium',
  customFontUrl:  '',
  customFontName: '',
  headingFontName: '',
  headingFontUrl:  '',
  quoteFontName:   '',
  quoteFontUrl:    '',
  monoFontName:    '',
  monoFontUrl:     '',
  headerBg:       '#0F2854',
  headerText:     '#BDE8F5',
  cornerRadius:   8,
  headerRadius:   null,
  footerBg:       '#0F2854',
  footerText:     '#BDE8F5',
  footerRadius:   null,
  buttonRadius:   null,
  badgeRadius:    null,
  imageRadius:    null,
  bodyBg:         '#ffffff',
  bodyText:       '#1a1a2e',
  linkColor:      '#4988C4',
};

/**
 * Custom inline-HTML slash commands.
 *
 * Each entry shows up in the "/" command palette and inserts a styled HTML tag
 * wrapping the placeholder text. Add, remove, or restyle entries here freely.
 *
 * Fields:
 *   id          — unique key (no spaces)
 *   label       — name shown in the palette
 *   description — subtitle shown in the palette
 *   tag         — HTML element name, e.g. "span", "mark", "kbd", "abbr"
 *   style       — inline CSS string applied to the element
 *   placeholder — default inner text inserted
 */
export const CUSTOM_TAG_COMMANDS: CustomTagCommand[] = [
  {
    id:          'highlight',
    label:       'Highlight',
    description: 'Yellow highlighted text',
    tag:         'mark',
    style:       'background:#fef08a;color:#713f12;padding:1px 4px;border-radius:3px;',
    placeholder: 'Highlighted text',
  },
  {
    id:          'pill',
    label:       'Pill Tag',
    description: 'Rounded pill badge',
    tag:         'span',
    style:       'display:inline-block;background:#3b82f6;color:#fff;padding:2px 12px;border-radius:9999px;font-size:12px;font-weight:600;',
    placeholder: 'Tag',
  },
  {
    id:          'kbd',
    label:       'Keyboard Key',
    description: 'Keyboard shortcut style',
    tag:         'kbd',
    style:       'display:inline-block;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:4px;padding:1px 6px;font-size:12px;font-family:monospace;box-shadow:0 1px 0 #94a3b8;',
    placeholder: 'Ctrl+C',
  },
  {
    id:          'note',
    label:       'Note',
    description: 'Inline note callout',
    tag:         'span',
    style:       'display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:2px 10px;font-size:13px;',
    placeholder: 'Note text',
  },
];
