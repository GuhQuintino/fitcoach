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

---

## Feature: Gestão e Localização Rápida de Alunos (`/coach/students`) & Sincronização com Dashboard (2026-10-10)

### Problema
1. `/coach/students` abre por padrão na aba "Todos" em vez de "Ativos", exigindo clique manual a cada acesso.
2. Contadores no topo de `/coach/students` são calculados sobre a lista filtrada da aba atual, distorcendo os números totais.
3. Desalinhamento com `/coach/dashboard`: o Dashboard considerava qualquer perfil com `status = 'active'` como ativo, ignorando a data de expiração da consultoria.
4. Os cards dos alunos não mostram quando foi o último treino do aluno (impossível saber se o aluno está engajado ou abandonou os treinos).
5. Falta botão de WhatsApp para alunos ativos (só existia para pendentes) e faltava ordenação por atividade recente.

### Regras de Negócio Validadas com o Coach
| # | Regra |
|---|---|
| S1 | **Classificação Canônica de Aluno:**<br>- **Ativo:** plano ativo no momento (`consultancy_expires_at >= agora` e cadastro ativo).<br>- **Pendente:** cadastro novo aguardando aprovação (`status = 'pending'`) **OU** plano vencido nos últimos 7 dias (período de tolerância/renovação).<br>- **Inativo:** sem plano ativo há mais de 7 dias (`agora - consultancy_expires_at > 7 dias`), ou sem plano, ou banido/rejeitado. |
| S2 | `/coach/students` abre diretamente na aba **Ativos** por padrão. |
| S3 | Os contadores do topo (Total, Ativos, Pendentes, Inativos) refletem os dados globais reais do coach, independentemente da aba ou busca selecionada. |
| S4 | **Sincronização 100% com `/coach/dashboard`:** o Dashboard passa a utilizar exatamente a mesma função pura (`utils/studentStatus.ts`) para calcular totais de ativos, pendentes e inativos. |
| S5 | **Informações reais no card do aluno:**<br>- Exibição do último treino concluído (ex: "Treinou hoje", "Treinou há 2 dias", ou alerta "Sem treinos há X dias" se > 7 dias, "Sem treinos registrados").<br>- Exibição do vencimento do plano com badge de urgência quando faltar <= 7 dias ou quando estiver vencido nos últimos 7 dias. |
| S6 | **Ações rápidas:**<br>- Link direto para WhatsApp disponível em todos os cards de alunos que tiverem telefone cadastrado.<br>- Acesso direto ao perfil/treinos.<br>- Modal de aprovação e ajuste de validade para pendentes. |
| S7 | **Ordenação Rápida:** permitir alternar entre "Último treino" (mais recentes primeiro) e "Nome (A-Z)". |

