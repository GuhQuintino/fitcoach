# Gauntlet Loop — Stage 2: Resumo de Execução das Fatias Verticais (`SLICE_SUMMARY.md`)

**Projeto:** Fitcoach Pro (`frontend-framework` + `full-stack` — React 19 + TypeScript + Vite 6 + Tailwind CSS + Supabase)
**Estágio:** Stage 2 (Wave Execution — Slices 1, 2 e 3)
**Agente Executor:** `gauntlet-builder` (Craft Director)

---

## 1. Visão Geral da Entrega

Todas as 3 Fatias Verticais especificadas em `PRODUCT.md` e `docs/gauntlet/REFERENCIAS.md` foram implementadas de ponta a ponta na stack nativa do Fitcoach Pro com zero truncamento de código, conformidade com os tokens visuais (`TOKENS.json`) e blindagem por suíte de testes de regressão automatizados (`*.regression.test.ts`).

---

## 2. Detalhamento por Fatia Vertical

### Slice 1 — Limpeza Estrutural, Fluxos Reais de Auth/Privacidade (WhatsApp) e Painel do Coach
1. **Remoção de Código Morto e Rotas de Planos Comerciais:**
   - [App.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/App.tsx): Removidas importações lazy e rotas `/coach/plans` e `/coach/subscription`.
   - [BottomNav.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/BottomNav.tsx): Removido o item `{ path: '/coach/plans', icon: 'card_membership', label: 'Planos' }` da barra de navegação inferior do Coach.
   - **Arquivos físicos deletados:** `pages/coach/Plans.tsx`, `pages/coach/SubscriptionDetails.tsx` e `contexts/RoleContext.tsx`.
2. **Sincronização de Tipos do Banco (`types/supabase.ts`):**
   - [supabase.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/types/supabase.ts): Adicionados os campos `gender: string | null` e `activity_level?: string | null` em `students_data` e `description: string | null` e `duration_minutes: number | null` em `workouts`.
3. **Recuperação de Senha via WhatsApp do Coach (`pages/Login.tsx`):**
   - [Login.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/Login.tsx): Substituído o toast estático no botão `"Esqueceu a senha?"` por um modal acessível (`role="dialog"`, `aria-modal="true"`, suporte à tecla `Escape`) onde o aluno informa seu Nome ou Login (`@fitcoach.com`) e aciona `"Solicitar Nova Senha pelo WhatsApp"`, abrindo `https://wa.me/5511992616777` com mensagem pré-formatada para o Coach Gustavo.
4. **Privacidade Funcional, Troca de Senha e Exclusão via WhatsApp (`pages/settings/Privacy.tsx`):**
   - [Privacy.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/settings/Privacy.tsx): Removidos os 4 switches cosméticos sem efeito (`showBio`, `showAvatar`, `performanceAnalysis`, `privateWorkoutHistory`). Adicionado formulário real de **Alterar Senha de Acesso** via `supabase.auth.updateUser({ password })` e ação **Solicitar Exclusão de Todos os Dados** abrindo WhatsApp (`5511992616777`) com os dados do usuário logado.
5. **E-mail no Perfil do Coach e Changelog em Atualizações (`pages/coach/Profile.tsx` & `pages/coach/Updates.tsx`):**
   - [Profile.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Profile.tsx): Exibição somente leitura do e-mail da conta (`profileData.email || user?.email`) no cabeçalho e na seção de informações pessoais.
   - [Updates.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Updates.tsx): Adicionada seção de **Histórico de Versões (Novidades do Sistema)** junto às pendências operacionais dos alunos.

---

### Slice 2 — Experiência do Aluno (Dashboard XP, Seleção, Histórico Interativo, TMB Mifflin-St Jeor e Storage)
1. **Preservação de Duração e Descrição na Clonagem de Rotinas (`pages/coach/Library.tsx`):**
   - [Library.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Library.tsx): Na função `handleAssign`, o insert de `workouts` agora copia `duration_minutes` e `description` do template original.
2. **Seleção de Treinos Sem JSON Cru e Duração Real (`pages/student/Selection.tsx`):**
   - [Selection.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/Selection.tsx): Criadas e exportadas `parseRoutineMeta`, `formatRoutineInfoToast` e `resolveWorkoutDurationLabel`. O botão `info` formata metadados JSON (`duration`, `level`, `frequency`) em texto legível (`"Duração média: 50-60 min • Nível: Iniciante • Frequência: 3x/sem"`), exibe a duração real nos cards de treino e remove o badge redundante `"Ver detalhes"` e a função morta `getDifficultyColor`.
3. **Dashboard do Aluno com Destaque de Nível/XP e Remoção de "Dica do dia" (`pages/student/Dashboard.tsx`):**
   - [Dashboard.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/Dashboard.tsx): Removido o texto `"Plano Atual / Consultoria Pro"` e o card `"Dica do dia"`. O card superior agora destaca o **Nível e XP atual** (`Nível X • Y XP`), barra de progresso de XP, explicação clara da mecânica (`"Cada treino concluído soma 100 XP. A cada 1.000 XP (10 treinos), você sobe de nível!"`) e indicador de validade (`Expira em: DD/MM/AAAA`).
4. **Histórico do Aluno com Query Corrigida e Calendário Interativo (`pages/student/History.tsx`):**
   - [History.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/History.tsx): Corrigida a busca da rotina ativa usando `student_assignments` (`.eq('student_id', user!.id).eq('is_active', true)`). Os dias com treino no calendário mensal agora são botões interativos que expandem o treino correspondente, destacam o card e fazem scroll suave até `#history-log-YYYY-MM-DD`. Removida a função não utilizada `formatDuration`.
5. **Calculadora Metabólica Mifflin-St Jeor e Sanitização de Dados (`utils/metabolicCalculator.ts`, `pages/student/Profile.tsx`, `pages/coach/StudentProfileView.tsx`):**
   - [metabolicCalculator.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/metabolicCalculator.ts): Utilitário puro com `sanitizeWeightKg` (corrige `750 -> 75.0 kg`, `75000 -> 75.0 kg`, valida `[25, 250] kg`), `sanitizeHeightCm` (converte `1.75 -> 175 cm`, `1750 -> 175 cm`, valida `[100, 250] cm`), `calculateAgeFromBirthDate` (idade exata com fallback seguro) e `calculateMetabolicProfile` (equação de Mifflin-St Jeor + multiplicador de atividade física).
   - [Profile.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/Profile.tsx) e [StudentProfileView.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/StudentProfileView.tsx): Integrados à calculadora metabólica com seletor de **Nível de Atividade Física** persistido em `profiles.preferences.activity_level`.
6. **Remoção Completa de Fotos no Supabase Storage (`components/student/EvolutionGallery.tsx`):**
   - [EvolutionGallery.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/student/EvolutionGallery.tsx): Exportada `extractStoragePath` e atualizada `deletePhoto` para remover o arquivo físico do bucket `evolution-photos` via `supabase.storage.from('evolution-photos').remove([storagePath])` além de deletar o registro na tabela `evolution_photos`.

---

### Slice 3 — Ferramentas do Coach (Templates Avançados, Upload de Mídia, Importação Sem N+1) e Motor de Notificações
1. **Preservação Integral das Camadas 2, 3, 4 e Cardio/HIIT em Templates (`components/coach/editor/SetTemplateManager.tsx`):**
   - [SetTemplateManager.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/SetTemplateManager.tsx): Exportadas `serializeSetForTemplate`, `deserializeTemplateSet`, `serializeSetsForTemplate` e `deserializeTemplateSets` preservando todos os campos básicos, avançados (`set_method`, `drop_count`, `sub_sets`, `micro_rest_seconds`, `activation_reps`, `execution_mode`, `tempo`, `timer_mode`) e de Cardio/HIIT (`time_target`, `distance_target`, `speed_target`, `incline_target`, `is_hiit`, `hiit_work_seconds`, `hiit_rest_seconds`, `hiit_rounds`, `hiit_cycles`, `hiit_work_speed`, `hiit_rest_speed`).
2. **Upload Direto de GIF/Imagem/Vídeo em Exercícios (`components/coach/exercises/ExerciseFormModal.tsx` & `pages/coach/Exercises.tsx`):**
   - [ExerciseFormModal.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/exercises/ExerciseFormModal.tsx) e [Exercises.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Exercises.tsx): Suporte a envio direto de arquivos GIF, WebP, PNG, JPG, MP4 e WebM para o Supabase Storage com pré-visualização instantânea no modal e preenchimento automático de `video_url` e `image_url`.
3. **Eliminação de N+1 na Importação de Treinos (`components/coach/editor/WorkoutImportModal.tsx`):**
   - [WorkoutImportModal.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/WorkoutImportModal.tsx): Substituído o loop `Promise.all` por busca única de `students_data` com filtro client-side em `profiles.full_name` e query em lote único (`.in('student_id', studentIds).eq('is_active', true)`) em `student_assignments`.
4. **Correção das Queries do Dispatcher de Notificações (`utils/smartNotificationDispatcher.ts`):**
   - [smartNotificationDispatcher.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/smartNotificationDispatcher.ts): Removidas as colunas inexistentes `age` (de `students_data`) e `completed_at` (de `workout_logs`, substituída por `finished_at`), eliminando erros HTTP 400 no PostgREST.
5. **Edge Function `smart-notifications` Completa (`supabase/functions/smart-notifications/index.ts`):**
   - [index.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/functions/smart-notifications/index.ts): Conversão de fuso horário para `America/Sao_Paulo` (UTC-3), respeito a `quiet_hours_start` e `quiet_hours_end` customizados por aluno, **Backoff inteligente de 5 dias** após 2 notificações ignoradas consecutivas e envio para endpoints registrados em `push_subscriptions` com limpeza automática de inscrições expiradas (`404`/`410`).
6. **Correção de Colisão de Chaves em Preferências de Notificação (`types/notifications.ts` & `pages/settings/Notifications.tsx`):**
   - [notifications.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/types/notifications.ts) e [Notifications.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/settings/Notifications.tsx): Separadas as chaves `coach_feedback` (`"Novos Feedbacks de Alunos"`) e `evolution_photos` (`"Fotos de Evolução de Alunos"`), garantindo persistência independente de todos os switches.

---

## 3. Suíte de Testes de Regressão Criada

- [metabolicCalculator.regression.test.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/__tests__/metabolicCalculator.regression.test.ts)
- [smartNotificationDispatcher.regression.test.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/__tests__/smartNotificationDispatcher.regression.test.ts)
- [selectionAndTemplates.regression.test.ts](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/__tests__/selectionAndTemplates.regression.test.ts)

---

## 4. Stage 3 — Refinamento Adaptativo Autônomo Impeccable (`polish` + `clarify` + `typeset`) & Code Review

1. **Playbook Impeccable (`polish` + `clarify` + `typeset`) aplicado aos 15 arquivos de UI:**
   - **Touch Targets & Estados de Foco (`polish`):** Todos os botões, links, seletores, abas e ações interativas foram padronizados com área mínima de toque (`min-h-[44px]` / `min-w-[44px]`), incluindo os botões de reordenação de treinos em [StudentProfileView.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/StudentProfileView.tsx), os links de ação rápida (`Ver Aluno`, `Renovar`, `Atribuir`) em [Updates.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Updates.tsx), o botão `"Reativar agora"` em [Notifications.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/settings/Notifications.tsx), o upload `"Enviar GIF / Vídeo"` em [ExerciseFormModal.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/exercises/ExerciseFormModal.tsx), o botão `"Marcar todos / Desmarcar todos"` em [WorkoutImportModal.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/WorkoutImportModal.tsx) e o botão `"Subir Foto"` em [EvolutionGallery.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/student/EvolutionGallery.tsx). Todos os controles interativos receberam `focus-visible:outline-none focus-visible:ring-2` explícito.
   - **Contraste WCAG AA em Light e Dark Mode (`polish`):** Textos secundários e rótulos informativos foram elevados de `text-slate-400` / `text-slate-500` para `text-slate-600 dark:text-slate-300` em todas as telas modificadas ([Login.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/Login.tsx), [Privacy.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/settings/Privacy.tsx), [Notifications.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/settings/Notifications.tsx), [Dashboard.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/Dashboard.tsx), [Selection.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/Selection.tsx), [History.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/History.tsx), [Profile.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/Profile.tsx), [StudentProfileView.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/StudentProfileView.tsx), [Profile.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Profile.tsx), [Updates.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Updates.tsx), [BottomNav.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/BottomNav.tsx), [SetTemplateManager.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/SetTemplateManager.tsx), [ExerciseFormModal.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/exercises/ExerciseFormModal.tsx), [WorkoutImportModal.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/WorkoutImportModal.tsx) e [EvolutionGallery.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/student/EvolutionGallery.tsx)).
   - **Tipografia Numérica Tabular (`typeset`):** Aplicado `tabular-nums` (equivalente a `font-variant-numeric: tabular-nums`) em todos os contadores de XP, níveis, streak, durações (`min`), cargas (`kg`), alturas (`cm`), idades (`anos`), calorias TMB/Manutenção (`kcal`), datas de validade, horários (`HH:MM`), células do calendário mensal, contagens de séries e versões.
   - **Clareza de Microcopy e Zero Em-Dashes (`clarify`):** Revisada toda a microcopy em `pt-BR` com acentuação impecável e zero travessões (`—`) em botões, títulos ou comentários.
2. **Code Review de Contratos & Verificação Automatizada:**
   - **Zero Links Quebrados:** Varredura completa confirmou **0 referências** remanescentes às rotas extintas `/coach/plans` ou `/coach/subscription`.
   - **Detector Mecânico Impeccable:** `node .agents/skills/impeccable/scripts/detect.mjs --json` retornou `[]` (**0 violações**).
   - **Suíte de Testes (`npx vitest run`):** **19 arquivos de teste aprovados (179/179 testes passando, 100% de sucesso)**.
   - **Build de Produção (`npm run build`):** Compilação limpa concluída com **exit code 0**.
