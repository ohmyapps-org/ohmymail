import { FileCode, FileDown, Printer } from 'lucide-react';
import { useT } from '../lib/i18n';

export default function ExportMenu({ onHtml, onMd, onPdf, onClose }: {
  onHtml: () => void;
  onMd:   () => void;
  onPdf:  () => void;
  onClose: () => void;
}) {
  const t = useT();
  const row = (icon: React.ReactNode, label: string, hint: string, fn: () => void) => (
    <button onClick={() => { fn(); onClose(); }} style={{
      display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px',
      background:'transparent', border:'none', color:'#ddeeff', cursor:'pointer', textAlign:'left',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(73,136,196,0.14)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color:'#4988C4' }}>{icon}</span>
      <div>
        <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
        <div style={{ fontSize:11, color:'#6a99bb' }}>{hint}</div>
      </div>
    </button>
  );

  return (
    <div style={{ position:'absolute', right:0, top:'100%', marginTop:4, background:'#14294a', border:'1px solid #2a4a6a', borderRadius:9, boxShadow:'0 8px 28px rgba(0,0,0,0.5)', width:220, zIndex:5000, overflow:'hidden' }}>
      {row(<FileCode size={14}/>, t('export.html'),     t('export.htmlHint'), onHtml)}
      {row(<FileDown size={14}/>, t('export.markdown'), t('export.mdHint'),  onMd)}
      {row(<Printer  size={14}/>, t('export.pdf'),      t('export.pdfHint'), onPdf)}
    </div>
  );
}
