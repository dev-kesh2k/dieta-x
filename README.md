# Dieta X

[![Testes](https://github.com/dev-kesh2k/dieta-x/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-kesh2k/dieta-x/actions/workflows/ci.yml)

Controle de dieta: refeições com cálculo de calorias e macros pelo Claude (Anthropic), água, pesagens semanais, IMC diário, relatório semanal com previsão e metas.

- frontend/: React + Vite + Tailwind.
- backend/: Express + Prisma (PostgreSQL) + Claude Agent SDK.
- Login inicial: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env.example.
- IA: somente pela assinatura Claude (Pro/Max), sem chave de API e sem token: o Hub monta o login do servidor (`claude login`) no container em CLAUDE_HOME.

## Estrutura
- `backend/src/diet.js` — refeições, água, pesagens, IMC e relatório semanal.
- `backend/src/ai.js` — cálculo de calorias e macros pelo Claude.
- `backend/src/exercises.js` — exercícios e cronômetro.
- `frontend/src/pages/` — Hoje, Refeições, Cardápio, Progresso, Linha do tempo, Ranking, Exercícios, Perfil e Admin.
- Temas de cor e ícones do app em `frontend/src/theme.ts` e `frontend/public/icon-*.svg`.

## Rodar localmente
```bash
# backend (Express + Prisma)
cd backend
cp .env.example .env          # ajuste DATABASE_URL e o login inicial
npm install
npx prisma migrate deploy
npm run db:seed               # dados de exemplo (uma vez)
npm start

# frontend (React + Vite), em outro terminal
cd frontend
npm install
npm run dev
```

## Publicação
Todo push na `main` publica o app no Central Apps Hub pelo GitHub Actions (`.github/workflows/deploy.yml`). Mudanças só em documentação não disparam o deploy.

## Testes

Testes do backend com o executor nativo do Node (`node:test`), sem banco e sem servidor rodando:

```bash
node --test backend/test/*.test.js
```

Cobrem as regras puras do backend (bmi, dates, energy, exercises, report). O GitHub Actions roda os mesmos testes em cada push e pull request (workflow `Testes`); mudanças só em `backend/test/` não republicam o app.
