/**
 * Ambient night behind the app: a quiet star field and the village skyline
 * with the clocktower. Purely decorative — fixed, behind everything, inert.
 */

// Deterministic pseudo-random so stars don't jump between renders.
function stars(count: number) {
  let seed = 20260610;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    cx: rand() * 1000,
    cy: rand() * 620,
    r: 0.6 + rand() * 1.1,
    o: 0.12 + rand() * 0.5,
  }));
}

const STARS = stars(90);

// Rooftops: [x, width, height, hasPitchedRoof]
const HOUSES: [number, number, number, boolean][] = [
  [-20, 110, 62, true],
  [70, 80, 40, false],
  [140, 96, 84, true],
  [225, 70, 52, false],
  [285, 120, 70, true],
  [390, 84, 44, false],
  [460, 104, 78, true],
  [555, 74, 50, false],
  [1040, 96, 66, true],
  [1125, 78, 42, false],
  [1190, 112, 80, true],
  [1290, 86, 52, false],
  [1355, 110, 68, true],
];

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <svg className="backdrop-stars" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMin slice">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#cbd2f2" opacity={s.o} />
        ))}
      </svg>

      <svg className="backdrop-skyline" viewBox="0 0 1440 230" preserveAspectRatio="xMidYMax meet">
        <g fill="#070a14">
          {HOUSES.map(([x, w, h, roof], i) => {
            const y = 230 - h;
            return (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} />
                {roof && <polygon points={`${x - 8},${y} ${x + w / 2},${y - 26} ${x + w + 8},${y}`} />}
              </g>
            );
          })}

          {/* The clocktower — the thing the game is named for. */}
          <rect x="640" y="86" width="132" height="144" />
          <polygon points="626,86 706,26 786,86" />
          <rect x="700" y="8" width="12" height="24" />
          <rect x="694" y="0" width="24" height="10" />
        </g>

        {/* Its face, lit like the dial on the progress screen. */}
        <circle cx="706" cy="132" r="27" fill="#0e1222" stroke="#8a6a2f" strokeWidth="2.5" />
        <circle cx="706" cy="132" r="21" fill="#e8b056" opacity="0.13" />
        <line x1="706" y1="132" x2="706" y2="117" stroke="#e8b056" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
        <line x1="706" y1="132" x2="718" y2="139" stroke="#e8b056" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      </svg>
    </div>
  );
}
