import { useState, type FormEvent } from 'react';
import { CheckCircle2, KeyRound, LogOut } from 'lucide-react';
import { api, useApi, type Summary, type User } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, PageHeader } from '../ui';
import { ACTIVITY_LEVELS, n0, parseNum, todayKey } from '../util';

export default function Profile() {
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <>
      <PageHeader title="Perfil" subtitle={user.email} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
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
              <button key={s} type="button" onClick={() => set({ sex: s })} className={`min-h-11 rounded-xl text-sm font-semibold ${f.sex === s ? 'bg-brand text-white' : 'bg-[#eef6f2] text-[#3d524a]'}`}>
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
      <p className="rounded-xl bg-[#f3faf7] p-3 text-xs text-[#5b7068]">
        Peso atual: <b className="text-[#0f2a22]">{r?.weightKg != null ? `${String(r.weightKg).replace('.', ',')} kg` : 'sem pesagem'}</b> — registre o peso na tela Progresso (uma vez por semana).
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

      <div className="rounded-xl border border-[#e3efe9] p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Meta de calorias automática</span>
          <button
            type="button"
            role="switch"
            aria-checked={f.autoCalories}
            aria-label="Meta de calorias automática"
            onClick={() => set({ autoCalories: !f.autoCalories, calorieGoal: f.calorieGoal || str(r?.suggestedCalories) })}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${f.autoCalories ? 'bg-brand' : 'bg-[#cfdcd6]'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${f.autoCalories ? 'left-[1.375rem]' : 'left-0.5'}`} />
          </button>
        </div>
        <p className="mt-1 text-xs text-[#5b7068]">
          {r?.tdee
            ? `Metabolismo basal ${n0(r.bmr!)} kcal · gasto diário ≈ ${n0(r.tdee)} kcal · sugerido para sua meta: ${n0(r.suggestedCalories!)} kcal/dia.`
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
          <p className="mt-1 text-xs text-[#5b7068]">
            Recomendação para o seu peso: ~{n0(waterHint)} ml (35 ml/kg).{' '}
            <button type="button" className="font-semibold text-brand-dark underline" onClick={() => set({ waterGoalMl: String(waterHint) })}>
              Usar
            </button>
          </p>
        )}
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
