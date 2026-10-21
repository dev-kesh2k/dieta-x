import { useCallback, useEffect, useState } from 'react';

const BASE = `${import.meta.env.BASE_URL}api`;
const TOKEN_KEY = 'dieta-x:token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error || `Erro ${res.status}`);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b: unknown = {}) => request<T>('POST', p, b),
  put: <T>(p: string, b: unknown) => request<T>('PUT', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

/** Carrega um recurso da API; `reload` busca de novo sem piscar a tela. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}

// ---------- Tipos ----------
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  sex: '' | 'M' | 'F';
  birthDate: string | null;
  heightCm: number | null;
  goalWeightKg: number | null;
  activity: string;
  calorieGoal: number | null;
  waterGoalMl: number;
  createdAt: string;
}

export interface MealItem {
  name: string;
  quantity: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface Meal {
  id: string;
  day: string;
  type: string;
  description: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
  source: 'ia' | 'manual';
  createdAt: string;
}

export interface Estimate {
  items: MealItem[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
  model: string;
}

export interface Report {
  today: string;
  age: number | null;
  weightKg: number | null;
  lastWeighDay: string | null;
  daysSinceWeigh: number | null;
  weighDue: boolean;
  bmi: number | null;
  bmiClass: string | null;
  bmr: number | null;
  tdee: number | null;
  suggestedCalories: number | null;
  calorieGoal: number | null;
  waterGoalMl: number;
  week: { refDay: string | null; lostKg: number | null; avgKcal: number | null; daysLogged: number };
  forecast: { change: number; weightKg: number; energyChange: number | null; trendChange: number | null; bmi: number | null } | null;
  goal: { weightKg: number; startKg: number; remaining: number; pct: number; etaDay: string | null; bmi: number | null } | null;
  missing: string[];
}

export interface Summary {
  day: string;
  report: Report;
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
  meals: number;
  waterMl: number;
  streak: number;
}

export interface WeightEntry {
  id: string;
  day: string;
  weightKg: number;
  note: string;
}

export interface ProgressData {
  report: Report;
  weights: WeightEntry[];
  bmi: { day: string; weightKg: number; bmi: number }[];
  daily: { day: string; kcal: number; waterMl: number }[];
}

export interface WaterEntry {
  id: string;
  ml: number;
  createdAt: string;
}
