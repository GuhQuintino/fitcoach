# PROGRESS — Fitcoach Pro

> Registro histórico cronológico de entregas validadas pelo Gauntlet Loop e governança GSD.

---

## [2026-10-25] — Consolidação Single-Coach, Eliminação de Mockups e Blindagem de Bugs Silenciosos (C1 a C13) (Fase 15 — COMPLETE / PASS 3.00/3.00)

- **Identificador da Fatia:** `SINGLE_COACH_CONSOLIDATION` / `single-coach-consolidation-c1-c13`
- **Perfil Gauntlet:** `full-stack` (`frontend-framework` + Supabase Backend/Storage/Edge Functions — Vite 6.4.1 + React 19 + TypeScript 5.8 + Tailwind CSS + Supabase Postgres/Auth/Storage/Edge Functions Deno + Vitest 5.0.3)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D | 94.4% Similaridade | 19 suítes / 179 testes)** — [`QA_REPORT_SINGLE_COACH_CONSOLIDATION.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_SINGLE_COACH_CONSOLIDATION.md)

### Resumo do Valor Entregue (End-to-End — Slices 1, 2 e 3)
1. **Slice 1 — Limpeza Estrutural Single-Coach, Auth/LGPD via WhatsApp e Painel do Coach (C1, C2, C6, C7, C12):**
   - **Extinção de Rotas Comerciais Multi-Coach:** Remoção física de `pages/coach/Plans.tsx`, `pages/coach/SubscriptionDetails.tsx` e `contexts/RoleContext.tsx`, extinção das rotas `/coach/plans` e `/coach/subscription` em [`App.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/App.tsx) e remoção do botão `"Planos"` em [`BottomNav.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/BottomNav.tsx).
   - **Recuperação de Senha via WhatsApp (`Login.tsx`):** Modal acessível (`role="dialog"`, `aria-modal="true"`) em `"Esqueceu a senha?"` que pré-preenche o login `@fitcoach.com` e aciona `https://wa.me/5511992616777` com mensagem formatada para o Treinador Gustavo.
   - **Privacidade LGPD Funcional (`Privacy.tsx`):** Remoção dos 4 switches cosméticos sem efeito, preservando a alteração real de senha (`supabase.auth.updateUser`) e o botão `"Solicitar Exclusão de Todos os Dados"` conectado ao WhatsApp `5511992616777`.
   - **Perfil & Changelog do Coach (`pages/coach/Profile.tsx`, `Updates.tsx`):** Exibição do e-mail do treinador e adição da seção `"Novidades da Plataforma"` (Changelog V2.4.0 a V2.1.0).
2. **Slice 2 — Experiência do Aluno: Seleção, Dashboard XP, Histórico Interativo, TMB Mifflin-St Jeor e Storage (C3, C4, C5, C9, C10):**
   - **Seleção de Treinos & Preservação na Clonagem (`Selection.tsx`, `Library.tsx`):** Funções `parseRoutineMeta`, `formatRoutineInfoToast` e `resolveWorkoutDurationLabel` formatando descrições JSON sem expor JSON cru, exibindo a duração real do treino e preservando `duration_minutes` e `description` no `handleAssign` de `Library.tsx`.
   - **Dashboard do Aluno (`Dashboard.tsx`):** Remoção de `"Plano Atual / Consultoria Pro"` e do card `"Dica do dia"`, destacando `Nível X • Y XP`, barra de progresso, regra explícita de progressão e validade da consultoria (`Expira em: DD/MM/AAAA`).
   - **Histórico Interativo (`History.tsx`):** Query da rotina ativa corrigida via `student_assignments` (`.eq('student_id', user.id).eq('is_active', true)`) e dias com treino no calendário mensal transformados em botões interativos com expansão, destaque (`ring-2 ring-primary`) e scroll suave.
   - **Calculadora Metabólica Mifflin-St Jeor (`metabolicCalculator.ts`, `Profile.tsx`, `StudentProfileView.tsx`):** Sanitização de peso (`750 -> 75.0 kg`, `75000 -> 75.0 kg`) e altura (`1.75 -> 175 cm`, `1750 -> 175 cm`), cálculo de idade exata por `birth_date` e cálculo de TMB e Manutenção calórica com seletor de Nível de Atividade Física persistido em `profiles.preferences.activity_level`.
   - **Exclusão Física no Storage (`EvolutionGallery.tsx`):** Remoção do arquivo físico no bucket `evolution-photos` via `extractStoragePath` antes de deletar o registro no banco.
3. **Slice 3 — Ferramentas do Coach, Motor de Notificações e Blindagem de 4 Bugs Silenciosos (C8, C11, C13):**
   - **Templates de Séries (`SetTemplateManager.tsx`):** `serializeSetForTemplate` e `deserializeTemplateSet` preservando todos os 23 campos das Camadas 1–4 e Cardio/HIIT.
   - **Upload Direto de Mídia (`ExerciseFormModal.tsx`):** Suporte a envio direto de GIF, WebP, PNG, JPG, MP4 e WebM para o Supabase Storage com preview imediato.
   - **Eliminação de 4 Bugs Silenciosos:** (1) remoção das colunas inexistentes `age` e `completed_at` em `smartNotificationDispatcher.ts`; (2) fuso `America/Sao_Paulo`, Quiet Hours, backoff de 5 dias e Web Push na Edge Function `supabase/functions/smart-notifications/index.ts`; (3) separação das chaves `coach_feedback` e `evolution_photos` em `Notifications.tsx`; e (4) eliminação da query N+1 em `WorkoutImportModal.tsx` com busca em lote `.in('student_id', studentIds)`.
4. **Pendências / Backlog Futuro e Integrações Externas Registradas:**
   - **Pendência / Backlog Futuro (Item 2.11):** Camada 4 de Séries Especiais `timer_mode` (seletor EMOM/AMRAP/Tabata no editor e cronômetro dedicado no player de musculação).
   - **Pendência Externa / Integrações (`C:\Users\Gustavo\Desktop\Consultoria`):** Diagnóstico completo da duplicação de contas na renovação via Webhook InfinitePay em `src/lib/fitcoach/provisioning.ts` e `src/app/api/webhooks/infinitepay/route.ts` (divergência de e-mail pessoal vs `@fitcoach.com`, ausência de reconciliação por `payments`/telefone e falta de paginação em `listUsers()`).

### Métricas da Rubrica 6D & Matriz de Similaridade
| Dimensão | Nota | Status |
|---|:---:|:---:|
| **D1. Funcionalidade & Requisitos** | 3.0 / 3.0 | Aprovado |
| **D2. Robustez & Estabilidade** | 3.0 / 3.0 | Aprovado |
| **D3. Qualidade de Implementação & Anti-Slop** | 3.0 / 3.0 | Aprovado |
| **D4. Consistência Arquitetural & Stack Nativa** | 3.0 / 3.0 | Aprovado |
| **D5. Performance & Eficiência** | 3.0 / 3.0 | Aprovado |
| **D6. Testabilidade, Segurança & Conformidade** | 3.0 / 3.0 | Aprovado |
| **Média Consolidada** | **3.00 / 3.00** | **PASS** |
| **Matriz de Similaridade Multidimensional** | **94.4%** | **PASS (>= 85%)** |
| **Suíte de Testes Automatizados (Vitest)** | **19 suítes / 179 testes** | **100% PASS** |

### Arquivos Criados, Modificados e Removidos
- **Removidos:** `pages/coach/Plans.tsx`, `pages/coach/SubscriptionDetails.tsx`, `contexts/RoleContext.tsx`.
- **Criados:** `utils/metabolicCalculator.ts`, `utils/__tests__/metabolicCalculator.regression.test.ts`, `utils/__tests__/smartNotificationDispatcher.regression.test.ts`, `utils/__tests__/selectionAndTemplates.regression.test.ts`, `docs/gauntlet/QA_REPORT_SINGLE_COACH_CONSOLIDATION.md`.
- **Modificados:** `App.tsx`, `components/BottomNav.tsx`, `types/supabase.ts`, `types/notifications.ts`, `pages/Login.tsx`, `pages/settings/Privacy.tsx`, `pages/settings/Notifications.tsx`, `pages/student/Dashboard.tsx`, `pages/student/Selection.tsx`, `pages/student/History.tsx`, `pages/student/Profile.tsx`, `pages/coach/StudentProfileView.tsx`, `pages/coach/Profile.tsx`, `pages/coach/Updates.tsx`, `pages/coach/Library.tsx`, `pages/coach/Exercises.tsx`, `components/student/EvolutionGallery.tsx`, `components/coach/editor/SetTemplateManager.tsx`, `components/coach/editor/WorkoutImportModal.tsx`, `components/coach/exercises/ExerciseFormModal.tsx`, `utils/smartNotificationDispatcher.ts`, `supabase/functions/smart-notifications/index.ts`, `PRODUCT.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `ROADMAP.md`, `.planning/PROGRESS.md`, `PROGRESS.md`.

---

## [2026-10-25] — Expansão e Responsividade Mobile do ProfileCompletionBanner (Fase 14 — PASS)

- **Identificador da Fatia:** `profile_banner_expansion` / `feature-profile-banner-mobile-accordion`
- **Perfil Gauntlet:** `frontend-framework` (React 19.2.3 + TypeScript 5.8.2 + Vite 6.4.1 + Tailwind CSS + Lucide/Material Symbols + Vitest 5.0.3)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [`QA_REPORT_profile_banner_expansion.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_profile_banner_expansion.md)

### Resumo do Valor Entregue (End-to-End)
1. **Dados & Modelos:**
   - Consumo estrito da interface `ProfileCompletenessResult` de `types/notifications.ts`, mantendo tipagem estática e desacoplamento sem duplicação de estruturas.
2. **Serviços & Contratos de Persistência:**
   - Preservação da regra de adiamento (snooze de 3 dias) no `localStorage` e Supabase via `updatePreferences({ profile_snooze_until: ... })`.
   - Respeito integral ao opt-out do usuário em preferências de notificação (`profile_completion !== false`) e auto-ocultação determinística quando `isComplete: true` (100% preenchido).
3. **Interface & Responsividade Mobile (Acordeão Ergonômico):**
   - **Eliminação de Truncamento:** Remoção da classe `truncate` do cabeçalho que reduzia o título a "Co..." em telas estreitas (~360px). Título agora estruturado com `shrink-0` e `whitespace-nowrap`, garantindo leitura limpa em qualquer viewport mobile.
   - **Padrão de Acordeão com Chevron Animado:** Estado recolhido enxuto exibindo badge âmbar de perfil, percentual de completude em pill contrastante, botão expansor tátil com rótulo dinâmico ("Ver mais" / "Ver menos") e ícone chevron giratório com animação suave de 180° (`rotate-180`, `duration-200`, respeitando `motion-reduce:transition-none`).
   - **Painel Colapsável de Pendências (`#profile-banner-details`):** Exibição sob demanda de mensagem explicativa contextual, chips visuais dedicados com ícones individuais para os dados faltantes (`Foto`, `Peso`, `Idade`, `Altura`) e botões ergonômicos de ação rápida ("Lembrar depois" e "Preencher perfil").
   - **Acessibilidade WCAG 2.1 AA:** Alvos táteis $\ge 44\text{px}$ em todos os botões (`min-h-[44px] min-w-[44px]`), atributos WAI-ARIA semânticos completos (`aria-expanded`, `aria-controls="profile-banner-details"`, `aria-label`), e anéis de foco visíveis (`focus-visible:ring-2 focus-visible:ring-primary`).
4. **Testes Automatizados & Blindagem por Regressão:**
   - Criação de suíte de regressão dedicada em [`tests/regression/profileCompletionBanner.regression.test.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/tests/regression/profileCompletionBanner.regression.test.tsx) com 5/5 testes passando em 29ms, validando: renderização sem truncamento, atributos ARIA, expansão/recolhimento interativo com clique, exibição dos chips de dados faltantes e respeito ao snooze/opt-out.
   - 160/160 testes aprovados na suíte global Vitest (16 arquivos de teste, 100% de sucesso em ~2.91s).
   - Compilação TypeScript limpa com 0 erros (`tsc --noEmit`) e Vite build 100% concluído em 10.04s gerando 788 módulos.
   - Laudo Gauntlet Critic aprovado com nota máxima **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_profile_banner_expansion.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_profile_banner_expansion.md).

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
- `components/student/ProfileCompletionBanner.tsx`: componente refatorado com padrão de acordeão expansível, chips visuais de campos pendentes com ícones, chevron animado, proteção contra truncamento de texto e touch targets $\ge 44\text{px}$.
- `tests/regression/profileCompletionBanner.regression.test.tsx`: suíte de 5 testes de regressão automatizados cobrindo renderização, atributos de acessibilidade ARIA, interações de expansão/recolhimento e regras de desativação/snooze.
- `docs/gauntlet/QA_REPORT_profile_banner_expansion.md`: laudo formal de avaliação do Gauntlet Critic com nota máxima 3.00/3.00 (PASS).
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário de engenharia e entregáveis da fatia vertical.
- `docs/gauntlet/DECISIONS.md`: registro da ADR-018.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `ROADMAP.md`, `.planning/PROGRESS.md`, `PROGRESS.md`: governança GSD sincronizada.

---

## [2026-10-25] — Notificações Inteligentes Baseadas no Padrão do Aluno + Anti-Spam & Onboarding de Perfil (Fase 14 — PASS)

- **Identificador da Fatia:** `smart_notifications` / `feature-smart-notifications-habit-learner`
- **Perfil Gauntlet:** `full-stack` (React 19 + TypeScript 5.8.2 + Vite 6.4.1 + Tailwind CSS + Supabase Postgres/Auth & Realtime + Web Push PWA & Service Worker + Vitest 5.0.3)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY_smart_notifications.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY_smart_notifications.md)
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [`QA_REPORT_smart_notifications.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_smart_notifications.md)

### Resumo do Valor Entregue (End-to-End)
1. **Dados & Modelos Supabase (`supabase/migrations/20261025000000_smart_notifications.sql`):**
   - Criação das tabelas relacionais `public.push_subscriptions` e `public.notification_logs` no banco de produção do Supabase via session pooler com integridade referencial.
   - Índice parcial `idx_notification_logs_user_unread` (`WHERE read_at IS NULL`) otimizando a consulta do contador do sino para $O(1)$ sem varredura sequencial.
   - Índice composto `idx_notification_logs_user_topic_created` para frequency capping e regras de backoff.
   - Coluna `preferences` JSONB em `profiles` e ativação de RLS estrito com políticas de isolamento por `auth.uid() = user_id`.
2. **Motor Estatístico de Hábito & Quatro Escudos Anti-Spam (`utils/workoutHabitAnalyzer.ts`):**
   - Lógica de inferência com cálculo da mediana dos minutos do dia a partir dos treinos em `workout_logs.started_at` para alunos com $\ge 3$ treinos, imune a treinos esporádicos fora de hora.
   - Cold start suave e previsível às 16:30 nos dias Segunda, Quarta e Sexta ([1, 3, 5]) para alunos com menos de 3 treinos registrados.
   - Implementação rígida dos 4 Escudos Anti-Spam: (1) silêncio absoluto no dia se o aluno já concluiu qualquer treino; (2) teto diário de 1 notificação por usuário; (3) teto semanal de 3 lembretes de treino; (4) backoff progressivo com 5 dias de pausa completa se o aluno ignorar 2 lembretes consecutivos sem treinar; além de Quiet Hours invioláveis das 21:30 às 07:30 da manhã.
   - Avaliação de completude de perfil (foto, peso, idade/nasc, altura) com política de no máximo 1 aviso inicial e 1 reforço após 4 dias se continuar incompleto, cessando em seguida.
3. **Web Push Nativo & Preservação do Service Worker (`public/sw.js`, `utils/pushNotificationService.ts`):**
   - `public/sw.js` preserva 100% dos listeners existentes `'SCHEDULE_REST_TIMER'` e `'CANCEL_REST_TIMER'`, adicionando listeners puros de `push` com tratamento de erro e `notificationclick` com navegação inteligente em abas abertas ou novas janelas.
   - `utils/pushNotificationService.ts` implementa conversão de chave pública VAPID RFC 8292 (`urlBase64ToUint8Array`), detecção de PWA Standalone no iOS Safari 16.4+ e sincronização bidirecional de inscrições com `push_subscriptions`.
4. **Despachante & Edge Function (`utils/smartNotificationDispatcher.ts`, `supabase/functions/smart-notifications/index.ts`):**
   - Utilitário puro de despacho local e in-app com persistência de leitura individual e em lote.
   - Edge Function serveless Deno pronta para agendamento diurno horário via `pg_cron` ou webhook externo.
5. **Componentes do Aluno & Interface (`NotificationBell.tsx`, `ProfileCompletionBanner.tsx`, `Notifications.tsx`):**
   - `NotificationBell.tsx`: Eliminação da antiga bolinha vermelha estática, implementando badge dinâmico reativo via Supabase Realtime (renderiza exclusivamente quando `unreadCount > 0`).
   - `ProfileCompletionBanner.tsx`: Aviso esportivo sutil com percentual de preenchimento, dados pendentes e botão dispensar ("Lembrar depois") com CTA direto para `/student/profile`.
   - `pages/settings/Notifications.tsx`: Centro de controle funcional com toggle de Web Push integrado ao navegador, card de Hábito de Treino Aprendido com badge de precisão e override manual, controle granular por tópico, customização de Quiet Hours e Central de Notificações Recentes com marcação individual e em lote.
6. **Testes Automatizados & Qualidade Estática:**
   - Suíte de 19 testes automatizados em `tests/unit/workoutHabitAnalyzer.test.ts` cobrindo mediana, cold start, 4 escudos anti-spam e onboarding.
   - Testes unitários em `tests/unit/pushNotificationService.test.ts` e `tests/unit/smartNotificationDispatcher.test.ts`.
   - 155/155 testes aprovados na suíte global Vitest (100% de sucesso em 15 arquivos de teste em ~2.24s).
   - 0 erros de compilação TypeScript (`tsc --noEmit`) e Vite build 100% limpo em 7.98s gerando 781 módulos.
   - Conformidade estrita Anti-AI-Slop sem travessões longos `—` em headlines/botões, touch targets $\ge 44\text{px}$ e zero código truncado.
   - Laudo Gauntlet Critic aprovado com nota máxima **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_smart_notifications.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_smart_notifications.md).

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
- `supabase/migrations/20261025000000_smart_notifications.sql`: DDL completo de `push_subscriptions`, `notification_logs`, índices parciais e RLS.
- `scripts/apply_smart_notifications_migration.mjs`: script de aplicação da migration no pooler Supabase.
- `types/notifications.ts`: tipagem do domínio de notificações, hábitos e anti-spam.
- `types/supabase.ts`: extensão das tabelas e preferências de perfil no schema tipado.
- `utils/workoutHabitAnalyzer.ts`: motor matemático de cálculo de mediana de horário, dias frequentes, cold start e 4 escudos anti-spam.
- `tests/unit/workoutHabitAnalyzer.test.ts`: suíte de 19 testes automatizados cobrindo todos os cenários de inferência e filtros.
- `public/sw.js`: suporte a eventos nativos de `push` e `notificationclick` preservando 100% dos timers de descanso em segundo plano.
- `utils/pushNotificationService.ts`: serviço de conversão VAPID RFC 8292, detecção iOS standalone e sincronização push.
- `tests/unit/pushNotificationService.test.ts`: testes de compatibilidade de plataforma e decodificação VAPID.
- `utils/smartNotificationDispatcher.ts`: utilitário de despacho e controle de leitura.
- `tests/unit/smartNotificationDispatcher.test.ts`: testes com mocks do cliente Supabase.
- `supabase/functions/smart-notifications/index.ts`: Edge Function serveless em Deno para execução horária.
- `components/student/NotificationBell.tsx`: sino de notificações reativo em tempo real via Supabase Realtime com badge dinâmico.
- `components/student/ProfileCompletionBanner.tsx`: banner de incentivo esportivo gentil para preenchimento de perfil.
- `pages/student/Dashboard.tsx`: integração do `NotificationBell`, `ProfileCompletionBanner` e checagem em background.
- `pages/settings/Notifications.tsx`: centro de controle de notificações com card de hábito, Web Push real, tópicos e histórico.
- `docs/gauntlet/QA_REPORT_smart_notifications.md`: laudo formal de avaliação com veredito PASS (3.00 / 3.00).
- `docs/gauntlet/SLICE_SUMMARY_smart_notifications.md`: sumário de engenharia e entregáveis da fatia vertical.
- `docs/gauntlet/DECISIONS.md`: registro das ADRs 015 a 017.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `ROADMAP.md`, `.planning/PROGRESS.md`, `PROGRESS.md`: governança GSD sincronizada.

---

## [2026-10-18] — Retorno Instantâneo do Segundo Plano & Blindagem do Cronômetro de Descanso (Tela Bloqueada / Outros Apps) (Fase 13 — PASS)

- **Identificador da Fatia:** `background_timer` / `background-lifecycle-rest-timer-hardening`
- **Perfil Gauntlet:** `full-stack` / PWA Mobile (Vite 6.4.1 + React 19.2.3 + TypeScript 5.8.2 + Tailwind CSS + Supabase Auth & Postgres + Service Worker + Web Audio API + Vitest 5.0.3)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [`QA_REPORT_background_timer.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_background_timer.md)

### Resumo do Valor Entregue (End-to-End)
1. **Zero Loading Screen & Stale-While-Revalidate (`AuthContext.tsx`, `WorkoutExecution.tsx`, `Dashboard.tsx`, `Selection.tsx`):**
   - Implementação de hidratação síncrona `getCachedAuthProfile` no `AuthContext` permitindo renderização imediata sem spinners bloqueantes ao alternar entre apps ou destravar o celular.
   - Estabilização de referência no `AuthContext` (`prev.id === next.id ? prev : next`), impedindo que eventos `TOKEN_REFRESHED` do Supabase desmontem árvores de componentes de treino em andamento.
   - Hidratação imediata do treino ativo a partir de `active_workout` no `localStorage`, garantindo zero flickering de tela branca.
2. **Eliminação de Falso Banner Offline (`useOnlineStatus.ts`):**
   - Introdução de debounce de 1.2s ao restaurar visibilidade e retentativa com grace period de 900ms para aguardar que as placas de rede 4G/Wi-Fi reestabeleçam sockets após o sleep do aparelho.
   - Singleton `inFlightProbe` deduplicando chamadas concorrentes de probe de rede sem floodar requisições.
3. **Tela Acesa Respeitosa via Screen Wake Lock API (`restTimerAudioAndNotification.ts`, `WorkoutExecution.tsx`):**
   - Aquisição de `navigator.wakeLock.request('screen')` durante a execução do treino, com listener de `visibilitychange` que reativa automaticamente o lock ao desbloquear o aparelho, respeitando desligamentos manuais no botão físico.
4. **Alerta Triplo em Segundo Plano (Som + Vibração + Notificação Nativa) (`restTimerAudioAndNotification.ts`, `public/sw.js`):**
   - Criação de canal keep-alive silencioso sintetizado em memória (WAV PCM 40Hz @ volume 0.01) em elemento HTML5 `<audio>`, prevenindo a suspensão de thread em segundo plano pelo sistema operacional sem pausar apps de streaming de música (Spotify).
   - Reforço sonoro duplo (beep de alta frequência 880Hz via Web Audio API + fallback WAV embutido).
   - Vibração háptica no aparelho (`navigator.vibrate([300, 150, 300])`).
   - Integração com o Service Worker através de mensagens estruturadas `SCHEDULE_REST_TIMER` e `CANCEL_REST_TIMER`, disparando notificação nativa na bandeja do sistema operacional com `ServiceWorkerRegistration.showNotification()` contendo som e vibração do sistema no Android e desktops.
5. **Correção Matemática do `+15s` & Persistência do Timer (`WorkoutExecution.tsx`):**
   - Cálculo determinístico de acréscimo de tempo via `Math.max(Date.now(), restEndTime) + 15000` quando o cronômetro expirar com a tela bloqueada, impedindo que o cronômetro nasça zerado.
   - Persistência e restauração atômica de `restEndTime`, `initialTime`, `restTimerLabel` e `timerActive` em `active_workout` no `localStorage`.
6. **Testes Automatizados & Qualidade Estática:**
   - Criação da suíte de regressão dedicada `tests/background-lifecycle-timer.regression.test.ts` com 10/10 testes aprovados cobrindo lógica matemática, Service Worker, `showNotification`, debounce de rede e estabilidade de referência de usuário.
   - 120/120 testes aprovados na suíte global do Vitest (100% de sucesso em 11 arquivos de teste em ~2.15s).
   - 0 erros de compilação TypeScript (`npx tsc --noEmit`) e Vite build 100% limpo em 7.67s gerando 779 módulos.
   - Laudo Gauntlet Critic aprovado com nota máxima **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_background_timer.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_background_timer.md).

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
- `contexts/AuthContext.tsx`: Stale-While-Revalidate com hidratação síncrona `getCachedAuthProfile` e estabilização de referência de usuário (`prev.id === next.id ? prev : next`).
- `utils/restTimerAudioAndNotification.ts`: módulo autônomo com sintetizador WAV PCM em memória para keep-alive silencioso e alerta sonoro, vibração, agendamento de Service Worker e Screen Wake Lock.
- `utils/useOnlineStatus.ts`: debounce de 1.2s ao restaurar visibilidade, grace period de 900ms para reconexão de rádios e singleton `inFlightProbe`.
- `public/sw.js`: Service Worker com listeners de `SCHEDULE_REST_TIMER`, `CANCEL_REST_TIMER`, agendamento de notificações e atualização para cache v11.
- `pages/student/WorkoutExecution.tsx`: persistência do cronômetro em `localStorage`, correção matemática do `+15s` via `Math.max(Date.now(), restEndTime) + 15000` e integração com Wake Lock e canal de alerta.
- `pages/student/Dashboard.tsx` & `pages/student/Selection.tsx`: Stale-While-Revalidate e renderização rápida sem spinners bloqueantes.
- `tests/background-lifecycle-timer.regression.test.ts`: suíte de 10 testes automatizados cobrindo a lógica de ciclo de vida e timer em segundo plano.
- `PRODUCT.md`: especificação viva com as regras de negócio B1 a B6 validadas.
- `docs/gauntlet/CRAFT_AUDIT_background_timer.md`: laudo de auditoria estática, tipos e conformidade Anti-AI-Slop.
- `docs/gauntlet/TEST_REPORT_background_timer.md`: relatório de 120 testes automatizados aprovados (100% verde).
- `docs/gauntlet/QA_REPORT_background_timer.md`: laudo formal do Gauntlet Critic com veredito PASS (3.00 / 3.00).
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário técnico de engenharia da fatia.
- `docs/gauntlet/DECISIONS.md`: registro das ADRs 010 a 014.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `ROADMAP.md`, `.planning/PROGRESS.md`, `PROGRESS.md`: artefatos de governança GSD sincronizados.

---

## [2026-10-17] — Integração do Histórico de Conversas e Áudios do WhatsApp Web nos Dossiês de Alunos (`weekly-workout-adjuster`) (Fase 12 — PASS)


- **Identificador da Fatia:** `whatsapp_sync` / `weekly-workout-adjuster-whatsapp-sync`
- **Perfil Gauntlet:** `data-pipeline` (Node.js v22 ESM `.mjs` + Playwright CDP + PostgreSQL Dual-DB `pg` + Gemini 2.5 Flash Multimodal Audio REST API + Vitest 5.0.3)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [`QA_REPORT_whatsapp_sync.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_whatsapp_sync.md)

### Resumo do Valor Entregue (End-to-End)
1. **Núcleo Puro de Utilitários WhatsApp (`whatsapp_utils.mjs`):**
   - Implementação de `normalizePhoneVariants` gerando variantes brasileiras de busca (com/sem DDI `55`, com/sem 9º dígito móvel e últimos 8 dígitos) e `buildStudentNameSearchVariants`.
   - Janela temporal incremental inteligente (`resolveSyncWindowDays`): **75 dias** (faixa 60–90 dias) na primeira sincronização (`cold_start`) e **10 dias** (faixa 7–14 dias) nas revisões semanais subsequentes (`incremental`).
   - Persistência incremental idempotente e deduplicada em `docs/students/.whatsapp_cache/{slug}.json` (`mergeWhatsAppCache`), preservando transcrições de áudio prévias.
   - Transcrição e resumo clínico de áudios PTT via Gemini 2.5 Flash REST API (`transcribeAudioWithGemini`) com classificação automática de tags (`dor_lesao`, `equipamento_academia`, `carga_pr`, `rotina_viagem`, `sono_recuperacao`, `duvida_execucao`, `nutricao_dieta`).
   - Formatação da `## 6. Histórico de Conversas & Áudios (WhatsApp)` (`formatWhatsAppSectionMarkdown`) e migração automática em dossiês existentes (`upsertWhatsAppSectionInDossier`), renumerando as diretrizes para `## 7. Diretrizes para Revisões Semanais da Skill`.
2. **Extrator & Sincronizador via CDP / Playwright (`sync_whatsapp_history.mjs`):**
   - Conexão via `chromium.connectOverCDP(cdpUrl)`, fallback para perfil persistente (`--launch`), importação determinística de payloads JSON (`--import-file`) e degradação graciosa (`skipped_no_browser`) quando executado offline.
   - Estratégia híbrida de localização (`locateAndOpenStudentChat`): ativação prioritária do filtro/etiqueta **"Consultoria"** (`toggleConsultoriaFilter`), busca por variantes de telefone e fallback por variantes do nome do aluno.
   - Extração de mensagens de texto e captura de blobs de áudio (`blob:https://web.whatsapp.com/...`) via `FileReader` (Base64) no contexto da página.
3. **Integração nos 20 Dossiês Reais e no Fluxo Semanal:**
   - Regeneração e validação de todas as 20 fichas reais em `docs/students/*.md` via `generate_all_student_dossiers.mjs` com a Seção 6 (WhatsApp) e Seção 7 renumerada.
   - Enriquecimento do payload JSON semanal em `fetch_weekly_review.mjs` com o bloco `whatsappHistory` (`lastSyncAt`, `matchedVia`, `matchedChatTitle`, `totalCachedMessages`, `recentMessages`, `audioTranscriptionsCount`, `clinicalHighlights`).
   - Preservação e migração estrutural automática das Seções 6 e 7 em `apply_approved_adjustments.mjs`.
   - Paridade SHA-256 de 100% entre `.agents/skills/weekly-workout-adjuster/` e `~/.gemini/config/skills/weekly-workout-adjuster/` (9/9 arquivos).
4. **Testes Automatizados & Qualidade Estática:**
   - Checagem sintática e estática (`node --check` nos 5 scripts `.mjs` e `npx tsc --noEmit`): 0 erros.
   - Suíte dedicada [`tests/whatsappDossierSync.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/tests/whatsappDossierSync.test.ts): 19/19 testes passando (100% em 797ms).
   - Suíte global Vitest: 107/107 testes passando em 10 arquivos (100% em 1.54s).
   - Proteção de privacidade e segredos validada no `.gitignore` (`docs/students/` e `docs/students/.whatsapp_cache/`).

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
- `.agents/skills/weekly-workout-adjuster/scripts/whatsapp_utils.mjs`: núcleo puro de normalização, janela incremental, cache, transcrição Gemini e formatação Markdown.
- `.agents/skills/weekly-workout-adjuster/scripts/sync_whatsapp_history.mjs`: extrator via Playwright CDP / Browser Harness e importador JSON com atualização dos dossiês.
- `.agents/skills/weekly-workout-adjuster/scripts/generate_all_student_dossiers.mjs`: integração da Seção 6 (WhatsApp) e Seção 7 nos 20 dossiês em `docs/students/*.md`.
- `.agents/skills/weekly-workout-adjuster/scripts/fetch_weekly_review.mjs`: inclusão de `whatsappHistory` e filtro de atividade recente na revisão semanal.
- `.agents/skills/weekly-workout-adjuster/scripts/apply_approved_adjustments.mjs`: preservação e migração automática das Seções 6 e 7 nos dossiês.
- `.agents/skills/weekly-workout-adjuster/SKILL.md`, `references/dossier_template.md`, `references/progression_rules.md` e `references/report_template.md`: documentação e templates atualizados e espelhados em `~/.gemini/config/skills/weekly-workout-adjuster/`.
- `tests/whatsappDossierSync.test.ts`: suíte de 19 testes automatizados cobrindo todas as regras W1 a W5.
- `PRODUCT.md` e `.gitignore`: especificação das Regras W1 a W5 e proteção de cache/dossiês.
- `docs/gauntlet/QA_REPORT_whatsapp_sync.md`: laudo formal do Gauntlet Critic com veredito PASS (3.00 / 3.00).
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `ROADMAP.md`, `.planning/PROGRESS.md`, `PROGRESS.md` e `docs/gauntlet/DECISIONS.md`: artefatos de governança GSD sincronizados.

---

## [2026-10-15] — Otimização de Chunks do Recharts no Rollup / Vite & Atualização Caniuse-Lite (Fase 11 — PASS)

- **Identificador da Fatia:** `rollup_and_caniuse` / `infra-rollup-chunks-caniuse-update`
- **Perfil Gauntlet:** `frontend-framework` (Vite 6.4.1 + React 19 + TypeScript 5.8.2 + Vitest 5.0.3 + Recharts 2.15.1)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [`QA_REPORT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_rollup_and_caniuse.md)

### Resumo do Valor Entregue (End-to-End)
1. **Infraestrutura de Build & Empacotamento Rollup / Vite:**
   - Adicionada entrada dedicada `'vendor-recharts': ['recharts']` em `build.rollupOptions.output.manualChunks` em [`vite.config.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/vite.config.ts).
   - Eliminação completa do aviso de dependência circular emitido pelo Rollup entre submódulos do Recharts (`Bar.js` e `CartesianChart`).
   - Geração determinística do chunk dedicado `dist/assets/vendor-recharts-C0ZUWiqA.js` (358.18 kB │ gzip: 107.40 kB), otimizando o particionamento de bundle e o cache HTTP de longa duração para clientes.
2. **Atualização da Base Caniuse-Lite (Browserslist):**
   - Execução bem-sucedida de `npx --yes update-browserslist-db@latest`, atualizando o pacote `caniuse-lite` da versão defasada `1.0.30001761` para a versão mais recente `1.0.30001816` em [`package-lock.json`](file:///c:/Users/Gustavo/Desktop/Fitcoach/package-lock.json).
   - Alinhamento pleno com a base de compatibilidade de navegadores para compilações de produção CSS/JS, mantendo 0 vulnerabilidades no lockfile.
3. **Saneamento e Governança do Backlog Técnico:**
   - Resolução e encerramento formal dos itens 1 e 2 em [`docs/planning/BACKLOG_PROXIMAS_MELHORIAS.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/planning/BACKLOG_PROXIMAS_MELHORIAS.md), com documentação detalhada de diagnóstico, ação implementada e evidências físicas validadas.
4. **Testes Automatizados & Qualidade Estática:**
   - Checagem estática TypeScript (`tsc --noEmit`): 0 erros de compilação ou de tipos estáticos.
   - Suíte Vitest (`npm test`): 88/88 testes passando com 100% de sucesso em 9 arquivos de teste (tempo de execução: ~2.06s).
   - Build de produção Vite (`npm run build`): concluído com sucesso em 11.78s gerando 778 módulos sem warnings de circularidade.
   - Laudo Técnico do Gauntlet Critic ([`QA_REPORT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_rollup_and_caniuse.md)): Aprovado com pontuação máxima **3.00 / 3.00 (PASS)**.
   - Laudo Craft Auditor ([`CRAFT_AUDIT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/CRAFT_AUDIT_rollup_and_caniuse.md)): **PASS** com 0 erros estáticos, build limpo e secrets preservados.

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
- `vite.config.ts`: configuração de manualChunks com isolamento dedicado de `'vendor-recharts'`.
- `package-lock.json`: atualização de `caniuse-lite` para `1.0.30001816` via `update-browserslist-db`.
- `docs/planning/BACKLOG_PROXIMAS_MELHORIAS.md`: marcação dos itens 1 e 2 como resolvidos e documentados.
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário de engenharia e entregáveis da fatia vertical.
- `docs/gauntlet/CRAFT_AUDIT_rollup_and_caniuse.md`: auditoria estática de tipos, build e conformidade.
- `docs/gauntlet/QA_REPORT_rollup_and_caniuse.md`: laudo formal de avaliação com veredito PASS (3.00 / 3.00).
- `.planning/STATE.md`: atualização de governança, decisões travadas e métricas da Fase 11.
- `ROADMAP.md` e `.planning/ROADMAP.md`: checklist da Fase 11 finalizada com sucesso.
- `PROGRESS.md` e `.planning/PROGRESS.md`: registro cronológico do marco da Fase 11.

---

## [2026-10-14] — Fix Finalização de Treinos, Blindagem de Séries Especiais & Recuperação de Dados (Fase 10 — PASS)

- **Identificador da Fatia:** `workout_finalization_fix` / `fix-workout-completion-and-set-type-hardening`
- **Perfil Gauntlet:** `full-stack` (React 19 + TypeScript 5.8.2 + Vite 6.4.1 + Tailwind CSS + Supabase / PostgreSQL 15 + Vitest 5.0.3)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [`QA_REPORT_workout_finalization_fix.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_workout_finalization_fix.md)

### Resumo do Valor Entregue (End-to-End)
1. **Dados & Modelos (Supabase PostgreSQL):**
   - Criação da migração DDL [`20261014000000_add_dropset_to_set_type_enum.sql`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/migrations/20261014000000_add_dropset_to_set_type_enum.sql) adicionando condicional e idempotentemente o valor `'dropset'` ao tipo enumerado `set_type` no schema `public` via consulta em `pg_enum`, conferindo retrocompatibilidade total com bancos legados e payloads desnormalizados.
   - Restauração idempotente das 17 séries com volume acumulado de 5807.50 kg (~5808 kg) e feedback técnico da panturrilha do treino de Maria Aparecida de 14/10/2026 (`156372b5-22f3-4a0d-98c8-e91a36fce1fc`), auditados diretamente via query PostgreSQL.
2. **Serviços & Contratos:**
   - **Sanitização Universal de Tipos de Série:** Implementação da função canônica pura `sanitizeSetType()` em [`specialSetTokens.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.ts) com validação exaustiva dos 8 tipos suportados no Postgres (`warmup`, `feeder`, `working`, `top_set`, `backoff`, `failure`, `drop`, `dropset`), mapeando variantes e sub-séries de drops para `'drop'` e garantindo fallback seguro para `'working'`.
   - **Blindagem da Fila Offline (Anti-Data-Loss):** Em [`offlineSyncService.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/offlineSyncService.ts), remoção do descarte silencioso destrutivo da fila. Treinos com erros temporários ou indisponibilidade de rede permanecem retidos permanentemente (`remainingQueue.push(item)`) com log de erro (`lastError`) e incremento de retentativas, preservando o histórico integral do atleta.
   - **Suporte Completo a Sub-Séries & Metadados em Stale Workouts:** Em [`staleWorkoutService.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/staleWorkoutService.ts), inclusão e desdobramento das sub-séries concluídas (`sub_sets_records`) para todos os métodos de intensificação, com propagação dos metadados das 4 camadas (`group_round`, `set_method`, `micro_set_index`, `execution_mode`, `tempo_used`, `timer_mode`) e rollback cirúrgico ativo contra órfãos.
3. **Interface & Componentes:**
   - Em [`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx), aplicação de `sanitizeSetType` no fluxo principal de finalização do modal e no enfileiramento de fallback offline, garantindo que o payload de séries seja estritamente compatível com o Postgres antes de qualquer requisição PostgREST ou gravação no storage.
4. **Testes Automatizados & Qualidade Estática:**
   - Checagem estática TypeScript (`tsc --noEmit`): 0 erros de compilação ou tipos.
   - Suíte Vitest (`npm test`): 52/52 testes passando em 4 arquivos (100% verde em 880ms), incluindo 14 testes em `specialSetTokens.test.ts` cobrindo a sanitização e normalização de `set_type`.
   - Suíte de Integração Offline (`scripts/test_offline_suite.ts`): 24/24 asserções aprovadas (100% verde em 400ms).
   - Build de produção Vite (`npm run build`): concluído com sucesso em 7.96s gerando bundle limpo e sem warnings críticos.
   - Teste de Idempotência no Supabase (`scripts/restore_maria_workout_14_oct.cjs`): 100% aprovado sem duplicação de cabeçalhos, séries ou feedbacks.

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
- `pages/student/WorkoutExecution.tsx`: sanitização universal de `set_type` no fluxo de finalização e fallback offline, com desdobramento para `'drop'`.
- `utils/specialSetTokens.ts`: função `sanitizeSetType` cobrindo os 8 tipos do enum Postgres com fallback seguro para `'working'`.
- `utils/specialSetTokens.test.ts`: ampliação da suíte para 14 testes unitários cobrindo todos os ramos de sanitização de tipos de série.
- `utils/offlineSyncService.ts`: importação de `sanitizeSetType`, sanitização em `setsToInsert` e blindagem crítica contra perda de dados na fila offline.
- `utils/staleWorkoutService.ts`: sanitização de `set_type`, desdobramento de drops, suporte a sub-séries concluídas e propagação de telemetria das 4 camadas.
- `supabase/migrations/20261014000000_add_dropset_to_set_type_enum.sql`: migração condicional e idempotente adicionando `'dropset'` ao tipo enumerado `set_type`.
- `scripts/restore_maria_workout_14_oct.cjs`: script autônomo e idempotente para recuperação das 17 séries e feedback do treino de Maria Aparecida de 14/10/2026.
- `docs/gauntlet/QA_REPORT_workout_finalization_fix.md`: laudo formal de avaliação com veredito PASS (3.00 / 3.00).
- `docs/gauntlet/CRAFT_AUDIT_workout_finalization_fix.md`: laudo estático de compilação, build, segurança e higiene.
- `docs/gauntlet/TEST_REPORT_workout_finalization_fix.md`: relatório de testes automatizados com 76 asserções 100% verdes.
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário técnico de engenharia da fatia vertical.
- `.planning/STATE.md`: atualização de governança, decisões travadas e métricas da Fase 10.
- `.planning/ROADMAP.md` e `ROADMAP.md`: checklist da Fase 10 finalizada com sucesso.
- `PROGRESS.md` e `.planning/PROGRESS.md`: registro cronológico do marco da Fase 10.

---

## [2026-10-12] — Restauração do Padrão Visual Nativo & Fluxo Sequencial de Sub-Séries (Fase 9 — PASS)

- **Identificador da Fatia:** `native-visual-restoration-sequential-subsets` / `special-sets-ux-refinement`
- **Perfil Gauntlet:** `frontend-framework` (React 19 + TypeScript + Vite + Tailwind CSS + Vitest)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Status / Veredito:** **PASS** (48/48 testes Vitest aprovados, 24/24 offline aprovados, 0 erros TypeScript, build Vite 100% OK em 8.32s)

### Resumo do Valor Entregue (End-to-End)
1. **Fidelidade Visual Canônica Restaurada:**
   - Remoção de todas as bordas laterais duras na esquerda (`border-l-4`) em séries principais e sub-séries, resgatando a identidade visual limpa e arredondada original do aplicativo (Print 2 - Puxada Neutra).
2. **Dinamismo Cromático de Linhas (`rowBg`):**
   - Séries e sub-séries ativas/pendentes exibem tons suaves e claros contextuais do método (`bg-rose-50/60`, `bg-purple-50/60`, `bg-blue-50/60`, `bg-amber-50/60`, etc.) ou a cor nativa de aquecimento/preparação.
   - Ao receber o check `[✓]`, o fundo da linha é imediatamente promovido para o verde claro padrão do app (`bg-emerald-100/70 dark:bg-emerald-900/30`), unificando o feedback visual de dever cumprido em séries mãe e sub-séries.
3. **Badges Compactos na Coluna Ant./Alvo:**
   - Badge do método (ex: `[REST-PAUSE 15s ?]`) incorporado de forma compacta e discreta na segunda coluna ("Ant. / Alvo") junto dos alvos de carga/reps do treinador, eliminando a sub-barra pesada que fragmentava o layout.
4. **Grade Direta de 6 Colunas para Sub-Séries:**
   - Remoção do cabeçalho volumoso e containers isolados. As sub-séries (`+1`, `+2`) e drops (`-1`, `-2`) agora adotam a grade nativa de 6 colunas (`#`, `Ant. / Alvo`, `KG`, `REPS`, `PSE`, `✓`), com alinhamento perfeito de inputs e linha sutil de total acumulado (`Total acumulado na série: X reps`).
5. **Fluxo Sequencial & Correção do Bug de Auto-Conclusão:**
   - Desacoplamento da conclusão em `toggleSetCompletion`: dar check na série principal não marca mais as sub-séries em lote. Cada sub-série é completada independentemente no ritmo do aluno.
6. **Timer Único Integrado Inferior:**
   - Micro-pausas de métodos (ex: 15s) disparam no cronômetro inferior padrão do app (`startRestTimer`), eliminando a cápsula de relógio flutuante superior (`microTimer`). Ao finalizar todas as sub-séries, o descanso global do exercício assume naturalmente.
7. **Testes Automatizados & Estabilidade:**
   - Atualização da suíte [`specialSetTokens.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.test.ts) validando a ausência de `border-l-4` e a conformidade dos tokens suaves de `rowBg`.
   - Suíte Vitest com 48/48 testes aprovados (100%), 0 erros TypeScript (`tsc --noEmit`) e 24/24 asserções na suíte offline (total de 72 asserções verdes).

### Arquivos Criados e Modificados
- `pages/student/WorkoutExecution.tsx`: remoção de `border-l-4`, fundo dinâmico suave/verde claro padrão, badge compacto na coluna Ant./Alvo, grade de 6 colunas para sub-séries, desacoplamento de check e timer único inferior.
- `utils/specialSetTokens.ts`: tokens suaves de `rowBg` e remoção de `border-l-4` em `rowBorderLeft`.
- `utils/specialSetTokens.test.ts`: asserções de validação de tokens e ausência de bordas duras.
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário de engenharia da fatia.
- `.planning/STATE.md`: atualização de estado, decisões travadas e métricas da fatia.
- `ROADMAP.md` e `.planning/ROADMAP.md`: registro das entregas concluídas.
- `PROGRESS.md` e `.planning/PROGRESS.md`: registro histórico detalhado da fatia.

---

## [2026-10-12] — Harmonização Cromática do Método & Automação de Micro-Timers (Fase 9 — PASS)

- **Identificador da Fatia:** `method-chromatic-themes` / `special-sets-visual-unification`
- **Perfil Gauntlet:** `frontend-framework` (React 19 + TypeScript + Vite + Tailwind CSS + Vitest)
- **Subagente Executor:** `gauntlet-builder`
- **Sumário da Fatia:** [`docs/gauntlet/SLICE_SUMMARY.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/SLICE_SUMMARY.md)
- **Status / Veredito:** **PASS** (47/47 testes Vitest aprovados, 24/24 offline aprovados, 0 erros TypeScript, build Vite 100% OK em 8.32s)

### Resumo do Valor Entregue (End-to-End)
1. **Unificação Cromática Total por Método (`METHOD_THEMES` & `getMethodTheme`):**
   - Criação da interface `MethodTheme` e mapa centralizado `METHOD_THEMES` em [`specialSetTokens.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.ts) com 13 tokens temáticos dedicados por método:
     - `rest_pause`: tons Rose (`border-rose-500`, `bg-rose-500/10`, `text-rose-400`, `text-rose-600 dark:text-rose-300`, etc.)
     - `dropset`: tons Purple (`border-purple-500`, `bg-purple-500/10`, `text-purple-400`, etc.)
     - `cluster`: tons Blue (`border-blue-500`, `bg-blue-500/10`, `text-blue-400`, etc.)
     - `myo_reps`: tons Amber (`border-amber-500`, `bg-amber-500/10`, `text-amber-400`, etc.)
     - `muscle_round`: tons Emerald (`border-emerald-500`, `bg-emerald-500/10`, `text-emerald-400`, etc.)
     - `method_3_7`: tons Cyan (`border-cyan-500`, `bg-cyan-500/10`, `text-cyan-400`, etc.)
     - `fst7`: tons Fuchsia (`border-fuchsia-500`, `bg-fuchsia-500/10`, `text-fuchsia-400`, etc.)
     - `bfr`: tons Teal (`border-teal-500`, `bg-teal-500/10`, `text-teal-400`, etc.)
     - `standard`: tons Slate neutros com fallback seguro.
2. **Conexão Perfeita do Bloco no Player do Aluno:**
   - Em [`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx), a linha principal da série ativa, a sub-barra de metadados e o container de sub-linhas agora compartilham o mesmo fundo semântico e a borda esquerda contínua `border-l-4 ${methodTheme.borderColor}`.
   - Eliminação de fraturas ou margens isoladas (`ml-1 mr-1`), unificando o card em um bloco coeso de ponta a ponta.
   - Séries padrão mantêm `border-l-4 border-transparent` assegurando alinhamento do grid milimétrico sem reflow.
3. **Automação Pura de Micro-Timers & Despoluição Visual:**
   - Remoção do botão manual de micro-pausa na sub-barra que poluía a interface, mantendo a engine automática reativa disparada ao dar check `[✓]` na sub-série ou série de ativação.
4. **Testes Automatizados & Estabilidade:**
   - Nova suíte de testes unitários [`specialSetTokens.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.test.ts) com 9 asserções validando 100% dos métodos e resiliência a nulos/desconhecidos.
   - Suíte Vitest ampliada para 47/47 testes passando (100%), totalizando 71 asserções com a suíte offline.
   - 0 erros no typecheck TypeScript e build Vite 100% OK em 8.32s.

### Arquivos Criados e Modificados
- `utils/specialSetTokens.ts`: interface `MethodTheme`, mapa `METHOD_THEMES` e helper `getMethodTheme`.
- `utils/specialSetTokens.test.ts`: suíte de 9 testes unitários para tokens cromáticos.
- `pages/student/WorkoutExecution.tsx`: aplicação do tema unificado, borda conectora `border-l-4` e remoção de botão manual redundante.
- `docs/gauntlet/SLICE_SUMMARY.md`: sumário de engenharia da fatia.
- `.planning/STATE.md`: atualização de estado, decisões travadas e métricas.
- `ROADMAP.md` e `.planning/ROADMAP.md`: registro das entregas concluídas.
- `PROGRESS.md` e `.planning/PROGRESS.md`: registro cronológico do marco.

---

## [2026-10-12] — Auditoria Impeccable Loop: Fase 9 — Séries Especiais & Refinamentos de UX (PASS18 — Grade A+ 20.0/20.0)

- **Identificador da Auditoria:** `PASS18` / `impeccable-audit-phase-9-special-sets`
- **Avaliador:** `Impeccable Independent Auditor` (Fresh Context)
- **Veredito:** **PASS (20.0 / 20.0 — Aprovado com Excelência)** — [QA_REPORT_IMPECCABLE_PASS18.md](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_IMPECCABLE_PASS18.md)

### Melhorias de Craftsmanship, Acessibilidade & Refinamentos Funcionais Aplicados
1. **Acessibilidade & Teclado (A11y — 4.0/4.0):**
   - Micro-botões inline de interrogação `?` (métodos, modos biomecânicos e timers) ampliados para `min-w-[28px] min-h-[28px]` com hover tátil e rótulos explícitos `aria-label` para leitores de tela em [`ExerciseCard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExerciseCard.tsx) e [`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx).
   - Suporte à tecla `Escape` via `useEffect` com desmontagem e limpeza de listeners adicionado em [`TypeSelectionModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/TypeSelectionModal.tsx), [`MethodSelectionModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/MethodSelectionModal.tsx) e [`ExecutionModeModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExecutionModeModal.tsx).
   - Associação semântica de formulários acessível com `id` e `htmlFor` nos campos de rounds (`group-rounds-input`), descanso entre rounds (`group-rest-input`) e transição (`group-transition-input`) em [`ExerciseGroupCard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExerciseGroupCard.tsx).
2. **Theming & Color Contrast (WCAG AA/AAA — 4.0/4.0):**
   - Calibração de contraste de tokens em [`specialSetTokens.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.ts): série de aquecimento promovida para `text-amber-700 dark:text-amber-400` e método 3/7 ajustado para `bg-cyan-700 text-white` (contraste > 4.5:1).
   - Subtítulos do cabeçalho focado e cards conceituais em [`MethodGuideModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/MethodGuideModal.tsx) promovidos para `text-slate-600 dark:text-slate-300` para alta legibilidade.
   - Refinamento completo de Dark Mode com tipografia explícita `text-slate-900 dark:text-white` em textareas e inputs numéricos, além de estados táteis `dark:hover:bg-slate-700`, `dark:hover:bg-purple-950/40` e `dark:hover:bg-amber-950/40`.
3. **Clareza Pedagógica & Adaptação Contextual (4.0/4.0):**
   - **Omissão de "Quando Aplicar" para o Aluno (`isStudent = true`):** Em [`MethodGuideModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/MethodGuideModal.tsx), a seção de indicação de uso foi isolada para o treinador. O estudante visualiza exclusivamente instruções práticas passo a passo de postura, execução e recuperação, eliminando ruído conceitual durante o treino.
4. **Interação & Smart Timers no Player (4.0/4.0):**
   - **Auto-Scroll no Biset e Agrupamentos:** Navegação com centralização automática suave (`el.scrollIntoView({ behavior: 'smooth', block: 'center' })`) ao avançar entre exercícios agrupados em [`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx).
   - **Prioridade do Timer do Método:** Em métodos fracionados (Rest-Pause, Cluster, Myo-Reps, Dropset), o micro-timer tem precedência absoluta sobre descansos convencionais; o timer de intervalo do grupo dispara exclusivamente após o round completo.
   - **Métricas e Tracking de Sub-Séries:** Suporte completo com inputs individuais reativos de cargas e repetições (`handleSubSetChange`) e alternância de conclusão de sub-séries (`toggleSubSetCompletion`).
5. **Anti-AI-Slop, Tokens & Engenharia (4.0/4.0):**
   - Padronização centralizada de tokens de agrupamento, métodos, modos biomecânicos e tipos de série em [`specialSetTokens.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/specialSetTokens.ts).
   - Zero código genérico, zero em-dashes artificiais ou decorators desnecessários.
   - Suíte Vitest com 38/38 testes aprovados (100%), 0 erros estáticos de TypeScript (`tsc --noEmit`) e compilação de produção Vite 100% verde em 8.32s.

### Arquivos Modificados no Refinamento
- `components/coach/editor/ExerciseCard.tsx`: ampliação dos micro-botões inline `?` para 28x28px com ARIA labels.
- `components/coach/editor/TypeSelectionModal.tsx`: adição de listener de teclado `Escape` e desmontagem limpa.
- `components/coach/editor/MethodSelectionModal.tsx`: listener `Escape`, foco em inputs de sub-parâmetros e estados dark mode.
- `components/coach/editor/ExecutionModeModal.tsx`: listener `Escape`, contraste de inputs de cadência e hover dark mode.
- `components/coach/editor/ExerciseGroupCard.tsx`: semântica `id`/`htmlFor` nos campos de formulário e contraste de notas.
- `components/shared/MethodGuideModal.tsx`: omissão de "Quando Aplicar" para alunos (`isStudent`) e contraste de subtítulos.
- `pages/student/WorkoutExecution.tsx`: micro-botões 28x28px, auto-scroll no Biset, precedência de micro-timers e tracking de sub-séries.
- `utils/specialSetTokens.ts`: correção de tokens de contraste WCAG AA para aquecimento e método 3/7.
- `docs/gauntlet/QA_REPORT_IMPECCABLE_PASS18.md`: laudo formal independente com nota máxima 20.0 / 20.0.

---

## [2026-10-12] — Fase 9: Séries Especiais & Métodos de Intensificação (Taxonomia em 4 Camadas — PASS)


- **Identificador da Fatia:** `special_sets` / `feature-special-sets-intensification`
- **Perfil Gauntlet:** `full-stack` (React 19 + TypeScript + Tailwind CSS v4 + Supabase / PostgreSQL + Vitest)
- **Subagente Executor:** `gauntlet-builder`
- **Veredito do Gauntlet Critic:** **PASS (3.00 / 3.00 na Rubrica 6D)** — [QA_REPORT_special_sets.md](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_special_sets.md)

### Resumo do Valor Entregue (End-to-End)
1. **Modelagem Relacional & Persistência (Supabase PostgreSQL):**
   - Criação da migração [`20261012000000_special_sets_and_intensification.sql`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/migrations/20261012000000_special_sets_and_intensification.sql) com a tabela dedicada `public.exercise_groups` (tipo de grupo, rounds, descansos entre rounds e transição, notas e RLS para coaches e alunos).
   - Extensão das tabelas `workout_items` (com `group_id`, `group_order`, `exercise_notes`), `workout_sets` (com `set_method`, `method_config` JSONB, `execution_mode`, `tempo`, `timer_mode`, `micro_pause_seconds`, `activation_reps`) e `set_logs` com telemetria completa de execução.
   - Tipagem completa e segura gerada em [`types/supabase.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/types/supabase.ts).
2. **Editor do Coach & UX de Prescrição:**
   - Implementação de [`ExerciseGroupCard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExerciseGroupCard.tsx) para agrupamentos visuais (Biset, Triset, Giant Set, Pareado Antagonista) com rounds, intervalos de transição e desagrupamento seguro.
   - Modais interativos com WAI-ARIA e touch targets $\ge 44\text{px}$: [`MethodSelectionModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/MethodSelectionModal.tsx) (9 métodos de intensificação com sliders dinâmicos de drops, pausas e reps), [`ExecutionModeModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/ExecutionModeModal.tsx) (10 modos biomecânicos e notação 4 dígitos E-P-C-P) e [`TypeSelectionModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/coach/editor/TypeSelectionModal.tsx).
   - Desdobramento cirúrgico de dropsets em sub-séries com carga e repetições independentes.
3. **Guia Pedagógico de Métodos ("? Help System"):**
   - Catálogo estruturado em [`methodGuideContent.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/methodGuideContent.ts) contendo instruções científicas e biomecânicas em PT-BR para todos os métodos e modos.
   - Modal interativo [`MethodGuideModal.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/MethodGuideModal.tsx) acionado por badges com "?", provendo clareza pedagógica instantânea para treinador e aluno.
4. **Player do Aluno & Smart Timers:**
   - Execução em [`WorkoutExecution.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/WorkoutExecution.tsx) com agrupamentos visuais e **Smart Rest Timer**: o cronômetro principal de descanso não dispara prematuramente entre exercícios do mesmo grupo; dispara unicamente após a conclusão de todos os exercícios do round.
   - **Micro-Timers Automáticos:** Contagem regressiva embutida na tela para transições e pausas curtas (dropset, rest-pause, clusters, myo-reps).
   - Gravação completa de metadados em `set_logs` e persistência sem consultas N+1.
5. **Clonagem Profunda & Resiliência:**
   - Clonagem profunda em [`Library.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Library.tsx) recriando instâncias de `exercise_groups` e mapeando `oldGroupId -> newGroupId` para cada item clonado, com inserção em lote das 4 camadas.
   - Rollback atômico em falhas de rede no registro de logs para evitar cabeçalhos órfãos.
6. **Testes Automatizados & Qualidade:**
   - 38/38 testes passando no Vitest (incluindo testes de metadados das 4 camadas em `utils/workoutHistoryGrouper.test.ts`).
   - 24/24 testes aprovados na suíte offline (`scripts/test_offline_suite.ts`).
   - 0 erros de TypeScript (`tsc --noEmit`) e build de produção Vite 100% OK em 7.96s.

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
- `supabase/migrations/20261012000000_special_sets_and_intensification.sql`: migração SQL criando `exercise_groups` e novos campos em `workout_items`, `workout_sets` e `set_logs`.
- `types/supabase.ts`: tipagem TypeScript completa atualizada com as novas tabelas e colunas.
- `components/coach/editor/ExerciseGroupCard.tsx`: componente de agrupamento para Biset, Triset, Giant Set e Pareado.
- `components/coach/editor/MethodSelectionModal.tsx`: modal para seleção e parametrização dos 9 métodos avançados.
- `components/coach/editor/ExecutionModeModal.tsx`: modal para seleção dos 10 modos biomecânicos e cadência.
- `components/coach/editor/TypeSelectionModal.tsx`: modal para seleção de tipos de série.
- `components/coach/editor/ExerciseCard.tsx`: integração das 4 camadas, badges de métodos e modos e acionamento de ajuda.
- `components/shared/methodGuideContent.ts`: catálogo canônico de textos pedagógicos e orientações científicas em PT-BR.
- `components/shared/MethodGuideModal.tsx`: modal de consulta pedagógica com busca e abas por camada.
- `components/shared/ExerciseHistoryModal.tsx`: exibição de metadados das séries especiais no histórico do exercício.
- `pages/coach/Editor.tsx`: persistência e remapeamento de UUIDs de grupos em 4 fases sem N+1.
- `pages/coach/Library.tsx`: deep clone de rotinas com recriação de `exercise_groups` e mapeamento de IDs.
- `pages/student/WorkoutExecution.tsx`: execução do aluno com smart timers de grupo, micro-pausas e gravação de metadados.
- `utils/workoutHistoryGrouper.ts` e `utils/workoutHistoryGrouper.test.ts`: agrupamento e testes com preservação de metadados das 4 camadas.
- `docs/gauntlet/QA_REPORT_special_sets.md`: laudo formal de avaliação com veredito PASS (3.00 / 3.00).
- `docs/gauntlet/CRAFT_AUDIT_special_sets.md`: laudo estático de compilação, build, segurança e higiene.
- `docs/gauntlet/TEST_REPORT_special_sets.md`: relatório de testes automatizados com 62/62 asserções aprovadas.
- `.planning/STATE.md`: atualização de estado da Fase 9 com decisões travadas e métricas.
- `.planning/ROADMAP.md` e `ROADMAP.md`: checklist completo da Fase 9.
- `PRODUCT.md`: especificação viva validada com as regras de negócio da Taxonomia em 4 Camadas.

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
