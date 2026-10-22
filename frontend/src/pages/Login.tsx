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
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
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
          <div>
            <h2 className="text-xl font-bold">Entrar</h2>
            <p className="text-sm text-[#5b7068]">Acesso criado pelo administrador do app.</p>
          </div>
          <div>
            <label className="label" htmlFor="email">Usuário</label>
            <input id="email" type="text" autoCapitalize="none" autoCorrect="off" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <ErrorBox message={error} />
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Aguarde…' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  );
}
