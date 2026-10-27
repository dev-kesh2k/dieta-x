import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma, HttpError, addDays, dayKey, isDay } from './db.js';
import { publicUser, requireAdmin, requireAuth, signToken } from './auth.js';
import { ACTIVITY, MEAL_TYPES, bmiSeries, report } from './diet.js';
import { EXERCISES, exerciseKcal, findExercise } from './exercises.js';
import { DEFAULT_MODEL, MODELS, aiConfig, askCalories, estimateMeal, generateMenu, MENU_LEVELS, parseImages, saveModel, testAi } from './ai.js';

export const api = Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);
const LOGIN_RE = /^[a-z0-9._@-]{3,160}$/;

/** Número validado; `optional` aceita vazio (null). */
function num(v, label, min, max, { optional = false, int = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    throw new HttpError(400, `Informe ${label}`);
  }
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${label[0].toUpperCase()}${label.slice(1)} deve estar entre ${min} e ${max}`);
  return int ? Math.round(n) : Math.round(n * 10) / 10;
}

const dayParam = (v, { future = false } = {}) => {
  if (v === undefined || v === '') return dayKey();
  if (!isDay(v)) throw new HttpError(400, 'Data inválida');
  if (!future && v > dayKey()) throw new HttpError(400, 'A data não pode estar no futuro');
  return v;
};

api.get('/health', wrap(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ ok: true, db: true });
}));

// ---------- Autenticação ----------
const attempts = new Map();
function checkRate(key) {
  const a = attempts.get(key) || { n: 0, until: 0 };
  if (a.until > Date.now()) throw new HttpError(429, 'Muitas tentativas. Aguarde alguns minutos.');
  return a;
}

api.post('/auth/login', wrap(async (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const password = String(req.body?.password ?? '');
  const key = `${req.ip}|${email}`;
  const a = checkRate(key);
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    a.n += 1;
    if (a.n >= 5) Object.assign(a, { n: 0, until: Date.now() + 5 * 60000 });
    attempts.set(key, a);
    throw new HttpError(401, 'Usuário ou senha incorretos');
  }
  attempts.delete(key);
  res.json({ token: signToken(user), user: publicUser(user) });
}));

api.use(requireAuth);

// ---------- Perfil ----------
api.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

api.put('/me', wrap(async (req, res) => {
  const b = req.body || {};
  const data = {};
  if (b.name !== undefined) {
    data.name = str(b.name, 80);
    if (data.name.length < 2) throw new HttpError(400, 'Informe seu nome');
  }
  if (b.email !== undefined) {
    data.email = str(b.email, 160).toLowerCase();
    if (!LOGIN_RE.test(data.email)) throw new HttpError(400, 'Usuário inválido (mín. 3 caracteres: letras, números, ponto, hífen ou _)');
    const other = await prisma.user.findUnique({ where: { email: data.email } });
    if (other && other.id !== req.user.id) throw new HttpError(409, 'Este usuário já está em uso');
  }
  if (b.sex !== undefined) data.sex = ['', 'M', 'F'].includes(b.sex) ? b.sex : '';
  if (b.birthDate !== undefined) {
    if (b.birthDate === '' || b.birthDate === null) data.birthDate = null;
    else {
      if (!isDay(b.birthDate)) throw new HttpError(400, 'Data de nascimento inválida');
      const today = dayKey();
      if (b.birthDate > addDays(today, -365 * 10) || b.birthDate < '1900-01-01') throw new HttpError(400, 'Data de nascimento fora do intervalo aceito');
      data.birthDate = b.birthDate;
    }
  }
  if (b.heightCm !== undefined) data.heightCm = num(b.heightCm, 'a altura (cm)', 100, 250, { optional: true });
  if (b.goalWeightKg !== undefined) data.goalWeightKg = num(b.goalWeightKg, 'o peso meta (kg)', 30, 300, { optional: true });
  if (b.activity !== undefined) {
    if (!(b.activity in ACTIVITY)) throw new HttpError(400, 'Nível de atividade inválido');
    data.activity = b.activity;
  }
  if (b.calorieGoal !== undefined) data.calorieGoal = num(b.calorieGoal, 'a meta de calorias', 800, 6000, { optional: true, int: true });
  if (b.shareRanking !== undefined) data.shareRanking = b.shareRanking === true;
  if (b.waterGoalMl !== undefined) data.waterGoalMl = num(b.waterGoalMl, 'a meta de água (ml)', 500, 8000, { int: true });
  const user = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ user: publicUser(user) });
}));

api.put('/me/password', wrap(async (req, res) => {
  const current = String(req.body?.currentPassword ?? '');
  const next = String(req.body?.newPassword ?? '');
  if (!(await bcrypt.compare(current, req.user.passwordHash))) throw new HttpError(400, 'Senha atual incorreta');
  if (next.length < 8) throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres');
  await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  res.json({ ok: true });
}));

// ---------- Resumo ----------
async function loadReportData(userId, today) {
  const [weights, meals] = await Promise.all([
    prisma.weightEntry.findMany({ where: { userId }, orderBy: { day: 'asc' } }),
    prisma.meal.groupBy({ by: ['day'], where: { userId, day: { gte: addDays(today, -29), lte: today } }, _sum: { kcal: true } }),
  ]);
  const kcalByDay = Object.fromEntries(meals.map((m) => [m.day, m._sum.kcal || 0]));
  return { weights, kcalByDay };
}

api.get('/summary', wrap(async (req, res) => {
  const day = dayParam(req.query.day);
  const today = dayKey();
  const { weights, kcalByDay } = await loadReportData(req.user.id, today);
  const [meals, water, exercise] = await Promise.all([
    prisma.meal.findMany({ where: { userId: req.user.id, day }, orderBy: { createdAt: 'asc' } }),
    prisma.waterEntry.findMany({ where: { userId: req.user.id, day }, orderBy: { createdAt: 'asc' } }),
    prisma.exerciseEntry.aggregate({ where: { userId: req.user.id, day }, _sum: { kcal: true }, _count: true }),
  ]);
  const totals = meals.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, proteinG: a.proteinG + m.proteinG, carbsG: a.carbsG + m.carbsG, fatG: a.fatG + m.fatG }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  for (const k of ['proteinG', 'carbsG', 'fatG']) totals[k] = Math.round(totals[k] * 10) / 10;
  // Sequência de dias seguidos com refeição registrada.
  let streak = 0;
  for (let d = kcalByDay[today] ? today : addDays(today, -1); kcalByDay[d]; d = addDays(d, -1)) streak += 1;
  res.json({
    day,
    report: report(req.user, weights, kcalByDay, today),
    totals,
    meals: meals.length,
    waterMl: water.reduce((a, w) => a + w.ml, 0),
    // Calorias gastas nos desafios de exercício cumpridos no dia (descontadas das consumidas).
    exercise: { kcal: exercise._sum.kcal || 0, done: exercise._count },
    streak,
  });
}));

api.get('/progress', wrap(async (req, res) => {
  const today = dayKey();
  const { weights, kcalByDay } = await loadReportData(req.user.id, today);
  const from = addDays(today, -29);
  const water = await prisma.waterEntry.groupBy({ by: ['day'], where: { userId: req.user.id, day: { gte: from } }, _sum: { ml: true } });
  const waterByDay = Object.fromEntries(water.map((w) => [w.day, w._sum.ml || 0]));
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -13 + i));
  res.json({
    report: report(req.user, weights, kcalByDay, today),
    weights: weights.map((w) => ({ id: w.id, day: w.day, weightKg: w.weightKg, note: w.note })),
    bmi: bmiSeries(weights, req.user.heightCm, weights[0]?.day && weights[0].day > from ? weights[0].day : from, today),
    daily: days.map((d) => ({ day: d, kcal: kcalByDay[d] || 0, waterMl: waterByDay[d] || 0 })),
  });
}));

// ---------- Ranking ----------
// Só aparecem usuários que ligaram "Compartilhar no ranking" no perfil. Janela: últimos 7 dias.
api.get('/ranking', wrap(async (req, res) => {
  const today = dayKey();
  const from = addDays(today, -6);
  const users = await prisma.user.findMany({ where: { shareRanking: true } });
  const ids = users.map((u) => u.id);
  const [weights, meals, water] = await Promise.all([
    prisma.weightEntry.findMany({ where: { userId: { in: ids } }, orderBy: { day: 'asc' } }),
    prisma.meal.groupBy({ by: ['userId', 'day'], where: { userId: { in: ids }, day: { gte: addDays(today, -29), lte: today } }, _sum: { kcal: true } }),
    prisma.waterEntry.groupBy({ by: ['userId'], where: { userId: { in: ids }, day: today }, _sum: { ml: true } }),
  ]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const entries = users.map((u) => {
    const kcalByDay = {};
    for (const m of meals) if (m.userId === u.id) kcalByDay[m.day] = m._sum.kcal || 0;
    const w = weights.filter((x) => x.userId === u.id);
    const rep = report(u, w, kcalByDay, today);
    const goal = rep.calorieGoal;
    const daily = days.map((d) => kcalByDay[d] || 0);
    // "Na meta": dia registrado com calorias até 10% acima/abaixo da meta.
    const daysOnGoal = goal ? daily.filter((k) => k > 0 && Math.abs(k - goal) <= goal * 0.1).length : 0;
    let streak = 0;
    for (let d = kcalByDay[today] ? today : addDays(today, -1); kcalByDay[d]; d = addDays(d, -1)) streak += 1;
    const first = w.find((x) => x.day >= addDays(today, -29));
    const last = w.at(-1);
    return {
      id: u.id,
      name: u.name,
      isMe: u.id === req.user.id,
      calorieGoal: goal,
      todayKcal: kcalByDay[today] || 0,
      avgKcal: rep.week.avgKcal,
      daysLogged: rep.week.daysLogged,
      daysOnGoal,
      streak,
      waterMl: water.find((x) => x.userId === u.id)?._sum.ml || 0,
      waterGoalMl: u.waterGoalMl,
      goalPct: rep.goal?.pct ?? null,
      lostKg30: first && last && first.id !== last.id ? Math.round((first.weightKg - last.weightKg) * 10) / 10 : null,
      daily,
    };
  });
  // Quem fica mais perto da própria meta (média dos dias registrados) vem primeiro; sem meta ou sem registro vai para o fim.
  const gap = (e) => (e.avgKcal != null && e.calorieGoal ? Math.abs(e.avgKcal - e.calorieGoal) / e.calorieGoal : Infinity);
  entries.sort((a, b) => gap(a) - gap(b) || b.daysOnGoal - a.daysOnGoal || b.daysLogged - a.daysLogged || a.name.localeCompare(b.name));
  res.json({ days, joined: req.user.shareRanking, entries });
}));

// ---------- Refeições ----------
function mealData(b) {
  const type = MEAL_TYPES.includes(b.type) ? b.type : null;
  if (!type) throw new HttpError(400, 'Escolha o tipo da refeição');
  const description = str(b.description, 1000);
  if (description.length < 2) throw new HttpError(400, 'Descreva a refeição');
  const items = Array.isArray(b.items)
    ? b.items.slice(0, 40).map((i) => ({
        name: str(i?.name, 120),
        quantity: str(i?.quantity, 80),
        kcal: num(i?.kcal ?? 0, 'as calorias do item', 0, 10000, { int: true }),
        proteinG: num(i?.proteinG ?? 0, 'a proteína', 0, 1000),
        carbsG: num(i?.carbsG ?? 0, 'o carboidrato', 0, 1000),
        fatG: num(i?.fatG ?? 0, 'a gordura', 0, 1000),
      })).filter((i) => i.name)
    : [];
  return {
    type,
    description,
    day: dayParam(b.day),
    kcal: num(b.kcal, 'as calorias', 0, 10000, { int: true }),
    proteinG: num(b.proteinG ?? 0, 'a proteína (g)', 0, 1000),
    carbsG: num(b.carbsG ?? 0, 'o carboidrato (g)', 0, 1000),
    fatG: num(b.fatG ?? 0, 'a gordura (g)', 0, 1000),
    items,
    source: b.source === 'ia' ? 'ia' : 'manual',
  };
}

api.get('/meals', wrap(async (req, res) => {
  const day = dayParam(req.query.day);
  const meals = await prisma.meal.findMany({ where: { userId: req.user.id, day }, orderBy: { createdAt: 'asc' } });
  res.json({ day, meals });
}));

// Refeições recentes distintas (para repetir com um toque).
api.get('/meals/recent', wrap(async (req, res) => {
  const rows = await prisma.meal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, take: 80 });
  const seen = new Set();
  const meals = [];
  for (const m of rows) {
    const k = m.description.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    meals.push(m);
    if (meals.length >= 15) break;
  }
  res.json({ meals });
}));

const aiRate = new Map();
api.post('/meals/estimate', wrap(async (req, res) => {
  const description = str(req.body?.description, 1000);
  const images = parseImages(req.body?.images, 3);
  if (description.length < 3 && !images.length) throw new HttpError(400, 'Descreva o que você comeu ou mande uma foto');
  const now = Date.now();
  const hits = (aiRate.get(req.user.id) || []).filter((t) => now - t < 60000);
  if (hits.length >= 10) throw new HttpError(429, 'Muitas análises seguidas. Aguarde um minuto.');
  aiRate.set(req.user.id, [...hits, now]);
  res.json(await estimateMeal(description, images));
}));


const askRate = new Map();
api.post('/assistant/ask', wrap(async (req, res) => {
  const raw = Array.isArray(req.body?.messages) ? req.body.messages.slice(-6) : [];
  const history = raw
    .map((m) => ({ role: m?.role === 'assistant' ? 'assistant' : 'user', text: str(m?.text, 500) }))
    .filter((m) => m.text);
  const images = parseImages(req.body?.images, 1);
  if (images.length && history[history.length - 1]?.role !== 'user') history.push({ role: 'user', text: 'Quantas calorias tem isto?' });
  if (!history.length || history[history.length - 1].role !== 'user') throw new HttpError(400, 'Escreva sua pergunta');
  const now = Date.now();
  const hits = (askRate.get(req.user.id) || []).filter((t) => now - t < 86400000);
  if (hits.filter((t) => now - t < 60000).length >= 5) throw new HttpError(429, 'Muitas perguntas seguidas. Aguarde um minuto.');
  if (hits.length >= 50) throw new HttpError(429, 'Limite diário de perguntas atingido. Volte amanhã.');
  askRate.set(req.user.id, [...hits, now]);
  res.json({ answer: await askCalories(history, images) });
}));
api.post('/menu/generate', wrap(async (req, res) => {
  const level = String(req.body?.level ?? '');
  if (!MENU_LEVELS.includes(level)) throw new HttpError(400, 'Escolha o nível: fácil, médio ou avançado');
  const today = dayKey();
  const { weights, kcalByDay } = await loadReportData(req.user.id, today);
  const rep = report(req.user, weights, kcalByDay, today);
  if (!rep.calorieGoal) throw new HttpError(400, 'Complete o perfil (sexo, nascimento, altura e peso) para calcularmos sua meta de calorias.');
  const now = Date.now();
  const hits = (aiRate.get(req.user.id) || []).filter((t) => now - t < 60000);
  if (hits.length >= 10) throw new HttpError(429, 'Muitas análises seguidas. Aguarde um minuto.');
  aiRate.set(req.user.id, [...hits, now]);
  res.json(await generateMenu({ level, kcal: rep.calorieGoal, goalKg: rep.goal?.weightKg ?? null, currentKg: rep.weightKg }));
}));

api.post('/meals', wrap(async (req, res) => {
  const meal = await prisma.meal.create({ data: { ...mealData(req.body || {}), userId: req.user.id } });
  res.status(201).json({ meal });
}));

async function ownMeal(req) {
  const meal = await prisma.meal.findFirst({ where: { id: String(req.params.id), userId: req.user.id } });
  if (!meal) throw new HttpError(404, 'Refeição não encontrada');
  return meal;
}

api.put('/meals/:id', wrap(async (req, res) => {
  const current = await ownMeal(req);
  const meal = await prisma.meal.update({ where: { id: current.id }, data: mealData({ day: current.day, ...req.body }) });
  res.json({ meal });
}));

api.delete('/meals/:id', wrap(async (req, res) => {
  const meal = await ownMeal(req);
  await prisma.meal.delete({ where: { id: meal.id } });
  res.json({ ok: true });
}));

// ---------- Água ----------
api.get('/water', wrap(async (req, res) => {
  const day = dayParam(req.query.day);
  const entries = await prisma.waterEntry.findMany({ where: { userId: req.user.id, day }, orderBy: { createdAt: 'asc' } });
  res.json({ day, entries, totalMl: entries.reduce((a, e) => a + e.ml, 0), goalMl: req.user.waterGoalMl });
}));

api.post('/water', wrap(async (req, res) => {
  const entry = await prisma.waterEntry.create({
    data: { userId: req.user.id, day: dayParam(req.body?.day), ml: num(req.body?.ml, 'a quantidade (ml)', 10, 3000, { int: true }) },
  });
  res.status(201).json({ entry });
}));

api.delete('/water/:id', wrap(async (req, res) => {
  const { count } = await prisma.waterEntry.deleteMany({ where: { id: String(req.params.id), userId: req.user.id } });
  if (!count) throw new HttpError(404, 'Registro não encontrado');
  res.json({ ok: true });
}));

// ---------- Exercícios em casa ----------
// O gasto é calculado com o último peso no momento em que o desafio é marcado e fica salvo.
api.get('/exercises', wrap(async (req, res) => {
  const day = dayParam(req.query.day);
  const [entries, latest] = await Promise.all([
    prisma.exerciseEntry.findMany({ where: { userId: req.user.id, day } }),
    prisma.weightEntry.findFirst({ where: { userId: req.user.id, day: { lte: day } }, orderBy: { day: 'desc' } }),
  ]);
  const byId = Object.fromEntries(entries.map((e) => [e.exerciseId, e]));
  const weightKg = latest?.weightKg ?? null;
  res.json({
    day,
    weightKg,
    exercises: EXERCISES.map((e) => ({
      id: e.id,
      name: e.name,
      dose: e.dose,
      minutes: e.minutes,
      tip: e.tip,
      kcal: byId[e.id]?.kcal ?? exerciseKcal(e, weightKg),
      entryId: byId[e.id]?.id ?? null,
    })),
    totalKcal: entries.reduce((a, e) => a + e.kcal, 0),
  });
}));

api.post('/exercises', wrap(async (req, res) => {
  const exercise = findExercise(String(req.body?.exerciseId ?? ''));
  if (!exercise) throw new HttpError(400, 'Exercício inválido');
  const day = dayParam(req.body?.day);
  const latest = await prisma.weightEntry.findFirst({ where: { userId: req.user.id, day: { lte: day } }, orderBy: { day: 'desc' } });
  const key = { userId: req.user.id, day, exerciseId: exercise.id };
  const entry = await prisma.exerciseEntry.upsert({
    where: { userId_day_exerciseId: key },
    create: { ...key, kcal: exerciseKcal(exercise, latest?.weightKg) },
    update: {},
  });
  res.status(201).json({ entry });
}));

api.delete('/exercises/:id', wrap(async (req, res) => {
  const { count } = await prisma.exerciseEntry.deleteMany({ where: { id: String(req.params.id), userId: req.user.id } });
  if (!count) throw new HttpError(404, 'Registro não encontrado');
  res.json({ ok: true });
}));

// ---------- Pesagens ----------
api.post('/weights', wrap(async (req, res) => {
  const day = dayParam(req.body?.day);
  const weightKg = num(req.body?.weightKg, 'o peso (kg)', 25, 350);
  const note = str(req.body?.note, 200);
  const entry = await prisma.weightEntry.upsert({
    where: { userId_day: { userId: req.user.id, day } },
    create: { userId: req.user.id, day, weightKg, note },
    update: { weightKg, note },
  });
  res.status(201).json({ entry });
}));

api.delete('/weights/:id', wrap(async (req, res) => {
  const { count } = await prisma.weightEntry.deleteMany({ where: { id: String(req.params.id), userId: req.user.id } });
  if (!count) throw new HttpError(404, 'Pesagem não encontrada');
  res.json({ ok: true });
}));

// ---------- Usuários (admin) ----------
api.get('/admin/users', requireAdmin, wrap(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { meals: true, weights: true } }, weights: { orderBy: { day: 'desc' }, take: 1 } },
  });
  const lastMeals = await prisma.meal.groupBy({ by: ['userId'], _max: { day: true } });
  const lastMeal = Object.fromEntries(lastMeals.map((m) => [m.userId, m._max.day]));
  res.json({
    users: users.map(({ _count, weights, ...u }) => ({
      ...publicUser(u),
      meals: _count.meals,
      weighings: _count.weights,
      lastWeightKg: weights[0]?.weightKg ?? null,
      lastMealDay: lastMeal[u.id] ?? null,
    })),
  });
}));

function userInput(b, { creating }) {
  const data = {};
  if (creating || b.name !== undefined) {
    data.name = str(b.name, 80);
    if (data.name.length < 2) throw new HttpError(400, 'Informe o nome');
  }
  if (creating || b.email !== undefined) {
    data.email = str(b.email, 160).toLowerCase();
    if (!LOGIN_RE.test(data.email)) throw new HttpError(400, 'Usuário inválido (mín. 3 caracteres: letras, números, ponto, hífen ou _)');
  }
  if (b.role !== undefined) {
    if (!['admin', 'member'].includes(b.role)) throw new HttpError(400, 'Perfil de acesso inválido');
    data.role = b.role;
  }
  const password = String(b.password ?? '');
  if (creating || password) {
    if (password.length < 8) throw new HttpError(400, 'A senha precisa ter pelo menos 8 caracteres');
    data.password = password;
  }
  return data;
}

api.post('/admin/users', requireAdmin, wrap(async (req, res) => {
  const { password, ...data } = userInput(req.body || {}, { creating: true });
  if (await prisma.user.findUnique({ where: { email: data.email } })) throw new HttpError(409, 'Este usuário já está cadastrado');
  const user = await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  res.status(201).json({ user: publicUser(user) });
}));

api.put('/admin/users/:id', requireAdmin, wrap(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) throw new HttpError(404, 'Usuário não encontrado');
  const { password, ...data } = userInput(req.body || {}, { creating: false });
  if (data.email && data.email !== target.email && (await prisma.user.findUnique({ where: { email: data.email } }))) {
    throw new HttpError(409, 'Este usuário já está em uso');
  }
  if (data.role === 'member' && target.role === 'admin') {
    if (target.id === req.user.id) throw new HttpError(400, 'Você não pode remover o seu próprio acesso de administrador');
    if ((await prisma.user.count({ where: { role: 'admin' } })) <= 1) throw new HttpError(400, 'É preciso manter pelo menos um administrador');
  }
  if (password) data.passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { id: target.id }, data });
  res.json({ user: publicUser(user) });
}));

api.delete('/admin/users/:id', requireAdmin, wrap(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
  if (!target) throw new HttpError(404, 'Usuário não encontrado');
  if (target.id === req.user.id) throw new HttpError(400, 'Você não pode excluir a sua própria conta');
  if (target.role === 'admin' && (await prisma.user.count({ where: { role: 'admin' } })) <= 1) throw new HttpError(400, 'É preciso manter pelo menos um administrador');
  await prisma.user.delete({ where: { id: target.id } });
  res.json({ ok: true });
}));

// ---------- Inteligência artificial (admin) ----------
const aiView = (cfg) => ({ configured: cfg.configured, model: cfg.model, models: MODELS, defaultModel: DEFAULT_MODEL });

api.get('/ai/status', wrap(async (_req, res) => {
  const cfg = await aiConfig();
  res.json({ configured: cfg.configured, model: cfg.model });
}));

api.get('/ai/config', requireAdmin, wrap(async (_req, res) => {
  res.json(aiView(await aiConfig()));
}));

api.put('/ai/config', requireAdmin, wrap(async (req, res) => {
  const b = req.body || {};
  if (b.model !== undefined) {
    if (!MODELS.includes(b.model)) throw new HttpError(400, 'Modelo inválido');
    await saveModel(b.model);
  }
  res.json(aiView(await aiConfig()));
}));

api.post('/ai/test', requireAdmin, wrap(async (_req, res) => {
  const cfg = await aiConfig();
  if (!cfg.configured) throw new HttpError(400, 'O servidor não está logado na assinatura Claude (claude login)');
  await testAi(cfg);
  res.json({ ok: true, model: cfg.model });
}));
