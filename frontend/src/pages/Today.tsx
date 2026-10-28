import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Dumbbell, Flame, Plus, Scale, TrendingDown, TrendingUp, UserCog } from 'lucide-react';
import { useApi, type Summary } from '../api';
import { useAuth } from '../auth';
import { Bar, ErrorBox, Loading, PageHeader, Ring } from '../ui';
import { WaterCard, WeighSheet } from '../widgets';
import { dateFull, dateLong, kg, n0, n1, signedKg, todayKey } from '../util';

export default function Today() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const day = todayKey();
  const { data, error, loading, reload } = useApi<Summary>(`/summary?day=${day}`);
  const [weigh, setWeigh] = useState(false);

  const firstName = user?.name.split(' ')[0] ?? '';
  const header = <PageHeader title={`Olá, ${firstName}!`} subtitle={<span className="inline-block first-letter:uppercase">{dateLong(day)}</span>} />;
  if (!data) return <>{header}{loading ? <Loading /> : <ErrorBox message={error} onRetry={reload} />}</>;

  const { report: r, totals } = data;
  const goal = r.calorieGoal;
  // Saldo do dia: consumidas menos o gasto dos exercícios cumpridos.
  const burned = data.exercise?.kcal ?? 0;
  const net = Math.max(0, totals.kcal - burned);
  const left = goal != null ? goal - net : null;
  // Metas de macros: proteína em g/kg (do resumo), gordura 25% das calorias e o restante em carboidrato.
  const protein = goal ? (r.proteinGoalG ?? (goal * 0.3) / 4) : null;
  const fat = goal ? (goal * 0.25) / 9 : null;
  const macros = [
    { label: 'Proteína', value: totals.proteinG, goal: protein, color: 'bg-rose-400' },
    { label: 'Carboidrato', value: totals.carbsG, goal: goal ? Math.max(0, (goal - protein! * 4 - fat! * 9) / 4) : null, color: 'bg-amber-400' },
    { label: 'Gordura', value: totals.fatG, goal: fat, color: 'bg-violet-400' },
  ];

  return (
    <>
      {header}
      <div className="space-y-4">
        {r.missing.length > 0 && (
          <Link to="/perfil" className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <UserCog size={20} className="shrink-0" />
            <span className="min-w-0 flex-1">Complete seu perfil ({r.missing.join(', ')}) para calcular IMC, gasto diário e meta de calorias.</span>
            <ChevronRight size={18} className="shrink-0" />
          </Link>
        )}
        {r.weighDue && (
          <button onClick={() => setWeigh(true)} className="flex w-full items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-left text-sm text-sky-900">
            <Scale size={20} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {r.lastWeighDay ? `Sua última pesagem foi há ${r.daysSinceWeigh} dias. Hora da pesagem semanal!` : 'Registre seu peso para começar a acompanhar a evolução.'}
            </span>
            <ChevronRight size={18} className="shrink-0" />
          </button>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-bold">
                <Flame size={18} className="text-orange-500" /> Calorias de hoje
              </h2>
              {data.streak > 1 && <span className="shrink-0 whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">{data.streak} dias seguidos</span>}
            </div>
            <div className="mt-4 flex flex-col items-center gap-5 min-[380px]:flex-row">
              <Ring value={goal ? net / goal : 0} size={136}>
                <span className="text-2xl font-bold">{n0(net)}</span>
                <span className="text-xs text-muted">{goal ? `de ${n0(goal)} kcal` : 'kcal'}</span>
              </Ring>
              <div className="w-full min-w-0 flex-1 space-y-3">
                {left != null && (
                  <p className={`text-sm font-semibold ${left >= 0 ? 'text-brand-dark' : 'text-red-600'}`}>
                    {left >= 0 ? `Restam ${n0(left)} kcal` : `${n0(-left)} kcal acima da meta`}
                  </p>
                )}
                {burned > 0 && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-2.5">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-orange-700">
                      <Dumbbell size={15} className="shrink-0" /> −{n0(burned)} kcal com exercícios
                    </p>
                    <p className="mt-0.5 text-xs text-orange-900/70">
                      {n0(totals.kcal)} consumidas − {n0(burned)} gastas = {totals.kcal < burned ? '−' : ''}
                      {n0(Math.abs(totals.kcal - burned))} kcal
                    </p>
                  </div>
                )}
                {macros.map((m) => (
                  <div key={m.label}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="font-semibold text-soft">{m.label}</span>
                      <span className="text-muted">
                        {n1(m.value)}
                        {m.goal ? ` / ${n0(m.goal)}` : ''} g
                      </span>
                    </div>
                    <Bar value={m.goal ? m.value / m.goal : 0} color={m.color} />
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary mt-4 w-full" onClick={() => navigate('/refeicoes?novo=1')}>
              <Plus size={18} /> Adicionar refeição
            </button>
            <p className="mt-2 text-center text-xs text-muted">
              {data.meals ? `${data.meals} refeição(ões) registrada(s) hoje · ` : ''}
              <Link to="/refeicoes" className="font-semibold text-brand-dark underline">ver refeições</Link>
            </p>
          </section>

          <WaterCard day={day} goalMl={r.waterGoalMl} onChange={reload} />
        </div>

        <Link to="/exercicios" className="card flex items-center gap-3 transition hover:border-orange-300">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <Dumbbell size={22} />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">Exercícios em casa</p>
            <p className="truncate text-muted">
              {data.exercise?.done ? `${data.exercise.done} desafio(s) hoje · ` : 'Faça os desafios do dia e desconte calorias'}
              {data.exercise?.done ? <span className="font-bold text-orange-600">−{n0(burned)} kcal</span> : null}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-faint" />
        </Link>

        <section className="card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold">
              <Scale size={18} className="text-brand" /> Corpo
            </h2>
            <button className="btn-ghost !min-h-9 !py-1.5 !text-xs" onClick={() => setWeigh(true)}>Registrar peso</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Info label="Peso atual" value={r.weightKg != null ? kg(r.weightKg) : '—'} hint={r.lastWeighDay ? `em ${dateFull(r.lastWeighDay)}` : 'sem pesagem'} />
            <Info label="IMC hoje" value={r.bmi != null ? n1(r.bmi) : '—'} hint={r.bmiClass ?? 'informe altura e peso'} />
            <Info label="Meta de peso" value={r.goal ? kg(r.goal.weightKg) : '—'} hint={r.goal ? (r.goal.remaining > 0 ? `faltam ${kg(r.goal.remaining)}` : r.goal.remaining < 0 ? `faltam ${kg(-r.goal.remaining)} a ganhar` : 'meta atingida!') : 'defina no perfil'} />
            <Info label="Progresso" value={r.goal ? `${r.goal.pct}%` : '—'} hint={r.goal ? `início: ${kg(r.goal.startKg)}` : ''} />
          </div>
          {r.goal && (
            <div className="mt-3">
              <Bar value={r.goal.pct / 100} />
            </div>
          )}
        </section>

        <Link to="/progresso" className="card flex items-center gap-3 transition hover:border-brand">
          {r.goalMode === 'massa' ? <TrendingUp size={22} className="shrink-0 text-brand" /> : <TrendingDown size={22} className="shrink-0 text-brand" />}
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-bold">Semana</p>
            <p className="text-muted">
              {r.week.lostKg != null ? (r.week.lostKg >= 0 ? `Perdeu ${kg(r.week.lostKg)}` : `Ganhou ${kg(-r.week.lostKg)}`) : 'Sem pesagens para comparar'}
              {' · '}
              {r.week.avgKcal != null ? `média ${n0(r.week.avgKcal)} kcal/dia` : 'sem refeições na semana'}
              {r.forecast ? ` · previsão ${signedKg(r.forecast.change)}` : ''}
            </p>
          </div>
          <ChevronRight size={18} className="shrink-0 text-faint" />
        </Link>

      </div>
      <WeighSheet open={weigh} onClose={() => setWeigh(false)} onSaved={reload} lastKg={r.weightKg} />
    </>
  );
}

function Info({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-tint p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-0.5 truncate text-lg font-bold">{value}</p>
      {hint && <p className="truncate text-xs text-muted">{hint}</p>}
    </div>
  );
}
