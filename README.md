# Dieta X

Controle de dieta: refeições com cálculo de calorias e macros pelo Claude (Anthropic), água, pesagens semanais, IMC diário, relatório semanal com previsão e metas.

- frontend/: React + Vite + Tailwind.
- backend/: Express + Prisma (PostgreSQL) + Claude Agent SDK.
- Login inicial: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env.example.
- IA: somente pela assinatura Claude (Pro/Max), sem chave de API e sem token: o Hub monta o login do servidor (`claude login`) no container em CLAUDE_HOME.
