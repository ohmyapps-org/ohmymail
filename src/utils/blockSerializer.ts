import { nanoid } from 'nanoid';
import type {
  Block, BlockId, BlockType,
  MarkdownBlock, HeaderBlock, FooterBlock, ImageBlock,
  IconBlock, FontBlock, SocialBlock, InlineBlock, SocialLink,
} from '../types';
import { DIVIDER_COLOR } from '../constants';
import { normalizeHex } from '../utils';

// ── Serializer ────────────────────────────────────────────────

function serializeProps(block: Omit<Block, 'id' | 'type'>): string {
  return Object.entries(block)
    // undefined = "follow the branding theme"; leave the key out so it round-trips as inherited
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${JSON.stringify(v)}`;
      if (typeof v === 'string') return `${k}: "${v}"`;
      return `${k}: ${String(v)}`;
    })
    .join('\n');
}

export function serializeBlocks(blocks: Block[]): string {
  return blocks.map(block => {
    if (block.type === 'markdown') {
      return (block as MarkdownBlock).content;
    }
    const { id: _id, type, ...rest } = block;
    return `:::${type}\n${serializeProps(rest as Omit<Block, 'id' | 'type'>)}\n:::`;
  }).join('\n\n');
}

// ── Deserializer ──────────────────────────────────────────────

function newId(): BlockId { return nanoid(8); }

function parseValue(v: string): string | number | boolean {
  const trimmed = v.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  if (!isNaN(Number(trimmed)) && trimmed !== '') return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
}

function parseProps(lines: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();
    if (rawVal.startsWith('[') || rawVal.startsWith('{')) {
      try { result[key] = JSON.parse(rawVal); } catch { result[key] = rawVal; }
    } else {
      result[key] = parseValue(rawVal);
    }
  }
  return result;
}

/** Optional string prop: absent in the source means "inherit from the theme". */
function optString(v: unknown): string | undefined {
  return v === undefined ? undefined : String(v);
}

/** Normalizes legacy persisted data (e.g. rgba() divider colors) to the current schema. */
export function migrateBlocks(blocks: Block[]): Block[] {
  return blocks.map(b => b.type === 'divider'
    ? { ...b, color: normalizeHex(b.color, DIVIDER_COLOR) }
    : b);
}

function buildBlock(type: BlockType, props: Record<string, unknown>): Block {
  const id = newId();

  switch (type) {
    case 'header':
      return {
        id, type: 'header',
        logoUrl:   String(props.logoUrl ?? ''),
        title:     optString(props.title),
        bg:        optString(props.bg),
        textColor: optString(props.textColor),
        height:    Number(props.height ?? 80),
        radius:    optString(props.radius),
        align:     (props.align as HeaderBlock['align']) ?? 'center',
      };
    case 'footer':
      return {
        id, type: 'footer',
        bg:        optString(props.bg),
        text:      String(props.text ?? ''),
        textColor: optString(props.textColor),
        radius:    optString(props.radius),
        align:     props.align as FooterBlock['align'],
      };
    case 'badge':
      return {
        id, type: 'badge',
        label:    String(props.label    ?? 'Badge'),
        color:    String(props.color    ?? '#1D4ED8'),
        bg:       String(props.bg       ?? '#EFF6FF'),
        radius:   optString(props.radius),
        fontSize: String(props.fontSize ?? '12px'),
      };
    case 'divider':
      return {
        id, type: 'divider',
        color:     normalizeHex(String(props.color ?? DIVIDER_COLOR), DIVIDER_COLOR),
        thickness: Number(props.thickness ?? 1),
        margin:    String(props.margin    ?? '24px 0'),
      };
    case 'image':
      return {
        id, type: 'image',
        src:    String(props.src    ?? ''),
        alt:    String(props.alt    ?? ''),
        width:  String(props.width  ?? '100%'),
        align:  (props.align as ImageBlock['align']) ?? 'center',
        radius: optString(props.radius),
      };
    case 'button':
      return {
        id, type: 'button',
        label:    String(props.label    ?? 'Click Here'),
        href:     String(props.href     ?? '#'),
        bg:       String(props.bg       ?? '#4988C4'),
        color:    String(props.color    ?? '#ffffff'),
        radius:   optString(props.radius),
        fontSize: String(props.fontSize ?? '15px'),
      };
    case 'icon':
      return {
        id, type: 'icon',
        name:  String(props.name  ?? 'star'),
        size:  Number(props.size  ?? 24),
        color: String(props.color ?? 'currentColor'),
        align: (props.align as IconBlock['align']) ?? 'center',
      };
    case 'font':
      return {
        id, type: 'font',
        family: String(props.family ?? 'Inter'),
        url:    String(props.url    ?? ''),
        target: (props.target as FontBlock['target']) ?? 'all',
        size:   String(props.size   ?? '16px'),
        weight: String(props.weight ?? '400'),
      };
    case 'spacer':
      return {
        id, type: 'spacer',
        height: Number(props.height ?? 24),
      };
    case 'columns': {
      const left  = (props.left  as InlineBlock[] | undefined) ?? [];
      const right = (props.right as InlineBlock[] | undefined) ?? [];
      return {
        id, type: 'columns',
        left,
        right,
        gap:       String(props.gap       ?? '24px'),
        leftWidth: String(props.leftWidth ?? '50%'),
      };
    }
    case 'social': {
      const links = (props.links as SocialLink[] | undefined) ?? [];
      return {
        id, type: 'social',
        links,
        iconSize: Number(props.iconSize ?? 24),
        color:    String(props.color    ?? '#4988C4'),
        align:    (props.align as SocialBlock['align']) ?? 'center',
      };
    }
    case 'markdown':
    default:
      return { id, type: 'markdown', content: '' };
  }
}

const KNOWN_BLOCK_TYPES = new Set<BlockType>([
  'markdown', 'header', 'footer', 'badge', 'divider',
  'image', 'button', 'icon', 'font', 'spacer', 'columns', 'social',
]);

export function deserializeBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  // Split on fence markers, preserving the delimiter info
  const fenceRegex = /^:::(\w+)\s*$([\s\S]*?)^:::\s*$/gm;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(raw)) !== null) {
    // Markdown content before this fence
    const before = raw.slice(lastIndex, match.index);
    if (before.trim()) {
      // Split on double newlines to create separate markdown blocks
      const paragraphs = before.split(/\n{2,}/);
      for (const para of paragraphs) {
        if (para.trim()) {
          blocks.push({ id: newId(), type: 'markdown', content: para.trim() });
        }
      }
    }
    lastIndex = match.index + match[0].length;

    const typeName  = match[1] as BlockType;
    const bodyLines = match[2].split('\n').filter(l => l.trim());
    const props     = parseProps(bodyLines);

    if (KNOWN_BLOCK_TYPES.has(typeName)) {
      blocks.push(buildBlock(typeName, props));
    } else {
      // Unknown type → graceful degradation to markdown
      blocks.push({ id: newId(), type: 'markdown', content: match[0] });
    }
  }

  // Trailing markdown after last fence
  const tail = raw.slice(lastIndex);
  if (tail.trim()) {
    const paragraphs = tail.split(/\n{2,}/);
    for (const para of paragraphs) {
      if (para.trim()) {
        blocks.push({ id: newId(), type: 'markdown', content: para.trim() });
      }
    }
  }

  // If no blocks produced, wrap entire input as a single markdown block
  if (blocks.length === 0 && raw.trim()) {
    blocks.push({ id: newId(), type: 'markdown', content: raw.trim() });
  }

  return blocks;
}
