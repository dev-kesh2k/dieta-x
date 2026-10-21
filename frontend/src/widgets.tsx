import { useState, type FormEvent } from 'react';
import { Droplet, GlassWater, Plus, Trash2 } from 'lucide-react';
import { api, useApi, type WaterEntry } from './api';
import { Bar, ErrorBox, Sheet } from './ui';
import { liters, n0, parseNum, todayKey } from './util';

/** Registro de pesagem (cria ou substitui a do mesmo dia). */
export function WeighSheet({ open, onClose, onSaved, lastKg }: { open: boolean; onClose: () => void; onSaved: () => void; lastKg?: number | null }) {
  const [day, setDay] = useState(todayKey());
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const w = parseNum(weight);
    if (w == null) return setError('Informe o peso em kg');
    setBusy(true);
    setError('');
    try {
      await api.post('/weights', { day, weightKg: w, note });
      setWeight('');
      setNote('');
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Registrar peso">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="w-kg">Peso (kg)</label>
            <input id="w-kg" className="input" inputMode="decimal" placeholder={lastKg ? String(lastKg).replace('.', ',') : 'ex.: 82,5'} value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="w-day">Data</label>
            <input id="w-day" type="date" className="input" value={day} max={todayKey()} onChange={(e) => setDay(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="w-note">Observação (opcional)</label>
          <input id="w-note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex.: em jejum, após o banho" />
        </div>
        <p className="text-xs text-[#5b7068]">Dica: pese-se uma vez por semana, no mesmo dia e horário, em jejum. Se já houver pesagem nesta data, ela será substituída.</p>
        <ErrorBox message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Salvando…' : 'Salvar pesagem'}</button>
      </form>
    </Sheet>
  );
}

const QUICK = [200, 300, 500];

/** Água do dia: adicionar copos, ver progresso e desfazer registros. */
export function WaterCard({ day, goalMl, onChange }: { day: string; goalMl: number; onChange?: () => void }) {
  const { data, error, reload } = useApi<{ entries: WaterEntry[]; totalMl: number }>(`/water?day=${day}`);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const total = data?.totalMl ?? 0;

  const add = async (ml: number) => {
    setBusy(true);
    setErr('');
    try {
      await api.post('/water', { day, ml });
      await reload();
      onChange?.();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setErr('');
    try {
      await api.del(`/water/${id}`);
      await reload();
      onChange?.();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const left = Math.max(0, goalMl - total);
  return (
    <section className="card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Droplet size={18} className="text-sky-500" /> Água
        </h2>
        <span className="text-sm font-semibold text-sky-700">
          {liters(total)} / {liters(goalMl)}
        </span>
      </div>
      <div className="mt-3">
        <Bar value={goalMl ? total / goalMl : 0} color="bg-sky-500" />
        <p className="mt-1.5 text-xs text-[#5b7068]">{left > 0 ? `Faltam ${liters(left)} (≈ ${Math.ceil(left / 250)} copos de 250 ml)` : 'Meta de água batida! 🎉'}</p>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK.map((ml) => (
          <button key={ml} className="btn-ghost !gap-1 whitespace-nowrap !bg-sky-50 !px-1 !text-sky-700" disabled={busy} onClick={() => add(ml)}>
            <GlassWater size={16} className="hidden min-[360px]:block" /> {ml} ml
          </button>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = parseNum(custom);
          if (v == null || v < 10) return setErr('Informe a quantidade em ml');
          setCustom('');
          add(Math.round(v));
        }}
      >
        <input className="input" inputMode="numeric" placeholder="Outro valor (ml)" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Quantidade em ml" />
        <button className="btn-icon !bg-sky-500 !text-white" disabled={busy} aria-label="Adicionar água">
          <Plus size={20} />
        </button>
      </form>
      <div className="mt-2">
        <ErrorBox message={err || error} />
      </div>
      {!!data?.entries.length && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {data.entries.map((e) => (
            <li key={e.id} className="flex items-center gap-1 rounded-full bg-sky-50 py-1 pl-3 pr-1 text-xs font-semibold text-sky-800">
              {n0(e.ml)} ml · {new Date(e.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              <button className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-sky-100" onClick={() => remove(e.id)} aria-label={`Remover ${e.ml} ml`}>
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
