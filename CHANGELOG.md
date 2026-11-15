# Changelog

Mudanças relevantes do app, da mais nova para a mais antiga. Cada item é um pull request mesclado na `main` (que publica o app).

## 2026-11-15

- **Novo:** Perfil → Meus dados → *Exportar meus dados* baixa pesos, refeições, água e exercícios em CSV (abre no Excel) (#21–#25)
- **Saúde:** /health testa o banco e responde 503 se o Postgres cair (#20)
- Segurança: react-router v7 no frontend (corrige open redirect GHSA-wrjc-x8rr-h8h6) (#17)
- Segurança: body-parser, qs e hono atualizados no backend (npm audit) (#16)
- CI: corrige o caminho dos testes (Node 22 não aceita pasta no --test) (#15)
- CI: roda os testes do backend no GitHub Actions (#14)
- Testes: desafios de exercícios e liberação de níveis (#13)
- Testes: relatório de peso, previsão e meta (#12)
- Testes: gasto calórico, déficit, superávit e proteína (#11)
- Testes: idade, IMC e classificação do IMC (#10)
- Testes: datas do app (dia, soma e diferença de dias) (#9)
- Backend: funções de data em dates.js (testáveis sem o banco) (#8)
- Deploy: mudanças só em testes não republicam o app (#7)
