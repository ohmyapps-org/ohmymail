import { X } from 'lucide-react';
import { ICON_PICKER_ITEMS, ICON_SVGS } from '../constants';
import { useT } from '../lib/i18n';

export default function IconPickerModal({ onSelect, onClose }: {
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:9100, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#12253e', border:'1px solid #2a4a6a', borderRadius:12, padding:22, width:320 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <span style={{ color:'#BDE8F5', fontWeight:700, fontSize:15 }}>{t('iconPicker.title')}</span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6a99bb', cursor:'pointer', padding:4, borderRadius:4 }}>
            <X size={16}/>
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:6 }}>
          {ICON_PICKER_ITEMS.map((item, idx) => (
            <button key={`${item.name}-${idx}`} onClick={() => onSelect(item.name)} style={{
              background:'rgba(73,136,196,0.08)', border:'1px solid rgba(73,136,196,0.18)',
              borderRadius:8, padding:'10px 4px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:5,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.25)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.08)')}
              title={item.label}
            >
              <span style={{ color:'#BDE8F5' }} dangerouslySetInnerHTML={{ __html: ICON_SVGS[item.name] ?? '' }}/>
              <span style={{ fontSize:9, color:'#6a99bb', textAlign:'center', lineHeight:1.2 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
