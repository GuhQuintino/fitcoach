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

### Fase 8: Resolução de Race Condition, Deduplicação Offline & Integridade de Treinos (Concluída — PASS)
- [x] **Trava Concorrente & Prevenção de Duplo Clique:** Trava atômica síncrona `isSubmittingRef.current` combinada com o estado `isSubmitting` e desativação com feedback visual de carregamento (`animate-spin`) em todos os botões e controles de `FinishWorkoutModal` ([`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx)). [2026-10-12]
- [x] **Desvinculação da Avaliação de Esforço:** Seleção de nota de esforço desacoplada da submissão imediata, exigindo confirmação explícita do aluno ([`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx)). [2026-10-12]
- [x] **Rollback Atômico de Cabeçalhos Órfãos:** Reversão cirúrgica via `delete().eq('id', createdLogId)` no `catch` de `WorkoutExecution.tsx`, `offlineSyncService.ts` e `staleWorkoutService.ts` caso a inserção subsequente de séries ou feedbacks falhe. [2026-10-12]
- [x] **Idempotência no Sincronismo Offline:** Consulta prévia por `student_id`, `started_at` e `workout_id` em `flushOfflineQueue`, reaproveitando cabeçalho existente no Supabase e prevenindo duplicatas de séries em retentativas através de contagem de séries pré-existentes ([`offlineSyncService.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/offlineSyncService.ts)). [2026-10-12]
- [x] **Teto de Retentativas da Fila:** Fixação e validação de `MAX_SYNC_RETRIES = 3` para descarte seguro de payloads corrompidos após 3 falhas consecutivas, prevenindo loops de sincronização ([`offlineSyncService.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/offlineSyncService.ts), [`test_offline_suite.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/scripts/test_offline_suite.ts)). [2026-10-12]
- [x] **Saneamento do Banco de Dados (Supabase PostgreSQL):** Remoção de 8 registros órfãos duplicados do aluno Gabriel Pontes de 08/10, mantendo intacto exatamente 1 registro canônico legítimo (`0cbd5ee0-107e-438a-b718-8a0463de8241`). [2026-10-12]
- [x] **Garantia de Qualidade & Testes:** Suíte Vitest com 37/37 testes aprovados (100%), suíte offline com 24/24 testes aprovados (100%), build de produção do Vite 100% OK em 7.78s e laudo formal com nota máxima 3.00/3.00 ([`QA_REPORT_duplicate_workout_bug.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_duplicate_workout_bug.md)). [2026-10-12]

### Fase 9: Séries Especiais & Métodos de Intensificação (Concluída — PASS)
- [x] **M1 — Taxonomia Ortogonal em 4 Camadas:** Separação independente entre Agrupamento entre Exercícios (Camada 1), Método de Série (Camada 2), Modo de Execução & Cadência (Camada 3) e Timers & Smart Rest (Camada 4), permitindo combinações livres sem proliferar enums caóticos. [2026-10-12]
- [x] **M2 — Persistência Relacional & RLS:** Tabela `exercise_groups` com chaves estrangeiras, colunas de rounds, tempos de descanso e notas, novos campos em `workout_items`, `workout_sets` e `set_logs`, e tipagem completa em `types/supabase.ts` ([`20261012000000_special_sets_and_intensification.sql`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/migrations/20261012000000_special_sets_and_intensification.sql)). [2026-10-12]
- [x] **M3 — Editor do Treinador & Agrupamentos:** Componente `ExerciseGroupCard` suportando Biset, Triset, Giant Set e Pareado Antagonista, com rounds, tempos de transição, notas do grupo e opção de desagrupar ([`Editor.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Editor.tsx), [`ExerciseGroupCard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExerciseGroupCard.tsx)). [2026-10-12]
- [x] **M4 — Modais de Seleção & Parametrização:** `MethodSelectionModal` (9 métodos avançados), `ExecutionModeModal` (10 modos biomecânicos e cadência 4 dígitos E-P-C-P) e `TypeSelectionModal` (tipos de série) com acessibilidade ARIA e touch targets $\ge 44\text{px}$ ([`components/coach/editor/`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/)). [2026-10-12]
- [x] **M5 — Guia Pedagógico de Métodos ("? Help System"):** Catálogo estruturado `methodGuideContent.ts` e modal interativo `MethodGuideModal.tsx` com busca em tempo real e orientações biomecânicas/científicas em PT-BR para todos os métodos e modos. [2026-10-12]
- [x] **M6 — Player do Aluno & Smart Timers:** Execução de séries especiais com cronômetro inteligente que não dispara prematuramente no meio de supersets (dispara somente ao fim do round) e ativação de micro-timers automáticos para pausas curtas ([`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx)). [2026-10-12]
- [x] **M7 — Clonagem Profunda (Deep Clone) na Biblioteca:** Replicação íntegra de treinos atribuídos a alunos ou duplicados na biblioteca, recriando instâncias de `exercise_groups` e remapeando `oldGroupId -> newGroupId` para cada `workout_item` com inserção de séries em lote anti-N+1 ([`Library.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Library.tsx)). [2026-10-12]
- [x] **M8 — Rastreabilidade & Histórico:** Registro completo de telemetria em `set_logs` com preservação nas consultas e exibição agrupada no `ExerciseHistoryModal` com cobertura de testes unitários ([`workoutHistoryGrouper.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/workoutHistoryGrouper.ts)). [2026-10-12]
- [x] **Garantia de Qualidade & Testes:** Suíte Vitest com 38/38 testes aprovados (100%), suíte offline com 24/24 asserções aprovadas (100%), build de produção Vite 100% OK em 7.96s e Laudo Gauntlet Critic aprovado com nota máxima 3.00/3.00 ([`QA_REPORT_special_sets.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_special_sets.md)). [2026-10-12]

### Auditoria Impeccable Loop — Fase 9: Séries Especiais & Refinamentos de UX (Concluída — Grade A+ 20.0/20.0)
- [x] **Acessibilidade & Teclado (A11y):** Micro-botões inline `?` expandidos para `min-w-[28px] min-h-[28px]` com hover e atributos ARIA, tecla `Escape` implementada em `TypeSelectionModal`, `MethodSelectionModal` e `ExecutionModeModal`, e associação semântica `id`/`htmlFor` em `ExerciseGroupCard`. [2026-10-12]
- [x] **Theming & Color Contrast (WCAG AA/AAA):** Contraste calibrado em `specialSetTokens.ts` para série de aquecimento (`text-amber-700/400`) e método 3/7 (`bg-cyan-700`), subtítulos de `MethodGuideModal` em `text-slate-600/300`, e refinamento dark mode com `text-slate-900 dark:text-white` e estados de hover tátil. [2026-10-12]
- [x] **Clareza Pedagógica Adaptativa:** Omissão contextual da seção "Quando Aplicar" para o estudante (`isStudent = true`) em `MethodGuideModal.tsx`, reservando recomendações de periodização clínica para o treinador e focando o aluno exclusivamente na biomecânica e segurança. [2026-10-12]
- [x] **Interação & Smart Timers no Player:** Auto-scroll suave no Biset/agrupamentos com `scrollIntoView` ao alternar exercícios, precedência operacional do micro-timer do método sobre descansos normais, e suporte completo a métricas de sub-séries em Rest-Pause, Cluster Sets, Myo-Reps e Dropsets. [2026-10-12]
- [x] **Tokens Canônicos & Anti-Slop:** Padronização centralizada em `utils/specialSetTokens.ts`, zero código genérico ou decorators artificiais, 38/38 testes Vitest aprovados (100%), 0 erros TypeScript e build Vite 100% OK em 8.32s. [2026-10-12]
- [x] **Laudo Independente:** Aprovado com **20.0 / 20.0** e 0 achados remanescentes ([`QA_REPORT_IMPECCABLE_PASS18.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_IMPECCABLE_PASS18.md)). [2026-10-12]

### Refinamento Visual & Interativo — Fase 9: Harmonização Cromática do Método & Automação de Micro-Timers (Concluída)
- [x] **Harmonização Cromática em Bloco por Método (`METHOD_THEMES`):** Mapeamento cromático integral e centralizado em `utils/specialSetTokens.ts` (`METHOD_THEMES`, `getMethodTheme`) cobrindo todos os métodos (Rose para Rest-Pause, Purple para Dropset, Blue para Cluster, Amber para Myo-Reps, Emerald para Muscle Round, Cyan para Método 3/7, Fuchsia para FST-7, Teal para BFR e Slate neutro para séries padrão). [2026-10-12]
- [x] **Conexão Perfeita do Bloco no Player:** Unificação da linha principal, sub-barra de metadados e container de sub-linhas em um bloco coeso contínuo com borda esquerda `border-l-4 ${methodTheme.borderColor}` e fundo temático dinâmico em `WorkoutExecution.tsx`, com `border-l-4 border-transparent` nas séries padrão para estabilidade milimétrica do grid. [2026-10-12]
- [x] **Automação Pura de Micro-Timers & Despoluição Visual:** Remoção do botão manual redundante de micro-pausa na sub-barra, confiando no disparo automático fluído já orquestrado ao concluir a série (`[✓]`). [2026-10-12]
- [x] **Cobertura de Testes de Tokens Cromáticos:** Criação de `utils/specialSetTokens.test.ts` com 9 testes unitários validando mapeamentos e fallback, elevando a suíte para 47/47 testes Vitest aprovados (100%), 0 erros TypeScript e build Vite 100% OK em 8.32s. [2026-10-12]

### Refinamento Visual & Interativo — Fase 9: Restauração do Padrão Visual Nativo & Fluxo Sequencial de Sub-Séries (Concluída)
- [x] **Remoção de Bordas Grossas & Geometria Nativa:** Eliminação de todas as bordas laterais `border-l-4` e restauração da grade limpa e arredondada original do app em séries principais e sub-séries ([`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx), [`specialSetTokens.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.ts)). [2026-10-12]
- [x] **Fundo Suave Ativo & Verde Claro Padrão no Check:** Fundo suave contextual (`bg-*-50/60`) para séries ativas/pendentes e transição imediata para verde claro nativo (`bg-emerald-100/70 dark:bg-emerald-900/30`) ao marcar check `[✓]` tanto na série mãe quanto em cada sub-série/drop. [2026-10-12]
- [x] **Badges Compactos na Coluna Ant./Alvo:** Integração do badge de método e botão de ajuda na coluna "Ant. / Alvo", eliminando a sub-barra redundante e diminuindo o ruído cognitivo. [2026-10-12]
- [x] **Grade Alinhada de 6 Colunas para Sub-Séries:** Sub-séries (`+1`, `+2`) e drops (`-1`, `-2`) utilizando a mesma grade de 6 colunas (`#`, `Ant. / Alvo`, `KG`, `REPS`, `PSE`, `✓`) com linha de total acumulado discreta. [2026-10-12]
- [x] **Fluxo Sequencial & Desacoplamento do Check:** Conclusão da série mãe não auto-marca sub-séries; fluxo guiado passo a passo com check individual em cada sub-série. [2026-10-12]
- [x] **Timer Único Integrado Inferior:** Acionamento de micro-pausas diretamente no cronômetro inferior nativo do app (`startRestTimer`), removendo o segundo relógio flutuante superior. [2026-10-12]
- [x] **Testes Automatizados:** 48/48 testes Vitest aprovados (100%), 0 erros TypeScript e 24/24 testes na suíte offline (72 asserções 100% verdes). [2026-10-12]

### Fase 10: Fix Finalização de Treinos, Blindagem de Séries Especiais & Recuperação de Dados (Concluída — PASS)
- [x] **F1 — Sanitização Universal de `set_type`:** Função `sanitizeSetType()` em `utils/specialSetTokens.ts` cobrindo com segurança os 8 tipos suportados pelo Postgres (`warmup`, `feeder`, `working`, `top_set`, `backoff`, `failure`, `drop`, `dropset`), com normalização para `'drop'` e fallback seguro para `'working'`. [2026-10-14]
- [x] **F2 — Desdobramento de Dropsets & Retrocompatibilidade DDL:** Migração idempotente `supabase/migrations/20261014000000_add_dropset_to_set_type_enum.sql` adicionando `'dropset'` ao enum PostgreSQL no Supabase, e desdobramento para `'drop'` nos fluxos de inserção de séries filhas. [2026-10-14]
- [x] **F3 — Blindagem da Fila Offline (Anti-Data-Loss):** Remoção definitiva do descarte silencioso em `offlineSyncService.ts`, preservando o histórico integral do aluno (`remainingQueue.push(item)`) com registro de `lastError` e retentativa segura. [2026-10-14]
- [x] **F4 — Suporte Completo a Sub-Séries & Metadados em Stale/Offline:** Registro integral de sub-séries (`sub_sets_records`) e propagação de todos os metadados das 4 camadas (`group_round`, `set_method`, `micro_set_index`, `execution_mode`, `tempo_used`, `timer_mode`) em `staleWorkoutService.ts` e `offlineSyncService.ts`, com rollback cirúrgico ativo contra órfãos. [2026-10-14]
- [x] **F5 — Restauração Idempotente do Treino de Maria Aparecida:** Script `scripts/restore_maria_workout_14_oct.cjs` restaurando com fidelidade matemática e empírica as 17 séries (5808 kg) e feedback técnico da panturrilha do treino de 14/10/2026 (`156372b5-22f3-4a0d-98c8-e91a36fce1fc`). [2026-10-14]
- [x] **Garantia de Qualidade & Testes:** Suíte Vitest com 52/52 testes aprovados (100%), suíte offline com 24/24 asserções aprovadas (100%), 0 erros TypeScript, build Vite 100% OK em 7.96s e Laudo Gauntlet Critic aprovado com nota máxima 3.00/3.00 ([`QA_REPORT_workout_finalization_fix.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_workout_finalization_fix.md)). [2026-10-14]
