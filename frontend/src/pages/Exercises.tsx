import { useEffect, useState } from 'react';
import { Check, Dumbbell, Flame, Info, Lock, Trophy } from 'lucide-react';
import { api, useApi, type ExerciseDay } from '../api';
import { Bar, ErrorBox, Loading, PageHeader } from '../ui';
import { kg, n0, todayKey } from '../util';

/** Exercícios em casa por nível: cada desafio cumprido desconta o gasto estimado das calorias do dia. */
export default function Exercises() {
  const day = todayKey();
  const { data, error, loading, reload } = useApi<ExerciseDay>(`/exercises?day=${day}`);
  const [level, setLevel] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  // Abre no nível mais alto já liberado.
  useEffect(() => {
    if (data && level == null) setLevel(data.currentLevel);
  }, [data, level]);

  const header = <PageHeader title="Exercícios" subtitle="Desafios para fazer em casa, sem equipamento" />;
  if (!data) return <>{header}{loading ? <Loading /> : <ErrorBox message={error} onRetry={reload} />}</>;

  const toggle = async (id: string, entryId: string | null) => {
    setBusy(id);
    setErr('');
    try {
      if (entryId) await api.del(`/exercises/${entryId}`);
      else await api.post('/exercises', { exerciseId: id, day });
      await reload();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const current = data.levels.find((l) => l.level === (level ?? data.currentLevel)) ?? data.levels[0];
  const next = data.levels.find((l) => l.level === current.level + 1);
  const done = current.exercises.filter((e) => e.entryId).length;
  const doneToday = data.levels.reduce((a, l) => a + l.exercises.filter((e) => e.entryId).length, 0);

  return (
    <>
      {header}
      <div className="space-y-4">
        <section className="card flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-[0_6px_16px_rgba(249,115,22,0.35)]">
            <Flame size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#5b7068]">Gasto com exercícios hoje</p>
            <p className="text-2xl font-bold text-orange-600">−{n0(data.totalKcal)} kcal</p>
            <p className="truncate text-xs text-[#5b7068]">
              {doneToday ? `${doneToday} desafio(s) cumprido(s) · descontado das calorias do dia` : 'Marque os desafios ao terminar para descontar das calorias'}
            </p>
          </div>
        </section>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Níveis">
          {data.levels.map((l) => {
            const active = l.level === current.level;
            return (
              <button
                key={l.level}
                role="tab"
                aria-selected={active}
                onClick={() => setLevel(l.level)}
                className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${
                  active ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.35)]' : l.unlocked ? 'bg-white text-[#3d524a] ring-1 ring-[#e3efe9]' : 'bg-[#eef3f1] text-[#8a9a93]'
                }`}
              >
                {!l.unlocked && <Lock size={14} />}
                {l.level}. {l.name}
              </button>
            );
          })}
        </div>

        <section className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 font-bold">
                <Dumbbell size={18} className="shrink-0 text-orange-500" /> Nível {current.level} · {current.name}
              </h2>
              <p className="mt-0.5 text-xs text-[#5b7068]">{current.description}</p>
            </div>
            {current.unlocked && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                {done}/{current.exercises.length} hoje
              </span>
            )}
          </div>

          {current.unlocked ? (
            <div className="mt-3">
              <Bar value={done / current.exercises.length} color="bg-orange-400" />
              {next && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#5b7068]">
                  <Trophy size={13} className="shrink-0 text-amber-500" />
                  {next.unlocked
                    ? `Nível ${next.level} já liberado`
                    : `Complete todos os desafios em ${data.unlockDays} dias para liberar o nível ${next.level} (${Math.min(current.completeDays, data.unlockDays)}/${data.unlockDays})`}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-[#f3faf7] p-3 text-sm text-[#3d524a]">
              <Lock size={16} className="mt-0.5 shrink-0" />
              Complete todos os desafios do nível {current.level - 1} em {data.unlockDays} dias para liberar este nível.
            </p>
          )}

          <div className="mt-2">
            <ErrorBox message={err} />
          </div>

          <ul className="mt-3 space-y-2">
            {current.exercises.map((e) => {
              const ok = !!e.entryId;
              const locked = !current.unlocked && !ok;
              return (
                <li key={e.id} className={`rounded-xl border p-2.5 transition ${ok ? 'border-orange-200 bg-orange-50' : 'border-[#e3efe9] bg-white'} ${locked ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3">
                    <button
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-95 disabled:opacity-50 ${
                        ok ? 'border-orange-500 bg-orange-500 text-white' : 'border-[#cfe3d9] text-transparent hover:border-orange-400'
                      }`}
                      disabled={busy === e.id || locked}
                      onClick={() => toggle(e.id, e.entryId)}
                      aria-label={ok ? `Desmarcar ${e.name}` : `Marcar ${e.name} como feito`}
                      aria-pressed={ok}
                    >
                      {locked ? <Lock size={16} className="text-[#8a9a93]" /> : <Check size={20} strokeWidth={3} />}
                    </button>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                      <p className="truncate text-sm font-semibold">{e.name}</p>
                      <p className="truncate text-xs text-[#5b7068]">{/minuto/.test(e.dose) ? e.dose : `${e.dose} · ~${e.minutes} min`}</p>
                    </button>
                    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${ok ? 'bg-orange-500 text-white' : 'bg-[#f3faf7] text-[#5b7068]'}`}>
                      {ok ? `−${n0(e.kcal)}` : `≈ ${n0(e.kcal)}`} kcal
                    </span>
                  </div>
                  {open === e.id && <p className="mt-2 pl-14 text-xs text-[#3d524a]">{e.tip}</p>}
                </li>
              );
            })}
          </ul>
        </section>

        <p className="flex items-start gap-1.5 px-1 text-[11px] text-[#5b7068]">
          <Info size={13} className="mt-px shrink-0" />
          {data.weightKg
            ? `Gasto estimado para ${kg(data.weightKg)} pela intensidade (MET) e o tempo de cada exercício. Toque no nome para ver como fazer.`
            : 'Gasto estimado para 70 kg; registre seu peso para um cálculo mais preciso. Toque no nome para ver como fazer.'}
        </p>
      </div>
    </>
  );
}
