import { useEffect, useMemo, useRef, useState } from 'react';
import { X, RefreshCw, Settings2, Search } from 'lucide-react';
import { useT, type TranslationKey } from '../lib/i18n';
import {
  fetchCdnImages, fetchCdnIdentity, loadCdnConfig, saveCdnConfig,
  type CdnConfig, type CdnImage, type CdnIdentity,
} from '../lib/cdn';

const INPUT: React.CSSProperties = {
  width: '100%', background: 'rgba(73,136,196,0.1)', border: '1px solid rgba(73,136,196,0.22)',
  borderRadius: 7, padding: '7px 10px', color: '#ddeeff', fontSize: 13, outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
};

const LABEL: React.CSSProperties = {
  color: '#5a88aa', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.7px', marginBottom: 5,
};

const ICON_BTN: React.CSSProperties = {
  background: 'none', border: 'none', color: '#6a99bb', cursor: 'pointer', padding: 4, borderRadius: 4,
  display: 'inline-flex', alignItems: 'center',
};

function errorKey(code: string): TranslationKey {
  if (code === 'missing-url')   return 'library.err.missing-url';
  if (code === 'unauthorized')  return 'library.err.unauthorized';
  if (code === 'bad-format')    return 'library.err.bad-format';
  if (code.startsWith('http-')) return 'library.err.http';
  return 'library.err.network';
}

// ── Connection form ───────────────────────────────────────────

function ConnectionForm({ config, onChange, onConnect }: {
  config: CdnConfig;
  onChange: (c: CdnConfig) => void;
  onConnect: () => void;
}) {
  const t = useT();
  const ready = config.url.trim() !== '';
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <div style={LABEL}>{t('library.url')}</div>
        <input value={config.url} onChange={e => onChange({ ...config, url: e.target.value })} style={INPUT} placeholder={t('library.urlPlaceholder')} type="url" />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <div style={LABEL}>{t('library.token')}</div>
        <input value={config.token} onChange={e => onChange({ ...config, token: e.target.value })} style={INPUT} placeholder={t('library.tokenPlaceholder')} type="password" autoComplete="off" />
      </label>
      <div style={{ fontSize: 11, color: '#5a88aa', marginBottom: 12, lineHeight: 1.5 }}>{t('library.hint')}</div>
      <button onClick={onConnect} disabled={!ready} style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: '#4988C4', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', opacity: ready ? 1 : 0.5 }}>
        {t('library.connect')}
      </button>
    </div>
  );
}

// ── Token identity line ───────────────────────────────────────

function IdentityLine({ identity }: { identity: CdnIdentity }) {
  const t = useT();
  const canRead = identity.kind === 'master' || identity.scopes.includes('assets:read');
  return (
    <div style={{ fontSize: 11, marginBottom: 10, color: canRead ? '#4d9a6e' : '#e0b45a' }}>
      {t('library.connectedAs')} {identity.name ?? identity.kind}
      {' · '}{identity.scopes.join(', ') || '—'}
      {identity.folders ? ` · ${identity.folders.join(', ')}` : ''}
      {!canRead && ` — ${t('library.needsRead')}`}
    </div>
  );
}

// ── Image grid ────────────────────────────────────────────────

function ImageGrid({ images, onSelect }: { images: CdnImage[]; onSelect: (img: CdnImage) => void }) {
  return (
    <div style={{ overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
      {images.map(img => (
        <button key={img.url} onClick={() => onSelect(img)} title={img.name} style={{
          background: 'rgba(73,136,196,0.08)', border: '1px solid rgba(73,136,196,0.18)', borderRadius: 8,
          padding: 6, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'stretch',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.25)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.08)')}
        >
          <div style={{ height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 5, overflow: 'hidden' }}>
            <img src={img.thumb} alt={img.name} loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 10, color: '#6a99bb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.name}</span>
        </button>
      ))}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────

export default function ImageLibraryModal({ onSelect, onClose }: {
  onSelect: (url: string, name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [config, setConfig]     = useState<CdnConfig>(loadCdnConfig);
  const [showConn, setShowConn] = useState(() => !loadCdnConfig().url);
  const [images, setImages]     = useState<CdnImage[]>([]);
  const [identity, setIdentity] = useState<CdnIdentity | null>(null);
  const [loading, setLoading]   = useState(() => Boolean(loadCdnConfig().url));
  const [error, setError]       = useState('');
  const [query, setQuery]       = useState('');
  const abortRef = useRef<AbortController | null>(null);

  /** Starts the requests; state is only set from callbacks, so it is safe to call from an effect. */
  const request = (cfg: CdnConfig) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    void fetchCdnIdentity(cfg, ctrl.signal).then(id => { if (!ctrl.signal.aborted) setIdentity(id); });
    fetchCdnImages(cfg, ctrl.signal)
      .then(list => { if (!ctrl.signal.aborted) setImages(list); })
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return;
        setImages([]);
        setError(e.message);
      })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
  };

  const load = (cfg: CdnConfig) => {
    setLoading(true);
    setError('');
    request(cfg);
  };

  // Auto-load once on open if a connection is already saved; focus the dialog for Escape.
  useEffect(() => {
    backdropRef.current?.focus();
    const saved = loadCdnConfig();
    if (saved.url) request(saved);
    return () => abortRef.current?.abort();
  }, []);

  const connect = () => {
    saveCdnConfig(config);
    setShowConn(false);
    load(config);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? images.filter(i => i.search.includes(q)) : images;
  }, [images, query]);

  const showEmpty = !loading && !error && !showConn && filtered.length === 0;

  return (
    <div
      ref={backdropRef}
      role="presentation"
      tabIndex={-1}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}
    >
      <div role="dialog" aria-modal="true" aria-label={t('library.title')} style={{ background: '#12253e', border: '1px solid #2a4a6a', borderRadius: 12, padding: 22, width: 560, maxWidth: '94vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ color: '#BDE8F5', fontWeight: 700, fontSize: 15 }}>{t('library.title')}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setShowConn(s => !s)} style={ICON_BTN} title={t('library.settings')} aria-label={t('library.settings')}><Settings2 size={16} /></button>
            <button onClick={() => load(config)} disabled={loading || !config.url} style={ICON_BTN} title={t('library.refresh')} aria-label={t('library.refresh')}><RefreshCw size={16} /></button>
            <button onClick={onClose} style={ICON_BTN} aria-label="Close"><X size={16} /></button>
          </div>
        </div>

        {showConn && <ConnectionForm config={config} onChange={setConfig} onConnect={connect} />}
        {identity && <IdentityLine identity={identity} />}

        {!showConn && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#5a88aa' }} />
            <input value={query} onChange={e => setQuery(e.target.value)} style={{ ...INPUT, paddingLeft: 30 }} placeholder={t('library.search')} aria-label={t('library.search')} />
          </div>
        )}

        {error && <div style={{ color: '#e07a7a', fontSize: 12, marginBottom: 10 }}>{t(errorKey(error))}{error.startsWith('http-') ? ` (${error.slice(5)})` : ''}</div>}
        {loading && <div style={{ color: '#6a99bb', fontSize: 12 }}>{t('library.loading')}</div>}
        {showEmpty && <div style={{ color: '#6a99bb', fontSize: 12 }}>{t('library.empty')}</div>}

        <ImageGrid images={filtered} onSelect={img => onSelect(img.url, img.name)} />
      </div>
    </div>
  );
}
