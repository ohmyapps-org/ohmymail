import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block, BrandingConfig, SlashCommandDef, SlashCommandState } from '../types';
import { serializeBlocks, deserializeBlocks } from '../utils/blockSerializer';
import { getCaretCoordinates, fuzzyMatch } from '../utils';
import SlashPalette from './SlashPalette';
import IconPickerModal from './IconPickerModal';
import { nanoid } from 'nanoid';
import { useT } from '../lib/i18n';

interface Props {
  blocks: Block[];
  branding: BrandingConfig;
  slashCommands: SlashCommandDef[];
  onBlocksChange: (blocks: Block[]) => void;
}

export default function PureEditor({ blocks, branding, slashCommands, onBlocksChange }: Props) {
  const t = useT();
  const [localValue,      setLocalValue]      = useState(() => serializeBlocks(blocks));
  const [slashState,      setSlashState]       = useState<SlashCommandState | null>(null);
  const [showIconPicker,  setShowIconPicker]   = useState(false);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const lineNumRef        = useRef<HTMLDivElement>(null);
  const pendingIconInsert = useRef<{ startIndex: number } | null>(null);
  const debounceTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track when blocks change externally (mode switch) to sync textarea
  const lastExternal      = useRef('');

  // Sync textarea when blocks change from outside (e.g. mode switch)
  useEffect(() => {
    const serialized = serializeBlocks(blocks);
    if (serialized !== lastExternal.current) {
      lastExternal.current = serialized;
      setLocalValue(serialized);
    }
  }, [blocks]);

  const syncLineScroll = useCallback(() => {
    if (textareaRef.current && lineNumRef.current)
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setLocalValue(val);

    // Debounce deserialization by 300ms
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const parsed = deserializeBlocks(val);
      lastExternal.current = val;
      onBlocksChange(parsed);
    }, 300);

    // Slash command detection
    const before    = val.slice(0, pos);
    const lastSlash = before.lastIndexOf('/');
    if (lastSlash !== -1) {
      const prev        = lastSlash > 0 ? before[lastSlash - 1] : '\n';
      const atWordStart = ['\n', ' ', '\t'].includes(prev) || lastSlash === 0;
      const query       = before.slice(lastSlash + 1);
      if (atWordStart && !query.includes('\n') && query.length <= 20) {
        const taRect = e.target.getBoundingClientRect();
        const caret  = getCaretCoordinates(e.target, lastSlash);
        setSlashState({ query, startIndex: lastSlash, x: taRect.left + caret.left, y: taRect.top + caret.top - e.target.scrollTop + caret.height, selectedIndex: 0 });
        return;
      }
    }
    setSlashState(null);
  }, [onBlocksChange]);

  const insertAtCursor = useCallback((text: string, startIndex: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const next = `${localValue.slice(0, startIndex)}${text}\n${localValue.slice(ta.selectionStart)}`;
    setLocalValue(next);
    setSlashState(null);
    // Re-deserialize immediately
    const parsed = deserializeBlocks(next);
    lastExternal.current = next;
    onBlocksChange(parsed);
    requestAnimationFrame(() => {
      const p = startIndex + text.length + 1;
      ta.selectionStart = ta.selectionEnd = p;
      ta.focus();
    });
  }, [localValue, onBlocksChange]);

  const insertCommand = useCallback((cmd: SlashCommandDef, state: SlashCommandState) => {
    if (cmd.special === 'icon-picker') {
      pendingIconInsert.current = { startIndex: state.startIndex };
      setSlashState(null);
      setShowIconPicker(true);
      return;
    }
    insertAtCursor(cmd.insert(branding), state.startIndex);
  }, [branding, insertAtCursor]);

  const handleIconPicked = useCallback((iconName: string) => {
    setShowIconPicker(false);
    if (!pendingIconInsert.current) return;
    const text = `<lucide-icon name="${iconName}" />`;
    insertAtCursor(text, pendingIconInsert.current.startIndex);
    pendingIconInsert.current = null;
  }, [insertAtCursor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashState) {
      const filtered = slashCommands.filter(c => fuzzyMatch(slashState.query, `${c.label} ${c.description}`)).slice(0, 8);
      const total    = Math.max(filtered.length, 1);
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashState(s => s ? { ...s, selectedIndex: (s.selectedIndex + 1) % total } : null); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashState(s => s ? { ...s, selectedIndex: (s.selectedIndex - 1 + total) % total } : null); return; }
      if (e.key === 'Enter')     { e.preventDefault(); const cmd = filtered[slashState.selectedIndex]; if (cmd) insertCommand(cmd, slashState); return; }
      if (e.key === 'Escape')    { e.preventDefault(); setSlashState(null); return; }
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const s = ta.selectionStart;
      const next = localValue.slice(0, s) + '  ' + localValue.slice(ta.selectionEnd);
      setLocalValue(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  }, [slashState, slashCommands, localValue, insertCommand]);

  // Highlighted overlay content: color ::: fences purple
  const highlightedContent = localValue.replace(
    /(^:::(\w+)$|^:::$)/gm,
    '<span style="color:#7C3AED;font-weight:600;">$1</span>'
  );

  const lines = localValue.split('\n');

  // Cleanup timer on unmount
  useEffect(() => () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); }, []);

  // Prevent unused warning — nanoid is imported for potential use in snippet generation
  void nanoid;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '5px 12px', background: '#0a1e3d', borderBottom: '1px solid rgba(73,136,196,0.12)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#4988C4', fontWeight: 700 }}>&lt;/&gt;</span>
        <span style={{ fontSize: 11, color: '#6a99bb', fontWeight: 700, letterSpacing: '0.5px' }}>{t('pure.mode')}</span>
        <span style={{ fontSize: 11, color: '#2a4a6a', marginLeft: 'auto' }}>{t('pure.hint')}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
        {/* Line numbers */}
        <div ref={lineNumRef} style={{ width: 42, flexShrink: 0, overflowY: 'hidden', background: '#091830', borderRight: '1px solid rgba(73,136,196,0.1)', color: '#2a4a6a', fontFamily: '"IBM Plex Mono",monospace', fontSize: 12, lineHeight: '22px', paddingTop: 16, userSelect: 'none', textAlign: 'right' }}>
          {lines.map((_, i) => <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>)}
        </div>

        {/* Syntax highlight overlay + textarea stack */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Highlight div (behind textarea) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              padding: 16, fontFamily: '"IBM Plex Mono",monospace', fontSize: 13,
              lineHeight: '22px', color: 'transparent', whiteSpace: 'pre-wrap',
              wordWrap: 'break-word', tabSize: 2, zIndex: 1, overflowY: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
          {/* Transparent textarea on top */}
          <textarea
            ref={textareaRef}
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={syncLineScroll}
            spellCheck={false}
            aria-label={t('pure.ariaLabel')}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              resize: 'none', border: 'none', outline: 'none',
              background: '#0c1d38', color: '#b8d4ee',
              fontFamily: '"IBM Plex Mono",monospace', fontSize: 13,
              lineHeight: '22px', padding: 16, overflowY: 'auto',
              whiteSpace: 'pre-wrap', wordWrap: 'break-word', tabSize: 2, zIndex: 2,
            }}
          />
        </div>
      </div>

      {slashState && (
        <SlashPalette
          commands={slashCommands}
          state={slashState}
          onSelect={cmd => insertCommand(cmd, slashState)}
        />
      )}
      {showIconPicker && (
        <IconPickerModal onSelect={handleIconPicked} onClose={() => setShowIconPicker(false)} />
      )}
    </div>
  );
}
