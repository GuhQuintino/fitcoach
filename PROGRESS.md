# PROGRESS — Fitcoach Pro

> Registro histórico cronológico de entregas validadas pelo Gauntlet Loop e governança GSD.

---

## [2026-10-12] — Resolução de Race Condition, Deduplicação Offline & Rollback Atômico de Workout Logs (duplicate_workout_bug — PASS)

- **Identificador da Fatia:** `duplicate_workout_bug` / `fix-duplicate-workout-logs`
- **Perfil Gauntlet:** `full-stack` (React 19 + TypeScript + Vite + Supabase / PostgreSQL + Vitest)
- **Subagente Executor:** `gauntlet-builder`
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [QA_REPORT_duplicate_workout_bug.md](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_duplicate_workout_bug.md)

### Resumo do Valor Entregue (End-to-End)
1. **Dados & Integridade do Banco (Supabase PostgreSQL):**
   - Limpeza e saneamento no banco de dados via session pooler: 8 duplicatas órfãs (`0ae87bf9-9711-4b45-bcf9-ec05d0c98a40`, `4de3b8f1-0587-4e62-b92a-5d366f3f54b2`, `d911d1b2-c3ed-4f97-aff2-5a17da0fa84b`, `d9e30921-b0c3-4e69-8e92-da188d1860a6`, `b596f3ae-191f-4255-9774-f1af9c462011`, `5b33c98a-d23b-4bd3-b2dd-e66afced5613`, `8ba9a26b-21be-4e96-8492-5eed89c687b3`, `08d36a89-09cf-49a4-ac5b-6b7ca0bd3b0c`) do aluno Gabriel Pontes (`42dbdd07-abdb-4d9c-843e-72006ec5fb26`) referentes ao treino de 08/10 foram removidas com integridade relacional.
   - Preservado com sucesso o registro canônico legítimo `0cbd5ee0-107e-438a-b718-8a0463de8241` (`effort_rating: 10`, `started_at: 2026-10-08T19:02:34.191Z`), assegurando exatamente 1 treino contabilizado em 08/10.
2. **Serviços & Contratos:**
   - **Trava Concorrente Síncrona:** Implementação de trava com `useRef` (`isSubmittingRef.current`) e estado reativo `isSubmitting` em `confirmFinishWorkout`, eliminando race conditions por cliques concorrentes ou em rajada no botão de finalizar.
   - **Rollback Atômico de Cabeçalhos:** Inserção protegida de `workout_logs` com reversão cirúrgica via `delete().eq('id', createdLogId)` em caso de falha na persistência subsequente de séries ou feedbacks em [`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx), [`offlineSyncService.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/offlineSyncService.ts) e [`staleWorkoutService.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/staleWorkoutService.ts).
   - **Idempotência no Sincronismo Offline:** O método `flushOfflineQueue` agora consulta o Supabase antes da inserção buscando registros pré-existentes por `student_id`, `started_at` e `workout_id`. Se já existente, reaproveita o cabeçalho em vez de duplicá-lo.
   - **Proteção contra Séries Duplicadas:** Verificação de contagem de séries já persistidas em retentativas parciais de rede.
   - **Teto de Retentativas da Fila:** Validação estrita de `MAX_SYNC_RETRIES = 3` para descarte seguro de payloads corrompidos após 3 falhas consecutivas, prevenindo loops de sincronização.
3. **Interface & Componentes:**
   - Modal `FinishWorkoutModal` desacoplado: a seleção da nota de esforço (1 a 10) altera o estado sem submeter imediatamente o treino, exigindo clique deliberado no botão "Concluir Treino".
   - Desativação em lote com `disabled={isSubmitting}` de todos os botões, seletor de esforço e textarea com feedback visual imediato de carregamento (`animate-spin`).
4. **Testes Automatizados & Build:**
   - Suíte Vitest: 37 passing / 37 total (100% de sucesso).
   - Suíte Offline (`scripts/test_offline_suite.ts`): 24 passing / 24 total (100% de sucesso).
   - Compilação de produção Vite (`vite build`): aprovada com código 0 em 7.78s sem erros TypeScript.

### Métricas da Rubrica 6D
| Dimensão | Nota | Status |
|---|:---:|:---:|
| **D1. Funcionalidade & Requisitos** | 3.0 / 3.0 | Aprovado |
| **D2. Robustez & Estabilidade** | 3.0 / 3.0 | Aprovado |
| **D3. Qualidade de Implementação & Anti-Slop** | 3.0 / 3.0 | Aprovado |
| **D4. Consistência Arquitetural & Stack Nativa** | 3.0 / 3.0 | Aprovado |
| **D5. Performance & Eficiência** | 3.0 / 3.0 | Aprovado |
| **D6. Testabilidade, Segurança & Conformidade** | 3.0 / 3.0 | Aprovado |
| **Média Consolidada** | **3.00 / 3.00** | **PASS** |

### Arquivos Criados e Modificados
- `pages/student/WorkoutExecution.tsx`: trava síncrona `isSubmittingRef`, bloqueio de controles no modal, esforço desacoplado do submit e rollback no `catch`.
- `utils/offlineSyncService.ts`: idempotência no `flushOfflineQueue`, contagem de séries pré-existentes, rollback de cabeçalho e `MAX_SYNC_RETRIES = 3`.
- `utils/staleWorkoutService.ts`: rollback cirúrgico de `workout_log` órfão na auto-finalização de treinos obsoletos.
- `scripts/test_offline_suite.ts`: testes de regressão para `MAX_SYNC_RETRIES = 3`, TTL de 8 dias, limite FIFO e descarte.
- `docs/gauntlet/QA_REPORT_duplicate_workout_bug.md`: laudo formal de aprovação do Gauntlet Critic (PASS 3.00/3.00).
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário técnico de engenharia da fatia vertical.
- `.planning/STATE.md`: sincronização de governança, decisões travadas e métricas da fatia.
- `.planning/ROADMAP.md` e `ROADMAP.md`: checklist da Fase 8 finalizada com sucesso.

---

## [2026-10-10] — Auditoria Impeccable Loop: Fases 6 e 7 (PASS17 — Grade A+ 20.0/20.0)

- **Identificador da Auditoria:** `PASS17` / `impeccable-audit-phases-6-7`
- **Avaliador:** `Impeccable Independent Auditor` (Fresh Context)
- **Veredito:** **PASS (20.0 / 20.0 — Aprovado com Excelência)** — [QA_REPORT_IMPECCABLE_PASS17.md](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_IMPECCABLE_PASS17.md)

### Melhorias de Craftsmanship & Acessibilidade Aplicadas
1. **Acessibilidade (A11y — 4.0/4.0):**
   - Touch targets expandidos para o padrão mínimo internacional ($\ge 44 \times 44\text{px}$) em botões inline de confirmação de feedbacks, atalhos de validade do plano (+30d, +60d, +90d, +1 ano), botão de limpar busca e ações de aluno.
   - Suporte nativo à tecla `Escape` adicionado nos modais de histórico (`ExerciseHistoryModal.tsx`) e edição de validade/aprovação (`Students.tsx`).
   - Adição de textos ocultos acessíveis (`sr-only`) para leitores de tela em seletores e nos badges de contagem de notificações não lidas e pendências do Dashboard.
2. **Theming & Color Contrast (WCAG AA/AAA — 4.0/4.0):**
   - Correção do contraste de textos secundários em Light Mode e Dark Mode (ratio superior a 4.5:1).
   - Ajuste do contraste dos badges de "Expira Hoje" (`text-amber-950 font-black` sobre `bg-amber-500`, ratio > 7:1) e "Lido/Removido".
   - Substituição de token Tailwind não-padrão (`dark:bg-slate-850`) por token canônico (`dark:bg-slate-900/60`).
3. **Responsividade & Adapt (4.0/4.0):**
   - Refatoração do grid de métricas de alunos de `grid-cols-4` para `grid-cols-2 sm:grid-cols-4`, garantindo leitura limpa em telas móveis estreitas (360px a 430px).
   - Grid de séries no card expandido de feedbacks em `grid-cols-1 sm:grid-cols-2`.
4. **Anti-AI-Slop & Integridade (4.0/4.0):**
   - Substituição do SVG circular progress ring puramente decorativo no card de visão geral por métrica tipográfica de alta densidade (`3xl font-black` com rótulo "Ativos"), conforme diretrizes do `craft-floor.md`.
   - Remoção de kickers genéricos repetitivos ("Ferramenta" e "Biblioteca") nos cartões do Dashboard em favor de microcópias honestas e funcionais.
   - Substituição de `alert()` síncrono nativo por toasts modernos com `react-hot-toast`.
   - 37/37 testes automatizados passando no Vitest e compilação limpa sem erros TypeScript.

---

## [2026-10-10] — Fase 7: Gestão e Localização Rápida de Alunos (`/coach/students`) & Sincronização com Dashboard (PASS16)

- **Identificador da Fatia:** `PASS16` / `feature-students-management-dashboard-sync`
- **Perfil Gauntlet:** `full-stack` (Vite 6 + React 19 + TypeScript + Tailwind CSS 4 + Supabase + Vitest)
- **Subagente Executor:** `gauntlet-builder`
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [QA_REPORT_PASS16.md](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_PASS16.md)

### Resumo do Valor Entregue (End-to-End)
1. **Dados & Modelos:**
   - Consumo unificado do modelo relacional `students_data` com FK `profiles` (`profiles!students_data_id_fkey!inner`).
   - Query em lote anti-N+1 na tabela `workout_logs` trazendo o último treino finalizado de todos os alunos em O(1) requisições com agrupamento e mapeamento client-side em `Map` O(N).
2. **Serviços & Contratos:**
   - Regras de negócio S1 a S7 consolidadas no módulo puro [`utils/studentStatus.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.ts):
     - `active`: cadastro ativo com plano vigente (`consultancy_expires_at >= agora`).
     - `pending`: novos cadastros aguardando aprovação (`status = 'pending'`) ou planos vencidos há no máximo 7 dias (janela de tolerância para renovação).
     - `inactive`: planos vencidos há mais de 7 dias, alunos sem plano ou contas rejeitadas/banidas.
   - Sincronização matemática e lógica absoluta com [`pages/coach/Dashboard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Dashboard.tsx) via `calculateDashboardStats(allStudents)`, eliminando discrepâncias históricas onde o Dashboard ignorava a data de expiração da consultoria.
   - Tratamento explícito de segurança e retorno de erro no RPC `approve_student` no Postgres.
3. **Interface & Componentes (Superfície Operate):**
   - Página [`pages/coach/Students.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Students.tsx) com abertura direta na aba **Ativos** por padrão (S2).
   - 4 cards de métricas no topo (*Total*, *Ativos*, *Pendentes*, *Inativos*) calculados sobre a base global do coach, imunes a filtros ou termos de pesquisa (S3).
   - Abas com contadores dinâmicos e busca instantânea em memória sem travamentos.
   - Seletor de ordenação ágil alternando entre "Último treino" (mais recentes primeiro com desempate alfabético) e "Nome (A-Z)" (S7).
   - Cards dos alunos com badges táteis de status (Esmeralda/Âmbar/Rosa), exibição relativa do último treino com alerta âmbar para inatividade > 7 dias (S5), e indicador de urgência de vencimento (<= 7 dias ou em renovação).
   - Ações rápidas com alvos táteis $\ge 44\text{px}$: link direto para WhatsApp de todos os alunos com telefone cadastrado, botão de atalho para perfil de treinos e modal duplo-uso para aprovação e extensão de consultoria com atalhos (+30d, +60d, +90d, +1 ano) (S6).
4. **Testes Automatizados:**
   - 20 novos testes unitários automatizados via Vitest em [`utils/studentStatus.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.test.ts) cobrindo 100% dos ramos de classificação, carência de 7 dias, cálculos agregados, formatação temporal e ordenação, totalizando 37/37 testes aprovados na suíte geral em 833ms.
   - Build de produção do Vite 100% aprovado com código 0 em 7.79s.

### Métricas da Rubrica 6D
| Dimensão | Nota | Status |
|---|:---:|:---:|
| **D1. Funcionalidade & Requisitos** | 3.0 / 3.0 | Aprovado |
| **D2. Robustez & Estabilidade** | 3.0 / 3.0 | Aprovado |
| **D3. Qualidade de Implementação & Anti-Slop** | 3.0 / 3.0 | Aprovado |
| **D4. Consistência Arquitetural & Stack Nativa** | 3.0 / 3.0 | Aprovado |
| **D5. Performance & Eficiência** | 3.0 / 3.0 | Aprovado |
| **D6. Testabilidade, Segurança & Conformidade** | 3.0 / 3.0 | Aprovado |
| **Média Consolidada** | **3.00 / 3.00** | **PASS** |

### Arquivos Criados e Modificados
- `utils/studentStatus.ts`: módulo puro canônico para classificação de status, contadores e formatação de engajamento/vencimento.
- `utils/studentStatus.test.ts`: suíte de 20 testes unitários automatizados cobrindo todas as regras de negócio S1 a S7.
- `pages/coach/Students.tsx`: reformulação da tela de alunos com aba padrão Ativos, contadores fixos, busca, ordenação, badges de engajamento, WhatsApp e modal integrado.
- `pages/coach/Dashboard.tsx`: sincronização canônica dos contadores de alunos via `calculateDashboardStats` e consumo de `consultancy_expires_at`.
- `PRODUCT.md`: especificação formal validada das regras de negócio S1 a S7 da Fase 7.
- `.planning/STATE.md`: atualização de governança, métricas e decisões travadas da Fase 7.
- `.planning/ROADMAP.md` e `ROADMAP.md`: checklist da Fase 7 finalizada com sucesso.
- `docs/gauntlet/QA_REPORT_PASS16.md`: laudo formal de aprovação do Gauntlet Critic (PASS 3.00/3.00).
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário técnico de engenharia da fatia vertical.

---

## [2026-10-10] — Fase 6: Histórico Completo do Exercício + Fila de Feedbacks do Coach (PASS15)

- **Identificador da Fatia:** `PASS15` / `feature-feedbacks-history`
- **Perfil Gauntlet:** `full-stack` (Vite 6 + React 19 + TypeScript + Tailwind CSS 4 + Supabase + Vitest)
- **Subagente Executor:** `gauntlet-builder`
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [QA_REPORT_PASS15.md](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_PASS15.md)

### Resumo do Valor Entregue (End-to-End)
1. **Persistência & RLS:**
   - Criação da migração [`20261010000000_feedbacks_coach_update_rls.sql`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/migrations/20261010000000_feedbacks_coach_update_rls.sql) estabelecendo índice parcial de alta performance `idx_workout_logs_coach_unread` para queries de triagem e policy de `UPDATE` restrita para treinadores em `public.workout_logs(read_by_coach)` vinculada a `students_data.coach_id = auth.uid()`.
2. **Serviços & Contratos:**
   - Paginação contínua client-side em blocos de 1000 registros via `range()`, contornando com segurança o teto de 1000 linhas do PostgREST e garantindo histórico completo sem truncamento.
   - Paginação por cursor via `lt('created_at', lastCreatedAt)` na fila de feedbacks, eliminando anomalias de paginação por offset durante marcações de lido.
   - Agrupamento de treinos por sessão única (`workout_logs.id`), desfazendo a fusão indevida de treinos ocorridos no mesmo dia.
   - Utilitário puro de sobrecarga progressiva com cálculo determinístico de volume (descartando aquecimento/preparatórias), identificação da melhor série e comparação com sessão anterior do mesmo treino.
3. **Interface & Componentes:**
   - Modal [`ExerciseHistoryModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/ExerciseHistoryModal.tsx) com contagem de sessões, cabeçalho rico (data, horário, nome do treino) e balão de feedback técnico dedicado do exercício (`exercise_feedback_logs.feedback_text`) para Aluno e Coach.
   - Tela [`Feedbacks.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Feedbacks.tsx) redesenhada com segmented control Não lidos / Todos, contador leve (`head: true`), botão "Abrir Treino" com redirecionamento direto para o editor e marcação automática como lido, confirmação inline suave para "Marcar todos como lidos", badges de variação de volume e realce âmbar para feedbacks escritos pendentes.
4. **Testes Automatizados:**
   - 17 testes unitários automatizados via Vitest cobrindo volume, melhor série, cardio, tempo, primeira sessão de treino e agrupamento de histórico (100% de aprovação).

### Métricas da Rubrica 6D
| Dimensão | Nota | Status |
|---|:---:|:---:|
| **D1. Funcionalidade & Requisitos** | 3.0 / 3.0 | Aprovado |
| **D2. Robustez & Estabilidade** | 3.0 / 3.0 | Aprovado |
| **D3. Qualidade de Implementação & Anti-Slop** | 3.0 / 3.0 | Aprovado |
| **D4. Consistência Arquitetural & Stack Nativa** | 3.0 / 3.0 | Aprovado |
| **D5. Performance & Eficiência** | 3.0 / 3.0 | Aprovado |
| **D6. Testabilidade, Segurança & Conformidade** | 3.0 / 3.0 | Aprovado |
| **Média Consolidada** | **3.00 / 3.00** | **PASS** |

### Arquivos Criados e Modificados
- `components/shared/ExerciseHistoryModal.tsx`: modal refatorado com paginação contínua e feedback por exercício.
- `pages/coach/Feedbacks.tsx`: tela do coach com triagem ágil, comparação de sessões e botão "Abrir Treino".
- `supabase/migrations/20261010000000_feedbacks_coach_update_rls.sql`: migração com índice parcial e policy de UPDATE.
- `utils/sessionComparison.ts`: utilitário puro de cálculo de sobrecarga progressiva e deltas de volume/séries.
- `utils/workoutHistoryGrouper.ts`: agrupamento de logs por ID de sessão de treino.
- `utils/sessionComparison.test.ts`: suíte de testes unitários para comparações de sessão.
- `utils/workoutHistoryGrouper.test.ts`: suíte de testes unitários para agrupamento de histórico.
- `vite.config.ts`: inclusão e configuração do ambiente Vitest.
- `package.json`: inclusão do script `test` e dependência do Vitest.
- `.planning/STATE.md`: atualização de governança e decisões travadas.
- `.planning/ROADMAP.md` e `ROADMAP.md`: checklist da Fase 6 finalizada.
- `PRODUCT.md`: especificação validada das regras de negócio R1 a R9.
- `docs/gauntlet/QA_REPORT_PASS15.md`: laudo formal de aprovação do Gauntlet Critic.
- `docs/gauntlet/SLICE_SUMMARY.md`: resumo técnico detalhado da fatia vertical.

---

## Marcos Anteriores Consolidados

### [2026-08-31] — Fase 5: Clareza Pedagógica & UX de Prescrição do Coach
- **Veredito:** PASS (Grade A+ 20.0 / 20.0 na Auditoria Impeccable Pass 14)
- **Entregas:** Redesign do cabeçalho "Alvo / Anterior" na execução de treino do aluno, badges legíveis para Carga (`100kg`), Repetições (`3-7 reps`) e PSE (`PSE 9.5`), modal explicativo de PSE e adequação de touch targets $\ge 44\text{px}$.

### [2026-08-15] — Fase 4: Auditoria Técnica & Refinamento Impeccable
- **Veredito:** PASS (Grade A+ 20.0 / 20.0)
- **Entregas:** Conformidade WCAG 2.1 AA em temas Claro e Escuro, acessibilidade WAI-ARIA em modais/diálogos e blindagem contra telas brancas nas rotas de treino.

### [2026-07-30] — Fase 3: Execução do Treino & PWA Offline-First
- **Entregas:** Player de execução interativo (`/student/workout/:id`), sincronização offline com IndexedDB e LocalStorage, cronômetro de descanso e detector de treinos abandonados.

### [2026-07-15] — Fase 2: Gestão do Treinador (Coach Portal)
- **Entregas:** Dashboard do treinador, construtor de treinos/rotinas, gestão de exercícios com vídeos e gestão de alunos/planos.

### [2026-06-30] — Fase 1: Arquitetura Base & Autenticação Supabase
- **Entregas:** Autenticação por e-mail/senha, controle de perfis (admin/coach/student), banco Postgres com RLS e telas de onboarding/login.
