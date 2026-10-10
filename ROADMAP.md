# ROADMAP — Fitcoach Pro

## Visão do Produto
Fitcoach Pro é uma plataforma progressiva (PWA Mobile-First com suporte a fallback offline) de gestão e execução de treinos personalizados, conectando treinadores físicos (Coaches) e alunos (Students) com foco em alta performance, aderência, clareza pedagógica e design de padrão internacional.

---

## Fases do Projeto

### Fase 1: Arquitetura Base & Autenticação Supabase (Concluída)
- [x] Autenticação com e-mail/senha e controle de papéis (`admin`, `coach`, `student`).
- [x] RLS (Row Level Security) e tabelas relacionais no Postgres.
- [x] Telas de Login, Registro, Aguardando Aprovação e Assinatura Vencida.

### Fase 2: Gestão do Treinador (Coach Portal) (Concluída)
- [x] Dashboard de métricas, faturamento e resumo de alunos.
- [x] Biblioteca de Rotinas e Construtor de Treinos (Editor).
- [x] Gestão de Exercícios, Links de Vídeo (YouTube/MP4) e Prescrição de Séries (Reps, Tempo, Cardio, HIIT).
- [x] Gestão de Alunos, Atribuição de Planos e Vencimento de Consultoria.

### Fase 3: Execução do Treino & PWA Offline-First (Concluída)
- [x] Player de Execução de Treino interativo (`/student/workout/:id`).
- [x] Sincronização offline transparente com IndexedDB e LocalStorage.
- [x] Detecção de treinos abandonados (`useStaleWorkoutDetector`).
- [x] Cronômetro de descanso flutuante e modo HIIT intervalado.
- [x] Histórico de treinos com acordiões e gráficos de evolução.

### Fase 4: Auditoria Técnica & Refinamento Impeccable (Concluída — Grade A+ 20.0/20.0)
- [x] Acessibilidade WAI-ARIA integral em modais, acordeões e formulários.
- [x] Conformidade de contraste WCAG 2.1 AA em tema Claro e Escuro.
- [x] Touch targets seguros ($\ge 44 \times 44\text{px}$) em todos os botões e abas.
- [x] Correção de rotas e blindagem contra telas em branco (`/student/workout`).
- [x] Auditoria independente aprovada com 20.0/20.0 (PASS sem bloqueantes).

### Fase 5: Clareza Pedagógica & UX de Prescrição do Coach (Concluída)
- [x] Refatoração da apresentação de Metas vs Histórico na Execução do Treino.
- [x] Badges explicativos e legíveis para Carga (`100kg`), Faixa de Repetições (`3-7 reps`) e PSE (`PSE 9.5`).
- [x] Cabeçalho semântico `Alvo / Anterior` e botões com modais explicativos (`kg ?`, `Reps ?`, `PSE ?`).
- [x] Resolução dos 6 itens de acessibilidade e touch targets do editor e dashboards.

### Fase 6: Histórico Completo do Exercício + Fila de Feedbacks do Coach (Concluída — PASS15)
- [x] **R1 — Histórico Ilimitado:** Modal de histórico completo com paginação contínua em lotes de 1000 sem truncamento ou limite de 20 registros ([`ExerciseHistoryModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/ExerciseHistoryModal.tsx)). [2026-10-10]
- [x] **R2 — Agrupamento por Sessão:** Agrupamento estrito por `workout_logs.id` impedindo fusão de treinos realizados no mesmo dia ([`workoutHistoryGrouper.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/workoutHistoryGrouper.ts)). [2026-10-10]
- [x] **R3 & R4 — Feedback Técnico Isolado:** Apresentação dedicada de `exercise_feedback_logs.feedback_text` compartilhada no modal para Aluno e Coach. [2026-10-10]
- [x] **R5 — Ação "Abrir Treino":** Botão nos cards de feedback com navegação profunda para `/coach/editor?workout_id=...&student_id=...` e marcação otimista como lido ([`Feedbacks.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Feedbacks.tsx)). [2026-10-10]
- [x] **R6 & R7 — Gestão de Triagem de Feedbacks:** Filtro Não lidos / Todos com contador leve (`head: true`), paginação por cursor (`lt`) e botão "Marcar todos como lidos" com confirmação inline suave. [2026-10-10]
- [x] **R8 — Sobrecarga Progressiva:** Comparação determinística com a sessão anterior do mesmo treino (resumo de volume e delta por série/exercício, descartando aquecimentos) ([`sessionComparison.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/sessionComparison.ts)). [2026-10-10]
- [x] **R9 — Destaque Visual:** Borda âmbar, anel de foco e prévia para cards contendo feedbacks escritos prioritários para o coach. [2026-10-10]
- [x] **Persistência & RLS:** Migração SQL com índice parcial `idx_workout_logs_coach_unread` e policy de UPDATE de `read_by_coach` para coaches ([`20261010000000_feedbacks_coach_update_rls.sql`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/migrations/20261010000000_feedbacks_coach_update_rls.sql)). [2026-10-10]
- [x] **Garantia de Qualidade & Testes:** Suíte de 17 testes automatizados com Vitest (100% passed) e Laudo Técnico Gauntlet Critic aprovado com nota máxima 3.00/3.00 ([`QA_REPORT_PASS15.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_PASS15.md)). [2026-10-10]

### Fase 7: Gestão e Localização Rápida de Alunos (`/coach/students`) & Sincronização com Dashboard (Concluída — PASS16)
- [x] **S1 — Classificação Canônica de Status:** Implementação de `classifyStudent` com categorização tripartite (`active` com consultoria vigente, `pending` para aprovação ou vencidos nos últimos 7 dias com tolerância de renovação, e `inactive` para vencidos há >7 dias ou banidos) ([`studentStatus.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.ts)). [2026-10-10]
- [x] **S2 — Aba Padrão "Ativos":** Abertura padrão de `/coach/students` na aba de alunos ativos (`selectedTab = 'active'`) eliminando cliques redundantes ([`Students.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Students.tsx)). [2026-10-10]
- [x] **S3 — Contadores Globais Fixos:** 4 cards métricos no topo (*Total*, *Ativos*, *Pendentes*, *Inativos*) calculados sobre a base global do coach via `calculateDashboardStats(allStudents)`, estáveis independentemente da aba ou busca ativa ([`Students.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Students.tsx)). [2026-10-10]
- [x] **S4 — Sincronização 100% com Dashboard:** Eliminação completa de discrepâncias com `/coach/dashboard`, trazendo `consultancy_expires_at` do banco e consumindo os mesmos utilitários puros de classificação ([`Dashboard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Dashboard.tsx)). [2026-10-10]
- [x] **S5 — Engajamento & Vencimento nos Cards:** Apresentação da data relativa do último treino com alerta visual âmbar para inatividade > 7 dias, e badges de urgência de vencimento de plano (<= 7 dias ou em tolerância de renovação) ([`studentStatus.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.ts)). [2026-10-10]
- [x] **S6 — Ações Rápidas & WhatsApp:** Botão de WhatsApp direto para todos os alunos com telefone cadastrado, links rápidos para perfil de treinos e modal integrado para aprovação e edição de validade com atalhos de data ([`Students.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Students.tsx)). [2026-10-10]
- [x] **S7 — Ordenação Rápida:** Alternância instantânea entre "Último treino" (mais recentes primeiro com desempate alfabético) e "Nome (A-Z)" ([`Students.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Students.tsx)). [2026-10-10]
- [x] **Performance Anti-N+1:** Carregamento do último treino de todos os alunos via 1 única consulta em lote na tabela `workout_logs` com indexação em `Map` client-side em O(N). [2026-10-10]
- [x] **Garantia de Qualidade & Testes:** Suíte de 20 testes unitários específicos em `studentStatus.test.ts` (37 testes no total do Vitest, 100% passed) e Laudo Técnico Gauntlet Critic aprovado com nota máxima 3.00/3.00 ([`QA_REPORT_PASS16.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_PASS16.md)). [2026-10-10]

### Auditoria Impeccable Loop — Fases 6 e 7 (Concluída — Grade A+ 20.0/20.0)
- [x] **Acessibilidade (A11y):** Touch targets seguros $\ge 44 \times 44\text{px}$ em 100% dos controles, listener da tecla `Escape` em modais, WAI-ARIA completo e textos `sr-only` para leitores de tela em badges e seletores. [2026-10-10]
- [x] **Theming & Color Contrast:** Conformidade estrita WCAG AA/AAA em Light & Dark Mode, sem tokens inválidos de Tailwind e contraste superior a 7:1 em cartões e alertas. [2026-10-10]
- [x] **Responsividade Mobile:** Reflow fluido em telas estreitas (360px a 430px) com grid de estatísticas `grid-cols-2 sm:grid-cols-4` e grid de séries `grid-cols-1 sm:grid-cols-2`. [2026-10-10]
- [x] **Anti-AI-Slop & Craft:** Substituição de SVG progress rings genéricos por tipografia de alta densidade no Dashboard, eliminação de kickers repetitivos ("Ferramenta"/"Biblioteca") em favor de cópias informativas, e substituição de alertas síncronos nativos por `react-hot-toast`. [2026-10-10]
- [x] **Laudo Independente:** Aprovado com **20.0 / 20.0** e 0 achados remanescentes ([`QA_REPORT_IMPECCABLE_PASS17.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_IMPECCABLE_PASS17.md)). [2026-10-10]

