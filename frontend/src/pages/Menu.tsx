import { useState } from 'react';
import { ChefHat, Loader2 } from 'lucide-react';
import { api } from '../api';
import { ErrorBox, PageHeader } from '../ui';
import { mealLabel, n0, n1 } from '../util';

interface MenuMeal {
  type: string;
  name: string;
  ingredients: string[];
  preparation: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}
interface MenuResult {
  level: string;
  targetKcal: number;
  meals: MenuMeal[];
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  tips: string;
}

const LEVELS = [
  { id: 'facil', label: 'Fácil', hint: 'até 15 min, ingredientes simples' },
  { id: 'medio', label: 'Médio', hint: '20 a 40 min, receitas caseiras' },
  { id: 'avancado', label: 'Avançado', hint: 'receitas elaboradas' },
];

export default function Menu() {
  const [level, setLevel] = useState('facil');
  const [menu, setMenu] = useState<MenuResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      setMenu(await api.post<MenuResult>('/menu/generate', { level }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Cardápio" subtitle="Cardápio do dia na sua meta de calorias" />
      <div className="card space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLevel(l.id)}
              className={`min-h-11 rounded-xl px-3 py-2 text-left ${level === l.id ? 'bg-brand text-white' : 'bg-tint text-soft'}`}
            >
              <span className="block text-sm font-semibold">{l.label}</span>
              <span className="block text-xs opacity-80">{l.hint}</span>
            </button>
          ))}
        </div>
        <ErrorBox message={error} />
        <button className="btn-primary w-full" onClick={generate} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />}
          {busy ? 'Montando o cardápio… (pode levar um minuto)' : menu ? 'Gerar outro cardápio' : 'Gerar cardápio'}
        </button>
      </div>

      {menu && (
        <div className="mt-4 space-y-3">
          <div className="card text-sm">
            <b>{n0(menu.totals.kcal)} kcal</b> de {n0(menu.targetKcal)} kcal · P {n1(menu.totals.proteinG)} g · C {n1(menu.totals.carbsG)} g · G {n1(menu.totals.fatG)} g
            {menu.tips && <p className="mt-2 text-xs text-muted">{menu.tips}</p>}
          </div>
          {menu.meals.map((m, i) => (
            <div key={i} className="card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted">{mealLabel(m.type)}</p>
                  <h3 className="break-words font-bold">{m.name}</h3>
                </div>
                <span className="shrink-0 text-sm font-semibold">{n0(m.kcal)} kcal</span>
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {m.ingredients.map((ing, j) => (
                  <li key={j}>{ing}</li>
                ))}
              </ul>
              <p className="text-sm text-soft">{m.preparation}</p>
              <p className="text-xs text-muted">P {n1(m.proteinG)} g · C {n1(m.carbsG)} g · G {n1(m.fatG)} g</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
