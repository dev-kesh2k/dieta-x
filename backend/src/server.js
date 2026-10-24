import express from 'express';
import { api } from './routes.js';
import { HttpError, prisma } from './db.js';
import { ensureAdmin } from './seed-admin.js';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
// Rotas da IA aceitam fotos (data URL); o resto continua com 200 kB.
const jsonSmall = express.json({ limit: '200kb' });
const jsonPhotos = express.json({ limit: '12mb' });
app.use((req, res, next) => (/\/(meals\/estimate|assistant\/ask)$/.test(req.path) ? jsonPhotos : jsonSmall)(req, res, next));

// O proxy pode repassar /api/..., o caminho completo /<slug>/api/... ou já sem o prefixo.
const publicPath = String(process.env.PUBLIC_PATH || '').replace(/\/+$/, '');
app.get(['/health', `${publicPath}/health`], (_req, res) => res.json({ ok: true }));
if (publicPath) app.use(`${publicPath}/api`, api);
app.use('/api', api);
app.use('/', api);

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Envio grande demais. Use uma foto menor.' });
  if (err?.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado' });
  if (err?.code === 'P2002') return res.status(409).json({ error: 'Registro duplicado' });
  const status = err instanceof HttpError ? err.status : err.status || 500;
  if (status >= 500 && !(err instanceof HttpError)) console.error(err);
  res.status(status).json({ error: status >= 500 && !(err instanceof HttpError) ? 'Erro interno' : err.message });
});

ensureAdmin(prisma).catch((err) => console.error('Falha ao criar o admin inicial:', err.message));

const port = Number(process.env.PORT) || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Dieta X API ouvindo em 0.0.0.0:${port} (prefixo ${publicPath || '/'})`);
});
