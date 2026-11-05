import { LOOK_META, type Look } from './looks';
/* Subtle drifting cloud veils on top of the landscape's own cloud sea (CSS only). */
const BANKS: { l: number; t: number; w: number; h: number; o: number; d: number; dir?: boolean }[] = [
  { l: -10, t: 62, w: 50, h: 20, o: .22, d: 170 }, { l: 40, t: 68, w: 55, h: 22, o: .2, d: 210, dir: true }, { l: 62, t: 58, w: 48, h: 20, o: .18, d: 190 },
  { l: 10, t: 30, w: 30, h: 8, o: .1, d: 260 }, { l: 60, t: 26, w: 34, h: 8, o: .09, d: 240, dir: true },
];
export function Clouds({ look }: { look: Look }) {
  const tint = `rgba(${LOOK_META[look].cloud},`;
  return (
    <div className="clouds" aria-hidden>
      {BANKS.map((b, i) => (
        <div key={i} className="cloudbank" style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, opacity: b.o, animationDuration: `${b.d}s`, animationDirection: b.dir ? 'alternate-reverse' : 'alternate',
          background: `radial-gradient(42% 60% at 30% 60%, ${tint}.9) 0%, ${tint}.3) 55%, transparent 75%), radial-gradient(36% 55% at 62% 45%, ${tint}.85) 0%, ${tint}.25) 55%, transparent 75%)` }} />
      ))}
    </div>
  );
}
