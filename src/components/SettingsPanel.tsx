import { useState } from 'react';
import { X } from 'lucide-react';
import type { BrandingConfig } from '../types';
import { GOOGLE_FONTS, FONT_LABELS, FONT_SIZE_MAP, HEADER_PADDING, FOOTER_PADDING } from '../constants';
import { extractFontNameFromUrl, getActiveFontFamily, getFontStacks, concentricRadius, componentRadius } from '../utils';

// Shared input style
const INPUT: React.CSSProperties = {
  width:'100%', background:'rgba(73,136,196,0.1)', border:'1px solid rgba(73,136,196,0.22)',
  borderRadius:7, padding:'7px 10px', color:'#ddeeff', fontSize:13, outline:'none',
  boxSizing:'border-box', fontFamily:'inherit',
};

const LABEL: React.CSSProperties = {
  color:'#5a88aa', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:5,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={LABEL}>{label}</div>
      {children}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={LABEL}>{label}</div>
      <div style={{ display:'flex', gap:7, alignItems:'center' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width:36, height:32, border:'none', borderRadius:6, cursor:'pointer', padding:2, background:'transparent', flexShrink:0 }}/>
        <input value={value} onChange={e => onChange(e.target.value)}
          style={{ ...INPUT, fontFamily:'monospace', flex:1 }} placeholder="#000000"/>
      </div>
    </div>
  );
}

function RadiusRow({ label, value, padding, previewBg, onChange }: {
  label:     string;
  value:     number;
  /** Element's content padding — used to compute outer CSS radius via concentric rule (0 = leaf element, no rule) */
  padding:   number;
  previewBg: string;
  onChange:  (v: number) => void;
}) {
  const outerRadius = concentricRadius(value, padding);

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
        <div style={LABEL}>{label}</div>
        <span style={{ fontSize:10, color:'#4a7890', fontFamily:'monospace' }}>
          {padding > 0 ? `inner ${value}px → outer ${outerRadius}px` : `${value}px`}
        </span>
      </div>

      {/* Preset buttons */}
      <div style={{ display:'flex', gap:6, marginBottom:8 }}>
        {[0, 4, 12, 24].map(r => (
          <button key={r} onClick={() => onChange(r)} style={{
            flex:1, padding:'5px 0', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:600,
            background: value===r ? '#1C4D8D' : 'rgba(73,136,196,0.08)',
            color:      value===r ? '#BDE8F5' : '#6a99bb',
          }}>{r===0 ? 'None' : r===4 ? 'Slight' : r===12 ? 'Mod' : 'Round'}</button>
        ))}
      </div>

      {/* Slider — controls inner radius */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <input type="range" min={0} max={32} value={value} onChange={e => onChange(Number(e.target.value))}
          style={{ flex:1, accentColor:'#4988C4' }}/>
        <span style={{ color:'#ddeeff', fontSize:12, fontFamily:'monospace', minWidth:30, textAlign:'right' }}>{value}px</span>
      </div>

      {/* Preview swatches — show outer (rendered) radius */}
      <div style={{ marginTop:8, display:'flex', gap:4 }}>
        <div style={{ flex:1, height:20, background:previewBg, borderRadius:`${outerRadius}px ${outerRadius}px 0 0`, transition:'border-radius 0.15s' }}/>
        <div style={{ flex:1, height:20, background:previewBg, borderRadius:`0 0 ${outerRadius}px ${outerRadius}px`, transition:'border-radius 0.15s' }}/>
      </div>
    </div>
  );
}

/** A component radius that either follows the global corner radius or carries its own value. */
function ComponentRadiusRow({ label, value, global, padding, previewBg, onChange }: {
  label:     string;
  value:     number | null;
  global:    number;
  padding:   number;
  previewBg: string;
  onChange:  (v: number | null) => void;
}) {
  return (
    <div style={{ marginBottom:8 }}>
      <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', color:'#ddeeff', fontSize:12, marginBottom:value === null ? 0 : 10 }}>
        <input type="checkbox" checked={value === null} onChange={e => onChange(e.target.checked ? null : global)} style={{ accentColor:'#4988C4' }}/>
        <span style={{ fontWeight:600 }}>{label}</span>
        <span style={{ marginLeft:'auto', fontSize:10, color:'#4a7890', fontFamily:'monospace' }}>
          {value === null ? `global · ${global}px` : 'custom'}
        </span>
      </label>
      {value !== null && <RadiusRow label="Corner Radius" value={value} padding={padding} previewBg={previewBg} onChange={onChange}/>}
    </div>
  );
}

/** Font for one typographic role: a family name (loaded from Google Fonts) and/or a Google Fonts URL. */
function FontRoleField({ label, name, url, placeholder, onChange }: {
  label:       string;
  name:        string;
  url:         string;
  placeholder: string;
  onChange:    (name: string, url: string) => void;
}) {
  return (
    <Field label={label}>
      <input value={name} onChange={e => onChange(e.target.value, url)} style={INPUT} placeholder={placeholder}/>
      <input value={url}
        onChange={e => onChange(extractFontNameFromUrl(e.target.value) || name, e.target.value)}
        style={{ ...INPUT, marginTop:6, fontFamily:'monospace', fontSize:11 }} placeholder="Google Fonts URL (optional, sets weights)"/>
      {url.trim() && !name.trim() && <div style={{ marginTop:5, fontSize:11, color:'#d4904a' }}>Could not detect font name — enter it above</div>}
    </Field>
  );
}

type Tab = 'identity' | 'header' | 'footer' | 'body' | 'corners';

export default function SettingsPanel({ branding, onChange, onClose, visible }: {
  branding: BrandingConfig;
  onChange: (b: BrandingConfig) => void;
  onClose:  () => void;
  visible:  boolean;
}) {
  const [tab, setTab] = useState<Tab>('identity');
  const set = (patch: Partial<BrandingConfig>) => onChange({ ...branding, ...patch });

  const tabs: { id: Tab; label: string }[] = [
    { id:'identity', label:'Identity' },
    { id:'header',   label:'Header'   },
    { id:'footer',   label:'Footer'   },
    { id:'body',     label:'Body'     },
    { id:'corners',  label:'Corners'  },
  ];

  return (
    <div style={{
      position:'fixed', right:0, top:0, bottom:0, zIndex:6000, width:340,
      background:'#0d1f3a', borderLeft:'1px solid #2a4a6a',
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition:'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      display:'flex', flexDirection:'column',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px', borderBottom:'1px solid #1e3a5a', flexShrink:0 }}>
        <span style={{ color:'#BDE8F5', fontWeight:700, fontSize:14 }}>Branding & Settings</span>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#6a99bb', cursor:'pointer', borderRadius:5, padding:4 }}>
          <X size={16}/>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #1e3a5a', flexShrink:0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 4px', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
            background:'transparent',
            color:       tab===t.id ? '#BDE8F5' : '#4a7a9a',
            borderBottom:`2px solid ${tab===t.id ? '#4988C4' : 'transparent'}`,
            transition:'color 0.15s, border-color 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:18 }}>

        {/* ── IDENTITY ─────────────────────────────────────── */}
        {tab === 'identity' && <>
          <Field label="Company Name">
            <input value={branding.companyName} onChange={e => set({ companyName:e.target.value })} style={INPUT} placeholder="Acme Corp"/>
          </Field>
          <Field label="Logo URL">
            <input value={branding.logoUrl} onChange={e => set({ logoUrl:e.target.value })} style={INPUT} placeholder="https://example.com/logo.png"/>
          </Field>
          <ColorRow label="Accent / Primary Color" value={branding.primaryColor} onChange={v => set({ primaryColor:v })}/>

          <div style={{ height:1, background:'#1e3a5a', margin:'16px 0' }}/>

          <Field label="Preset Font">
            <select value={branding.font} onChange={e => set({ font:e.target.value })} style={{ ...INPUT, cursor:'pointer' }}>
              {GOOGLE_FONTS.map(f => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
            </select>
          </Field>
          <Field label="Custom Google Font URL">
            <>
              <input value={branding.customFontUrl}
                onChange={e => {
                  const url  = e.target.value;
                  const name = extractFontNameFromUrl(url);
                  set({ customFontUrl:url, customFontName:name });
                }}
                style={INPUT} placeholder="https://fonts.googleapis.com/css2?family=..."/>
              {branding.customFontName && <div style={{ marginTop:5, fontSize:11, color:'#4d9a6e' }}>✓ Detected: {branding.customFontName}</div>}
              {branding.customFontUrl && !branding.customFontName && <div style={{ marginTop:5, fontSize:11, color:'#d4904a' }}>Could not detect font name — enter it below</div>}
            </>
          </Field>
          <Field label="Custom Font Name (override)">
            <input value={branding.customFontName} onChange={e => set({ customFontName:e.target.value })} style={INPUT} placeholder="e.g. Roboto Condensed"/>
            <div style={{ marginTop:5, fontSize:11, color:'#4a7890' }}>Without a URL, the name is loaded from Google Fonts.</div>
          </Field>

          <div style={{ height:1, background:'#1e3a5a', margin:'16px 0' }}/>
          <div style={{ ...LABEL, marginBottom:10 }}>Typography by role (empty = text font)</div>
          <FontRoleField label="Headings" name={branding.headingFontName} url={branding.headingFontUrl} placeholder="e.g. Playfair Display"
            onChange={(n, u) => set({ headingFontName:n, headingFontUrl:u })}/>
          <FontRoleField label="Quotes" name={branding.quoteFontName} url={branding.quoteFontUrl} placeholder="e.g. Lora"
            onChange={(n, u) => set({ quoteFontName:n, quoteFontUrl:u })}/>
          <FontRoleField label="Monospace (code)" name={branding.monoFontName} url={branding.monoFontUrl} placeholder="e.g. JetBrains Mono"
            onChange={(n, u) => set({ monoFontName:n, monoFontUrl:u })}/>

          <div style={{ height:1, background:'#1e3a5a', margin:'16px 0' }}/>

          <Field label="Font Size">
            <div style={{ display:'flex', gap:6 }}>
              {(['small','medium','large'] as const).map(s => (
                <button key={s} onClick={() => set({ fontSize:s })} style={{
                  flex:1, padding:'7px 0', border:'none', borderRadius:6, cursor:'pointer',
                  background: branding.fontSize===s ? '#1C4D8D' : 'rgba(73,136,196,0.08)',
                  color:      branding.fontSize===s ? '#BDE8F5' : '#6a99bb',
                  fontSize:12, fontWeight:600, textTransform:'capitalize',
                }}>{s}</button>
              ))}
            </div>
          </Field>

          {/* Swatch preview */}
          <div style={{ marginTop:16, padding:12, background:'rgba(73,136,196,0.07)', borderRadius:8, border:'1px solid rgba(73,136,196,0.18)' }}>
            <div style={{ ...LABEL, marginBottom:8 }}>Preview</div>
            <div style={{ background:branding.primaryColor, color:'#fff', padding:'7px 14px', borderRadius:6, fontSize:13, fontWeight:600, textAlign:'center', marginBottom:6 }}>
              {branding.companyName || 'Your Company'}
            </div>
            <div style={{ fontSize:11, color:'#4a7890' }}>
              {getActiveFontFamily(branding)} · {branding.fontSize} · {FONT_SIZE_MAP[branding.fontSize]}
            </div>
            <div style={{ marginTop:10, color:'#ddeeff', fontFamily:getFontStacks(branding).text, fontSize:FONT_SIZE_MAP[branding.fontSize] }}>
              <div style={{ fontFamily:getFontStacks(branding).heading, fontSize:18, fontWeight:700, marginBottom:4 }}>Heading sample</div>
              <div style={{ marginBottom:4 }}>Body text sample</div>
              <div style={{ fontFamily:getFontStacks(branding).quote, borderLeft:`3px solid ${branding.primaryColor}`, paddingLeft:8, marginBottom:4 }}>Quote sample</div>
              <code style={{ fontFamily:getFontStacks(branding).mono, fontSize:12 }}>const code = true;</code>
            </div>
          </div>
        </>}

        {/* ── HEADER ───────────────────────────────────────── */}
        {tab === 'header' && <>
          <ColorRow label="Background Color" value={branding.headerBg} onChange={v => set({ headerBg:v })}/>
          <ColorRow label="Text Color"        value={branding.headerText} onChange={v => set({ headerText:v })}/>
          <div style={{ fontSize:11, color:'#4a7890', marginBottom:8 }}>Corners are configured in the Corners tab.</div>
          {/* Live preview */}
          <div style={{ marginTop:12, borderRadius:`${concentricRadius(componentRadius(branding, 'headerRadius'), HEADER_PADDING)}px ${concentricRadius(componentRadius(branding, 'headerRadius'), HEADER_PADDING)}px 0 0`, background:branding.headerBg, padding:16, textAlign:'center', transition:'all 0.15s' }}>
            <div style={{ color:branding.headerText, fontSize:14, fontWeight:700, fontFamily:getFontStacks(branding).heading }}>{branding.companyName || 'Your Company'}</div>
            <div style={{ color:branding.headerText, fontSize:11, opacity:0.6, marginTop:2 }}>Header preview</div>
          </div>
        </>}

        {/* ── FOOTER ───────────────────────────────────────── */}
        {tab === 'footer' && <>
          <ColorRow label="Background Color" value={branding.footerBg} onChange={v => set({ footerBg:v })}/>
          <ColorRow label="Text Color"        value={branding.footerText} onChange={v => set({ footerText:v })}/>
          <div style={{ fontSize:11, color:'#4a7890', marginBottom:8 }}>Corners are configured in the Corners tab.</div>
          {/* Live preview */}
          <div style={{ marginTop:12, borderRadius:`0 0 ${concentricRadius(componentRadius(branding, 'footerRadius'), FOOTER_PADDING)}px ${concentricRadius(componentRadius(branding, 'footerRadius'), FOOTER_PADDING)}px`, background:branding.footerBg, padding:'12px 16px', textAlign:'center', transition:'all 0.15s' }}>
            <div style={{ color:branding.footerText, fontSize:12 }}>© {new Date().getFullYear()} {branding.companyName || 'Your Company'}</div>
            <div style={{ color:branding.footerText, fontSize:10, opacity:0.5, marginTop:3 }}>Built with MailForge by Eternum</div>
          </div>
        </>}

        {/* ── BODY ─────────────────────────────────────────── */}
        {tab === 'body' && <>
          <ColorRow label="Background Color" value={branding.bodyBg}   onChange={v => set({ bodyBg:v })}/>
          <ColorRow label="Text Color"        value={branding.bodyText} onChange={v => set({ bodyText:v })}/>
          <ColorRow label="Link Color"        value={branding.linkColor} onChange={v => set({ linkColor:v })}/>
          <div style={{ marginTop:12, background:branding.bodyBg, borderRadius:8, padding:16, border:'1px solid rgba(73,136,196,0.18)', transition:'all 0.15s' }}>
            <div style={{ color:branding.bodyText, fontSize:15, fontWeight:700, marginBottom:6 }}>Body preview</div>
            <div style={{ color:branding.bodyText, fontSize:13, lineHeight:1.6, marginBottom:8 }}>
              Paragraph text with an <a href="#" style={{ color:branding.linkColor, textDecoration:'underline' }} onClick={e => e.preventDefault()}>inline link</a>.
            </div>
            <div style={{ fontSize:12, color:branding.bodyText, opacity:0.6 }}>Font size: {FONT_SIZE_MAP[branding.fontSize]}</div>
          </div>
        </>}

        {/* ── CORNERS ──────────────────────────────────────── */}
        {tab === 'corners' && <>
          <RadiusRow label="Global Corner Radius" value={branding.cornerRadius} padding={0} previewBg={branding.primaryColor} onChange={v => set({ cornerRadius:v })}/>
          <div style={{ fontSize:11, color:'#4a7890', marginBottom:14 }}>
            Every component follows the global radius unless you give it its own. Header and footer use concentric corners (outer = inner + padding).
          </div>
          <div style={{ height:1, background:'#1e3a5a', margin:'4px 0 16px' }}/>
          <ComponentRadiusRow label="Header" value={branding.headerRadius} global={branding.cornerRadius} padding={HEADER_PADDING} previewBg={branding.headerBg}     onChange={v => set({ headerRadius:v })}/>
          <ComponentRadiusRow label="Footer" value={branding.footerRadius} global={branding.cornerRadius} padding={FOOTER_PADDING} previewBg={branding.footerBg}     onChange={v => set({ footerRadius:v })}/>
          <ComponentRadiusRow label="Button" value={branding.buttonRadius} global={branding.cornerRadius} padding={0}              previewBg={branding.primaryColor}  onChange={v => set({ buttonRadius:v })}/>
          <ComponentRadiusRow label="Badge"  value={branding.badgeRadius}  global={branding.cornerRadius} padding={0}              previewBg={branding.primaryColor}  onChange={v => set({ badgeRadius:v })}/>
          <ComponentRadiusRow label="Image"  value={branding.imageRadius}  global={branding.cornerRadius} padding={0}              previewBg="#6a99bb"                onChange={v => set({ imageRadius:v })}/>
        </>}

      </div>
    </div>
  );
}
