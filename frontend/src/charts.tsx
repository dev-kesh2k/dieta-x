import { useEffect, useRef, useState } from 'react';

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

const PAD = { l: 36, r: 10, t: 12, b: 22 };

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
  return [0, 0.5, 1].map((f) => min + (max - min) * f);
}

const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

export function LineChart({ points, target, targetLabel, height = 180, color = '#059669' }: { points: Point[]; target?: number | null; targetLabel?: string; height?: number; color?: string }) {
  const [ref, width] = useWidth();
  const { min, max } = scale(points.map((p) => p.value), [target]);
  const iw = Math.max(0, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2);
  const y = (v: number) => PAD.t + ih - ((v - min) / (max - min)) * ih;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 48))));
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img">
          {ticks(min, max).map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke="#edf4f0" />
              <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#8a9a93">
                {fmt(t)}
              </text>
            </g>
          ))}
          {target != null && (
            <g>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(target)} y2={y(target)} stroke="#f59e0b" strokeDasharray="5 4" />
              {targetLabel && (
                <text x={width - PAD.r} y={y(target) - 4} textAnchor="end" fontSize="10" fill="#b45309">
                  {targetLabel}
                </text>
              )}
            </g>
          )}
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.value)} r={points.length > 20 ? 2 : 3.5} fill="#fff" stroke={color} strokeWidth="2" />
              {i % every === 0 && (
                <text x={x(i)} y={height - 6} textAnchor={points.length < 2 ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="10" fill="#8a9a93">
                  {p.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function BarChart({ points, target, targetLabel, height = 180, color = '#10b981', overColor = '#f87171' }: { points: Point[]; target?: number | null; targetLabel?: string; height?: number; color?: string; overColor?: string }) {
  const [ref, width] = useWidth();
  const { max } = scale(points.map((p) => p.value), [target], true);
  const iw = Math.max(0, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const slot = points.length ? iw / points.length : 0;
  const bw = Math.max(4, Math.min(28, slot * 0.6));
  const y = (v: number) => PAD.t + ih - (v / max) * ih;
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(iw / 40))));
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={height} role="img">
          {ticks(0, max).map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke="#edf4f0" />
              <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#8a9a93">
                {fmt(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = PAD.l + slot * i + slot / 2;
            const over = target != null && p.value > target;
            return (
              <g key={i}>
                {p.value > 0 && <rect x={cx - bw / 2} y={y(p.value)} width={bw} height={Math.max(1, PAD.t + ih - y(p.value))} rx={Math.min(6, bw / 2)} fill={over ? overColor : color} />}
                {i % every === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" fontSize="10" fill="#8a9a93">
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
          {target != null && (
            <g>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(target)} y2={y(target)} stroke="#f59e0b" strokeDasharray="5 4" />
              {targetLabel && (
                <text x={width - PAD.r} y={y(target) - 4} textAnchor="end" fontSize="10" fill="#b45309">
                  {targetLabel}
                </text>
              )}
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
