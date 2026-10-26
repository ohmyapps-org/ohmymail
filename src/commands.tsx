import {
  Hash, Minus, Tag, AlignLeft, Zap, Type, Palette, Star,
  Link as LinkIcon, Image as ImageIcon,
} from 'lucide-react';
import type { BrandingConfig, SlashCommandDef } from './types';
import { CUSTOM_TAG_COMMANDS } from './config/app.config';
import { concentricRadius, componentRadius } from './utils';
import { HEADER_PADDING, FOOTER_PADDING } from './constants';

function builtinCommands(b: BrandingConfig): SlashCommandDef[] {
  const logo = b.logoUrl || 'https://placehold.co/120x40/0F2854/BDE8F5?text=Logo';
  const co   = b.companyName || 'Your Company';
  const year = new Date().getFullYear();

  return [
    {
      id: 'h1', label: 'Heading 1', description: 'Large section heading', icon: <Hash size={14} />,
      insert: () => '# Heading 1',
    },
    {
      id: 'h2', label: 'Heading 2', description: 'Medium section heading', icon: <Hash size={14} />,
      insert: () => '## Heading 2',
    },
    {
      id: 'h3', label: 'Heading 3', description: 'Small section heading', icon: <Hash size={14} />,
      insert: () => '### Heading 3',
    },
    {
      id: 'divider', label: 'Divider', description: 'Horizontal rule', icon: <Minus size={14} />,
      insert: () => '---',
    },
    {
      id: 'badge', label: 'Badge', description: 'Colored label badge', icon: <Tag size={14} />,
      insert: () => `<span style="background:${b.primaryColor};color:#fff;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;display:inline-block;">Label</span>`,
    },
    {
      id: 'link', label: 'Link', description: 'Hyperlink', icon: <LinkIcon size={14} />,
      insert: () => '[Link Text](https://url.com)',
    },
    {
      id: 'gif', label: 'GIF', description: 'Animated GIF image', icon: <ImageIcon size={14} />,
      insert: () => '![alt text](https://media.giphy.com/media/REPLACE_ID/giphy.gif)',
    },
    {
      id: 'icon', label: 'Icon', description: 'Insert inline icon', icon: <Star size={14} />,
      special: 'icon-picker', insert: () => '<lucide-icon name="star" />',
    },
    {
      id: 'header', label: 'Email Header', description: 'Branded header block', icon: <AlignLeft size={14} />,
      insert: () => {
        // outer = inner + padding — inner corners of the content appear with headerRadius rounding
        const r = concentricRadius(componentRadius(b, 'headerRadius'), HEADER_PADDING);
        return `<div class="email-header" style="background:${b.headerBg};padding:${HEADER_PADDING}px;text-align:center;border-radius:${r}px ${r}px 0 0;">
  <img src="${logo}" alt="Logo" style="height:40px;margin-bottom:8px;" />
  <h1 style="color:${b.headerText};font-size:22px;margin:0;">${co}</h1>
</div>`;
      },
    },
    {
      id: 'footer', label: 'Email Footer', description: 'Branded footer block', icon: <AlignLeft size={14} />,
      insert: () => {
        const r = concentricRadius(componentRadius(b, 'footerRadius'), FOOTER_PADDING);
        return `<div class="email-footer" style="background:${b.footerBg};padding:${FOOTER_PADDING}px;text-align:center;font-size:12px;color:${b.footerText};border-radius:0 0 ${r}px ${r}px;margin-top:24px;">
  © ${year} ${co} · Unsubscribe · Privacy Policy
  <br/><span style="opacity:0.5;">Built with MailForge by Eternum · Apache 2.0</span>
</div>`;
      },
    },
    {
      id: 'button', label: 'CTA Button', description: 'Call-to-action button', icon: <Zap size={14} />,
      insert: () => `<a href="#" style="display:inline-block;background:${b.primaryColor};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0;">Click Here</a>`,
    },
    {
      id: 'font', label: 'Font Import', description: 'Google Font style block', icon: <Type size={14} />,
      insert: () => `<style>@import url('https://fonts.googleapis.com/css2?family=${b.font}:wght@400;600;700&display=swap');</style>`,
    },
    {
      id: 'branding', label: 'Branding Block', description: 'Logo + company name', icon: <Palette size={14} />,
      insert: () => `<div style="display:flex;align-items:center;gap:12px;padding:16px 0;">
  <img src="${logo}" alt="Logo" style="height:40px;border-radius:4px;" />
  <span style="font-size:20px;font-weight:700;color:#0F2854;">${co}</span>
</div>`,
    },
  ];
}

/** Returns all slash commands: built-ins + user-defined tag commands from app.config.ts */
export function buildSlashCommands(b: BrandingConfig): SlashCommandDef[] {
  const customs: SlashCommandDef[] = CUSTOM_TAG_COMMANDS.map(cmd => ({
    id:          cmd.id,
    label:       cmd.label,
    description: cmd.description,
    icon:        <Tag size={14} />,
    insert:      () => `<${cmd.tag} style="${cmd.style}">${cmd.placeholder}</${cmd.tag}>`,
  }));

  return [...builtinCommands(b), ...customs];
}
