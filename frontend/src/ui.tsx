import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { AlertCircle, ChefHat, ChevronRight, Dumbbell, Home, LineChart, Loader2, Shield, Trophy, User, Utensils, X } from 'lucide-react';
import { useAuth } from './auth';
import { AssistantButton } from './assistant';

// Barra do celular: os 5 primeiros; o resto fica no menu do avatar (como no Facebook).
const NAV = [
  { to: '/', label: 'Hoje', icon: Home, end: true },
  { to: '/refeicoes', label: 'Refeições', icon: Utensils, end: false },
  { to: '/exercicios', label: 'Exercícios', icon: Dumbbell, end: false },
  { to: '/cardapio', label: 'Cardápio', icon: ChefHat, end: false },
  { to: '/progresso', label: 'Progresso', icon: LineChart, end: false },
  { to: '/ranking', label: 'Ranking', icon: Trophy, end: false },
  { to: '/perfil', label: 'Perfil', icon: User, end: false },
];
const ADMIN_NAV = { to: '/admin', label: 'Admin', icon: Shield, end: false };
const BAR_SIZE = 5;

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

/** Foto de perfil, ou as iniciais quando não há foto. */
export function Avatar({ name, src, size = 36, className = '' }: { name?: string; src?: string | null; size?: number; className?: string }) {
  const box = `shrink-0 rounded-full ${className}`;
  if (src) return <img src={src} alt="" width={size} height={size} className={`${box} object-cover`} style={{ width: size, height: size }} />;
  return (
    <span className={`${box} flex items-center justify-center bg-brand font-bold text-white`} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  );
}

export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className={`${className} shrink-0 rounded-xl`} />;
}

/** Menu lateral no desktop, barra inferior no celular. */
export function AppLayout() {
  const { user } = useAuth();
  const nav = user?.role === 'admin' ? [...NAV, ADMIN_NAV] : NAV;
  const bar = nav.slice(0, BAR_SIZE);
  const more = nav.slice(BAR_SIZE);
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const moreActive = more.some((m) => pathname.startsWith(m.to));
  useEffect(() => setMenu(false), [pathname]);
  return (
    <div className="min-h-[100dvh] md:flex">
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-3 px-2">
          <Logo />
          <span className="text-lg font-bold">Dieta X</span>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  isActive ? 'bg-brand-light text-brand-dark' : 'text-muted hover:bg-tint'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-10">
        <div className="mx-auto w-full max-w-5xl px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 md:pt-8">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="Menu"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-30 rounded-[1.75rem] border border-white/40 bg-surface/35 px-2 py-2 shadow-[0_12px_32px_-10px_rgb(var(--bar)/0.35),inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-2xl backdrop-saturate-[1.8] md:hidden"
      >
        <div className="flex items-center justify-between gap-1">
          {bar.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                `flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl transition active:scale-95 ${
                  isActive ? 'bg-brand/15 text-brand-dark' : 'text-ink/60 hover:text-ink'
                }`
              }
            >
              <Icon size={24} />
            </NavLink>
          ))}
          <button
            onClick={() => setMenu(true)}
            aria-label="Mais opções"
            aria-haspopup="dialog"
            className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-2xl transition active:scale-95 ${moreActive ? 'bg-brand/15' : ''}`}
          >
            <Avatar name={user?.name} src={user?.avatarUrl} size={36} className="ring-2 ring-surface" />
          </button>
        </div>
      </nav>
      <Sheet open={menu} onClose={() => setMenu(false)} title={user?.name ?? 'Menu'}>
        <div className="space-y-2">
          {more.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-14 items-center gap-3 rounded-2xl px-4 text-base font-semibold transition ${
                  isActive ? 'bg-brand-light text-brand-dark' : 'bg-tint text-ink'
                }`
              }
            >
              <Icon size={22} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={18} className="text-faint" />
            </NavLink>
          ))}
        </div>
      </Sheet>
      <AssistantButton />
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Logo className="h-9 w-9 md:hidden" />
        <div className="min-w-0">
          <h1 className="truncate text-[clamp(1.25rem,5vw,1.75rem)] font-bold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-16 text-brand">
      <Loader2 className="animate-spin" size={32} />
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1 break-words">{message}</span>
      {onRetry && (
        <button className="shrink-0 font-semibold underline" onClick={onRetry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

/** Modal que vira bottom sheet no celular. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Anel de progresso (0–1+). */
export function Ring({ value, size = 140, stroke = 12, color = 'rgb(var(--brand))', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} style={{ stroke: 'rgb(var(--track))' }} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          style={{ stroke: value > 1 ? '#dc2626' : color }}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, color = 'bg-brand' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-track">
      <div className={`h-full rounded-full ${value > 1 ? 'bg-red-500' : color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-brand' : tone === 'bad' ? 'text-red-600' : 'text-ink';
  return (
    <div className="card min-w-0">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-1 break-words text-xl font-bold sm:text-2xl ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Empty({ icon, text, children }: { icon: ReactNode; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line2 bg-surface/60 px-4 py-10 text-center text-sm text-muted">
      <div className="text-faint">{icon}</div>
      <p>{text}</p>
      {children}
    </div>
  );
}
