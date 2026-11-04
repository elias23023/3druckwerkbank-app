/* Cloud banks that sit below and between the islands (CSS only – no cloud images exist). */
const BANKS: { l: number; t: number; w: number; h: number; o: number; d: number; dir?: boolean }[] = [
  { l: -12, t: 56, w: 52, h: 22, o: .55, d: 160 }, { l: 30, t: 62, w: 48, h: 20, o: .5, d: 190, dir: true }, { l: 62, t: 55, w: 50, h: 24, o: .55, d: 170 },
  { l: -6, t: 74, w: 60, h: 26, o: .65, d: 210, dir: true }, { l: 45, t: 78, w: 64, h: 26, o: .62, d: 230 },
  { l: 8, t: 36, w: 30, h: 10, o: .22, d: 260 }, { l: 60, t: 30, w: 34, h: 10, o: .2, d: 240, dir: true },
];
export function Clouds({ look }: { look: 'tag' | 'abend' | 'nacht' }) {
  const tint = look === 'nacht' ? 'rgba(120,140,200,' : look === 'abend' ? 'rgba(255,214,180,' : 'rgba(255,255,255,';
  return (
    <div className="clouds" aria-hidden>
      {BANKS.map((b, i) => (
        <div key={i} className="cloudbank" style={{ left: `${b.l}%`, top: `${b.t}%`, width: `${b.w}%`, height: `${b.h}%`, opacity: b.o, animationDuration: `${b.d}s`, animationDirection: b.dir ? 'alternate-reverse' : 'alternate',
          background: `radial-gradient(42% 60% at 30% 60%, ${tint}.95) 0%, ${tint}.35) 55%, transparent 75%), radial-gradient(36% 55% at 62% 45%, ${tint}.9) 0%, ${tint}.3) 55%, transparent 75%), radial-gradient(30% 50% at 85% 65%, ${tint}.8) 0%, transparent 70%), radial-gradient(26% 45% at 12% 40%, ${tint}.7) 0%, transparent 70%)` }} />
      ))}
    </div>
  );
}
