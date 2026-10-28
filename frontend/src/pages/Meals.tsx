import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Camera, Check, ChevronLeft, ChevronRight, Clock, History, Loader2, Pencil, Plus, Sparkles, Trash2, Utensils, X } from 'lucide-react';
import { photoToDataUrl } from '../photo';
import { api, useApi, type Estimate, type Meal, type MealItem } from '../api';
import { useAuth } from '../auth';
import { Empty, ErrorBox, Loading, PageHeader, Sheet } from '../ui';
import { MEAL_TYPES, dateLong, fmtMin, mealByHour, mealBySchedule, mealLabel, mealSchedule, n0, n1, parseNum, shiftDay, todayKey, type MealSlot } from '../util';

interface Draft {
  id?: string;
  type: string;
  description: string;
  kcal: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  sugarG: string;
  items: MealItem[];
  source: 'ia' | 'manual';
}

const blank = (type = mealByHour()): Draft => ({ type, description: '', kcal: '', proteinG: '', carbsG: '', fatG: '', sugarG: '', items: [], source: 'manual' });
const fromMeal = (m: Meal, keepId: boolean): Draft => ({
  id: keepId ? m.id : undefined,
  type: keepId ? m.type : mealByHour(),
  description: m.description,
  kcal: String(m.kcal),
  proteinG: String(m.proteinG).replace('.', ','),
  carbsG: String(m.carbsG).replace('.', ','),
  fatG: String(m.fatG).replace('.', ','),
  sugarG: String(m.sugarG ?? 0).replace('.', ','),
  items: m.items || [],
  source: m.source,
});

/** Melhores horários do dia pela rotina de sono do perfil; destaca a refeição da vez e marca as já registradas. */
function MealTimes({ slots, done, isToday, massa }: { slots: MealSlot[]; done: Set<string>; isToday: boolean; massa: boolean }) {
  const now = new Date();
  const current = isToday ? mealBySchedule(slots, now) : null;
  return (
    <section className="card mb-4 !p-3">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Clock size={16} className="text-brand" /> Melhores horários
      </h2>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {slots.map((sl) => {
          const ok = done.has(sl.id);
          const active = !ok && sl.id === current;
          return (
            <li
              key={sl.id}
              title={sl.tip}
              className={`rounded-xl px-2.5 py-1.5 text-xs ${active ? 'bg-brand text-white' : ok ? 'bg-brand-light text-brand-dark' : 'bg-tint text-soft'}`}
            >
              <span className="flex items-center gap-1 font-semibold">
                {ok && <Check size={12} strokeWidth={3} />}
                {sl.label}
                {sl.optional && <span className="font-normal opacity-70">(opcional)</span>}
              </span>
              <span className="block">
                {fmtMin(sl.from)}–{fmtMin(sl.to)}
                {active ? ' · agora' : ''}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">
        {slots.find((sl) => sl.id === current)?.tip ?? 'Intervalos de 3–4 h, mais calorias no café e no almoço e jantar até 3 h antes de dormir.'}
        {massa ? ' Para ganhar massa: 20–40 g de proteína em cada refeição.' : ''} Ajuste seus horários de sono no Perfil.
      </p>
    </section>
  );
}

export default function Meals() {
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const day = params.get('dia') && params.get('dia')! <= today ? params.get('dia')! : today;
  const { data, error, loading, reload } = useApi<{ meals: Meal[] }>(`/meals?day=${day}`);
  const ai = useApi<{ configured: boolean }>('/ai/status');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const { user } = useAuth();
  const slots = mealSchedule(user?.wakeTime, user?.sleepTime);
  const newDraft = () => blank(mealBySchedule(slots));

  // Atalho "Adicionar refeição" vindo da tela Hoje.
  useEffect(() => {
    if (params.get('novo')) {
      setDraft(newDraft());
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
  const totals = meals.reduce((a, m) => ({ kcal: a.kcal + m.kcal, p: a.p + m.proteinG, c: a.c + m.carbsG, f: a.f + m.fatG, s: a.s + m.sugarG }), { kcal: 0, p: 0, c: 0, f: 0, s: 0 });
  const groups = MEAL_TYPES.map((t) => ({ ...t, meals: meals.filter((m) => m.type === t.id) })).filter((g) => g.meals.length);

  return (
    <>
      <PageHeader
        title="Refeições"
        subtitle="Descreva o que comeu e a IA calcula"
        action={
          <button className="btn-primary hidden sm:inline-flex" onClick={() => setDraft(newDraft())}>
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
          <span className="block text-xs text-muted">{n0(totals.kcal)} kcal · P {n1(totals.p)} g · C {n1(totals.c)} g · G {n1(totals.f)} g · A {n1(totals.s)} g</span>
          <input type="date" className="absolute inset-0 cursor-pointer opacity-0" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Escolher dia" />
        </label>
        <button className="btn-icon disabled:opacity-30" onClick={() => setDay(shiftDay(day, 1))} disabled={day >= today} aria-label="Próximo dia">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:hidden">
        <button className="btn-primary" onClick={() => setDraft(newDraft())}>
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

      <MealTimes slots={slots} done={new Set(meals.map((m) => m.type))} isToday={day === today} massa={user?.goalMode === 'massa'} />

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
          <button className="btn-primary" onClick={() => setDraft(newDraft())}>
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
              <ul className="divide-y divide-divider">
                {g.meals.map((m) => (
                  <li key={m.id} className="flex items-start gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{m.description}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        <b className="text-ink">{n0(m.kcal)} kcal</b> · P {n1(m.proteinG)} g · C {n1(m.carbsG)} g · G {n1(m.fatG)} g · A {n1(m.sugarG)} g
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
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draft) {
      setD(draft);
      setEstimatedFor(draft.items.length ? draft.description : '');
      setNotes('');
      setError('');
      setPhotos([]);
    }
  }, [draft]);

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    try {
      const urls = await Promise.all([...files].slice(0, 3 - photos.length).map((f) => photoToDataUrl(f)));
      setPhotos((cur) => [...cur, ...urls].slice(0, 3));
      setEstimatedFor('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const set = (patch: Partial<Draft>) => setD((cur) => ({ ...cur, ...patch }));
  const fmt = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',');

  const applyItems = (items: MealItem[]) => {
    const sum = (k: keyof MealItem) => items.reduce((a, i) => a + Number(i[k]), 0);
    set({ items, kcal: String(Math.round(sum('kcal'))), proteinG: fmt(sum('proteinG')), carbsG: fmt(sum('carbsG')), fatG: fmt(sum('fatG')), sugarG: fmt(sum('sugarG')) });
  };

  const estimate = async () => {
    if (d.description.trim().length < 3 && !photos.length) return setError('Descreva o que você comeu ou adicione uma foto');
    setEstimating(true);
    setError('');
    try {
      const r = await api.post<Estimate>('/meals/estimate', { description: d.description, images: photos });
      if (!r.items.length) {
        setNotes(r.notes || (photos.length ? 'Não identifiquei alimentos na foto.' : 'Não identifiquei alimentos na descrição.'));
        return;
      }
      applyItems(r.items);
      // Só foto: a descrição vira a lista do que a IA reconheceu.
      if (!d.description.trim()) set({ source: 'ia', description: r.items.map((i) => `${i.name} (${i.quantity})`).join(', ').slice(0, 1000) });
      else set({ source: 'ia' });
      setNotes(r.notes);
      setEstimatedFor(d.description.trim() ? d.description : '__foto__');
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
      sugarG: parseNum(d.sugarG) ?? 0,
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

  const stale = !!estimatedFor && estimatedFor !== '__foto__' && estimatedFor !== d.description;

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
                className={`min-h-9 rounded-full px-3 text-xs font-semibold transition ${d.type === t.id ? 'bg-brand text-white' : 'bg-tint text-soft'}`}
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
          <p className="mt-1 text-xs text-muted">Quanto mais detalhes (quantidade, preparo), mais preciso o cálculo.</p>
        </div>

        {aiReady && (
          <div>
            <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line">
                  <img src={src} alt={`Foto ${i + 1} da refeição`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotos((cur) => cur.filter((_, j) => j !== i));
                      setEstimatedFor('');
                    }}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Remover foto"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 ${photos.length ? 'h-20 w-20 flex-col text-xs' : 'h-12 w-full'}`}
                >
                  <Camera size={photos.length ? 20 : 18} />
                  {photos.length ? 'Mais' : 'Tirar ou escolher foto do prato'}
                </button>
              )}
            </div>
            {photos.length > 0 && <p className="mt-1 text-xs text-muted">A IA estima os gramas de cada alimento pela foto. A descrição é opcional e ajuda a acertar (ex.: "arroz integral", "frito no óleo").</p>}
          </div>
        )}

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
          <div className="rounded-xl border border-line">
            <ul className="divide-y divide-divider">
              {d.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">{it.name}</p>
                    <p className="text-xs text-muted">
                      {it.quantity} · P {n1(it.proteinG)} · C {n1(it.carbsG)} · G {n1(it.fatG)} · A {n1(it.sugarG ?? 0)}
                    </p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-sm font-bold">{n0(it.kcal)} kcal</span>
                  <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-faint hover:bg-red-50 hover:text-red-600" onClick={() => applyItems(d.items.filter((_, j) => j !== i))} aria-label={`Remover ${it.name}`}>
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
            {notes && <p className="border-t border-divider p-2.5 text-xs text-muted">{notes}</p>}
          </div>
        )}
        {!d.items.length && notes && <p className="text-xs text-muted">{notes}</p>}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Num id="kcal" label="Calorias (kcal)" value={d.kcal} onChange={(v) => set({ kcal: v })} />
          <Num id="prot" label="Proteína (g)" value={d.proteinG} onChange={(v) => set({ proteinG: v })} />
          <Num id="carb" label="Carboidrato (g)" value={d.carbsG} onChange={(v) => set({ carbsG: v })} />
          <Num id="fat" label="Gordura (g)" value={d.fatG} onChange={(v) => set({ fatG: v })} />
          <Num id="sugar" label="Açúcar (g)" value={d.sugarG} onChange={(v) => set({ sugarG: v })} />
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
        <p className="py-6 text-center text-sm text-muted">Você ainda não registrou refeições.</p>
      ) : (
        <ul className="space-y-2">
          {data.meals.map((m) => (
            <li key={m.id}>
              <button className="flex w-full items-center gap-3 rounded-xl border border-line p-3 text-left transition hover:border-brand active:scale-[0.99]" onClick={() => onPick(m)}>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{m.description}</p>
                  <p className="text-xs text-muted">{mealLabel(m.type)} · {n0(m.kcal)} kcal</p>
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
