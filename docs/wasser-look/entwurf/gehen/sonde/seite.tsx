// A page for sonde.mjs: 60 things, two lists of them. "teil" shows the first five and gives every row its test (as "Aufgaben
// heute" does); "alle" shows every one WITHOUT a test (as a full list does). window.weg(id) deletes a thing, window.vor(id)
// puts a new one in front (it pushes the fifth row out of "teil"), window.verstecke(id) takes a row
// out of "alle" only (its thing stays, so the test of "teil" says: not gone), window.stand() tells what gehen.ts holds.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../../src/wasser/kern.css';
import { weich, stand } from '../../../../../src/ui/gehen';

let versteckt: string[] = [];
let dinge = Array.from({ length: 60 }, (_, i) => `d${i + 1}`);
function Seite() {
  const [, neu] = useState(0); const w = window as unknown as Record<string, unknown>;
  w.weg = (id: string) => { dinge = dinge.filter((x) => x !== id); neu((n) => n + 1); };
  w.vor = (id: string) => { dinge = [id, ...dinge]; neu((n) => n + 1); };
  w.verstecke = (id: string) => { versteckt = [...versteckt, id]; neu((n) => n + 1); };
  w.stand = stand;
  return <div data-wasser="mobil" style={{ display: 'flex' }}>
    <div className="liste" id="teil">{dinge.slice(0, 5).map((id) => <div key={id} {...weich(id, () => !dinge.includes(id))} className="zeile">{id}</div>)}</div>
    <div className="liste" id="alle">{dinge.filter((id) => !versteckt.includes(id)).map((id) => <div key={id} {...weich(id)} className="zeile">{id}</div>)}</div>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Seite />);
