# Dieta X

Controle de dieta: refeições com cálculo de calorias e macros pelo Claude (Anthropic), água, pesagens semanais, IMC diário, relatório semanal com previsão e metas.

- frontend/: React + Vite + Tailwind.
- backend/: Express + Prisma (PostgreSQL) + @anthropic-ai/sdk.
- Login inicial: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do .env.example.
- IA: o admin cadastra a chave da API Anthropic em Perfil → Inteligência artificial (ou ANTHROPIC_API_KEY no .env).
