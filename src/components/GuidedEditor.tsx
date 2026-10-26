import { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import {
  GripVertical, Trash2, ChevronDown, ChevronUp, Plus,
  Edit3, Image as ImageIcon, Type, AlignLeft, Minus,
  Square, Zap, Hash, Tag, Music,
} from 'lucide-react';
import type {
  Block, BlockId, BlockType, BrandingConfig, SlashCommandDef, SlashCommandState,
  MarkdownBlock, HeaderBlock, FooterBlock, BadgeBlock, DividerBlock,
  ImageBlock, ButtonBlock, IconBlock, FontBlock, SpacerBlock,
  ColumnsBlock, SocialBlock, SocialLink,
} from '../types';
import { fuzzyMatch, normalizeHex, resolveFooterStyle, resolveHeaderStyle, resolveRadius, componentRadius, type RadiusKey } from '../utils';
import { DIVIDER_COLOR } from '../constants';
import SlashPalette from './SlashPalette';

interface Props {
  blocks: Block[];
  branding: BrandingConfig;
  slashCommands: SlashCommandDef[];
  onBlocksChange: (blocks: Block[]) => void;
  updateBlock: <T extends Block>(id: BlockId, patch: Partial<Omit<T, 'id' | 'type'>>) => void;
  addBlock: (block: Block, afterId?: BlockId) => void;
  removeBlock: (id: BlockId) => void;
}

// ── Block defaults ────────────────────────────────────────────

function makeBlock(type: BlockType, branding: BrandingConfig): Block {
  const id = nanoid(8);
  switch (type) {
    case 'markdown': return { id, type, content: 'Type your **markdown** here.' };
    // bg / textColor / radius are intentionally omitted: header and footer follow the branding theme
    case 'header':   return { id, type, logoUrl: branding.logoUrl, title: branding.companyName, height: 80, align: 'center' };
    case 'footer':   return { id, type, text: `© ${new Date().getFullYear()} ${branding.companyName || 'Your Company'}`, align: 'center' as const };
    case 'badge':    return { id, type, label: 'Badge', color: '#1D4ED8', bg: '#EFF6FF', fontSize: '12px' };
    case 'divider':  return { id, type, color: DIVIDER_COLOR, thickness: 1, margin: '24px 0' };
    case 'image':    return { id, type, src: 'https://placehold.co/600x200', alt: 'Image', width: '100%', align: 'center' };
    case 'button':   return { id, type, label: 'Click Here', href: '#', bg: branding.primaryColor, color: '#ffffff', fontSize: '15px' };
    case 'icon':     return { id, type, name: 'star', size: 32, color: branding.primaryColor, align: 'center' };
    case 'font':     return { id, type, family: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap', target: 'all', size: '16px', weight: '400' };
    case 'spacer':   return { id, type, height: 24 };
    case 'columns':  return { id, type, left: [], right: [], gap: '24px', leftWidth: '50%' };
    case 'social':   return { id, type, links: [], iconSize: 24, color: branding.primaryColor, align: 'center' };
  }
}

// ── Block type metadata for the add-block palette ─────────────

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'markdown', label: 'Text',    icon: <Hash size={14}/>,      description: 'Markdown text block'    },
  { type: 'header',   label: 'Header',  icon: <AlignLeft size={14}/>, description: 'Email header with logo' },
  { type: 'footer',   label: 'Footer',  icon: <AlignLeft size={14}/>, description: 'Email footer'           },
  { type: 'badge',    label: 'Badge',   icon: <Tag size={14}/>,       description: 'Colored label'          },
  { type: 'divider',  label: 'Divider', icon: <Minus size={14}/>,     description: 'Horizontal rule'        },
  { type: 'image',    label: 'Image',   icon: <ImageIcon size={14}/>, description: 'Image block'            },
  { type: 'button',   label: 'Button',  icon: <Zap size={14}/>,       description: 'CTA button'             },
  { type: 'icon',     label: 'Icon',    icon: <Square size={14}/>,    description: 'Lucide icon'            },
  { type: 'font',     label: 'Font',    icon: <Type size={14}/>,      description: 'Google Font import'     },
  { type: 'spacer',   label: 'Spacer',  icon: <Minus size={14}/>,     description: 'Vertical space'         },
  { type: 'columns',  label: 'Columns', icon: <Edit3 size={14}/>,     description: 'Two-column layout'      },
  { type: 'social',   label: 'Social',  icon: <Music size={14}/>,     description: 'Social icon links'      },
];

// ── Add Block Button ──────────────────────────────────────────

function AddBlockButton({ afterId, branding, onAdd }: { afterId?: BlockId; branding: BrandingConfig; onAdd: (block: Block, afterId?: BlockId) => void }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');

  const filtered = BLOCK_TYPES.filter(b => fuzzyMatch(query, `${b.label} ${b.description}`));

  const pick = (type: BlockType) => {
    onAdd(makeBlock(type, branding), afterId);
    setOpen(false);
    setQuery('');
  };

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 12px', borderRadius: 99, border: '1px dashed rgba(73,136,196,0.4)', background: 'transparent', color: '#4988C4', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.1)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <Plus size={12}/> Add block
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '100%', zIndex: 1000, background: '#122040', border: '1px solid #2a4a6a', borderRadius: 10, width: 240, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', overflow: 'hidden', marginTop: 4 }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e3a5a' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search blocks…"
              style={{ width: '100%', background: 'rgba(73,136,196,0.12)', border: '1px solid rgba(73,136,196,0.3)', borderRadius: 6, padding: '4px 8px', color: '#ddeeff', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map(b => (
              <button key={b.type} onClick={() => pick(b.type)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', color: '#ddeeff', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: '#4988C4' }}>{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{b.label}</div>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>{b.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Block preview renderers ───────────────────────────────────

function BlockPreview({ block, branding, expanded, onToggleExpand }: { block: Block; branding: BrandingConfig; expanded?: boolean; onToggleExpand?: () => void }) {
  switch (block.type) {
    case 'markdown': {
      const html = String(marked.parse(block.content));
      const isLong = block.content.length > 180;
      return (
        <div>
          <div
            style={{ fontSize: 13, color: '#c8dff5', pointerEvents: 'none', maxHeight: expanded ? 'none' : 100, overflow: 'hidden', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {isLong && (
            <button
              onClick={e => { e.stopPropagation(); onToggleExpand?.(); }}
              style={{ marginTop: 4, padding: '1px 8px', fontSize: 11, background: 'rgba(73,136,196,0.12)', border: '1px solid rgba(73,136,196,0.3)', borderRadius: 4, color: '#4988C4', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {expanded ? '↑ Collapse' : '↓ Show more'}
            </button>
          )}
        </div>
      );
    }
    case 'header': {
      const h = resolveHeaderStyle(block, branding);
      return (
        <div style={{ background: h.bg, padding: '12px', textAlign: block.align, borderRadius: h.radius, fontSize: 12 }}>
          {block.logoUrl
            ? <img src={block.logoUrl} alt="Logo" style={{ height: Math.min(block.height * 0.4, 32), display: 'inline-block', borderRadius: h.innerRadius }} />
            : <span style={{ color: '#aaa', fontSize: 11 }}>[Logo placeholder]</span>}
          {block.title?.trim() && <div style={{ color: h.textColor, fontSize: 14, fontWeight: 700, marginTop: block.logoUrl ? 6 : 0 }}>{block.title}</div>}
        </div>
      );
    }
    case 'footer': {
      const f = resolveFooterStyle(block, branding);
      return (
        <div style={{ background: f.bg, color: f.textColor, padding: '8px 12px', textAlign: block.align ?? 'center', fontSize: 11, borderRadius: f.radius }}>
          {block.text || '(footer)'}
        </div>
      );
    }
    case 'badge':
      return (
        <div style={{ padding: '4px 0' }}>
          <span style={{ display: 'inline-block', background: block.bg, color: block.color, borderRadius: resolveRadius(block.radius, branding, 'badgeRadius'), fontSize: block.fontSize, padding: '2px 10px', fontWeight: 600 }}>{block.label}</span>
        </div>
      );
    case 'divider':
      return <hr style={{ border: 'none', borderTop: `${block.thickness}px solid ${block.color}`, margin: '8px 0' }} />;
    case 'image':
      return (
        <div style={{ textAlign: block.align }}>
          <img src={block.src} alt={block.alt} style={{ maxWidth: '100%', maxHeight: 80, borderRadius: resolveRadius(block.radius, branding, 'imageRadius'), display: 'inline-block' }} />
        </div>
      );
    case 'button':
      return (
        <div style={{ textAlign: 'center' }}>
          <span style={{ display: 'inline-block', background: block.bg, color: block.color, borderRadius: resolveRadius(block.radius, branding, 'buttonRadius'), fontSize: block.fontSize, padding: '6px 20px', fontWeight: 600 }}>{block.label}</span>
        </div>
      );
    case 'icon':
      return (
        <div style={{ textAlign: block.align, padding: '4px 0' }}>
          <span style={{ display: 'inline-block', width: block.size, height: block.size, background: block.color, borderRadius: 4, opacity: 0.7, fontSize: 10, lineHeight: `${block.size}px`, textAlign: 'center', color: '#fff' }}>{block.name}</span>
        </div>
      );
    case 'font':
      return (
        <span style={{ fontFamily: `'${block.family}',sans-serif`, fontSize: 18, color: '#ddeeff' }}>Aa Bb Cc — {block.family}</span>
      );
    case 'spacer':
      return (
        <div style={{ border: '1px dashed rgba(73,136,196,0.3)', height: Math.max(block.height * 0.4, 20), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4988C4', fontSize: 11 }}>
          Spacer {block.height}px
        </div>
      );
    case 'columns':
      return (
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#aaa' }}>
          <div style={{ flex: 1, border: '1px dashed rgba(73,136,196,0.3)', padding: 6, borderRadius: 4 }}>Left ({block.left.length} block{block.left.length !== 1 ? 's' : ''})</div>
          <div style={{ flex: 1, border: '1px dashed rgba(73,136,196,0.3)', padding: 6, borderRadius: 4 }}>Right ({block.right.length} block{block.right.length !== 1 ? 's' : ''})</div>
        </div>
      );
    case 'social':
      return (
        <div style={{ textAlign: block.align, fontSize: 11, color: '#aaa' }}>
          {block.links.length === 0 ? 'No links yet' : block.links.map(l => l.platform).join(' · ')}
        </div>
      );
  }
}

// ── Inline Prop Editor ────────────────────────────────────────

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#6a99bb', minWidth: 80 }}>{label}</label>
      <input type="color" value={normalizeHex(value, '#000000')} onChange={e => onChange(e.target.value)}
        style={{ width: 28, height: 24, border: 'none', cursor: 'pointer', borderRadius: 4, padding: 0, background: 'none' }} />
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 4, padding: '3px 6px', color: '#ddeeff', fontSize: 11, fontFamily: 'monospace', outline: 'none' }} />
    </div>
  );
}

function TextField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#6a99bb', minWidth: 80 }}>{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ flex: 1, background: 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 4, padding: '3px 6px', color: '#ddeeff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#6a99bb', minWidth: 80 }}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        style={{ width: 80, background: 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 4, padding: '3px 6px', color: '#ddeeff', fontSize: 12, outline: 'none' }} />
    </div>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label style={{ fontSize: 11, color: '#6a99bb', minWidth: 80 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value as T)}
        style={{ flex: 1, background: '#122040', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 4, padding: '3px 6px', color: '#ddeeff', fontSize: 12, outline: 'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TextareaField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#6a99bb', marginBottom: 4 }}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
        style={{ width: '100%', background: 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 4, padding: '6px 8px', color: '#ddeeff', fontSize: 12, outline: 'none', fontFamily: '"IBM Plex Mono",monospace', resize: 'vertical', boxSizing: 'border-box' }} />
    </div>
  );
}

function themeRadiusHint(branding: BrandingConfig, key: RadiusKey): string {
  return `Theme (${componentRadius(branding, key)}px)`;
}

function ThemeResetButton({ active, onReset }: { active: boolean; onReset: () => void }) {
  if (!active) return null;
  return (
    <button onClick={onReset} style={{ marginBottom: 8, padding: '3px 10px', fontSize: 11, background: 'rgba(73,136,196,0.12)', border: '1px solid rgba(73,136,196,0.3)', borderRadius: 4, color: '#4988C4', cursor: 'pointer', fontFamily: 'inherit' }}>
      Use theme colors &amp; corners
    </button>
  );
}

function BlockPropEditor({ block, branding, update }: { block: Block; branding: BrandingConfig; update: (patch: Partial<Omit<Block, 'id' | 'type'>>) => void }) {
  switch (block.type) {
    case 'markdown': {
      const b = block as MarkdownBlock;
      return <TextareaField label="Content" value={b.content} onChange={v => update({ content: v })} />;
    }
    case 'header': {
      const b = block as HeaderBlock;
      const h = resolveHeaderStyle(b, branding);
      return (<>
        <ThemeResetButton
          active={b.bg !== undefined || b.textColor !== undefined || b.radius !== undefined}
          onReset={() => update({ bg: undefined, textColor: undefined, radius: undefined })}
        />
        <TextField  label="Logo URL" value={b.logoUrl} onChange={v => update({ logoUrl: v })} type="url" />
        <TextField  label="Title"    value={b.title ?? ''} onChange={v => update({ title: v })} />
        <ColorField label="Background" value={h.bg}    onChange={v => update({ bg: v })} />
        <ColorField label="Text color" value={h.textColor} onChange={v => update({ textColor: v })} />
        <NumberField label="Height px" value={b.height} onChange={v => update({ height: v })} />
        <TextField  label="Radius"    value={b.radius ?? ''} placeholder={themeRadiusHint(branding, 'headerRadius')} onChange={v => update({ radius: v === '' ? undefined : v })} />
        <SelectField<HeaderBlock['align']> label="Align" value={b.align} options={['left', 'center', 'right']} onChange={v => update({ align: v })} />
      </>);
    }
    case 'footer': {
      const b = block as FooterBlock;
      const f = resolveFooterStyle(b, branding);
      return (<>
        <ThemeResetButton
          active={b.bg !== undefined || b.textColor !== undefined || b.radius !== undefined}
          onReset={() => update({ bg: undefined, textColor: undefined, radius: undefined })}
        />
        <ColorField   label="Background" value={f.bg}           onChange={v => update({ bg: v })} />
        <ColorField   label="Text color" value={f.textColor}    onChange={v => update({ textColor: v })} />
        <TextField    label="Radius"     value={b.radius ?? ''} placeholder={themeRadiusHint(branding, 'footerRadius')} onChange={v => update({ radius: v === '' ? undefined : v })} />
        <SelectField<'left' | 'center' | 'right'> label="Align" value={b.align ?? 'center'} options={['left', 'center', 'right']} onChange={v => update({ align: v })} />
        <TextareaField label="Text (md)"  value={b.text}        onChange={v => update({ text: v })} />
      </>);
    }
    case 'badge': {
      const b = block as BadgeBlock;
      return (<>
        <TextField  label="Label"     value={b.label}    onChange={v => update({ label: v })} />
        <ColorField label="Text color" value={b.color}   onChange={v => update({ color: v })} />
        <ColorField label="Background" value={b.bg}      onChange={v => update({ bg: v })} />
        <TextField  label="Radius"    value={b.radius ?? ''} placeholder={themeRadiusHint(branding, 'badgeRadius')} onChange={v => update({ radius: v === '' ? undefined : v })} />
        <TextField  label="Font size" value={b.fontSize} onChange={v => update({ fontSize: v })} />
      </>);
    }
    case 'divider': {
      const b = block as DividerBlock;
      return (<>
        <ColorField  label="Color"     value={b.color}     onChange={v => update({ color: v })} />
        <NumberField label="Thickness" value={b.thickness} onChange={v => update({ thickness: v })} />
        <TextField   label="Margin"    value={b.margin}    onChange={v => update({ margin: v })} />
      </>);
    }
    case 'image': {
      const b = block as ImageBlock;
      return (<>
        <TextField   label="Source URL" value={b.src}    onChange={v => update({ src: v })} type="url" />
        <TextField   label="Alt text"   value={b.alt}    onChange={v => update({ alt: v })} />
        <TextField   label="Width"      value={b.width}  onChange={v => update({ width: v })} />
        <TextField   label="Radius"     value={b.radius ?? ''} placeholder={themeRadiusHint(branding, 'imageRadius')} onChange={v => update({ radius: v === '' ? undefined : v })} />
        <SelectField<ImageBlock['align']> label="Align" value={b.align} options={['left', 'center', 'right']} onChange={v => update({ align: v })} />
      </>);
    }
    case 'button': {
      const b = block as ButtonBlock;
      return (<>
        <TextField  label="Label"      value={b.label}    onChange={v => update({ label: v })} />
        <TextField  label="URL"        value={b.href}     onChange={v => update({ href: v })} type="url" />
        <ColorField label="Background" value={b.bg}       onChange={v => update({ bg: v })} />
        <ColorField label="Text color" value={b.color}    onChange={v => update({ color: v })} />
        <TextField  label="Radius"     value={b.radius ?? ''} placeholder={themeRadiusHint(branding, 'buttonRadius')} onChange={v => update({ radius: v === '' ? undefined : v })} />
        <TextField  label="Font size"  value={b.fontSize} onChange={v => update({ fontSize: v })} />
      </>);
    }
    case 'icon': {
      const b = block as IconBlock;
      return (<>
        <TextField   label="Icon name"  value={b.name}  onChange={v => update({ name: v })} />
        <NumberField label="Size px"    value={b.size}  onChange={v => update({ size: v })} />
        <ColorField  label="Color"      value={b.color} onChange={v => update({ color: v })} />
        <SelectField<IconBlock['align']> label="Align" value={b.align} options={['left', 'center', 'right']} onChange={v => update({ align: v })} />
      </>);
    }
    case 'font': {
      const b = block as FontBlock;
      return (<>
        <TextField  label="Family"  value={b.family} onChange={v => update({ family: v })} />
        <TextField  label="URL"     value={b.url}    onChange={v => update({ url: v })} type="url" />
        <SelectField<FontBlock['target']> label="Target" value={b.target} options={['h1', 'h2', 'h3', 'body', 'footer', 'all']} onChange={v => update({ target: v })} />
        <TextField  label="Size"    value={b.size}   onChange={v => update({ size: v })} />
        <TextField  label="Weight"  value={b.weight} onChange={v => update({ weight: v })} />
        <button onClick={() => {
          const existing = document.getElementById(`gf-${b.family.replace(/\s+/g, '-')}`);
          if (!existing) {
            const link = Object.assign(document.createElement('link'), { id: `gf-${b.family.replace(/\s+/g, '-')}`, rel: 'stylesheet', href: b.url });
            document.head.appendChild(link);
          }
        }} style={{ marginTop: 4, padding: '4px 10px', fontSize: 11, background: 'rgba(73,136,196,0.2)', border: '1px solid rgba(73,136,196,0.4)', borderRadius: 4, color: '#BDE8F5', cursor: 'pointer', fontFamily: 'inherit' }}>
          Load Font Preview
        </button>
      </>);
    }
    case 'spacer': {
      const b = block as SpacerBlock;
      return <NumberField label="Height px" value={b.height} onChange={v => update({ height: v })} />;
    }
    case 'columns': {
      const b = block as ColumnsBlock;
      return (<>
        <TextField   label="Left width"  value={b.leftWidth} onChange={v => update({ leftWidth: v })} />
        <TextField   label="Gap"         value={b.gap}       onChange={v => update({ gap: v })} />
        <div style={{ fontSize: 11, color: '#6a99bb', marginTop: 8 }}>
          Nested blocks ({b.left.length} left, {b.right.length} right) — edit in Pure mode for full control.
        </div>
      </>);
    }
    case 'social': {
      const b = block as SocialBlock;
      const updateLink = (i: number, patch: Partial<SocialLink>) => {
        const next = b.links.map((l, j) => j === i ? { ...l, ...patch } : l);
        update({ links: next });
      };
      const addLink = () => update({ links: [...b.links, { platform: 'github' as const, url: 'https://github.com' }] });
      const removeLink = (i: number) => update({ links: b.links.filter((_, j) => j !== i) });

      return (<>
        <NumberField label="Icon size" value={b.iconSize} onChange={v => update({ iconSize: v })} />
        <ColorField  label="Color"     value={b.color}    onChange={v => update({ color: v })} />
        <SelectField<SocialBlock['align']> label="Align" value={b.align} options={['left', 'center', 'right']} onChange={v => update({ align: v })} />
        <div style={{ marginTop: 8 }}>
          {b.links.map((link, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
              <select value={link.platform} onChange={e => updateLink(i, { platform: e.target.value as SocialLink['platform'] })}
                style={{ background: '#122040', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 4, padding: '2px 6px', color: '#ddeeff', fontSize: 11, outline: 'none' }}>
                {(['twitter','linkedin','instagram','github','youtube','tiktok'] as const).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="url" value={link.url} onChange={e => updateLink(i, { url: e.target.value })}
                style={{ flex: 1, background: 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 4, padding: '2px 6px', color: '#ddeeff', fontSize: 11, outline: 'none' }} />
              <button onClick={() => removeLink(i)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}><Trash2 size={12}/></button>
            </div>
          ))}
          <button onClick={addLink} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', fontSize: 11, background: 'rgba(73,136,196,0.12)', border: '1px solid rgba(73,136,196,0.3)', borderRadius: 4, color: '#4988C4', cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={10}/> Add link
          </button>
        </div>
      </>);
    }
  }
}

// ── Sortable Block Card ───────────────────────────────────────

function SortableCard({
  block, branding, onRemove, onUpdate, onAddAfter,
}: {
  block: Block;
  branding: BrandingConfig;
  onRemove: () => void;
  onUpdate: (patch: Partial<Omit<Block, 'id' | 'type'>>) => void;
  onAddAfter: (b: Block) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [markdownExpanded, setMarkdownExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isFooter = block.type === 'footer';

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ background: '#0d2040', border: '1px solid rgba(73,136,196,0.2)', borderRadius: 10, marginBottom: 2, overflow: 'hidden' }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#091830', borderBottom: '1px solid rgba(73,136,196,0.12)' }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#2a4a6a', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <GripVertical size={14}/>
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4988C4', letterSpacing: '0.5px', textTransform: 'uppercase', flexShrink: 0 }}>{block.type}</span>
          <div style={{ flex: 1 }}/>
          <button onClick={() => setEditing(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11, background: editing ? 'rgba(73,136,196,0.25)' : 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.3)', borderRadius: 5, color: '#4988C4', cursor: 'pointer', fontFamily: 'inherit' }}>
            {editing ? <ChevronUp size={10}/> : <ChevronDown size={10}/>} Edit
          </button>
          <button onClick={onRemove} style={{ display: 'flex', alignItems: 'center', padding: '2px 6px', background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,107,107,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Trash2 size={13}/>
          </button>
        </div>

        {/* Visual preview */}
        <div style={{ padding: '10px 16px', minHeight: 32 }}>
          <BlockPreview
            block={block}
            branding={branding}
            expanded={markdownExpanded}
            onToggleExpand={() => setMarkdownExpanded(e => !e)}
          />
        </div>

        {/* Inline prop editor */}
        {editing && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(73,136,196,0.12)', background: 'rgba(73,136,196,0.04)' }}>
            <BlockPropEditor block={block} branding={branding} update={onUpdate}/>
          </div>
        )}
      </div>

      {/* Add block between cards — hidden after footer (footer must stay last) */}
      {!isFooter && (
        <AddBlockButton afterId={block.id} branding={branding} onAdd={(b) => onAddAfter(b)} />
      )}
    </div>
  );
}

// ── Main GuidedEditor ─────────────────────────────────────────

export default function GuidedEditor({ blocks, branding, slashCommands, onBlocksChange, updateBlock, addBlock, removeBlock }: Props) {
  const [slashState, setSlashState] = useState<SlashCommandState | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const moved = arrayMove(blocks, oldIdx, newIdx);
    // Enforce header stays first: if header ends up not-first, move it back
    const headerIdx = moved.findIndex(b => b.type === 'header');
    if (headerIdx !== -1 && headerIdx !== 0) {
      const header = moved.splice(headerIdx, 1)[0];
      moved.unshift(header);
    }
    // Enforce footer stays last
    const footerIdx = moved.findIndex(b => b.type === 'footer');
    if (footerIdx !== -1 && footerIdx !== moved.length - 1) {
      const footer = moved.splice(footerIdx, 1)[0];
      moved.push(footer);
    }
    onBlocksChange(moved);
  };

  // Slash command insertion for the top-level "Add block" area
  const handleSlashCommand = (cmd: SlashCommandDef, state: SlashCommandState) => {
    const text = cmd.insert(branding);
    const block = makeBlock('markdown', branding);
    (block as MarkdownBlock).content = text;
    addBlock(block);
    setSlashState(null);
    void state;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '5px 12px', background: '#0a1e3d', borderBottom: '1px solid rgba(73,136,196,0.12)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#4988C4', fontWeight: 700 }}>✦</span>
        <span style={{ fontSize: 11, color: '#6a99bb', fontWeight: 700, letterSpacing: '0.5px' }}>GUIDED MODE</span>
        <span style={{ fontSize: 11, color: '#2a4a6a', marginLeft: 'auto' }}>Drag · Edit · Add</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Only allow inserting above the first block if it is NOT a header */}
        {blocks[0]?.type !== 'header' && (
          <AddBlockButton branding={branding} onAdd={b => onBlocksChange([b, ...blocks])} />
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map(block => (
              <SortableCard
                key={block.id}
                block={block}
                branding={branding}
                onRemove={() => removeBlock(block.id)}
                onUpdate={patch => updateBlock(block.id, patch)}
                onAddAfter={b => addBlock(b, block.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {blocks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#2a4a6a', fontSize: 13 }}>
            No blocks yet. Add your first block above.
          </div>
        )}
      </div>

      {slashState && (
        <SlashPalette
          commands={slashCommands}
          state={slashState}
          onSelect={cmd => handleSlashCommand(cmd, slashState)}
        />
      )}
    </div>
  );
}
