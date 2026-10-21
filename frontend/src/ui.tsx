import { useEffect, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AlertCircle, Home, LineChart, Loader2, Shield, User, Utensils, X } from 'lucide-react';
import { useAuth } from './auth';

const NAV = [
  { to: '/', label: 'Hoje', icon: Home, end: true },
  { to: '/refeicoes', label: 'Refeições', icon: Utensils, end: false },
  { to: '/progresso', label: 'Progresso', icon: LineChart, end: false },
  { to: '/perfil', label: 'Perfil', icon: User, end: false },
];
const ADMIN_NAV = { to: '/admin', label: 'Admin', icon: Shield, end: false };

export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className={`${className} shrink-0 rounded-xl`} />;
}

/** Menu lateral no desktop, barra inferior no celular. */
export function AppLayout() {
  const { user } = useAuth();
  const nav = user?.role === 'admin' ? [...NAV, ADMIN_NAV] : NAV;
  return (
    <div className="min-h-[100dvh] md:flex">
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-[#e3efe9] bg-white px-4 py-6 md:flex">
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
                  isActive ? 'bg-brand-light text-brand-dark' : 'text-[#5b7068] hover:bg-[#f1f8f5]'
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10">
        <div className="mx-auto w-full max-w-5xl px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 md:pt-8">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e3efe9] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className={`grid ${nav.length > 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-semibold min-[360px]:text-[11px] ${
                  isActive ? 'text-brand' : 'text-[#8a9a93]'
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
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
          {subtitle && <p className="truncate text-sm text-[#5b7068]">{subtitle}</p>}
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
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-3xl sm:p-6"
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
export function Ring({ value, size = 140, stroke = 12, color = '#059669', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e6f2ec" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={value > 1 ? '#dc2626' : color}
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
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#e6f2ec]">
      <div className={`h-full rounded-full ${value > 1 ? 'bg-red-500' : color} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'default' | 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-brand' : tone === 'bad' ? 'text-red-600' : 'text-[#0f2a22]';
  return (
    <div className="card min-w-0">
      <p className="text-xs font-semibold text-[#5b7068]">{label}</p>
      <p className={`mt-1 break-words text-xl font-bold sm:text-2xl ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#5b7068]">{hint}</p>}
    </div>
  );
}

export function Empty({ icon, text, children }: { icon: ReactNode; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#cfe3d9] bg-white/60 px-4 py-10 text-center text-sm text-[#5b7068]">
      <div className="text-[#9fbfb1]">{icon}</div>
      <p>{text}</p>
      {children}
    </div>
  );
}
