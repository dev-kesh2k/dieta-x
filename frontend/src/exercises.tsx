import { useState } from 'react';
import { Check, ChevronDown, Dumbbell, Flame, Info } from 'lucide-react';
import { api, useApi, type ExerciseDay } from './api';
import { Bar, ErrorBox } from './ui';
import { kg, n0 } from './util';

const SHOWN = 6;

/** Desafios de exercícios em casa: cada um cumprido desconta o gasto estimado das calorias do dia. */
export function ExerciseCard({ day, onChange }: { day: string; onChange?: () => void }) {
  const { data, error, reload } = useApi<ExerciseDay>(`/exercises?day=${day}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const toggle = async (id: string, entryId: string | null) => {
    setBusy(id);
    setErr('');
    try {
      if (entryId) await api.del(`/exercises/${entryId}`);
      else await api.post('/exercises', { exerciseId: id, day });
      await reload();
      onChange?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const list = data?.exercises ?? [];
  const done = list.filter((e) => e.entryId).length;
  // Os cumpridos sobem para o topo; o resto mantém a ordem (dos mais leves de começar aos mais longos).
  const sorted = [...list.filter((e) => e.entryId), ...list.filter((e) => !e.entryId)];
  const shown = all ? sorted : sorted.slice(0, Math.max(SHOWN, done));

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 font-bold">
          <Dumbbell size={18} className="shrink-0 text-orange-500" /> Exercícios em casa
        </h2>
        {!!data?.totalKcal && (
          <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-[0_4px_12px_rgba(249,115,22,0.35)]">
            <Flame size={13} /> −{n0(data.totalKcal)} kcal
          </span>
        )}
      </div>
      <div className="mt-3">
        <Bar value={list.length ? done / list.length : 0} color="bg-orange-400" />
        <p className="mt-1.5 text-xs text-[#5b7068]">
          {done ? `${done} de ${list.length} desafios cumpridos hoje` : 'Marque cada desafio quando terminar: as calorias gastas saem do total do dia.'}
        </p>
      </div>
      <div className="mt-2">
        <ErrorBox message={err || error} />
      </div>
      <ul className="mt-3 space-y-2">
        {shown.map((e) => {
          const ok = !!e.entryId;
          return (
            <li key={e.id} className={`rounded-xl border p-2.5 transition ${ok ? 'border-orange-200 bg-orange-50' : 'border-[#e3efe9] bg-white'}`}>
              <div className="flex items-center gap-3">
                <button
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-95 disabled:opacity-50 ${
                    ok ? 'border-orange-500 bg-orange-500 text-white' : 'border-[#cfe3d9] text-transparent hover:border-orange-400'
                  }`}
                  disabled={busy === e.id}
                  onClick={() => toggle(e.id, e.entryId)}
                  aria-label={ok ? `Desmarcar ${e.name}` : `Marcar ${e.name} como feito`}
                  aria-pressed={ok}
                >
                  <Check size={20} strokeWidth={3} />
                </button>
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                  <p className="truncate text-sm font-semibold">{e.name}</p>
                  <p className="truncate text-xs text-[#5b7068]">
                    {/minuto/.test(e.dose) ? e.dose : `${e.dose} · ~${e.minutes} min`}
                  </p>
                </button>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${
                    ok ? 'bg-orange-500 text-white' : 'bg-[#f3faf7] text-[#5b7068]'
                  }`}
                >
                  {ok ? `−${n0(e.kcal)}` : `≈ ${n0(e.kcal)}`} kcal
                </span>
              </div>
              {open === e.id && <p className="mt-2 pl-14 text-xs text-[#3d524a]">{e.tip}</p>}
            </li>
          );
        })}
      </ul>
      {sorted.length > shown.length || all ? (
        <button className="btn-ghost mt-3 w-full !bg-orange-50 !text-orange-700" onClick={() => setAll(!all)}>
          {all ? 'Mostrar menos' : `Ver mais ${sorted.length - shown.length} desafios`}
          <ChevronDown size={16} className={all ? 'rotate-180' : ''} />
        </button>
      ) : null}
      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[#5b7068]">
        <Info size={13} className="mt-px shrink-0" />
        {data?.weightKg
          ? `Gasto estimado para ${kg(data.weightKg)} pela intensidade (MET) e o tempo de cada exercício. Toque no nome para ver como fazer.`
          : 'Gasto estimado para 70 kg; registre seu peso para um cálculo mais preciso. Toque no nome para ver como fazer.'}
      </p>
    </section>
  );
}
