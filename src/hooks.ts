import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block, BlockId, Template, Toast } from './types';
import { AUTOSAVE_KEY, BLOCKS_KEY, EDITOR_MODE_KEY, TEMPLATES_KEY, TITLE_KEY } from './constants';
import { generateId, getFromStorage, setToStorage } from './utils';
import { deserializeBlocks, migrateBlocks } from './utils/blockSerializer';

// ── Autosave ──────────────────────────────────────────────────

export type SaveStatus = 'saved' | 'unsaved';

export function useAutosave(content: string, title: string) {
  const [status, setStatus]     = useState<SaveStatus>('saved');
  const [savedAgo, setSavedAgo] = useState(0);
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedAt = useRef(Date.now());

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setStatus('unsaved');
    timer.current = setTimeout(() => {
      setToStorage(AUTOSAVE_KEY, content);
      setToStorage(TITLE_KEY, title);
      savedAt.current = Date.now();
      setStatus('saved');
      setSavedAgo(0);
    }, 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [content, title]);

  useEffect(() => {
    if (status !== 'saved') return;
    const iv = setInterval(() => setSavedAgo(Math.floor((Date.now() - savedAt.current) / 1000)), 5000);
    return () => clearInterval(iv);
  }, [status]);

  return { status, savedAgo };
}

// ── Mobile detection ──────────────────────────────────────────

export function useMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < breakpoint);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);
  return isMobile;
}

// ── Pane drag-resize ──────────────────────────────────────────

export function useDragResize(initial = 50) {
  const [paneWidth, setPaneWidth] = useState(initial);
  const isDragging = useRef(false);
  const origin     = useRef({ x: 0, width: initial });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const el = document.getElementById('mf-panes');
      if (!el) return;
      const delta = (e.clientX - origin.current.x) / el.getBoundingClientRect().width;
      setPaneWidth(Math.min(75, Math.max(25, origin.current.width + delta * 100)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    origin.current = { x: e.clientX, width: paneWidth };
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return { paneWidth, onDragStart };
}

// ── Toasts ────────────────────────────────────────────────────

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = generateId();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

// ── Template CRUD ─────────────────────────────────────────────

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(() =>
    getFromStorage<Template[]>(TEMPLATES_KEY, [])
  );

  const persist = useCallback((next: Template[]) => {
    setTemplates(next);
    setToStorage(TEMPLATES_KEY, next);
  }, []);

  const saveTemplate = useCallback((name: string, content: string) => {
    const t: Template = { id: generateId(), name, content, createdAt: Date.now(), updatedAt: Date.now() };
    persist([...templates, t]);
  }, [templates, persist]);

  const deleteTemplate = useCallback((id: string) => {
    persist(templates.filter(t => t.id !== id));
  }, [templates, persist]);

  const duplicateTemplate = useCallback((t: Template) => {
    const dup: Template = { ...t, id: generateId(), name: `${t.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    persist([...templates, dup]);
  }, [templates, persist]);

  const renameTemplate = useCallback((id: string, name: string) => {
    persist(templates.map(t => t.id === id ? { ...t, name, updatedAt: Date.now() } : t));
  }, [templates, persist]);

  return { templates, saveTemplate, deleteTemplate, duplicateTemplate, renameTemplate };
}

// ── Block state management ────────────────────────────────────

function loadInitialBlocks(): Block[] {
  // Try new format first (JSON array stored under BLOCKS_KEY)
  const raw = localStorage.getItem(BLOCKS_KEY);
  if (raw) {
    if (raw.trim().startsWith('[')) {
      try { return migrateBlocks(JSON.parse(raw) as Block[]); } catch { /* fall through */ }
    }
    // Unlikely but handle plain string migration
    return deserializeBlocks(raw);
  }

  // Fall back to legacy autosave key (plain markdown string)
  const legacy = localStorage.getItem(AUTOSAVE_KEY);
  if (legacy) {
    // Remove JSON quotes if it was stored as JSON string
    const str = (() => {
      try { const p = JSON.parse(legacy); return typeof p === 'string' ? p : legacy; } catch { return legacy; }
    })();
    return deserializeBlocks(str);
  }

  return [];
}

type UpdateBlockPatch<T extends Block> = Partial<Omit<T, 'id' | 'type'>>;

export function useBlocks() {
  const [blocks, setBlocksRaw] = useState<Block[]>(loadInitialBlocks);

  // Persist to localStorage whenever blocks change
  const setBlocks = useCallback((next: Block[] | ((prev: Block[]) => Block[])) => {
    setBlocksRaw(prev => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      setToStorage(BLOCKS_KEY, resolved);
      return resolved;
    });
  }, []);

  const addBlock = useCallback((block: Block, afterId?: BlockId) => {
    setBlocks(prev => {
      if (!afterId) return [...prev, block];
      const idx = prev.findIndex(b => b.id === afterId);
      if (idx === -1) return [...prev, block];
      return [...prev.slice(0, idx + 1), block, ...prev.slice(idx + 1)];
    });
  }, [setBlocks]);

  const removeBlock = useCallback((id: BlockId) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, [setBlocks]);

  const moveBlock = useCallback((id: BlockId, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }, [setBlocks]);

  function updateBlock<T extends Block>(id: BlockId, patch: UpdateBlockPatch<T>): void {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      // Spread produces a new object (React Compiler compatible)
      return { ...b, ...patch } as Block;
    }));
  }

  return { blocks, setBlocks, addBlock, removeBlock, moveBlock, updateBlock };
}

// ── Editor mode ───────────────────────────────────────────────

export function useEditorMode() {
  const [editorMode, setEditorModeRaw] = useState<'pure' | 'guided'>(() => {
    const saved = localStorage.getItem(EDITOR_MODE_KEY);
    return (saved === 'pure' || saved === 'guided') ? saved : 'guided';
  });

  const setEditorMode = useCallback((mode: 'pure' | 'guided') => {
    setEditorModeRaw(mode);
    localStorage.setItem(EDITOR_MODE_KEY, mode);
  }, []);

  return { editorMode, setEditorMode };
}
