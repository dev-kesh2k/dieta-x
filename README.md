# Dieta X

Controle de dieta: refeições com cálculo de calorias e macros pelo Claude (Anthropic), água, pesagens semanais, IMC diário, relatório semanal com previsão e metas.

- frontend/: React + Vite + Tailwind.
- backend/: Express + Prisma (PostgreSQL) + Claude Agent SDK.
- Login inicial: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env.example.
- IA: somente pela assinatura Claude (Pro/Max), sem chave de API. O admin gera o token com `claude setup-token` e cadastra em Admin → Inteligência artificial (ou CLAUDE_CODE_OAUTH_TOKEN no .env).
