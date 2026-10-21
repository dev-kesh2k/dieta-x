import { useState } from 'react';
import { Plus, Scale, Trash2 } from 'lucide-react';
import { api, useApi, type ProgressData } from '../api';
import { BarChart, LineChart } from '../charts';
import { Empty, ErrorBox, Loading, PageHeader, Stat } from '../ui';
import { WeighSheet } from '../widgets';
import { dateFull, dateShort, kg, n0, n1, signedKg } from '../util';

export default function Progress() {
  const { data, error, loading, reload } = useApi<ProgressData>('/progress');
  const [weigh, setWeigh] = useState(false);

  const header = (
    <PageHeader
      title="Progresso"
      subtitle="Peso, IMC e previsões"
      action={
        <button className="btn-primary !px-3 sm:!px-5" onClick={() => setWeigh(true)} aria-label="Registrar peso">
          <Plus size={18} /> <span className="hidden min-[400px]:inline">Pesagem</span>
        </button>
      }
    />
  );
  if (!data) return <>{header}{loading ? <Loading /> : <ErrorBox message={error} onRetry={reload} />}<WeighSheet open={weigh} onClose={() => setWeigh(false)} onSaved={reload} /></>;

  const { report: r, weights, bmi, daily } = data;

  const remove = async (id: string, day: string) => {
    if (!confirm(`Excluir a pesagem de ${dateFull(day)}?`)) return;
    try {
      await api.del(`/weights/${id}`);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const lost = r.week.lostKg;
  return (
    <>
      {header}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Última semana"
            value={lost == null ? '—' : lost >= 0 ? `−${n1(lost)} kg` : `+${n1(-lost)} kg`}
            tone={lost == null ? 'default' : lost >= 0 ? 'good' : 'bad'}
            hint={lost == null ? 'precisa de 2 pesagens' : `${lost >= 0 ? 'perdidos' : 'ganhos'} desde ${dateShort(r.week.refDay!)}`}
          />
          <Stat
            label="Média de calorias"
            value={r.week.avgKcal != null ? `${n0(r.week.avgKcal)} kcal` : '—'}
            hint={r.week.daysLogged ? `por dia · ${r.week.daysLogged} de 7 dias registrados` : 'nenhuma refeição nos últimos 7 dias'}
          />
          <Stat
            label="Previsão próx. semana"
            value={r.forecast ? kg(r.forecast.weightKg) : '—'}
            tone={r.forecast ? (r.forecast.change <= 0 ? 'good' : 'bad') : 'default'}
            hint={r.forecast ? `${signedKg(r.forecast.change)} em 7 dias` : 'registre peso e refeições'}
          />
          <Stat
            label="IMC hoje"
            value={r.bmi != null ? n1(r.bmi) : '—'}
            hint={r.bmiClass ?? 'informe altura e peso'}
          />
        </div>

        {(r.forecast || r.goal) && (
          <section className="card space-y-2 text-sm">
            <h2 className="font-bold">Como chegamos na previsão</h2>
            {r.forecast && (
              <ul className="list-disc space-y-1 pl-5 text-[#3d524a]">
                {r.forecast.energyChange != null && (
                  <li>
                    Balanço calórico: você come em média {n0(r.week.avgKcal ?? 0)} kcal e gasta cerca de {n0(r.tdee ?? 0)} kcal por dia → {signedKg(r.forecast.energyChange)} por semana (7.700 kcal ≈ 1 kg).
                  </li>
                )}
                {r.forecast.trendChange != null && <li>Tendência das pesagens dos últimos 28 dias: {signedKg(r.forecast.trendChange)} por semana.</li>}
                {r.forecast.energyChange != null && r.forecast.trendChange != null && <li>A previsão é a média das duas estimativas.</li>}
                {r.forecast.bmi != null && <li>IMC previsto para daqui a 7 dias: {n1(r.forecast.bmi)}.</li>}
              </ul>
            )}
            {r.goal && (
              <p className="text-[#3d524a]">
                Meta de {kg(r.goal.weightKg)} (IMC {r.goal.bmi != null ? n1(r.goal.bmi) : '—'}): {r.goal.pct}% concluído.{' '}
                {r.goal.remaining === 0 ? 'Meta atingida! 🎉' : r.goal.etaDay ? `No ritmo atual, você chega lá por volta de ${dateFull(r.goal.etaDay)}.` : 'Ainda não dá para estimar a data no ritmo atual.'}
              </p>
            )}
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card">
            <h2 className="mb-3 font-bold">Peso</h2>
            {weights.length ? (
              <LineChart points={weights.map((w) => ({ label: dateShort(w.day), value: w.weightKg }))} target={r.goal?.weightKg} targetLabel="meta" />
            ) : (
              <Empty icon={<Scale size={32} />} text="Registre seu peso semanalmente para ver o gráfico." />
            )}
          </section>
          <section className="card">
            <h2 className="mb-3 font-bold">IMC diário</h2>
            {bmi.length ? (
              <LineChart points={bmi.map((b) => ({ label: dateShort(b.day), value: b.bmi }))} target={24.9} targetLabel="normal ≤ 24,9" color="#0d9488" />
            ) : (
              <p className="py-8 text-center text-sm text-[#5b7068]">Informe a altura no perfil e registre o peso.</p>
            )}
          </section>
          <section className="card">
            <h2 className="mb-3 font-bold">Calorias (14 dias)</h2>
            <BarChart points={daily.map((d) => ({ label: dateShort(d.day), value: d.kcal }))} target={r.calorieGoal} targetLabel="meta" color="#f97316" />
          </section>
          <section className="card">
            <h2 className="mb-3 font-bold">Água (14 dias, ml)</h2>
            <BarChart points={daily.map((d) => ({ label: dateShort(d.day), value: d.waterMl }))} target={r.waterGoalMl} targetLabel="meta" color="#0ea5e9" overColor="#0ea5e9" />
          </section>
        </div>

        <section className="card">
          <h2 className="mb-2 font-bold">Pesagens</h2>
          {weights.length === 0 ? (
            <p className="py-4 text-sm text-[#5b7068]">Nenhuma pesagem registrada.</p>
          ) : (
            <ul className="divide-y divide-[#edf4f0]">
              {[...weights].reverse().map((w, i, arr) => {
                const prev = arr[i + 1];
                const diff = prev ? Math.round((w.weightKg - prev.weightKg) * 10) / 10 : null;
                return (
                  <li key={w.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {kg(w.weightKg)}
                        {diff != null && diff !== 0 && <span className={`ml-2 text-xs ${diff < 0 ? 'text-brand' : 'text-red-600'}`}>{signedKg(diff)}</span>}
                      </p>
                      <p className="truncate text-xs text-[#5b7068]">
                        {dateFull(w.day)}
                        {w.note ? ` · ${w.note}` : ''}
                      </p>
                    </div>
                    <button className="btn-icon hover:!text-red-600" onClick={() => remove(w.id, w.day)} aria-label={`Excluir pesagem de ${dateFull(w.day)}`}>
                      <Trash2 size={17} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <WeighSheet open={weigh} onClose={() => setWeigh(false)} onSaved={reload} lastKg={r.weightKg} />
    </>
  );
}
