import { CornerDownLeft } from 'lucide-react';
import type { SlashCommandDef, SlashCommandState } from '../types';
import { fuzzyMatch } from '../utils';
import { useT } from '../lib/i18n';

export default function SlashPalette({ commands, state, onSelect }: {
  commands: SlashCommandDef[];
  state: SlashCommandState;
  onSelect: (cmd: SlashCommandDef) => void;
}) {
  const t = useT();
  const filtered = commands.filter(c => fuzzyMatch(state.query, `${c.label} ${c.description}`)).slice(0, 8);

  return (
    <div style={{
      position:'fixed',
      left:Math.min(state.x, window.innerWidth - 296),
      top:Math.min(state.y + 6, window.innerHeight - 360),
      zIndex:8800, background:'#14294a', border:'1px solid #2a4a6a', borderRadius:10,
      boxShadow:'0 12px 36px rgba(0,0,0,0.6)', width:288, overflow:'hidden',
    }}>
      <div style={{ padding:'5px 12px', borderBottom:'1px solid #1e3a5a', fontSize:11, color:'#5a88aa', fontFamily:'monospace', display:'flex', justifyContent:'space-between' }}>
        <span>/{state.query || t('slash.query')}</span>
        <span>{filtered.length} {filtered.length !== 1 ? t('slash.results') : t('slash.result')}</span>
      </div>

      <div style={{ maxHeight:300, overflowY:'auto' }}>
        {filtered.length === 0
          ? <div style={{ padding:14, color:'#5a88aa', fontSize:13 }}>{t('slash.noMatch')} "{state.query}"</div>
          : filtered.map((cmd, i) => (
            <div key={cmd.id} onClick={() => onSelect(cmd)}
              style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 12px', cursor:'pointer',
                background:   i === state.selectedIndex ? 'rgba(73,136,196,0.18)' : 'transparent',
                borderLeft:  `2px solid ${i === state.selectedIndex ? '#4988C4' : 'transparent'}`,
              }}
              onMouseEnter={e => { if (i !== state.selectedIndex) e.currentTarget.style.background = 'rgba(73,136,196,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = i === state.selectedIndex ? 'rgba(73,136,196,0.18)' : 'transparent'; }}
            >
              <span style={{ color:'#4988C4', flexShrink:0 }}>{cmd.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#ddeeff' }}>{cmd.label}</div>
                <div style={{ fontSize:11, color:'#6a99bb', marginTop:1 }}>{cmd.description}</div>
              </div>
              {i === state.selectedIndex && <CornerDownLeft size={11} style={{ color:'#4988C4', flexShrink:0 }} />}
            </div>
          ))
        }
      </div>

      <div style={{ padding:'4px 12px', borderTop:'1px solid #1e3a5a', fontSize:10, color:'#3a5a7a', display:'flex', gap:10 }}>
        <span>{t('slash.nav')}</span><span>{t('slash.select')}</span><span>{t('slash.close')}</span>
      </div>
    </div>
  );
}
