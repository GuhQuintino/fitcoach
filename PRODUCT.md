# PRODUCT.md: Fitcoach

> Documento vivo de regras de negócio validadas com o coach (dono do produto). Cada feature registra as decisões tomadas no Discovery.

## Contexto do produto
- **Fitcoach:** app de prescrição e acompanhamento de treinos (coach ↔ aluno).
- **Stack:** Vite + React + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS).
- **Perfil Gauntlet:** `full-stack`. **Superfície:** Operate (ferramenta de trabalho), light e dark mode já existentes.

---

## Feature: Histórico completo do exercício + fila de feedbacks do coach (2026-10-10)

### Problema
1. O modal de histórico do exercício (`components/shared/ExerciseHistoryModal.tsx`) só mostra os últimos 20 registros e agrupa por dia, misturando sessões do mesmo dia.
2. O coach vai e volta entre o editor do treino e `/coach/feedbacks` para ler o que o aluno escreveu.
3. Em `/coach/feedbacks`, para revisar o treino, o coach precisa abrir o perfil e lembrar qual treino o aluno marcou.

### Regras de negócio validadas
| # | Regra |
|---|---|
| R1 | O modal de histórico mostra **todos** os logs do exercício, sem limite de período ou de quantidade, tanto para o aluno quanto para o coach. |
| R2 | O histórico é agrupado por **sessão** (`workout_logs.id`), não por dia. |
| R3 | Cada sessão no modal mostra **apenas o feedback específico daquele exercício** (`exercise_feedback_logs.feedback_text`). Não mostra a observação geral da sessão. |
| R4 | **Aluno e coach** veem esse feedback no modal. |
| R5 | Cada card em `/coach/feedbacks` tem o botão **"Abrir treino"**, que navega para `/coach/editor?workout_id=…&student_id=…` e **marca o feedback como lido** automaticamente. |
| R6 | `/coach/feedbacks` tem o filtro **Não lidos / Todos** (padrão: Não lidos) com contador de não lidos. |
| R7 | Botão **"Marcar todos como lidos"**. |
| R8 | **Comparação com a sessão anterior do mesmo treino** (mesmo aluno, mesmo `workout_id`): resumo de volume no card fechado e delta da melhor série por exercício no card aberto. |
| R9 | **Destaque visual** para cards com feedback escrito (observação da sessão ou feedback por exercício), para o coach priorizar. |

### Fora do escopo
- Responder o feedback pelo card (chat).
- Filtro por aluno e agrupamento por aluno.

### Plano técnico
Ver `docs/gauntlet/PLAN_feedbacks_history.md`.
