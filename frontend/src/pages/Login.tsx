import { useState, type FormEvent } from 'react';
import { Droplet, Flame, Scale, Sparkles } from 'lucide-react';
import { useAuth } from '../auth';
import { ErrorBox, Logo } from '../ui';

const FEATURES = [
  { icon: Sparkles, text: 'Descreva o que comeu e a IA calcula as calorias' },
  { icon: Scale, text: 'IMC diário, peso semanal e previsão da próxima semana' },
  { icon: Droplet, text: 'Meta de água com registro em um toque' },
  { icon: Flame, text: 'Meta de calorias calculada para o seu objetivo' },
];

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <section className="bg-gradient-to-br from-brand to-[#0d9488] px-[max(1.25rem,env(safe-area-inset-left))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-8 text-white md:flex md:w-1/2 md:flex-col md:justify-center md:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12 ring-2 ring-white/40" />
            <span className="text-2xl font-bold">Dieta X</span>
          </div>
          <h1 className="mt-6 text-[clamp(1.5rem,6vw,2.25rem)] font-bold leading-tight">Sua dieta sob controle, um dia de cada vez.</h1>
          <ul className="mt-5 hidden space-y-3 sm:block">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/90">
                <Icon size={18} className="mt-0.5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-1 items-start justify-center px-[max(1.25rem,env(safe-area-inset-left))] py-8 pb-[max(2rem,env(safe-area-inset-bottom))] md:items-center">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="grid grid-cols-2 rounded-xl bg-[#e6f2ec] p-1 text-sm font-semibold">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={`min-h-11 rounded-lg transition ${mode === m ? 'bg-white text-brand-dark shadow' : 'text-[#5b7068]'}`}
              >
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="name">Nome</label>
              <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" type="email" inputMode="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
            />
            {mode === 'register' && <p className="mt-1 text-xs text-[#5b7068]">Mínimo de 8 caracteres.</p>}
          </div>
          <ErrorBox message={error} />
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </section>
    </div>
  );
}
