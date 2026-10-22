import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, History, Loader2, Pencil, Plus, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import { api, useApi, type Estimate, type Meal, type MealItem } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorBox, Loading, PageHeader, Sheet } from '../ui';
import { MEAL_TYPES, dateLong, mealByHour, mealLabel, n0, n1, parseNum, shiftDay, todayKey } from '../util';

interface Draft {
  id?: string;
  type: string;
  description: string;
  kcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  items: MealItem[];
  source: 'ia' | 'manual';
}

const blank = (): Draft => ({ type: mealByHour(), description: '', kcal: '', proteinG: '', carbsG: '', fatG: '', items: [], source: 'manual' });
const fromMeal = (m: Meal, keepId: boolean): Draft => ({
  id: keepId ? m.id : undefined,
  type: keepId ? m.type : mealByHour(),
  description: m.description,
  kcal: String(m.kcal),
  proteinG: String(m.proteinG).replace('.', ','),
  carbsG: String(m.carbsG).replace('.', ','),
  fatG: String(m.fatG).replace('.', ','),
  items: m.items || [],
  source: m.source,
});

export default function Meals() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const day = params.get('dia') && params.get('dia')! <= today ? params.get('dia')! : today;
  const { data, error, loading, reload } = useApi<{ meals: Meal[] }>(`/meals?day=${day}`);
  const ai = useApi<{ configured: boolean }>('/ai/status');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);

  // Atalho "Adicionar refeição" vindo da tela Hoje.
  useEffect(() => {
    if (params.get('novo')) {
      setDraft(blank());
      params.delete('novo');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const setDay = (d: string) => {
    const next = new URLSearchParams(params);
    if (d === today) next.delete('dia');
    else next.set('dia', d);
    setParams(next, { replace: true });
  };

  const remove = async (m: Meal) => {
    if (!confirm(`Excluir "${m.description}"?`)) return;
    try {
      await api.del(`/meals/${m.id}`);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const meals = data?.meals ?? [];
  const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.proteinG, c: a.c + m.carbsG, f: a.f + m.fatG }), { kcal: 0, p: 0, c: 0, f: 0 });
  const groups = MEAL_TYPES.map((t) => ({ ...t, meals: meals.filter((m) => m.type === t.id) })).filter((g) => g.meals.length);

  return (
    <>
      <PageHeader
        title="Refeições"
        subtitle="Descreva o que comeu e a IA calcula"
        action={
          <button className="btn-primary hidden sm:inline-flex" onClick={() => setDraft(blank())}>
            <Plus size={18} /> Nova refeição
          </button>
        }
      />

      <div className="card mb-4 flex items-center gap-2 !p-2">
        <button className="btn-icon" onClick={() => setDay(shiftDay(day, -1))} aria-label="Dia anterior">
          <ChevronLeft size={20} />
        </button>
        <label className="relative min-w-0 flex-1 text-center">
          <span className="block truncate text-sm font-bold first-letter:uppercase">{day === today ? 'Hoje' : dateLong(day)}</span>
          <span className="block text-xs text-[#5b7068]">{n0(totals.kcal)} kcal · P {n1(totals.p)} g · C {n1(totals.c)} g · G {n1(totals.f)} g</span>
          <input type="date" className="absolute inset-0 cursor-pointer opacity-0" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Escolher dia" />
        </label>
        <button className="btn-icon disabled:opacity-30" onClick={() => setDay(shiftDay(day, 1))} disabled={day >= today} aria-label="Próximo dia">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:hidden">
        <button className="btn-primary" onClick={() => setDraft(blank())}>
          <Plus size={18} /> Nova
        </button>
        <button className="btn-ghost" onClick={() => setRecentOpen(true)}>
          <History size={18} /> Repetir
        </button>
      </div>
      <div className="mb-4 hidden justify-end sm:flex">
        <button className="btn-ghost" onClick={() => setRecentOpen(true)}>
          <History size={18} /> Repetir refeição recente
        </button>
      </div>

      {ai.data && !ai.data.configured && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          O cálculo automático por IA ainda não está ativo. O servidor precisa estar logado na assinatura Claude (<b>claude login</b>). Enquanto isso, informe as calorias manualmente.
        </div>
      )}

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : groups.length === 0 ? (
        <Empty icon={<Utensils size={36} />} text={day === today ? 'Nenhuma refeição registrada hoje.' : 'Nenhuma refeição neste dia.'}>
          <button className="btn-primary" onClick={() => setDraft(blank())}>
            <Plus size={18} /> Adicionar refeição
          </button>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <section key={g.id} className="card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-bold">{g.label}</h2>
                <span className="text-sm font-semibold text-brand-dark">{n0(g.meals.reduce((a, m) => a + m.kcal, 0))} kcal</span>
              </div>
              <ul className="divide-y divide-[#edf4f0]">
                {g.meals.map((m) => (
                  <li key={m.id} className="flex items-start gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{m.description}</p>
                      <p className="mt-0.5 text-xs text-[#5b7068]">
                        <b className="text-[#0f2a22]">{n0(m.kcal)} kcal</b> · P {n1(m.proteinG)} g · C {n1(m.carbsG)} g · G {n1(m.fatG)} g
                        {m.source === 'ia' && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-violet-600">
                            · <Sparkles size={11} /> IA
                          </span>
                        )}
                      </p>
                    </div>
                    <button className="btn-icon" onClick={() => setDraft(fromMeal(m, true))} aria-label="Editar">
                      <Pencil size={17} />
                    </button>
                    <button className="btn-icon hover:!text-red-600" onClick={() => remove(m)} aria-label="Excluir">
                      <Trash2 size={17} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <MealSheet draft={draft} day={day} aiReady={!!ai.data?.configured} onClose={() => setDraft(null)} onSaved={reload} />
      <RecentSheet
        open={recentOpen}
        onClose={() => setRecentOpen(false)}
        onPick={(m) => {
          setRecentOpen(false);
          setDraft(fromMeal(m, false));
        }}
      />
    </>
  );
}

function MealSheet({ draft, day, aiReady, onClose, onSaved }: { draft: Draft | null; day: string; aiReady: boolean; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [d, setD] = useState<Draft>(blank());
  const [estimatedFor, setEstimatedFor] = useState('');
  const [notes, setNotes] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (draft) {
      setD(draft);
      setEstimatedFor(draft.items.length ? draft.description : '');
      setNotes('');
      setError('');
    }
  }, [draft]);

  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }));
  const fmt = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

  const applyItems = (items: MealItem[]) => {
    const sum = (k: keyof MealItem) => items.reduce((a, i) => a + Number(i[k]), 0);
    set({ items, kcal: String(Math.round(sum('kcal'))), proteinG: fmt(sum('proteinG')), carbsG: fmt(sum('carbsG')), fatG: fmt(sum('fatG')) });
  };

  const estimate = async () => {
    if (d.description.trim().length < 3) return setError('Descreva o que você comeu');
    setEstimating(true);
    setError('');
    try {
      const r = await api.post<Estimate>('/meals/estimate', { description: d.description });
      if (!r.items.length) {
        setNotes(r.notes || 'Não identifiquei alimentos na descrição.');
        return;
      }
      applyItems(r.items);
      set({ source: 'ia' });
      setNotes(r.notes);
      setEstimatedFor(d.description);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEstimating(false);
    }
  };

  const save = async () => {
    const kcal = parseNum(d.kcal);
    if (d.description.trim().length < 2) return setError('Descreva a refeição');
    if (kcal == null) return setError(aiReady ? 'Calcule com a IA ou informe as calorias' : 'Informe as calorias');
    setSaving(true);
    setError('');
    const body = {
      day: d.id ? undefined : day,
      type: d.type,
      description: d.description,
      kcal,
      proteinG: parseNum(d.proteinG) ?? 0,
      carbsG: parseNum(d.carbsG) ?? 0,
      fatG: parseNum(d.fatG) ?? 0,
      items: d.items,
      source: d.source,
    };
    try {
      if (d.id) await api.put(`/meals/${d.id}`, body);
      else await api.post('/meals', body);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const stale = !!estimatedFor && estimatedFor !== d.description;

  return (
    <Sheet open={!!draft} onClose={onClose} title={d.id ? 'Editar refeição' : 'Nova refeição'}>
      <div className="space-y-4">
        <div>
          <span className="label">Refeição</span>
          <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
            {MEAL_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => set({ type: t.id })}
                className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${d.type === t.id ? 'bg-brand text-white' : 'bg-[#eef6f2] text-[#3d524a]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="meal-desc">O que você comeu?</label>
          <textarea
            id="meal-desc"
            className="input min-h-[96px] resize-y"
            maxLength={1000}
            placeholder="ex.: 2 ovos mexidos com manteiga, 1 pão francês e café com leite sem açúcar"
            value={d.description}
            onChange={(e) => set({ description: e.target.value })}
          />
          <p className="mt-1 text-xs text-[#5b7068]">Quanto mais detalhes (quantidade, preparo), mais preciso o cálculo.</p>
        </div>

        {aiReady ? (
          <button type="button" className="btn-primary w-full !bg-violet-600 !shadow-[0_6px_16px_rgba(124,58,237,0.3)] hover:!bg-violet-700" onClick={estimate} disabled={estimating}>
            {estimating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {estimating ? 'Calculando…' : estimatedFor ? 'Recalcular com IA' : 'Calcular calorias com IA'}
          </button>
        ) : (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            IA não configurada{user?.role === 'admin' ? '' : ''}. Informe as calorias abaixo.
          </p>
        )}
        {stale && <p className="text-xs font-semibold text-amber-700">A descrição mudou depois do cálculo. Recalcule para atualizar os valores.</p>}

        {d.items.length > 0 && (
          <div className="rounded-xl border border-[#e3efe9]">
            <ul className="divide-y divide-[#edf4f0]">
              {d.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{it.name}</p>
                    <p className="text-xs text-[#5b7068]">
                      {it.quantity} · P {n1(it.proteinG)} · C {n1(it.carbsG)} · G {n1(it.fatG)}
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-sm font-bold">{n0(it.kcal)} kcal</span>
                  <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8a9a93] hover:bg-red-50 hover:text-red-600" onClick={() => applyItems(d.items.filter((_, j) => j !== i))} aria-label={`Remover ${it.name}`}>
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            {notes && <p className="border-t border-[#edf4f0] p-2.5 text-xs text-[#5b7068]">{notes}</p>}
          </div>
        )}
        {!d.items.length && notes && <p className="text-xs text-[#5b7068]">{notes}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Num id="kcal" label="Calorias (kcal)" value={d.kcal} onChange={(v) => set({ kcal: v })} />
          <Num id="prot" label="Proteína (g)" value={d.proteinG} onChange={(v) => set({ proteinG: v })} />
          <Num id="carb" label="Carboidrato (g)" value={d.carbsG} onChange={(v) => set({ carbsG: v })} />
          <Num id="fat" label="Gordura (g)" value={d.fatG} onChange={(v) => set({ fatG: v })} />
        </div>

        <ErrorBox message={error} />
        <button type="button" className="btn-primary w-full" onClick={save} disabled={saving || estimating}>
          {saving ? 'Salvando…' : d.id ? 'Salvar alterações' : 'Salvar refeição'}
        </button>
      </div>
    </Sheet>
  );
}

function Num({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="min-w-0">
      <label className="label truncate" htmlFor={id}>{label}</label>
      <input id={id} className="input" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function RecentSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (m: Meal) => void }) {
  const { data, error, loading } = useApi<{ meals: Meal[] }>(open ? '/meals/recent' : null);
  return (
    <Sheet open={open} onClose={onClose} title="Repetir refeição">
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : !data?.meals.length ? (
        <p className="py-6 text-center text-sm text-[#5b7068]">Você ainda não registrou refeições.</p>
      ) : (
        <ul className="space-y-2">
          {data.meals.map((m) => (
            <li key={m.id}>
              <button className="flex w-full items-center gap-3 rounded-xl border border-[#e3efe9] p-3 text-left transition hover:border-brand active:scale-[0.99]" onClick={() => onPick(m)}>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{m.description}</p>
                  <p className="text-xs text-[#5b7068]">{mealLabel(m.type)} · {n0(m.kcal)} kcal</p>
                </div>
                <Plus size={18} className="shrink-0 text-brand" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
