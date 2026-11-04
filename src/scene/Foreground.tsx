/* Pine-tree silhouettes framing the lower corners (inline SVG). */
const tree = (x: number, h: number, w: number) => `M${x} ${100} L${x - w * 0.5} ${100} L${x - w * 0.42} ${100 - h * 0.3} L${x - w * 0.3} ${100 - h * 0.3} L${x - w * 0.26} ${100 - h * 0.55} L${x - w * 0.14} ${100 - h * 0.55} L${x} ${100 - h} L${x + w * 0.14} ${100 - h * 0.55} L${x + w * 0.26} ${100 - h * 0.55} L${x + w * 0.3} ${100 - h * 0.3} L${x + w * 0.42} ${100 - h * 0.3} L${x + w * 0.5} ${100} Z`;
const LEFT = [[4, 70, 16], [12, 92, 20], [21, 60, 14], [28, 78, 18], [36, 48, 12]];
const RIGHT = [[64, 52, 13], [71, 80, 18], [80, 64, 15], [88, 96, 22], [96, 70, 16]];
export function Foreground({ look }: { look: 'tag' | 'abend' | 'nacht' }) {
  const fill = look === 'nacht' ? '#070b18' : look === 'abend' ? '#1a1724' : '#1d2a2a';
  const rim = look === 'abend' ? '#5a3a2a' : look === 'nacht' ? '#1a2240' : '#2e4a42';
  return (
    <div className="foreground" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="foreground__svg">
        <defs><linearGradient id="fgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={rim} /><stop offset=".35" stopColor={fill} /><stop offset="1" stopColor={fill} /></linearGradient></defs>
        <g fill="url(#fgG)" opacity=".96">{[...LEFT, ...RIGHT].map(([x, h, w], i) => <path key={i} d={tree(x, h * 0.62, w * 0.5)} />)}</g>
        <path d="M0 100 L0 86 Q 18 78 36 90 Q 50 96 64 90 Q 82 80 100 86 L100 100 Z" fill={fill} opacity=".98" />
      </svg>
      <div className="foreground__mist" />
    </div>
  );
}
