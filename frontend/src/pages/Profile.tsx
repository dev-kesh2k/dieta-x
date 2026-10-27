import { useRef, useState, type FormEvent } from 'react';
import { Camera, Check, CheckCircle2, KeyRound, LogOut, Trash2 } from 'lucide-react';
import { api, useApi, type Summary, type User } from '../api';
import { useAuth } from '../auth';
import { Avatar, ErrorBox, PageHeader } from '../ui';
import { avatarFromFile } from '../photo';
import { THEMES, applyTheme } from '../theme';
import { ACTIVITY_LEVELS, n0, parseNum, todayKey } from '../util';

export default function Profile() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader title="Perfil" subtitle={user.email} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <LookCard user={user} />
          <PersonalForm user={user} />
        </div>
        <div className="space-y-4">
          <PasswordForm />
          <button className="btn-ghost w-full !bg-red-50 !text-red-700" onClick={logout}>
            <LogOut size={18} /> Sair
          </button>
        </div>
      </div>
    </>
  );
}

/** Foto de perfil e tema: salvam na hora, sem precisar do botão Salvar. */
function LookCard({ user }: { user: User }) {
  const { setUser } = useAuth();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (data: { avatarUrl?: string | null; theme?: string }) => {
    setBusy(true);
    setError('');
    try {
      const { user: u } = await api.put<{ user: User }>('/me', data);
      setUser(u);
    } catch (err) {
      setError((err as Error).message);
      if (data.theme) applyTheme(user.theme);
    } finally {
      setBusy(false);
    }
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      await save({ avatarUrl: await avatarFromFile(f) });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="card space-y-4">
      <h2 className="font-bold">Foto e aparência</h2>
      <div className="flex items-center gap-4">
        <button type="button" className="relative shrink-0" onClick={() => file.current?.click()} aria-label="Trocar foto de perfil" disabled={busy}>
          <Avatar name={user.name} src={user.avatarUrl} size={80} />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-brand text-white">
            <Camera size={15} />
          </span>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button type="button" className="btn-ghost !min-h-10 !py-2" onClick={() => file.current?.click()} disabled={busy}>
            <Camera size={16} /> {user.avatarUrl ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {user.avatarUrl && (
            <button type="button" className="btn-ghost !min-h-10 !bg-red-50 !py-2 !text-red-700" onClick={() => save({ avatarUrl: null })} disabled={busy}>
              <Trash2 size={16} /> Remover foto
            </button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      <div>
        <span className="label">Tema</span>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = (user.theme || 'verde') === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={busy}
                aria-pressed={active}
                onClick={() => {
                  applyTheme(t.id);
                  save({ theme: t.id });
                }}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 text-xs font-semibold transition active:scale-95 ${
                  active ? 'border-brand bg-brand-light text-brand-dark' : 'border-line bg-tint text-soft'
                }`}
              >
                <span className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-xl" style={{ background: t.swatch[1] }}>
                  <span className="h-5 w-5 rounded-full" style={{ background: t.swatch[0] }} />
                  {active && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <ErrorBox message={error} />
    </section>
  );
}

const str = (v: number | null | undefined) => (v == null ? '' : String(v).replace('.', ','));

function PersonalForm({ user }: { user: User }) {
  const { setUser } = useAuth();
  const summary = useApi<Summary>('/summary');
  const [f, setF] = useState({
    name: user.name,
    sex: user.sex,
    birthDate: user.birthDate ?? '',
    heightCm: str(user.heightCm),
    goalWeightKg: str(user.goalWeightKg),
    activity: user.activity,
    autoCalories: user.calorieGoal == null,
    calorieGoal: str(user.calorieGoal),
    waterGoalMl: String(user.waterGoalMl),
    shareRanking: user.shareRanking,
  });
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => {
    setF((cur) => ({ ...cur, ...p }));
    setSaved(false);
  };

  const r = summary.data?.report;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user: u } = await api.put<{ user: User }>('/me', {
        name: f.name,
        sex: f.sex,
        birthDate: f.birthDate || null,
        heightCm: parseNum(f.heightCm),
        goalWeightKg: parseNum(f.goalWeightKg),
        activity: f.activity,
        calorieGoal: f.autoCalories ? null : parseNum(f.calorieGoal),
        waterGoalMl: parseNum(f.waterGoalMl),
        shareRanking: f.shareRanking,
      });
      setUser(u);
      setSaved(true);
      summary.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Sugestão de água: 35 ml por kg de peso.
  const waterHint = r?.weightKg ? Math.round((r.weightKg * 35) / 100) * 100 : null;

  return (
    <form onSubmit={submit} className="card space-y-4">
      <h2 className="font-bold">Minhas informações</h2>
      <div>
        <label className="label" htmlFor="p-name">Nome</label>
        <input id="p-name" className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Sexo</span>
          <div className="grid grid-cols-2 gap-2">
            {(['F', 'M'] as const).map((s) => (
              <button key={s} type="button" onClick={() => set({ sex: s })} className={`min-h-11 rounded-xl text-sm font-semibold ${f.sex === s ? 'bg-brand text-white' : 'bg-tint text-soft'}`}>
                {s === 'F' ? 'Feminino' : 'Masculino'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-birth">Data de nascimento {r?.age != null && <span className="font-normal">({r.age} anos)</span>}</label>
          <input id="p-birth" type="date" className="input" max={todayKey()} value={f.birthDate} onChange={(e) => set({ birthDate: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="p-height">Altura (cm)</label>
          <input id="p-height" className="input" inputMode="decimal" placeholder="ex.: 170" value={f.heightCm} onChange={(e) => set({ heightCm: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="p-goal">Meta de peso (kg)</label>
          <input id="p-goal" className="input" inputMode="decimal" placeholder="ex.: 70" value={f.goalWeightKg} onChange={(e) => set({ goalWeightKg: e.target.value })} />
        </div>
      </div>
      <p className="rounded-xl bg-tint p-3 text-xs text-muted">
        Peso atual: <b className="text-ink">{r?.weightKg != null ? `${String(r.weightKg).replace('.', ',')} kg` : 'sem pesagem'}</b> — registre o peso na tela Progresso (uma vez por semana).
      </p>

      <div>
        <label className="label" htmlFor="p-activity">Nível de atividade</label>
        <select id="p-activity" className="input" value={f.activity} onChange={(e) => set({ activity: e.target.value })}>
          {ACTIVITY_LEVELS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} ({a.hint})
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Meta de calorias automática</span>
          <button
            type="button"
            role="switch"
            aria-checked={f.autoCalories}
            aria-label="Meta de calorias automática"
            onClick={() => set({ autoCalories: !f.autoCalories, calorieGoal: f.calorieGoal || str(r?.suggestedCalories) })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${f.autoCalories ? 'bg-brand' : 'bg-line2'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow transition-all ${f.autoCalories ? 'left-[1.375rem]' : 'left-0.5'}`} />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          {r?.tdee
            ? `Metabolismo basal ${n0(r.bmr!)} kcal · gasto diário ≈ ${n0(r.tdee)} kcal${r.goalCalories ? ` · meta para ${r.goalCalories > r.tdee! ? 'ganhar' : 'emagrecer'}: ${n0(r.goalCalories)} kcal/dia` : ''}.`
            : 'Preencha sexo, nascimento, altura e registre o peso para calcularmos a meta.'}
        </p>
        {!f.autoCalories && (
          <div className="mt-3">
            <label className="label" htmlFor="p-kcal">Minha meta (kcal/dia)</label>
            <input id="p-kcal" className="input" inputMode="numeric" value={f.calorieGoal} onChange={(e) => set({ calorieGoal: e.target.value })} />
          </div>
        )}
      </div>

      <div>
        <label className="label" htmlFor="p-water">Meta de água (ml/dia)</label>
        <input id="p-water" className="input" inputMode="numeric" value={f.waterGoalMl} onChange={(e) => set({ waterGoalMl: e.target.value })} />
        {waterHint && (
          <p className="mt-1 text-xs text-muted">
            Recomendação para o seu peso: ~{n0(waterHint)} ml (35 ml/kg).{' '}
            <button type="button" className="font-semibold text-brand-dark underline" onClick={() => set({ waterGoalMl: String(waterHint) })}>
              Usar
            </button>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Compartilhar no ranking</span>
          <button
            type="button"
            role="switch"
            aria-checked={f.shareRanking}
            aria-label="Compartilhar no ranking"
            onClick={() => set({ shareRanking: !f.shareRanking })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${f.shareRanking ? 'bg-brand' : 'bg-line2'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow transition-all ${f.shareRanking ? 'left-[1.375rem]' : 'left-0.5'}`} />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">Mostra seu nome, calorias, metas e resultados dos últimos 7 dias aos outros usuários. O peso em kg não é exibido.</p>
      </div>

      <ErrorBox message={error} />
      <button className="btn-primary w-full" disabled={busy}>
        {saved ? <CheckCircle2 size={18} /> : null}
        {busy ? 'Salvando…' : saved ? 'Salvo' : 'Salvar informações'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api.put('/me/password', { currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setMsg('Senha alterada. Se ela estiver guardada no Cofre do Hub, atualize lá também.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="flex items-center gap-2 font-bold">
        <KeyRound size={18} /> Trocar senha
      </h2>
      <input type="password" className="input" placeholder="Senha atual" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required aria-label="Senha atual" />
      <input type="password" className="input" placeholder="Nova senha (mín. 8)" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required aria-label="Nova senha" />
      <ErrorBox message={error} />
      {msg && <p className="text-sm text-brand-dark">{msg}</p>}
      <button className="btn-ghost w-full" disabled={busy}>{busy ? 'Salvando…' : 'Alterar senha'}</button>
    </form>
  );
}
