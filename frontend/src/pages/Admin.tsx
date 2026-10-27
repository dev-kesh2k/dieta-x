import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Pencil, Shield, Sparkles, Trash2, UserPlus, Users } from 'lucide-react';
import { api, useApi, type User } from '../api';
import { useAuth } from '../auth';
import { ErrorBox, Loading, PageHeader, Sheet } from '../ui';
import { dateFull, kg } from '../util';

interface AdminUser extends User {
  meals: number;
  weighings: number;
  lastWeightKg: number | null;
  lastMealDay: string | null;
}

export default function Admin() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return (
    <>
      <PageHeader title="Admin" subtitle="Usuários e inteligência artificial" />
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <UsersPanel meId={user.id} />
        <div>
          <AiConfig />
        </div>
      </div>
    </>
  );
}

type Form = { id?: string; name: string; email: string; role: 'admin' | 'member'; password: string };

function UsersPanel({ meId }: { meId: string }) {
  const { data, error, loading, reload } = useApi<{ users: AdminUser[] }>('/admin/users');
  const [form, setForm] = useState<Form | null>(null);

  const remove = async (u: AdminUser) => {
    if (!confirm(`Excluir ${u.name} (${u.email})? Todas as refeições, pesagens e registros de água dele serão apagados.`)) return;
    try {
      await api.del(`/admin/users/${u.id}`);
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <section className="card min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold">
          <Users size={18} className="text-brand" /> Usuários
        </h2>
        <button className="btn-primary !px-3 sm:!px-5" onClick={() => setForm({ name: '', email: '', role: 'member', password: '' })}>
          <UserPlus size={18} /> Novo
        </button>
      </div>
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <ul className="divide-y divide-divider">
          {data?.users.map((u) => (
            <li key={u.id} className="flex items-start gap-2 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-light font-bold text-brand-dark">{u.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                  <span className="break-words">{u.name}</span>
                  {u.role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-700">
                      <Shield size={11} /> admin
                    </span>
                  )}
                  {u.id === meId && <span className="text-[11px] font-normal text-faint">(você)</span>}
                </p>
                <p className="break-all text-xs text-muted">{u.email}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {u.meals} refeições · {u.weighings} pesagens
                  {u.lastWeightKg != null ? ` · ${kg(u.lastWeightKg)}` : ''}
                  {u.lastMealDay ? ` · último registro ${dateFull(u.lastMealDay)}` : ''}
                </p>
              </div>
              <button className="btn-icon" onClick={() => setForm({ id: u.id, name: u.name, email: u.email, role: u.role, password: '' })} aria-label={`Editar ${u.name}`}>
                <Pencil size={17} />
              </button>
              {u.id !== meId && (
                <button className="btn-icon hover:!text-red-600" onClick={() => remove(u)} aria-label={`Excluir ${u.name}`}>
                  <Trash2 size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <UserSheet form={form} meId={meId} onClose={() => setForm(null)} onSaved={reload} />
    </section>
  );
}

function UserSheet({ form, meId, onClose, onSaved }: { form: Form | null; meId: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Form>({ name: '', email: '', role: 'member', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (form) {
      setF(form);
      setError('');
    }
  }, [form]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { name: f.name, email: f.email, role: f.role, ...(f.password ? { password: f.password } : {}) };
      if (f.id) await api.put(`/admin/users/${f.id}`, body);
      else await api.post('/admin/users', body);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // Senha aleatória forte para facilitar o cadastro.
  const generate = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const rnd = crypto.getRandomValues(new Uint32Array(12));
    setF((cur) => ({ ...cur, password: `${Array.from(rnd, (n) => chars[n % chars.length]).join('')}#9` }));
  };

  return (
    <Sheet open={!!form} onClose={onClose} title={f.id ? 'Editar usuário' : 'Novo usuário'}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="u-name">Nome</label>
          <input id="u-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="u-email">Usuário (login)</label>
          <input id="u-email" type="text" autoCapitalize="none" autoComplete="off" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </div>
        <div>
          <label className="label" htmlFor="u-pass">{f.id ? 'Nova senha (deixe vazio para manter)' : 'Senha'}</label>
          <div className="flex gap-2">
            <input id="u-pass" type="text" autoComplete="new-password" className="input font-mono" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required={!f.id} placeholder="mín. 8 caracteres" />
            <button type="button" className="btn-ghost shrink-0 !px-3" onClick={generate}>Gerar</button>
          </div>
          <p className="mt-1 text-xs text-muted">Passe a senha ao usuário; ele pode trocá-la em Perfil.</p>
        </div>
        <div>
          <span className="label">Acesso</span>
          <div className="grid grid-cols-2 gap-2">
            {(['member', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                disabled={f.id === meId}
                onClick={() => setF({ ...f, role: r })}
                className={`min-h-11 rounded-xl text-sm font-semibold disabled:opacity-60 ${f.role === r ? 'bg-brand text-white' : 'bg-tint text-soft'}`}
              >
                {r === 'member' ? 'Usuário' : 'Administrador'}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Administradores criam usuários e configuram a IA.</p>
        </div>
        <ErrorBox message={error} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Salvando…' : f.id ? 'Salvar alterações' : 'Criar usuário'}</button>
      </form>
    </Sheet>
  );
}

interface AiCfg {
  configured: boolean;
  model: string;
  models: string[];
}

const MODEL_LABEL: Record<string, string> = {
  opus: 'Opus (mais preciso)',
  sonnet: 'Sonnet (equilibrado)',
  haiku: 'Haiku (mais rápido, gasta menos limite)',
};

function AiConfig() {
  const { data, reload } = useApi<AiCfg>('/ai/config');
  const [model, setModel] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) setModel(data.model);
  }, [data]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await fn();
      setMsg(ok);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="flex items-center gap-2 font-bold">
        <Sparkles size={18} className="text-violet-600" /> Inteligência artificial
      </h2>
      <p className="text-xs text-muted">
        O cálculo de calorias usa a sua <b>assinatura Claude (Pro ou Max)</b>, sem chave de API: cada cálculo conta no limite de uso da assinatura.
      </p>
      <p className={`rounded-xl p-2.5 text-sm font-semibold ${data?.configured ? 'bg-brand-light text-brand-dark' : 'bg-amber-50 text-amber-900'}`}>
        {data ? (data.configured ? 'Servidor logado na assinatura Claude' : 'Servidor sem login Claude: rode "claude login" no computador do servidor') : 'Carregando…'}
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => api.put('/ai/config', { model }), 'Modelo atualizado.');
        }}
      >
        <select className="input" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Modelo">
          {(data?.models ?? []).map((m) => (
            <option key={m} value={m}>{MODEL_LABEL[m] ?? m}</option>
          ))}
        </select>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <button className="btn-primary" disabled={busy || !data || model === data.model}>{busy ? 'Salvando…' : 'Salvar modelo'}</button>
          <button type="button" className="btn-ghost" disabled={busy || !data?.configured} onClick={() => run(() => api.post('/ai/test'), 'Conexão com a assinatura Claude OK.')}>
            Testar conexão
          </button>
        </div>
      </form>
      <ErrorBox message={error} />
      {msg && <p className="text-sm text-brand-dark">{msg}</p>}
    </section>
  );
}
