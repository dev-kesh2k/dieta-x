import { CalendarDays, Droplet, Dumbbell, Flag, Flame, Award, Scale, Sparkles, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useApi, type TimelineData, type TimelineMilestone, type TimelineWeek } from '../api';
import { Empty, ErrorBox, Loading, PageHeader } from '../ui';
import { dateFull, dateShort, kg, liters, n0, n1, signedKg } from '../util';

const MILESTONE_ICON: Record<TimelineMilestone['kind'], typeof Flag> = {
  start: Flag,
  weight: Scale,
  bmi: Award,
  goal: Target,
  streak: Flame,
  days: CalendarDays,
};

/** Linha do tempo da dieta: dias desde o início, semanas resumidas e marcos alcançados. */
export default function Timeline() {
  const { data, error, loading, reload } = useApi<TimelineData>('/timeline');
  const header = <PageHeader title="Linha do tempo" subtitle="Sua jornada desde o primeiro dia" />;
  if (!data) return <>{header}{loading ? <Loading /> : <ErrorBox message={error} onRetry={reload} />}</>;
  if (!data.start) {
    return (
      <>
        {header}
        <Empty icon={<CalendarDays size={36} />} text="Sua linha do tempo começa no primeiro registro de refeição, peso ou exercício." />
      </>
    );
  }

  const massa = data.goalMode === 'massa';
  const change = data.weightKg != null && data.startWeightKg != null ? Math.round((data.weightKg - data.startWeightKg) * 10) / 10 : null;
  const good = change != null && (massa ? change > 0 : change < 0);
  const adherence = Math.round((data.loggedDays / data.totalDays) * 100);

  // Semanas e marcos numa só lista, do mais recente para o mais antigo (marcos ficam dentro da semana em que aconteceram).
  const byWeek = data.weeks.map((w) => ({ week: w, marks: data.milestones.filter((m) => m.day >= w.from && m.day <= w.to) }));

  return (
    <>
      {header}
      <div className="space-y-4">
        <section className="card flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-3xl bg-brand text-white shadow-lg shadow-brand/30">
            <span className="text-[11px] font-semibold uppercase opacity-80">Dia</span>
            <span className="text-3xl font-bold leading-none">{n0(data.totalDays)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold">{data.totalDays === 1 ? 'Primeiro dia de dieta' : `${n0(data.totalDays)} dias de dieta`}</p>
            <p className="text-sm text-muted">desde {dateFull(data.start)} · semana {data.weeks.length}</p>
            {change != null && (
              <p className={`mt-1 text-sm font-semibold ${good ? 'text-brand-dark' : change === 0 ? 'text-soft' : 'text-red-600'}`}>
                {signedKg(change)} desde o início ({kg(data.startWeightKg!)} → {kg(data.weightKg!)})
              </p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="Dias registrados" value={`${n0(data.loggedDays)}`} hint={`${adherence}% dos dias`} />
          <MiniStat label="Sequência atual" value={`${data.currentStreak} d`} hint={`recorde: ${data.bestStreak} dias`} />
          <MiniStat label="Exercícios feitos" value={n0(data.exercisesDone)} hint={data.burnedKcal ? `−${n0(data.burnedKcal)} kcal no total` : 'nenhum ainda'} />
          <MiniStat label="Marcos" value={n0(data.milestones.length)} hint="conquistas na jornada" />
        </div>

        <ol className="relative ml-3 space-y-4 border-l-2 border-line pl-6">
          {byWeek.map(({ week, marks }) => (
            <li key={week.n} className="space-y-3">
              {marks.map((m, i) => (
                <Milestone key={`${m.day}-${i}`} m={m} />
              ))}
              <WeekCard w={week} current={week.to === data.today} massa={massa} />
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="card min-w-0 !p-3">
      <p className="truncate text-xs font-semibold text-muted">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="truncate text-xs text-muted">{hint}</p>
    </div>
  );
}

function Milestone({ m }: { m: TimelineMilestone }) {
  const Icon = MILESTONE_ICON[m.kind] ?? Sparkles;
  return (
    <div className="relative">
      <span className="absolute -left-[2.35rem] top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-white ring-4 ring-[rgb(var(--bg))]">
        <Icon size={14} />
      </span>
      <p className="text-sm font-bold">{m.title}</p>
      <p className="text-xs text-muted">
        {dateShort(m.day)} · {m.text}
      </p>
    </div>
  );
}

function WeekCard({ w, current, massa }: { w: TimelineWeek; current: boolean; massa: boolean }) {
  const good = w.weightChange != null && (massa ? w.weightChange > 0 : w.weightChange < 0);
  const Trend = w.weightChange != null && w.weightChange > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="relative">
      <span className={`absolute -left-[2.1rem] top-4 h-4 w-4 rounded-full ring-4 ring-[rgb(var(--bg))] ${current ? 'bg-brand' : 'bg-line2'}`} />
      <section className="card !p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">
            Semana {w.n}
            {current && <span className="ml-1.5 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">atual</span>}
          </h2>
          <span className="shrink-0 text-xs text-muted">
            {dateShort(w.from)}–{dateShort(w.to)}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
          <p className="flex items-center gap-1.5 text-soft">
            <Scale size={14} className="shrink-0 text-brand" />
            {w.weightKg != null ? (
              <>
                {kg(w.weightKg)}
                {w.weightChange != null && w.weightChange !== 0 && (
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${good ? 'text-brand-dark' : 'text-red-600'}`}>
                    <Trend size={12} /> {signedKg(w.weightChange)}
                  </span>
                )}
              </>
            ) : (
              'sem pesagem'
            )}
          </p>
          <p className="flex items-center gap-1.5 text-soft">
            <Flame size={14} className="shrink-0 text-orange-500" />
            {w.avgKcal != null ? `${n0(w.avgKcal)} kcal/dia` : 'sem refeições'}
          </p>
          <p className="flex items-center gap-1.5 text-soft">
            <CalendarDays size={14} className="shrink-0 text-violet-500" />
            {w.daysLogged}/{w.days} dias · {w.daysOnGoal} na meta
          </p>
          <p className="flex items-center gap-1.5 text-soft">
            <Dumbbell size={14} className="shrink-0 text-orange-500" />
            {w.exercises ? `${w.exercises} exercícios` : 'sem exercícios'}
          </p>
          {w.avgWaterMl != null && (
            <p className="flex items-center gap-1.5 text-soft">
              <Droplet size={14} className="shrink-0 text-sky-500" />
              {liters(w.avgWaterMl)}/dia
            </p>
          )}
        </div>
        {w.daysLogged > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint" title={`${n1((w.daysOnGoal / w.days) * 100)}% dos dias na meta`}>
            <div className="h-full rounded-full bg-brand" style={{ width: `${(w.daysOnGoal / w.days) * 100}%` }} />
          </div>
        )}
      </section>
    </div>
  );
}
