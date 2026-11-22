// A page for spaet.mjs: the same list and sheet twice. "frueh" uses gehen.ts as the app does (a ref: React 19 calls its clean-up
// BEFORE it takes the node out). "spaet" hands the node to the very same functions from a passive effect, whose clean-up React
// calls AFTER the node is out of the document - the order a later React might give a ref's clean-up.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../../src/wasser/kern.css';
import { gehtBogen, gehtZeile, weich } from '../../../../../src/ui/gehen';

function Spaet({ kind, id, className, children }: { kind: 'bogen' | 'zeile'; id?: string; className: string; children: ReactNode }) {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = r.current!, weg = (kind === 'bogen' ? gehtBogen : gehtZeile)(el); return () => { (window as unknown as { __draussen: boolean[] }).__draussen.push(!el.isConnected); if (weg) weg(); }; }, [kind]);
  return <div ref={r} data-gehen={id} className={className}>{children}</div>;
}
function Liste({ art }: { art: 'frueh' | 'spaet' }) {
  const [ids, set] = useState(['1', '2', '3', '4', '5'].map((n) => `${art}-${n}`));
  const [offen, auf] = useState(true);
  (window as unknown as Record<string, unknown>)[`weg_${art}`] = (...weg: string[]) => set((x) => x.filter((i) => !weg.includes(i)));
  (window as unknown as Record<string, unknown>)[`zu_${art}`] = () => auf(false);
  return <>
    <div className="liste" id={art}>
      {ids.map((id) => art === 'frueh' ? <div key={id} {...weich(id)} className="zeile">{id}</div> : <Spaet key={id} kind="zeile" id={id} className="zeile">{id}</Spaet>)}
    </div>
    <i id={`vor-${art}`} />
    {offen ? art === 'frueh' ? <div ref={gehtBogen} className="sheet" id={`bogen-${art}`}>Bogen</div> : <Spaet kind="bogen" className={`sheet bogen-${art}`}>Bogen</Spaet> : null}
    <i id={`nach-${art}`} />
  </>;
}
(window as unknown as { __draussen: boolean[] }).__draussen = [];   // per late clean-up: was the node already out of the document?
createRoot(document.getElementById('root')!).render(<div data-wasser="mobil"><Liste art="frueh" /><Liste art="spaet" /></div>);
