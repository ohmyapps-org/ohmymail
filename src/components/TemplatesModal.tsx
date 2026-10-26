import { useState } from 'react';
import { X, Plus, Pencil, Copy, Trash2, Layers } from 'lucide-react';
import type { Template } from '../types';
import { useT } from '../lib/i18n';

export default function TemplatesModal({ templates, onLoad, onSave, onDelete, onDuplicate, onRename, onClose }: {
  templates:   Template[];
  onLoad:      (t: Template) => void;
  onSave:      () => void;
  onDelete:    (id: string) => void;
  onDuplicate: (t: Template) => void;
  onRename:    (id: string, name: string) => void;
  onClose:     () => void;
}) {
  const t = useT();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal,  setRenameVal]  = useState('');

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:9000, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#0e1f3a', border:'1px solid #2a4a6a', borderRadius:12, width:500, maxWidth:'90vw', maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', borderBottom:'1px solid #1e3a5a' }}>
          <div>
            <div style={{ color:'#BDE8F5', fontWeight:700, fontSize:16 }}>{t('templates.title')}</div>
            <div style={{ color:'#6a99bb', fontSize:12, marginTop:2 }}>{templates.length} {t('templates.saved')}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onSave} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', background:'#1C4D8D', border:'none', borderRadius:7, color:'#BDE8F5', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              <Plus size={13}/> {t('templates.saveCurrent')}
            </button>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#6a99bb', cursor:'pointer', padding:4 }}>
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:'auto', padding:16 }}>
          {templates.length === 0 ? (
            <div style={{ color:'#6a99bb', textAlign:'center', padding:'48px 24px' }}>
              <Layers size={36} style={{ margin:'0 auto 12px', display:'block', opacity:0.35 }}/>
              <div style={{ fontWeight:600, fontSize:14 }}>{t('templates.noTemplates')}</div>
              <div style={{ marginTop:6, opacity:0.7, fontSize:13 }}>{t('templates.noTemplatesHint')}</div>
            </div>
          ) : templates.map(tmpl => (
            <div key={tmpl.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, border:'1px solid rgba(73,136,196,0.18)', marginBottom:8, background:'rgba(73,136,196,0.04)' }}>
              {renamingId === tmpl.id ? (
                <input value={renameVal} onChange={e => setRenameVal(e.target.value)} autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter')  { onRename(tmpl.id, renameVal); setRenamingId(null); }
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  style={{ flex:1, background:'rgba(73,136,196,0.12)', border:'1px solid #4988C4', borderRadius:5, padding:'4px 8px', color:'#ddeeff', fontSize:13, outline:'none' }}
                />
              ) : (
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ color:'#ddeeff', fontWeight:600, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tmpl.name}</div>
                  <div style={{ color:'#6a99bb', fontSize:11, marginTop:2 }}>{new Date(tmpl.updatedAt).toLocaleDateString()}</div>
                </div>
              )}
              <div style={{ display:'flex', gap:2, flexShrink:0 }}>
                <button onClick={() => onLoad(tmpl)} style={{ padding:'4px 10px', background:'#1C4D8D', border:'none', borderRadius:5, color:'#BDE8F5', fontSize:12, fontWeight:600, cursor:'pointer' }}>{t('templates.load')}</button>
                <button onClick={() => { setRenamingId(tmpl.id); setRenameVal(tmpl.name); }} title={t('templates.rename')} style={{ background:'none', border:'none', color:'#6a99bb', cursor:'pointer', padding:'4px 6px', borderRadius:4 }}><Pencil size={13}/></button>
                <button onClick={() => onDuplicate(tmpl)} title={t('templates.duplicate')}                              style={{ background:'none', border:'none', color:'#6a99bb', cursor:'pointer', padding:'4px 6px', borderRadius:4 }}><Copy   size={13}/></button>
                <button onClick={() => onDelete(tmpl.id)} title={t('templates.delete')}                                 style={{ background:'none', border:'none', color:'#c46a6a', cursor:'pointer', padding:'4px 6px', borderRadius:4 }}><Trash2 size={13}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
