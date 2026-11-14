import type { CSSProperties, ReactNode } from 'react';
import { useStore } from '../store';
import { useNow, quoteOfDay } from '../lib/time';
import { PanelColumn } from './Glass';

/**
 * Desktop fields for what used to stand loose on the landscape (block „Felder“ in src/styles/global.css).
 * Both are `.glass.panel` in a `PanelColumn`, so the Wasser-Look draws them as basins like every other panel and they
 * scale with the screen (--ui-scale) like the side columns. The phone does not use them.
 */

/**
 * The head of a world: title, one line about it and (optional) the world's own controls (filters, actions of a project).
 * Same place in every world: top left, under the top bar, where the card of the day stands on Start.
 * `width` is the column's width (percent of the stage); keep it clear of the small islands top left (measured: docs/NACHSEHEN-FABLE-felder.md).
 */
export function Weltkopf({ title, sub, children, width = '20.5%', className, titleStyle, before }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; width?: string; className?: string; titleStyle?: CSSProperties; before?: ReactNode }) {
  return (
    <PanelColumn side="left" top="7.7%" bottom="auto" width={width}>
      <header className={`glass panel feld-kopf${className ? ' ' + className : ''}`}>
        {before}
        <h1 style={titleStyle}>{title}</h1>
        {sub ? <p className="feld-kopf__sub">{sub}</p> : null}
        {children}
      </header>
    </PanelColumn>
  );
}

/**
 * The sentence of the day as a field of its own at the right edge, in the same place in every world (top right, under the
 * buttons of the top bar). It replaces the handwritten notes (.hand) the worlds used to carry. Only with „Spruch des Tages
 * anzeigen“ on; without it there is no field at all (never an empty one).
 */
export function Spruchfeld() {
  const show = useStore((s) => s.settings.showQuote);
  const now = useNow(60_000);
  if (!show) return null;
  return (
    <PanelColumn side="right" top="7.7%" bottom="auto" width="15%">
      <aside className="glass panel feld-spruch" aria-label="Spruch des Tages">
        <p className="feld-spruch__text">„{quoteOfDay(now)}“</p>
      </aside>
    </PanelColumn>
  );
}
