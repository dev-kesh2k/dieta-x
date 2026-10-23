import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Trophy } from 'lucide-react';
import { useApi, type RankingData, type RankingEntry } from '../api';
import { Empty, ErrorBox, Loading, PageHeader } from '../ui';
import { n0, signedKg } from '../util';

const MEDAL = ['🥇', '🥈', '🥉'];

type Mode = 'kcal' | 'weight';
const MODES: { id: Mode; label: string; subtitle: string }[] = [
  { id: 'kcal', label: 'Menos calorias', subtitle: 'Média dos últimos 7 dias · quem consumiu menos fica em 1º' },
  { id: 'weight', label: 'Mais peso perdido', subtitle: 'Últimos 30 dias · quem perdeu mais peso fica em 1º' },
];

// Quem não tem dado (sem refeição / menos de 2 pesagens) vai para o fim.
function sorted(entries: RankingEntry[], mode: Mode) {
  const key = (e: RankingEntry) => (mode === 'kcal' ? (e.avgKcal ?? Infinity) : -(e.lostKg30 ?? -Infinity));
  return [...entries].sort((a, b) => key(a) - key(b) || b.daysLogged - a.daysLogged || a.name.localeCompare(b.name));
}

function score(e: RankingEntry, mode: Mode) {
  if (mode === 'kcal') return e.avgKcal != null ? `${n0(e.avgKcal)} kcal/dia` : 'sem registro';
  return e.lostKg30 != null ? `${signedKg(-e.lostKg30)}` : 'sem pesagens';
}

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
  const [mode, setMode] = useState<Mode>('kcal');
  const header = <PageHeader title="Ranking" subtitle={MODES.find((m) => m.id === mode)!.subtitle} />;
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
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#edf4f0] p-1" role="tablist">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === m.id ? 'bg-white text-brand-dark shadow-sm' : 'text-[#5b7068]'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {data.entries.length === 0 ? (
          <Empty icon={<Trophy size={32} />} text="Ninguém compartilhou ainda." />
        ) : (
          <ol className="space-y-3">
            {sorted(data.entries, mode).map((e, i) => (
              <li key={e.id} className={`card space-y-3 ${e.isMe ? 'ring-2 ring-brand' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="w-8 text-center text-xl font-bold">{MEDAL[i] ?? `${i + 1}º`}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{e.name}{e.isMe ? ' (você)' : ''}</p>
                    <p className="text-xs text-[#5b7068]">{e.daysOnGoal} de 7 dias na meta · {e.daysLogged} registrados</p>
                  </div>
                  <span className={`text-right text-sm font-bold ${mode === 'weight' && e.lostKg30 != null ? (e.lostKg30 > 0 ? 'text-brand' : 'text-red-600') : ''}`}>{score(e, mode)}</span>
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
