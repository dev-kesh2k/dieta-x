import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Send, Sparkles, X } from 'lucide-react';
import { api, ApiError } from './api';
import { Sheet } from './ui';
import { photoToDataUrl } from './photo';

/** `photo` só é mostrada na conversa; vai para a API apenas na mensagem em que foi anexada. */
type Msg = { role: 'user' | 'assistant'; text: string; photo?: string };

/** **negrito** das respostas da IA vira <b>. */
function RichText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) => (/^\*\*[^*\n]+\*\*$/.test(part) ? <b key={i}>{part.slice(2, -2)}</b> : part))}</>;
}

/** Botão flutuante com o assistente de calorias (Haiku, só perguntas sobre calorias de refeições). */
export function AssistantButton() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function pickPhoto(files: FileList | null) {
    const f = files?.[0];
    if (fileInput.current) fileInput.current.value = '';
    if (!f) return;
    try {
      setPhoto(await photoToDataUrl(f));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [msgs, busy, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim() || (photo ? 'Quantas calorias tem isto?' : '');
    if (!q || busy) return;
    const sentPhoto = photo;
    const next: Msg[] = [...msgs, { role: 'user', text: q, ...(sentPhoto ? { photo: sentPhoto } : {}) }];
    setMsgs(next);
    setText('');
    setPhoto(null);
    setError('');
    setBusy(true);
    try {
      const r = await api.post<{ answer: string }>('/assistant/ask', {
        messages: next.slice(-6).map((m) => ({ role: m.role, text: m.photo && m !== next[next.length - 1] ? `${m.text} [foto]` : m.text })),
        images: sentPhoto ? [sentPhoto] : [],
      });
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
              Pergunte sobre calorias de alimentos e refeições, ou mande uma foto do prato <Camera size={14} className="inline align-[-2px]" /> para saber os gramas e as calorias de cada coisa. Ex.: “Quantas calorias tem um pão francês com manteiga?”
            </p>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 ${m.role === 'user' ? 'self-end bg-brand text-white' : 'self-start bg-[#f1f8f5] text-[#0f2a20]'}`}
            >
              {m.photo && <img src={m.photo} alt="Foto enviada" className="mb-1.5 max-h-48 w-full rounded-xl object-cover" />}
              {m.role === 'assistant' ? <RichText text={m.text} /> : m.text}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 self-start text-[#8a9a93]">
              <Loader2 size={16} className="animate-spin" /> {msgs[msgs.length - 1]?.photo ? 'Analisando a foto…' : 'Pensando…'}
            </div>
          )}
          {error && <p className="text-red-600">{error}</p>}
          <div ref={end} />
        </div>
        {photo && (
          <div className="mt-2 flex items-center gap-2">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#e3efe9]">
              <img src={photo} alt="Foto a enviar" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhoto(null)} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Remover foto">
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-[#5b7068]">Escreva algo se quiser (ex.: “arroz integral”) ou só envie.</p>
          </div>
        )}
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files)} />
          <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d9e7e0] text-violet-700 hover:bg-violet-50" onClick={() => fileInput.current?.click()} disabled={busy} aria-label="Anexar foto">
            <Camera size={20} />
          </button>
          <input className="input min-w-0 flex-1" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={photo ? 'Opcional: detalhe a foto' : 'Ex.: 1 prato de arroz e feijão'} />
          <button className="btn-primary !px-4" disabled={busy || (!text.trim() && !photo)} aria-label="Enviar">
            <Send size={18} />
          </button>
        </form>
      </Sheet>
    </>
  );
}
