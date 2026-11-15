// Validação das fotos enviadas para a IA (data URL → bloco de imagem da API). Sem banco: testável.
import { HttpError } from './errors.js';

const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Valida fotos enviadas como data URL (JPEG/PNG/WebP/GIF, até 5 MB cada) e devolve no formato da API. */
export function parseImages(list, max = 3) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, max).map((url) => {
    const m = IMAGE_RE.exec(String(url ?? ''));
    if (!m) throw new HttpError(400, 'Foto inválida: use JPEG, PNG, WebP ou GIF.');
    if ((m[2].length * 3) / 4 > MAX_IMAGE_BYTES) throw new HttpError(413, 'Foto grande demais (máx. 5 MB).');
    return { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } };
  });
}
