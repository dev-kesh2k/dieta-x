import { useState } from 'react';
import { ChefHat, Loader2, ShoppingBasket } from 'lucide-react';
import { api } from '../api';
import { ErrorBox, PageHeader } from '../ui';
import { MEAL_TYPES, mealLabel, n0, n1 } from '../util';

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
  meal: string;
  ingredients: string;
  onlyThese: boolean;
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

/** O dia inteiro ou uma refeição só (a meta é a parte dela nas calorias do dia). */
const MEALS = [{ id: '', label: 'Dia inteiro' }, ...MEAL_TYPES.filter((t) => t.id !== 'outro')];

/** Ingredientes ficam lembrados no aparelho para o próximo cardápio. */
const ING_KEY = 'dieta-x:menu-ingredients';
const loadIngredients = () => {
  try {
    return JSON.parse(localStorage.getItem(ING_KEY) || '') as { text: string; only: boolean };
  } catch {
    return { text: '', only: false };
  }
};

export default function Menu() {
  const [level, setLevel] = useState('facil');
  const [meal, setMeal] = useState('');
  const [ingredients, setIngredients] = useState(() => loadIngredients().text);
  const [onlyThese, setOnlyThese] = useState(() => loadIngredients().only);
  const [menu, setMenu] = useState<MenuResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      localStorage.setItem(ING_KEY, JSON.stringify({ text: ingredients, only: onlyThese }));
    } catch {
      /* sem armazenamento */
    }
    try {
      setMenu(await api.post<MenuResult>('/menu/generate', { level, meal, ingredients, onlyThese }));
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
        <div>
          <span className="label">O que gerar</span>
          <div className="flex flex-wrap gap-2">
            {MEALS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMeal(m.id)}
                className={`min-h-10 rounded-full px-3.5 py-1.5 text-sm font-semibold ${meal === m.id ? 'bg-brand text-white' : 'bg-tint text-soft'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
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
        <div>
          <label className="label flex items-center gap-1.5" htmlFor="menu-ing">
            <ShoppingBasket size={16} className="text-brand" /> Ingredientes que você tem (opcional)
          </label>
          <textarea
            id="menu-ing"
            className="input min-h-20 resize-y"
            maxLength={600}
            placeholder="Ex.: frango, ovos, arroz, feijão, batata-doce, tomate, alface, banana, aveia, iogurte"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
          />
          {ingredients.trim() && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { only: false, label: 'Priorizar estes', hint: 'pode sugerir outros' },
                { only: true, label: 'Só estes', hint: '+ sal, óleo e temperos' },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setOnlyThese(o.only)}
                  className={`min-h-11 rounded-xl px-3 py-2 text-left ${onlyThese === o.only ? 'bg-brand text-white' : 'bg-tint text-soft'}`}
                >
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-xs opacity-80">{o.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <ErrorBox message={error} />
        <button className="btn-primary w-full" onClick={generate} disabled={busy}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />}
          {busy
            ? meal ? 'Montando a receita…' : 'Montando o cardápio… (pode levar um minuto)'
            : meal ? `Gerar ${mealLabel(meal).toLowerCase()}` : menu ? 'Gerar outro cardápio' : 'Gerar cardápio'}
        </button>
      </div>

      {menu && (
        <div className="mt-4 space-y-3">
          <div className="card text-sm">
            <b>{n0(menu.totals.kcal)} kcal</b> de {n0(menu.targetKcal)} kcal{menu.meal ? ` · meta: ${mealLabel(menu.meal)}` : ''} · P {n1(menu.totals.proteinG)} g · C {n1(menu.totals.carbsG)} g · G {n1(menu.totals.fatG)} g
            {menu.ingredients && (
              <p className="mt-1 text-xs text-muted">
                {menu.onlyThese ? 'Só com os seus ingredientes' : 'Priorizando os seus ingredientes; itens marcados "(comprar)" não estão na sua lista'}
              </p>
            )}
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
