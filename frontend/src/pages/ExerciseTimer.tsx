import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Sheet } from '../ui';

/** Descanso entre as séries (os desafios pedem de 20 a 30 s). */
const REST_S = 30;
/** Contagem antes de começar, para dar tempo de se posicionar. */
const PREP_S = 5;

export interface TimedPlan { sets: number; seconds: number }

/** Lê a dose com tempo ("3 × 40 segundos", "5 minutos", "5 × 2 minutos"); séries por repetição retornam null. */
export function timedPlan(dose: string): TimedPlan | null {
  const m = dose.match(/^(?:(\d+)\s*×\s*)?(\d+)\s*(segundos?|minutos?)$/);
  if (!m) return null;
  return { sets: Number(m[1] || 1), seconds: Number(m[2]) * (m[3].startsWith('min') ? 60 : 1) };
}

type Phase = 'prep' | 'work' | 'rest' | 'done';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Bipe curto pelo Web Audio (sem arquivo) e vibração, quando o aparelho permite. */
function useBeep() {
  const ctx = useRef<AudioContext | null>(null);
  const unlock = useCallback(() => {
    try {
      ctx.current ??= new AudioContext();
      void ctx.current.resume();
    } catch {
      /* sem áudio */
    }
  }, []);
  const beep = useCallback((freq = 880, ms = 180, vibrate = 200) => {
    try {
      const c = ctx.current;
      if (c) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.25, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + ms / 1000);
        o.connect(g).connect(c.destination);
        o.start();
        o.stop(c.currentTime + ms / 1000);
      }
      navigator.vibrate?.(vibrate);
    } catch {
      /* sem áudio */
    }
  }, []);
  useEffect(() => () => void ctx.current?.close(), []);
  return { unlock, beep };
}

/** Mantém a tela acesa enquanto o cronômetro roda. */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const get = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {});
    void get();
    const onVis = () => document.visibilityState === 'visible' && get();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release();
    };
  }, [active]);
}

export function ExerciseTimer({ name, tip, plan, onClose, onFinish }: { name: string; tip: string; plan: TimedPlan; onClose: () => void; onFinish: () => void }) {
  const [phase, setPhase] = useState<Phase>('prep');
  const [set, setSet] = useState(1);
  const [left, setLeft] = useState(PREP_S);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);
  const lastBeep = useRef(-1);
  const { unlock, beep } = useBeep();
  useWakeLock(running);

  const duration = (p: Phase) => (p === 'prep' ? PREP_S : p === 'work' ? plan.seconds : p === 'rest' ? REST_S : 0);

  const go = useCallback(
    (p: Phase, s: number) => {
      setPhase(p);
      setSet(s);
      setLeft(duration(p));
      endAt.current = Date.now() + duration(p) * 1000;
      lastBeep.current = -1;
      if (p === 'done') {
        setRunning(false);
        beep(1320, 600, 600);
      } else beep(p === 'work' ? 1040 : 660, 300, 300);
    },
    [beep, plan.seconds],
  );

  const advance = useCallback(() => {
    if (phase === 'prep' || phase === 'rest') go('work', phase === 'rest' ? set + 1 : set);
    else if (phase === 'work') go(set < plan.sets ? 'rest' : 'done', set);
  }, [phase, set, plan.sets, go]);

  // Tempo pelo relógio (não por contagem de ticks): continua certo se a aba ficar em segundo plano.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s <= 3 && s > 0 && lastBeep.current !== s) {
        lastBeep.current = s;
        beep(660, 90, 60);
      }
      if (s === 0) advance();
    }, 200);
    return () => clearInterval(id);
  }, [running, advance, beep]);

  const toggle = () => {
    unlock();
    if (running) setRunning(false);
    else {
      endAt.current = Date.now() + left * 1000;
      setRunning(true);
    }
  };

  const restart = () => {
    setRunning(false);
    setPhase('prep');
    setSet(1);
    setLeft(PREP_S);
  };

  const close = () => {
    if (running && phase !== 'done' && !confirm('Parar o cronômetro?')) return;
    onClose();
  };

  const total = duration(phase);
  const pct = total ? (total - left) / total : 1;
  const label = phase === 'prep' ? 'Prepare-se' : phase === 'work' ? 'Exercício' : phase === 'rest' ? 'Descanso' : 'Concluído!';
  const color = phase === 'work' ? '#f97316' : phase === 'rest' ? '#0ea5e9' : phase === 'done' ? '#22c55e' : '#94a3b8';
  const R = 88;
  const C = 2 * Math.PI * R;

  return (
    <Sheet open title={name} onClose={close}>
      <div className="flex flex-col items-center">
        <p className="text-sm font-semibold text-muted">
          {plan.sets > 1 ? `Série ${set} de ${plan.sets} · ` : ''}
          {plan.sets > 1 ? `${clock(plan.seconds)} cada` : clock(plan.seconds)}
        </p>
        <div className="relative my-4 h-52 w-52">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeWidth="12" className="text-tint" />
            <circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              style={{ transition: 'stroke-dashoffset 0.25s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold uppercase tracking-wide" style={{ color }}>{label}</span>
            <span className="text-5xl font-bold tabular-nums">{phase === 'done' ? <Check size={56} strokeWidth={3} style={{ color }} /> : clock(left)}</span>
          </div>
        </div>

        {plan.sets > 1 && (
          <div className="mb-4 flex gap-1.5" aria-hidden>
            {Array.from({ length: plan.sets }, (_, i) => (
              <span
                key={i}
                className={`h-2 w-6 rounded-full ${i + 1 < set || phase === 'done' || (i + 1 === set && phase === 'rest') ? 'bg-orange-500' : i + 1 === set && phase === 'work' ? 'bg-orange-300' : 'bg-tint'}`}
              />
            ))}
          </div>
        )}

        {phase === 'done' ? (
          <div className="grid w-full gap-2">
            <button
              className="btn-primary w-full"
              onClick={() => {
                onFinish();
                onClose();
              }}
            >
              <Check size={18} /> Marcar como feito
            </button>
            <button className="btn-ghost w-full" onClick={restart}>
              <RotateCcw size={18} /> Fazer de novo
            </button>
          </div>
        ) : (
          <div className="grid w-full grid-cols-[1fr_2fr_1fr] gap-2">
            <button className="btn-ghost" onClick={restart} aria-label="Recomeçar">
              <RotateCcw size={20} />
            </button>
            <button className="btn-primary !bg-orange-500" onClick={toggle}>
              {running ? <Pause size={20} /> : <Play size={20} />}
              {running ? 'Pausar' : phase === 'prep' && left === PREP_S ? 'Começar' : 'Continuar'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                unlock();
                advance();
              }}
              aria-label="Pular etapa"
            >
              <SkipForward size={20} />
            </button>
          </div>
        )}
        <p className="mt-4 text-center text-xs text-soft">{tip}</p>
      </div>
    </Sheet>
  );
}
