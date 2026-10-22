import { Link } from 'react-router-dom';
import { Flame, Trophy } from 'lucide-react';
import { useApi, type RankingData, type RankingEntry } from '../api';
import { Empty, ErrorBox, Loading, PageHeader } from '../ui';
import { n0, signedKg } from '../util';

const MEDAL = ['🥇', '🥈', '🥉'];

function Week({ e }: { e: RankingEntry }) {
  const max = Math.max(e.calorieGoal ?? 0, ...e.daily, 1);
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {e.daily.map((k, i) => {
        const ok = e.calorieGoal != null && k > 0 && Math.abs(k - e.calorieGoal) <= e.calorieGoal * 0.1;
        return <span key={i} className={`w-full rounded-sm ${k === 0 ? 'bg-[#edf4f0]' : ok ? 'bg-brand' : 'bg-[#f97316]'}`} style={{ height: `${Math.max(8, (k / max) * 100)}%` }} />;
      })}
    </div>
  );
}

export default function Ranking() {
  const { data, error, loading, reload } = useApi<RankingData>('/ranking');
  const header = <PageHeader title="Ranking" subtitle="Últimos 7 dias · menos calorias por dia fica em 1º" />;
  if (!data) return <>{header}{loading ? <Loading /> : <ErrorBox message={error} onRetry={reload} />}</>;

  return (
    <>
      {header}
      <div className="space-y-3">
        {!data.joined && (
          <p className="card text-sm text-[#3d524a]">
            Você não está no ranking. <Link to="/perfil" className="font-semibold text-brand-dark underline">Ative “Compartilhar no ranking” no perfil</Link> para aparecer e dividir suas estatísticas.
          </p>
        )}
        {data.entries.length === 0 ? (
          <Empty icon={<Trophy size={32} />} text="Ninguém compartilhou ainda." />
        ) : (
          <ol className="space-y-3">
            {data.entries.map((e, i) => (
              <li key={e.id} className={`card space-y-3 ${e.isMe ? 'ring-2 ring-brand' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-xl font-bold">{MEDAL[i] ?? `${i + 1}º`}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{e.name}{e.isMe ? ' (você)' : ''}</p>
                    <p className="text-xs text-[#5b7068]">{e.daysOnGoal} de 7 dias na meta · {e.daysLogged} registrados</p>
                  </div>
                  {e.streak > 0 && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-orange-600"><Flame size={16} />{e.streak}</span>
                  )}
                </div>
                <Week e={e} />
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[#3d524a] sm:grid-cols-4">
                  <div><dt className="text-[#5b7068]">Hoje</dt><dd className="font-semibold">{n0(e.todayKcal)}{e.calorieGoal ? ` / ${n0(e.calorieGoal)}` : ''} kcal</dd></div>
                  <div><dt className="text-[#5b7068]">Média 7 dias</dt><dd className="font-semibold">{e.avgKcal != null ? `${n0(e.avgKcal)} kcal` : '—'}</dd></div>
                  <div><dt className="text-[#5b7068]">Água hoje</dt><dd className="font-semibold">{n0(e.waterMl)} / {n0(e.waterGoalMl)} ml</dd></div>
                  <div>
                    <dt className="text-[#5b7068]">Resultado</dt>
                    <dd className="font-semibold">
                      {e.lostKg30 != null ? `${signedKg(-e.lostKg30)} em 30 d` : '—'}
                      {e.goalPct != null ? ` · meta ${e.goalPct}%` : ''}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
