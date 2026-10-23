import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import { api, ApiError } from './api';
import { Sheet } from './ui';

type Msg = { role: 'user' | 'assistant'; text: string };

/** Botão flutuante com o assistente de calorias (Haiku, só perguntas sobre calorias de refeições). */
export function AssistantButton() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs, busy, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', text: q }];
    setMsgs(next);
    setText('');
    setError('');
    setBusy(true);
    try {
      const r = await api.post<{ answer: string }>('/assistant/ask', { messages: next.slice(-6) });
      setMsgs([...next, { role: 'assistant', text: r.answer || 'Sem resposta. Tente de novo.' }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível responder agora.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Assistente de calorias"
        className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95 md:right-6 md:bottom-6"
      >
        <Sparkles size={24} />
      </button>
      <Sheet open={open} title="Assistente de calorias" onClose={() => setOpen(false)}>
        <div className="flex max-h-[60dvh] min-h-[30dvh] flex-col gap-2 overflow-y-auto pb-2 text-sm">
          {!msgs.length && (
            <p className="rounded-2xl bg-[#f1f8f5] p-3 text-[#3d524a]">
              Pergunte sobre calorias de alimentos e refeições. Ex.: “Quantas calorias tem um pão francês com manteiga?”
            </p>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === 'user' ? 'self-end bg-brand text-white' : 'self-start bg-[#f1f8f5] text-[#0f2a20]'}`}
            >
              {m.text}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 self-start text-[#8a9a93]">
              <Loader2 size={16} className="animate-spin" /> Pensando…
            </div>
          )}
          {error && <p className="text-red-600">{error}</p>}
          <div ref={end} />
        </div>
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input className="input flex-1" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Ex.: 1 prato de arroz e feijão" />
          <button className="btn-primary !px-4" disabled={busy || !text.trim()} aria-label="Enviar">
            <Send size={18} />
          </button>
        </form>
      </Sheet>
    </>
  );
}
