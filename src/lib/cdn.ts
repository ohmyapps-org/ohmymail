import { getFromStorage, setToStorage } from '../utils';
import { CDN_KEY } from '../constants';

export interface CdnConfig {
  /** Endpoint that lists the library (GET, JSON). */
  url: string;
  /** Sent as `Authorization: Bearer <token>`. Empty = no auth header. */
  token: string;
}

export interface CdnImage {
  /** Absolute, publicly reachable URL: this is what ends up in the email. */
  url: string;
  name: string;
  thumb: string;
  /** Lowercased filename + title + tags, for the picker search box. */
  search: string;
}

export const EMPTY_CDN_CONFIG: CdnConfig = { url: '', token: '' };

export function loadCdnConfig(): CdnConfig {
  return { ...EMPTY_CDN_CONFIG, ...getFromStorage<Partial<CdnConfig>>(CDN_KEY, {}) };
}

export function saveCdnConfig(config: CdnConfig): void {
  setToStorage(CDN_KEY, config);
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i;

function pickString(o: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v) return v;
  }
  return '';
}

function toImage(entry: unknown, base: string): CdnImage | null {
  const raw = typeof entry === 'string'
    ? { url: entry }
    : entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
  if (!raw) return null;

  const rel = pickString(raw, ['url', 'src', 'href', 'publicUrl', 'public_url', 'link']);
  if (!rel) return null;

  let url: string;
  try { url = new URL(rel, base).toString(); } catch { return null; }

  const thumbRel = pickString(raw, ['thumb', 'thumbnail', 'thumbnailUrl', 'preview']);
  let thumb = url;
  if (thumbRel) { try { thumb = new URL(thumbRel, base).toString(); } catch { /* keep url */ } }

  const file = pickString(raw, ['filename', 'fileName', 'name', 'key'])
    || decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? url);
  const title = pickString(raw, ['title']);
  const tags = Array.isArray(raw.tags) ? raw.tags.filter((t): t is string => typeof t === 'string') : [];

  // Keep only images when the entry carries a type, or when the URL has an image extension.
  const type = pickString(raw, ['type', 'mime', 'mimeType', 'contentType']);
  if (type ? !type.startsWith('image') && type !== 'file' : !IMAGE_EXT.test(url)) return null;

  return { url, name: title || file, thumb, search: [file, title, ...tags].join(' ').toLowerCase() };
}

/**
 * cdn-panel convenience: a bare host (https://host/) becomes /api/assets, and the
 * image-only / max-page defaults are added unless the URL already sets them.
 */
export function normalizeEndpoint(raw: string): string {
  const u = new URL(raw.trim());
  if (u.pathname === '/' || u.pathname === '') u.pathname = '/api/assets';
  if (u.pathname.replace(/\/+$/, '') === '/api/assets') {
    if (!u.searchParams.has('folder')) u.searchParams.set('folder', 'images');
    if (!u.searchParams.has('limit'))  u.searchParams.set('limit', '500');
  }
  return u.toString();
}

export interface CdnIdentity {
  name: string | null;
  kind: string;
  scopes: string[];
  folders: string[] | null;
}

/** cdn-panel only: who the token is (`GET /api/me`). Returns null for any other CDN or on failure. */
export async function fetchCdnIdentity(config: CdnConfig, signal?: AbortSignal): Promise<CdnIdentity | null> {
  try {
    const u = new URL(normalizeEndpoint(config.url));
    if (!u.pathname.startsWith('/api/assets')) return null;
    const res = await fetch(`${u.origin}/api/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${config.token.trim()}` },
      signal,
    });
    if (!res.ok) return null;
    const d = await res.json() as Partial<CdnIdentity>;
    return {
      name: d.name ?? null,
      kind: String(d.kind ?? ''),
      scopes: Array.isArray(d.scopes) ? d.scopes : [],
      folders: Array.isArray(d.folders) ? d.folders : null,
    };
  } catch {
    return null;
  }
}

/**
 * GET the library endpoint with a Bearer token.
 * Accepts: an array, or an object wrapping one under items / files / images / data / results.
 * Each entry: a URL string, or an object with url|src|href|publicUrl (+ optional name, thumb, type).
 */
export async function fetchCdnImages(config: CdnConfig, signal?: AbortSignal): Promise<CdnImage[]> {
  if (!config.url.trim()) throw new Error('missing-url');
  let url: string;
  try { url = normalizeEndpoint(config.url); } catch { throw new Error('missing-url'); }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (config.token.trim()) headers.Authorization = `Bearer ${config.token.trim()}`;

  const res = await fetch(url, { headers, signal });
  if (res.status === 401 || res.status === 403) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`http-${res.status}`);

  const data: unknown = await res.json();
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ['items', 'files', 'images', 'data', 'results']
          .map(k => (data as Record<string, unknown>)[k])
          .find(Array.isArray) as unknown[] | undefined
      : undefined;
  if (!list) throw new Error('bad-format');

  return list.map(e => toImage(e, url)).filter((i): i is CdnImage => i !== null);
}
