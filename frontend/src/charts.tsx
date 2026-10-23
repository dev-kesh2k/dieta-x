import { useEffect, useId, useRef, useState, type PointerEvent } from 'react';

/** Largura real do contêiner, para desenhar o SVG em pixels (texto sem distorção). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

interface Point {
  label: string;
  value: number;
}

const PAD = { l: 36, r: 10, t: 16, b: 22 };

function scale(values: number[], extra: (number | null | undefined)[], zero = false) {
  const all = [...values, ...extra.filter((v): v is number => v != null)];
  let min = zero ? 0 : Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.12;
  return { min: zero ? 0 : min - pad, max: max + pad };
}

function ticks(min: number, max: number) {
  return [0, 0.25, 0.5, 0.75, 1].map((f) => min + (max - min) * f);
}

const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
const full = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Índice do ponto mais próximo do dedo/mouse (toque mostra o valor). */
function useActive(count: number, xOf: (i: number) => number) {
  const [active, setActive] = useState<number | null>(null);
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!count) return;
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let best = 0;
    for (let i = 1; i < count; i++) if (Math.abs(xOf(i) - px) < Math.abs(xOf(best) - px)) best = i;
    setActive(best);
  };
  return { active, handlers: { onPointerDown: onMove, onPointerMove: onMove, onPointerLeave: () => setActive(null) } };
}

function Grid({ min, max, width, y }: { min: number; max: number; width: number; y: (v: number) => number }) {
  return (
    <>
      {ticks(min, max).map((t, i) => (
        <g key={t}>
          <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke="#edf4f0" strokeDasharray={i === 0 ? undefined : '2 4'} />
          {i % 2 === 0 && (
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#8a9a93">
              {fmt(t)}
            </text>
          )}
        </g>
      ))}
    </>
  );
}

function RefLine({ value, label, width, y, color, dash = '5 4', below }: { value: number; label?: string; width: number; y: (v: number) => number; color: string; dash?: string; below?: boolean }) {
  return (
    <g pointerEvents="none">
      <line x1={PAD.l} x2={width - PAD.r} y1={y(value)} y2={y(value)} stroke={color} strokeDasharray={dash} strokeWidth="1.5" />
      {label && (
        <text x={width - PAD.r} y={y(value) + (below ? 12 : -4)} textAnchor="end" fontSize="10" fontWeight="600" fill={color}>
          {label}
        </text>
      )}
    </g>
  );
}

/** Balão com data e valor do ponto tocado. */
function Tip({ x, y, width, title, text }: { x: number; y: number; width: number; title: string; text: string }) {
  const w = Math.max(title.length, text.length) * 6.4 + 16;
  const left = Math.min(Math.max(x - w / 2, PAD.l), width - PAD.r - w);
  const top = Math.max(0, y - 44);
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={w} height={36} rx="8" fill="#0f172a" opacity="0.92" />
      <text x={left + w / 2} y={top + 14} textAnchor="middle" fontSize="10" fill="#cbd5e1">
        {title}
      </text>
      <text x={left + w / 2} y={top + 29} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
        {text}
      </text>
    </g>
  );
}

export function LineChart({ points, target, targetLabel, height = 190, color = '#059669', unit = '' }: { points: Point[]; target?: number | null; targetLabel?: string; height?: number; color?: string; unit?: string }) {
  const [ref, width] = useWidth();
  const gid = useId().replace(/:/g, '');
  const { min, max } = scale(points.map((p) => p.value), [target]);
  const iw = Math.max(0, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2);
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const { active, handlers } = useActive(points.length, x);
  // Curva suave (Catmull-Rom → Bézier) em vez de segmentos retos.
  const path = points
    .map((p, i) => {
      if (i === 0) return `M${x(0).toFixed(1)},${y(p.value).toFixed(1)}`;
      const p0 = points[i - 2] ?? points[i - 1];
      const p1 = points[i - 1];
      const p3 = points[i + 1] ?? p;
      const x0 = x(Math.max(0, i - 2)), x1 = x(i - 1), x2 = x(i), x3 = x(Math.min(points.length - 1, i + 1));
      const c1x = x1 + (x2 - x0) / 6, c1y = y(p1.value) + (y(p.value) - y(p0.value)) / 6;
      const c2x = x2 - (x3 - x1) / 6, c2y = y(p.value) - (y(p3.value) - y(p1.value)) / 6;
      return `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y(p.value).toFixed(1)}`;
    })
    .join(' ');
  const area = points.length > 1 ? `${path} L${x(points.length - 1).toFixed(1)},${PAD.t + ih} L${x(0).toFixed(1)},${PAD.t + ih} Z` : '';
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 48))));
  const last = points.length - 1;
  const shown = active ?? last;
  return (
    <div ref={ref} className="w-full touch-pan-y select-none">
      {width > 0 && (
        <svg width={width} height={height} role="img" {...handlers}>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <Grid min={min} max={max} width={width} y={y} />
          {target != null && <RefLine value={target} label={targetLabel} width={width} y={y} color="#d97706" below={points.length > 0 && points[last].value < target} />}
          {area && <path d={area} fill={`url(#${gid})`} />}
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {active != null && <line x1={x(active)} x2={x(active)} y1={PAD.t} y2={PAD.t + ih} stroke="#94a3b8" strokeDasharray="3 3" />}
          {points.map((p, i) => (
            <g key={i}>
              {(points.length <= 20 || i === shown) && (
                <circle cx={x(i)} cy={y(p.value)} r={i === shown ? 5 : 3} fill={i === shown ? color : '#fff'} stroke={i === shown ? '#fff' : color} strokeWidth="2" />
              )}
              {i % every === 0 && (
                <text x={x(i)} y={height - 6} textAnchor={points.length < 2 ? 'middle' : i === 0 ? 'start' : i === last ? 'end' : 'middle'} fontSize="10" fill="#8a9a93">
                  {p.label}
                </text>
              )}
            </g>
          ))}
          {points.length > 0 && <Tip x={x(shown)} y={y(points[shown].value)} width={width} title={points[shown].label} text={`${full(points[shown].value)}${unit}`} />}
        </svg>
      )}
    </div>
  );
}

export function BarChart({ points, target, targetLabel, height = 190, color = '#10b981', overColor = '#f87171', unit = '', showAvg = true }: { points: Point[]; target?: number | null; targetLabel?: string; height?: number; color?: string; overColor?: string; unit?: string; showAvg?: boolean }) {
  const [ref, width] = useWidth();
  const { max } = scale(points.map((p) => p.value), [target], true);
  const iw = Math.max(0, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const slot = points.length ? iw / points.length : 0;
  const bw = Math.max(4, Math.min(28, slot * 0.62));
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const cxOf = (i: number) => PAD.l + slot * i + slot / 2;
  const { active, handlers } = useActive(points.length, cxOf);
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 40))));
  const logged = points.filter((p) => p.value > 0);
  const avg = logged.length ? logged.reduce((a, p) => a + p.value, 0) / logged.length : null;
  return (
    <div ref={ref} className="w-full touch-pan-y select-none">
      {width > 0 && (
        <svg width={width} height={height} role="img" {...handlers}>
          <Grid min={0} max={max} width={width} y={y} />
          {points.map((p, i) => {
            const cx = cxOf(i);
            const over = target != null && p.value > target;
            const dim = active != null && active !== i;
            return (
              <g key={i}>
                {active === i && <rect x={cx - slot / 2} y={PAD.t} width={slot} height={ih} fill="#f1f5f9" rx="4" />}
                {p.value > 0 ? (
                  <rect x={cx - bw / 2} y={y(p.value)} width={bw} height={Math.max(1, PAD.t + ih - y(p.value))} rx={Math.min(6, bw / 2)} fill={over ? overColor : color} opacity={dim ? 0.45 : 1} />
                ) : (
                  <rect x={cx - bw / 2} y={PAD.t + ih - 3} width={bw} height={3} rx="1.5" fill="#e2e8f0" />
                )}
                {i % every === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill="#8a9a93">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
          {showAvg && avg != null && <RefLine value={avg} label={`média ${fmt(avg)}`} width={width} y={y} color="#64748b" dash="2 3" below />}
          {target != null && <RefLine value={target} label={targetLabel} width={width} y={y} color="#d97706" />}
          {active != null && (
            <Tip x={cxOf(active)} y={y(points[active].value)} width={width} title={points[active].label} text={points[active].value > 0 ? `${full(points[active].value)}${unit}` : 'sem registro'} />
          )}
        </svg>
      )}
    </div>
  );
}
