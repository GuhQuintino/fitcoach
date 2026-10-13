# STATE — Fitcoach Pro

**Última Atualização:** 12 de Outubro de 2026  
**Fase Ativa:** Fase 9 — Séries Especiais, Métodos de Intensificação & Restauração do Padrão Visual Nativo (Concluída com Sucesso)  
**Status Global:** Saúde excelente, 0 erros TypeScript (`tsc --noEmit`), 48 testes automatizados Vitest passando (100%), 24 testes na suíte offline passando (100%), total de 72 testes/asserções 100% verdes, build de produção Vite 100% OK em 8.32s (`npm run build`), banco de dados Supabase com schema relacional de grupos e métodos atualizado, Laudo de Auditoria Gauntlet Critic com nota máxima **3.00 / 3.00 (Média 6D — PASS)** ([`QA_REPORT_special_sets.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_special_sets.md)) e Laudo de Re-Auditoria Impeccable Craft com nota máxima **20.0 / 20.0 (PASS — Zero Bloqueantes)** ([`QA_REPORT_IMPECCABLE_PASS18.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_IMPECCABLE_PASS18.md)).

---

## 🎯 Marco Atual Concluído
- **Objetivo**: Implementação ponta a ponta da Taxonomia Ortogonal em 4 Camadas para prescrição e execução de Séries Especiais e Métodos Avançados de Intensificação (Biset, Triset, Dropset, Rest-Pause, Myo-Reps, FST-7, etc.), combinada com os refinamentos cirúrgicos da Auditoria Impeccable (Acessibilidade, Theming WCAG AA, Auto-Scroll, Timers Prioritários e Guia Pedagógico Adaptativo).
- **Entregáveis da Fatia Vertical & Refinamentos Impeccable (End-to-End)**:
  - **Modelagem Relacional & Migração Supabase ([`20261012000000_special_sets_and_intensification.sql`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/migrations/20261012000000_special_sets_and_intensification.sql))**:
    - Criação da tabela `public.exercise_groups` (com `group_type`, `rounds`, `rest_between_rounds_seconds`, `transition_rest_seconds`, `notes` e políticas de RLS completas).
    - Extensão de `public.workout_items` com `group_id` (FK `exercise_groups`), `group_order` e `exercise_notes`.
    - Extensão de `public.workout_sets` com `set_method`, `method_config` (JSONB dinâmico), `execution_mode`, `tempo`, `timer_mode`, `micro_pause_seconds` e `activation_reps`.
    - Extensão de `public.set_logs` com campos de telemetria completa (`set_method`, `group_round`, `micro_set_index`, `execution_mode`, `tempo_used`, `timer_mode`).
    - Tipagem TypeScript atualizada em [`types/supabase.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/types/supabase.ts).
  - **Editor do Coach & UX de Prescrição ([`Editor.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Editor.tsx))**:
    - Card de agrupamento [`ExerciseGroupCard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExerciseGroupCard.tsx) com suporte visual e operacional a Biset, Triset, Giant Set e Pareado Antagonista, com controles de rounds, descanso entre rounds, tempo de transição, anotações do grupo, desagrupamento seguro e semântica acessível `id`/`htmlFor`.
    - Modais atômicos de seleção e parametrização com acessibilidade ARIA, listener da tecla `Escape` e touch targets $\ge 44\text{px}$:
      - [`MethodSelectionModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/MethodSelectionModal.tsx): 9 métodos avançados (Standard, Dropset, Rest-Pause, Cluster, Myo-Reps, Muscle Round, Método 3/7, FST-7, BFR) com sliders de drops, micro-pausas e sub-séries.
      - [`ExecutionModeModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExecutionModeModal.tsx): 10 modos biomecânicos e cadência 4 dígitos E-P-C-P (ex: `4-0-1-0`).
      - [`TypeSelectionModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/TypeSelectionModal.tsx): Tipos de série (Aquecimento, Preparatória, Trabalho, Top Set, Back-off, Falha).
    - Desdobramento cirúrgico de dropsets em sub-séries sem perda de integridade.
  - **Guia Pedagógico de Métodos ("? Help System") Adaptativo**:
    - Catálogo canônico estruturado em [`methodGuideContent.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/methodGuideContent.ts) contendo instruções passo a passo, recomendações científicas e dicas de execução em PT-BR para todos os métodos e modos.
    - Modal interativo [`MethodGuideModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/MethodGuideModal.tsx) com busca em tempo real, abas por camada e acionamento direto via botões `?` ampliados (`min-w-[28px] min-h-[28px]`).
    - **Omissão de "Quando Aplicar" para o Aluno (`isStudent = true`):** O aluno visualiza exclusivamente instruções de execução biomecânica e segurança; prescrições clínicas e de periodização são exibidas apenas para o treinador.
  - **Player de Execução do Aluno, Smart Timers & Interação ([`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx))**:
    - Suporte a agrupamentos no player: identificador visual do grupo, contagem de rounds e exercícios conectados.
    - **Auto-Scroll no Biset e Agrupamentos:** Foco automático suave (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) ao avançar entre exercícios agrupados.
    - **Prioridade do Timer do Método:** Micro-timers para intervalos curtos (Rest-Pause, Cluster, Myo-Reps, Dropset) possuem precedência absoluta sobre descansos convencionais; descanso de grupo dispara exclusivamente após o término de todas as séries do round.
    - **Métricas e Tracking de Sub-Séries:** Suporte completo para edição de cargas/repetições e marcação individual de conclusão em sub-séries de métodos avançados.
    - Gravação atômica em `set_logs` preservando todos os metadados de telemetria das 4 camadas.
  - **Padronização de Tokens Canônicos ([`specialSetTokens.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.ts))**:
    - Centralização de `GROUP_TOKENS`, `METHOD_TOKENS`, `EXECUTION_MODE_TOKENS` e `SET_TYPE_TOKENS` com conformidade estrita de contraste WCAG AA/AAA em Light e Dark Mode (warmup em `text-amber-700/400`, método 3/7 em `bg-cyan-700`).
  - **Clonagem Profunda (Deep Clone) na Biblioteca ([`Library.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Library.tsx))**:
    - Replicação íntegra de treinos atribuídos a alunos ou duplicados na biblioteca, recriando instâncias de `exercise_groups` e mapeando `oldGroupId -> newGroupId` para cada `workout_item`, com clonagem das 4 camadas em lote anti-N+1.
  - **Rastreabilidade no Histórico ([`ExerciseHistoryModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/ExerciseHistoryModal.tsx), [`workoutHistoryGrouper.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/workoutHistoryGrouper.ts))**:
    - Agrupador de histórico atualizado e coberto por testes unitários preservando os metadados das 4 camadas nos sets exibidos.
  - **Restauração do Padrão Visual Nativo & Fluxo Sequencial de Sub-Séries ([`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx), [`specialSetTokens.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.ts))**:
    - **Eliminação de Bordas Laterais Grossas:** Remoção de todas as instâncias de `border-l-4` e separadores pesados na esquerda das séries e sub-séries, resgatando a geometria arredondada e limpa original do aplicativo.
    - **Dinamismo Cromático da Linha (`rowBg`):** Séries ativas/pendentes exibem tons suaves e translúcidos do método (`bg-rose-50/60`, `bg-purple-50/60`, `bg-blue-50/60`, `bg-amber-50/60`, etc.) ou a cor nativa de aquecimento/preparação. Ao serem marcadas como concluídas via check `[✓]`, o fundo é imediatamente convertido para o verde claro padrão do app (`bg-emerald-100/70 dark:bg-emerald-900/30`), aplicado igualmente à série principal e a cada sub-série/drop individual.
    - **Badges Compactos na Coluna Ant./Alvo:** O indicador de método (ex: `REST-PAUSE 15s ?`) foi integrado diretamente na segunda coluna ("Ant. / Alvo") junto aos alvos do treinador, eliminando a sub-barra fragmentada redundante.
    - **Grade Direta de 6 Colunas para Sub-Séries:** Sub-séries (`+1`, `+2`) e drops (`-1`, `-2`) alinhadas rigorosamente na mesma grade de 6 colunas do app (`#`, `Ant. / Alvo`, `KG`, `REPS`, `PSE`, `✓`), com remoção de cabeçalhos isolados e exibição discreta do `Total acumulado na série: X reps`.
    - **Fluxo Sequencial & Desacoplamento do Check:** Marcar a série principal como concluída não marca mais em lote as sub-séries. Cada sub-série é marcada de forma 100% independente pelo aluno.
    - **Timer Único Integrado:** Micro-pausas disparam diretamente no cronômetro inferior padrão do app (`startRestTimer`), removendo o segundo relógio flutuante superior redundante.
  - **Validação Automatizada Abrangente**:
    - 48/48 testes unitários passando no Vitest, 24/24 testes na suíte offline (total de 72 asserções 100% verdes), 0 erros no typecheck (`tsc --noEmit`), build Vite concluído em 8.32s, Laudo Gauntlet Critic **3.00 / 3.00 (Média 6D — PASS)** e Laudo Impeccable Audit Loop **20.0 / 20.0 (PASS com Excelência)**.

---

## 🔒 Decisões Travadas (Locked Decisions)
- **Taxonomia Ortogonal em 4 Camadas:** Separação estrita e independente entre Camada 1 (Agrupamento entre exercícios), Camada 2 (Método da série), Camada 3 (Modo de execução/cadência) e Camada 4 (Timers & Rest). Permite combinar livremente qualquer método com qualquer modo sem proliferação caótica de enums.
- **Tabela Relacional Dedicada `exercise_groups`:** Agrupamentos residem em tabela própria com integridade referencial, foreign keys e controle de rounds (`rounds`), tempo de descanso entre rounds (`rest_between_rounds_seconds`) e tempo de transição entre exercícios (`transition_rest_seconds`).
- **Omissão Pedagógica Orientada ao Papel:** A seção "Quando Aplicar" em `MethodGuideModal` é omitida na visão do aluno (`isStudent = true`) para evitar sobrecarga de decisões de periodização clínica/esportiva, focando exclusivamente na técnica e biomecânica do movimento.
- **Canonicidade Estrita de Tokens Visuais:** Todos os identificadores visuais residem em `utils/specialSetTokens.ts`, garantindo harmonia estética, contraste WCAG AA/AAA e manutenção centralizada.
- **Precedência Operacional de Micro-Timers:** Durante métodos avançados com micro-pausas (Rest-Pause, Cluster, Myo-Reps, Dropset), o timer da micro-pausa tem prioridade sobre intervalos regulares, e o descanso do grupo só dispara ao fim do round.
- **Auto-Scroll no Player do Aluno:** O player centraliza suavemente os exercícios e sub-séries ativos dentro de supersets via `scrollIntoView`, eliminando atritos manuais durante a execução sob estresse físico.
- **Desdobramento Cirúrgico de Dropsets & Sub-Séries:** Dropsets, clusters, rest-pause e myo-reps registram sub-séries com carga e repetições independentes na interface e no banco de dados.
- **Deep Clone de Grupos com Remapeamento de IDs:** A clonagem de rotinas e treinos em `Library.tsx` cria novos registros em `exercise_groups` e remapeia `oldGroupId -> newGroupId` para cada `workout_item` antes de persistir em lote.
- **Telemetria e Rastreabilidade Completa em `set_logs`:** Cada série realizada grava metadados das 4 camadas (`set_method`, `group_round`, `micro_set_index`, `execution_mode`, `tempo_used`, `timer_mode`) para histórico e progressão de carga.
- **Rollback Cirúrgico Resiliente:** Persistência de treinos e auto-finalização no aluno possuem rollback explícito (`delete().eq('id', createdLogId)`) em caso de erro na gravação de séries, prevenindo registros órfãos.
- **Padrão Visual Nativo & Geometria Limpa:** Remoção de bordas laterais grossas (`border-l-4`) em favor da estética original arredondada e limpa do app. Cores de métodos atuam exclusivamente como fundo suave (`bg-*-50/60`) durante o estado ativo/pendente.
- **Transição Compulsória para Verde Claro no Check:** Qualquer série ou sub-série marcada com `[✓]` assume compulsoriamente o fundo verde claro padrão do aplicativo (`bg-emerald-100/70 dark:bg-emerald-900/30`), garantindo feedback visual consistente em toda a experiência de treino.
- **Independência Estrita de Sub-Séries & Drops:** O check na série mãe não auto-conclui sub-séries. Cada etapa fracionada exige check individual, respeitando o fluxo sequencial real do atleta.
- **Timer Único Inferior Padrão:** Micro-pausas de métodos (ex: 15s em Rest-Pause) e descansos convencionais compartilham a mesma infraestrutura do cronômetro inferior flutuante, eliminando poluição de múltiplos timers simultâneos em tela.

---

## 📊 Métricas de Qualidade
- **TypeScript:** 0 erros de tipagem estática (`tsc --noEmit`)
- **Testes Automatizados (Vitest):** 48 passed / 48 total (100% de sucesso)
  - `utils/specialSetTokens.test.ts`: 10/10 passed (mapeamento cromático de cada método, fallback seguro e ausência de `border-l-4`)
  - `utils/workoutHistoryGrouper.test.ts`: 5/5 passed (metadados das séries especiais)
  - `utils/sessionComparison.test.ts`: 13/13 passed
  - `utils/studentStatus.test.ts`: 20/20 passed
- **Suíte de Testes Offline:** 24 passed / 24 total (100% de sucesso via `scripts/test_offline_suite.ts`)
- **Total de Asserções Automatizadas:** 72 testes/asserções 100% verdes
- **Build de Produção:** Vite build 100% concluído em 8.32s sem erros
- **Acessibilidade:** 0 violações críticas P0 (WAI-ARIA `role="dialog"`, `aria-modal="true"`, touch targets $\ge 44\text{px}$, micro-botões $\ge 28\text{px}$, suporte a tecla `Escape` em 100% dos modais, `id`/`htmlFor` associados)
- **Laudo Gauntlet Critic (special_sets):** **3.00 / 3.00 (Média 6D — PASS)** documentado em [`QA_REPORT_special_sets.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_special_sets.md)
- **Laudo Impeccable Audit Loop (PASS18):** **20.0 / 20.0 (PASS com Excelência — Zero Bloqueantes)** documentado em [`QA_REPORT_IMPECCABLE_PASS18.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_IMPECCABLE_PASS18.md)

---

## 🚀 Próximo Passo
- Alinhamento de novas fatias verticais ou recursos prioritários no ecossistema Fitcoach Pro.
