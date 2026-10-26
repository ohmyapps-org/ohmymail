import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail, Check, ExternalLink, GripVertical,
  Plus, FolderOpen, Save, Layers, Download, ChevronDown, Settings2, Languages,
} from 'lucide-react';
import { useT, useI18nStore } from './lib/i18n';

import { APP_CONFIG, DEFAULT_BRANDING } from './config/app.config';
import type { BrandingConfig, SlashCommandDef, SlashCommandState, Template } from './types';
import { BRANDING_KEY, BLOCKS_KEY, TITLE_KEY, DEFAULT_CONTENT, DIVIDER_COLOR } from './constants';
import {
  getFromStorage, setToStorage, getFontStacks, getFontUrls,
  downloadFile,
} from './utils';
import { deserializeBlocks, migrateBlocks } from './utils/blockSerializer';
import { renderBlocksToPreviewHtml, renderBlocksToEmailHtml, inlineEmailStyles, typographyCss } from './utils/blockRenderer';
import { useToasts, useMobile, useDragResize, useTemplates, useBlocks, useEditorMode } from './hooks';
import { buildSlashCommands } from './commands';

import ToastList        from './components/ToastList';
import IconPickerModal  from './components/IconPickerModal';
import TemplatesModal   from './components/TemplatesModal';
import SettingsPanel    from './components/SettingsPanel';
import ExportMenu       from './components/ExportMenu';
import PureEditor       from './components/PureEditor';
import GuidedEditor     from './components/GuidedEditor';

// ── Shared button styles ──────────────────────────────────────
const IBTN: React.CSSProperties = {
  display:'flex', alignItems:'center', justifyContent:'center',
  width:34, height:34, borderRadius:7, border:'none', cursor:'pointer',
  background:'rgba(73,136,196,0.08)', color:'#90b8d8', transition:'background 0.15s', flexShrink:0,
};
const tbtn = (active = false): React.CSSProperties => ({
  display:'flex', alignItems:'center', gap:5,
  height:34, padding:'0 10px', borderRadius:7, border:'none', cursor:'pointer',
  fontSize:13, fontWeight:500, flexShrink:0, transition:'background 0.15s',
  background: active ? 'rgba(73,136,196,0.28)' : 'rgba(73,136,196,0.08)',
  color:      active ? '#BDE8F5'               : '#90b8d8',
});

// ============================================================
// Main component
// ============================================================

export default function OhMyMail() {
  const t = useT();
  const { locale, setLocale } = useI18nStore();
  // ── State ─────────────────────────────────────────────────
  const [title,              setTitle]              = useState(t('app.untitled'));
  const [editingTitle,       setEditingTitle]       = useState(false);
  const [branding,           setBranding]           = useState<BrandingConfig>(() => ({
    ...DEFAULT_BRANDING,
    ...getFromStorage<Partial<BrandingConfig>>(BRANDING_KEY, {}),
  }));
  const [activeTab,          setActiveTab]          = useState<'editor' | 'preview'>('editor');
  const [showSettings,       setShowSettings]       = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showExportMenu,     setShowExportMenu]     = useState(false);
  const [showIconPicker,     setShowIconPicker]     = useState(false);
  const [templateDropdown,   setTemplateDropdown]   = useState(false);

  // Unused state kept for slash-palette in legacy flow; individual editors manage their own
  const [_slashState, _setSlashState]              = useState<SlashCommandState | null>(null);
  void _slashState; void _setSlashState;

  const manualTitle = { current: false };

  // ── Hooks ─────────────────────────────────────────────────
  const { toasts, addToast, dismissToast }                                               = useToasts();
  const { templates, saveTemplate, deleteTemplate, duplicateTemplate, renameTemplate }   = useTemplates();
  const isMobile                                                                         = useMobile();
  const { paneWidth, onDragStart }                                                       = useDragResize();
  const { blocks, setBlocks, addBlock, removeBlock, updateBlock }                       = useBlocks();
  const { editorMode, setEditorMode }                                                   = useEditorMode();

  // ── Derived values ────────────────────────────────────────
  const slashCommands = useMemo(() => buildSlashCommands(branding), [branding]);

  const previewHtml = useMemo(
    () => renderBlocksToPreviewHtml(blocks, branding),
    [blocks, branding],
  );

  const wordCount = useMemo(() => {
    const text = blocks.map(b => b.type === 'markdown' ? b.content : '').join(' ');
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [blocks]);

  // ── Initialisation ────────────────────────────────────────
  useEffect(() => {
    const savedTitle = getFromStorage(TITLE_KEY, '');
    if (savedTitle) setTitle(savedTitle);

    // If no blocks saved yet, load default content
    const blocksRaw = localStorage.getItem(BLOCKS_KEY);
    if (!blocksRaw) {
      setBlocks(deserializeBlocks(DEFAULT_CONTENT));
      addToast(t('toast.welcome'), 'info');
    } else {
      addToast(t('toast.draftRestored'), 'info');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-title from first heading in markdown blocks
  useEffect(() => {
    if (manualTitle.current) return;
    for (const b of blocks) {
      if (b.type === 'markdown') {
        const match = b.content.match(/^#\s+(.+)$/m);
        if (match) { setTitle(match[1].trim()); break; }
      }
    }
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist title
  useEffect(() => { setToStorage(TITLE_KEY, title); }, [title]);

  // ── Font injection ────────────────────────────────────────
  useEffect(() => {
    [
      { id:'mf-ui-font',     href:'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap' },
      { id:'mf-editor-font', href:'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap' },
    ].forEach(({ id, href }) => {
      if (!document.getElementById(id)) {
        document.head.appendChild(Object.assign(document.createElement('link'), { id, rel:'stylesheet', href }));
      }
    });
  }, []);

  // Text + heading/quote/mono fonts. Debounced so typing a family name doesn't fire a request per keystroke.
  const fontUrlsKey = getFontUrls(branding).join('\n');
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('link[data-mf-preview-font]').forEach(el => el.remove());
      fontUrlsKey.split('\n').filter(Boolean).forEach(href => {
        const link = Object.assign(document.createElement('link'), { rel:'stylesheet', href });
        link.dataset.mfPreviewFont = '';
        document.head.appendChild(link);
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [fontUrlsKey]);

  // ── Persist branding ──────────────────────────────────────
  useEffect(() => { setToStorage(BRANDING_KEY, branding); }, [branding]);

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 's')                                   { e.preventDefault(); handleSaveAsTemplate(); }
      if (e.shiftKey && (e.key === 'E' || e.key === 'e')) { e.preventDefault(); handleExportHtml(); }
      if (e.key === 'p')                                   { e.preventDefault(); handleExportPdf(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }); // no deps — captures latest closures

  // ── Close dropdowns on outside click ─────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-export-menu]')) setShowExportMenu(false);
      if (!t.closest('[data-tpl-dropdown]')) setTemplateDropdown(false);
    };
    window.addEventListener('mousedown', fn);
    return () => window.removeEventListener('mousedown', fn);
  }, []);

  // ── Template handlers ─────────────────────────────────────
  const handleSaveAsTemplate = useCallback(() => {
    const name = window.prompt(t('toast.templateName'), title);
    if (!name?.trim()) return;
    // Store as JSON-serialized blocks
    saveTemplate(name.trim(), JSON.stringify(blocks));
    addToast(`"${name.trim()}" ${t('toast.templateSaved')}`, 'success');
  }, [title, blocks, saveTemplate, addToast, t]);

  const loadTemplate = useCallback((tmpl: Template) => {
    manualTitle.current = false;
    // Try parsing as Block[] JSON first, fall back to deserializing as markdown
    try {
      const parsed = JSON.parse(tmpl.content);
      if (Array.isArray(parsed)) { setBlocks(migrateBlocks(parsed)); }
      else { setBlocks(deserializeBlocks(tmpl.content)); }
    } catch {
      setBlocks(deserializeBlocks(tmpl.content));
    }
    setTitle(tmpl.name);
    setShowTemplatesModal(false);
    setTemplateDropdown(false);
    addToast(`"${tmpl.name}" ${t('toast.templateLoaded')}`, 'info');
  }, [addToast, setBlocks, t]);

  // ── Export handlers ───────────────────────────────────────
  const handleExportHtml = useCallback(async () => {
    const raw     = renderBlocksToEmailHtml(blocks, branding, title);
    const inlined = await inlineEmailStyles(raw);
    downloadFile(inlined, 'ohmymail-export.html', 'text/html');
    addToast(t('toast.htmlExported'), 'success');
  }, [blocks, branding, title, addToast, t]);

  const handleExportMd = useCallback(() => {
    const mdContent = blocks.map(b => b.type === 'markdown' ? b.content : '').filter(Boolean).join('\n\n');
    downloadFile(`${mdContent}\n\n<!-- Built with OhMyMail by Itica Lat · Apache 2.0 -->\n`, 'ohmymail-export.md', 'text/markdown');
    addToast(t('toast.markdownExported'), 'success');
  }, [blocks, addToast, t]);

  const handleExportPdf = useCallback(() => {
    const sid = 'mf-print-css';
    let el = document.getElementById(sid) as HTMLStyleElement | null;
    if (!el) { el = document.createElement('style'); el.id = sid; document.head.appendChild(el); }
    el.textContent = `@media print {
      #mf-toolbar,#mf-editor-pane,#mf-divider,#mf-statusbar { display:none !important; }
      #mf-preview-pane { width:100% !important; }
      body { background:#fff !important; }
      .mf-email-frame { box-shadow:none !important; border-radius:0 !important; }
      #mf-print-wm { display:block !important; }
    }`;
    window.print();
    window.addEventListener('afterprint', () => { if (el) el.textContent = ''; }, { once: true });
  }, []);

  const handleLoadFile = useCallback(() => {
    const input = Object.assign(document.createElement('input'), { type:'file', accept:'.md,.txt,.json' });
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result;
          if (typeof text === 'string') {
            // Try JSON block array first
            try {
              const parsed = JSON.parse(text);
              if (Array.isArray(parsed)) { setBlocks(parsed); setTitle(file.name.replace(/\.(json)$/, '')); addToast(`${t('toast.loaded')} ${file.name}`, 'info'); return; }
            } catch { /* not JSON */ }
            setBlocks(deserializeBlocks(text));
            setTitle(file.name.replace(/\.(md|txt)$/, ''));
            addToast(`${t('toast.loaded')} ${file.name}`, 'info');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addToast, setBlocks]);

  const handleNewDoc = useCallback(() => {
    if (blocks.length > 0 && !window.confirm(t('app.startFresh'))) return;
    manualTitle.current = false;
    setBlocks(deserializeBlocks(DEFAULT_CONTENT));
    setTitle(t('app.untitled'));
    addToast(t('toast.newDocument'), 'info');
  }, [blocks, addToast, setBlocks, t]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#0F2854', color:'#F8FBFF', fontFamily:'"IBM Plex Sans",system-ui,sans-serif', WebkitFontSmoothing:'antialiased', MozOsxFontSmoothing:'grayscale', overflow:'hidden', position:'relative' }}>
      <style>{`
        * { -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
        .mf-ibtn:hover { background:rgba(73,136,196,0.22) !important; color:#BDE8F5 !important; }
        .mf-tbtn:hover { background:rgba(73,136,196,0.18) !important; color:#BDE8F5 !important; }
        @keyframes mfSlideIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* ═══ TOOLBAR ══════════════════════════════════════════ */}
      <header id="mf-toolbar" style={{ height:52, display:'flex', alignItems:'center', gap:4, padding:'0 10px', background:'#09193b', borderBottom:'1px solid rgba(73,136,196,0.22)', flexShrink:0, zIndex:200 }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:2, flexShrink:0 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#1C4D8D,#4988C4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Mail size={15} style={{ color:'#fff' }}/>
          </div>
          <span style={{ fontSize:14, fontWeight:700, color:'#F8FBFF', letterSpacing:'-0.2px', whiteSpace:'nowrap' }}>
            {APP_CONFIG.name}
          </span>
        </div>

        {/* Mode toggle */}
        <div style={{ display:'flex', gap:2, background:'rgba(73,136,196,0.1)', borderRadius:7, padding:2, marginLeft:4, flexShrink:0 }}>
          <button className="mf-tbtn" onClick={() => setEditorMode('guided')} style={tbtn(editorMode === 'guided')} title={t('mode.guidedTitle')}>
            <span style={{ fontSize: 13 }}>✦</span> {t('mode.guided')}
          </button>
          <button className="mf-tbtn" onClick={() => setEditorMode('pure')} style={tbtn(editorMode === 'pure')} title={t('mode.pureTitle')}>
            <span style={{ fontSize: 13 }}>&lt;/&gt;</span> {t('mode.pure')}
          </button>
        </div>

        {/* Title */}
        <div style={{ flex:1, display:'flex', justifyContent:'center', padding:'0 8px', minWidth:0 }}>
          {editingTitle
            ? <input value={title}
                onChange={e => { manualTitle.current = true; setTitle(e.target.value); }}
                autoFocus onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
                style={{ background:'rgba(73,136,196,0.14)', border:'1px solid rgba(73,136,196,0.4)', borderRadius:6, padding:'4px 10px', color:'#F8FBFF', fontSize:14, fontWeight:600, outline:'none', textAlign:'center', minWidth:160, maxWidth:320, fontFamily:'inherit' }}
              />
            : <button onClick={() => setEditingTitle(true)}
                style={{ background:'none', border:'none', color:'#F8FBFF', cursor:'pointer', fontSize:14, fontWeight:600, padding:'4px 8px', borderRadius:6, maxWidth:320, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                title={t('app.clickRename')}
              >
                {title} <span style={{ opacity:0.3, fontSize:11 }}>✎</span>
              </button>
          }
        </div>

        {/* Actions */}
        <div style={{ display:'flex', alignItems:'center', gap:3, flexShrink:0 }}>
          <button className="mf-ibtn" onClick={handleNewDoc}         style={IBTN} title={t('app.newDoc')}><Plus       size={15}/></button>
          <button className="mf-ibtn" onClick={handleLoadFile}       style={IBTN} title={t('app.loadFile')}><FolderOpen   size={15}/></button>
          <button className="mf-ibtn" onClick={handleSaveAsTemplate} style={IBTN} title={t('app.saveAsTemplate')}><Save size={15}/></button>

          {/* Templates dropdown */}
          <div style={{ position:'relative', flexShrink:0 }} data-tpl-dropdown>
            <button className="mf-ibtn" onClick={() => setTemplateDropdown(o => !o)}
              style={{ ...IBTN, background:templateDropdown ? 'rgba(73,136,196,0.28)' : IBTN.background }}
              title={t('app.templates')}>
              <Layers size={15}/>
            </button>
            {templateDropdown && (
              <div style={{ position:'absolute', top:'100%', right:0, marginTop:4, background:'#122040', border:'1px solid #2a4a6a', borderRadius:9, width:210, boxShadow:'0 8px 28px rgba(0,0,0,0.5)', zIndex:4000, overflow:'hidden' }}>
                {templates.length === 0
                  ? <div style={{ padding:'12px 14px', color:'#6a99bb', fontSize:12 }}>{t('app.noTemplates')}</div>
                  : templates.map(t => (
                    <button key={t.id} onClick={() => loadTemplate(t)}
                      style={{ display:'block', width:'100%', padding:'9px 14px', background:'transparent', border:'none', color:'#ddeeff', cursor:'pointer', textAlign:'left', fontSize:13, fontFamily:'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.14)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >{t.name}</button>
                  ))
                }
                <div style={{ borderTop:'1px solid #1e3a5a', padding:'7px 14px' }}>
                  <button onClick={() => { setTemplateDropdown(false); setShowTemplatesModal(true); }}
                    style={{ background:'none', border:'none', color:'#4988C4', cursor:'pointer', fontSize:12, fontWeight:600, padding:0, fontFamily:'inherit' }}>
                    {t('app.manageAll')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ width:1, height:22, background:'rgba(73,136,196,0.22)', margin:'0 2px' }}/>

          {/* Export */}
          <div style={{ position:'relative' }} data-export-menu>
            <button className="mf-tbtn" onClick={() => setShowExportMenu(o => !o)} style={tbtn(showExportMenu)} title={t('app.exportOptions')}>
              <Download size={14}/><span>{t('app.exportOptions')}</span><ChevronDown size={10}/>
            </button>
            {showExportMenu && <ExportMenu onHtml={() => { void handleExportHtml(); }} onMd={handleExportMd} onPdf={handleExportPdf} onClose={() => setShowExportMenu(false)}/>}
          </div>

          <button className="mf-ibtn" onClick={() => setShowSettings(s => !s)}
            style={{ ...IBTN, background:showSettings ? 'rgba(73,136,196,0.3)' : IBTN.background }}
            title={t('app.brandingSettings')}>
            <Settings2 size={15}/>
          </button>

          {/* Language toggle */}
          <button className="mf-ibtn" onClick={() => setLocale(locale === 'en' ? 'es' : 'en')}
            style={IBTN}
            title={locale === 'en' ? 'Español' : 'English'}>
            <Languages size={15}/>
          </button>

          {isMobile && (
            <div style={{ display:'flex', gap:2, background:'rgba(73,136,196,0.1)', borderRadius:7, padding:2, marginLeft:2 }}>
              <button className="mf-tbtn" onClick={() => setActiveTab('editor')}  style={tbtn(activeTab==='editor')}  title={t('app.editor')}><span style={{ fontSize:13 }}>✦</span></button>
              <button className="mf-tbtn" onClick={() => setActiveTab('preview')} style={tbtn(activeTab==='preview')} title={t('app.preview')}><span style={{ fontSize:13 }}>👁</span></button>
            </div>
          )}
        </div>
      </header>

      {/* ═══ PANES ════════════════════════════════════════════ */}
      <div id="mf-panes" style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* Editor pane */}
        {(!isMobile || activeTab === 'editor') && (
          <div id="mf-editor-pane" style={{ width:isMobile ? '100%' : `${paneWidth}%`, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:isMobile ? 'none' : '1px solid rgba(73,136,196,0.18)', minWidth:0 }}>
            {editorMode === 'pure'
              ? <PureEditor
                  blocks={blocks}
                  branding={branding}
                  slashCommands={slashCommands as SlashCommandDef[]}
                  onBlocksChange={setBlocks}
                />
              : <GuidedEditor
                  blocks={blocks}
                  branding={branding}
                  slashCommands={slashCommands as SlashCommandDef[]}
                  onBlocksChange={setBlocks}
                  updateBlock={updateBlock}
                  addBlock={addBlock}
                  removeBlock={removeBlock}
                />
            }
          </div>
        )}

        {/* Divider */}
        {!isMobile && (
          <div id="mf-divider" onMouseDown={onDragStart}
            style={{ width:5, flexShrink:0, cursor:'col-resize', background:'rgba(73,136,196,0.06)', display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s', zIndex:10 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.28)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.06)')}
          >
            <GripVertical size={11} style={{ color:'#2a4a6a', pointerEvents:'none' }}/>
          </div>
        )}

        {/* Preview */}
        {(!isMobile || activeTab === 'preview') && (
          <div id="mf-preview-pane" style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
            <div style={{ padding:'5px 12px', background:'#0a1e3d', borderBottom:'1px solid rgba(73,136,196,0.12)', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
              <span style={{ fontSize:12, color:'#4988C4' }}>👁</span>
              <span style={{ fontSize:11, color:'#4988C4', fontWeight:700, letterSpacing:'0.5px' }}>{t('preview.label')}</span>
              <span style={{ fontSize:11, color:'#2a4a6a', marginLeft:'auto' }}>{t('preview.frame')}</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', background:'#091428', padding:'24px 16px' }}>
              <div className="mf-email-frame" style={{ maxWidth:600, margin:'0 auto', background:branding.bodyBg, borderRadius:10, boxShadow:'0 8px 40px rgba(0,0,0,0.45)', overflow:'hidden', minHeight:200 }}>
                <div
                  style={{ padding:'28px 36px', fontFamily:getFontStacks(branding).text, color:branding.bodyText, lineHeight:1.7, background:branding.bodyBg }}
                  dangerouslySetInnerHTML={{ __html: `
                    <style>
                      .mf-b h1{color:${branding.bodyText};font-size:26px;margin:0 0 16px}
                      .mf-b h2{color:${branding.bodyText};font-size:20px;margin:24px 0 12px;opacity:0.85}
                      .mf-b h3{color:${branding.bodyText};font-size:16px;margin:18px 0 8px;opacity:0.75}
                      .mf-b p{margin:0 0 14px;color:${branding.bodyText}}
                      .mf-b a{color:${branding.linkColor};text-decoration:underline}
                      .mf-b hr{border:none;border-top:1px solid ${DIVIDER_COLOR};margin:22px 0}
                      .mf-b img{max-width:100%;height:auto}
                      .mf-b blockquote{border-left:4px solid ${branding.linkColor};margin:16px 0;padding:10px 16px;background:rgba(73,136,196,0.07);border-radius:0 6px 6px 0}
                      .mf-b code{background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:3px;font-size:12px}
                      .mf-b pre{background:#1a1a2e;color:#c8dff5;padding:16px;border-radius:8px;overflow-x:auto;margin:0 0 16px}
                      .mf-b pre code{background:none;color:inherit;padding:0;font-size:13px}
                      .mf-b ul,.mf-b ol{margin:0 0 14px;padding-left:22px}.mf-b li{margin-bottom:5px;color:${branding.bodyText}}
                      .mf-b table{border-collapse:collapse;width:100%;margin-bottom:14px}
                      .mf-b th,.mf-b td{border:1px solid rgba(0,0,0,0.1);padding:7px 11px;text-align:left;color:${branding.bodyText}}
                      .mf-b th{background:rgba(0,0,0,0.04);font-weight:600}
                      .mf-b strong{font-weight:700}.mf-b em{font-style:italic}
                      ${typographyCss(branding, '.mf-b')}
                    </style>
                    <div class="mf-b">${previewHtml}</div>
                  ` }}
                />
                <div id="mf-print-wm" style={{ display:'none', padding:'10px 20px', borderTop:'1px solid #e8edf5', textAlign:'center', fontSize:11, color:'#aab8c8', background:'#f8fafc' }}>
                  Built with OhMyMail by Itica Lat · Apache 2.0
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ STATUS BAR ═══════════════════════════════════════ */}
      <footer id="mf-statusbar" style={{ height:26, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 14px', background:'#06122a', borderTop:'1px solid rgba(73,136,196,0.18)', flexShrink:0, fontSize:11 }}>
        <span style={{ color:'#3a5a7a' }}>{wordCount} {wordCount === 1 ? t('status.word') : t('status.words')} · {blocks.length} {blocks.length !== 1 ? t('status.blocks') : t('status.block')}</span>
        <span style={{ color:'#3d9a6a', display:'flex', alignItems:'center', gap:4 }}>
          <Check size={10}/> {t('status.autoSaved')}
        </span>
        <a href={APP_CONFIG.github} target="_blank" rel="noopener noreferrer" style={{ color:'#4988C4', textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
          <ExternalLink size={10}/> {APP_CONFIG.name}
        </a>
      </footer>

      {/* ═══ OVERLAYS ══════════════════════════════════════════ */}
      {showIconPicker && (
        <IconPickerModal onSelect={() => setShowIconPicker(false)} onClose={() => setShowIconPicker(false)}/>
      )}
      {showTemplatesModal && (
        <TemplatesModal
          templates={templates}
          onLoad={loadTemplate}
          onSave={() => { const n = window.prompt(t('toast.templateName'), title); if (n?.trim()) { saveTemplate(n.trim(), JSON.stringify(blocks)); addToast(`"${n.trim()}" ${t('toast.templateSaved')}`, 'success'); } }}
          onDelete={deleteTemplate}
          onDuplicate={duplicateTemplate}
          onRename={renameTemplate}
          onClose={() => setShowTemplatesModal(false)}
        />
      )}
      <SettingsPanel branding={branding} onChange={setBranding} onClose={() => setShowSettings(false)} visible={showSettings}/>
      <ToastList toasts={toasts} onDismiss={dismissToast}/>
    </div>
  );
}
