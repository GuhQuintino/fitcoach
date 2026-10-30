# STATE — Fitcoach Pro

**Última Atualização:** 30 de Outubro de 2026  
**Fase Ativa:** Fase 16 — Webhook Serverless & Notificação Web Push "Treino Finalizado" para o Coach (`COMPLETE` — `PASS 3.00/3.00`, `23 suítes / 225 testes`, `0 erros tsc`, `Vite build OK`)  
**Status Global:** Saúde excelente e blindada, 0 erros TypeScript (`tsc --noEmit`), build de produção Vite 100% aprovado (787 módulos), 225 testes automatizados Vitest passando (100% em 23 suítes de teste, incluindo as suítes `tests/unit/studentFirstName.regression.test.ts`, `tests/unit/apiWorkoutCompletedPush.test.ts`, `tests/unit/workoutCompletedPush.test.ts` e `tests/unit/timingSafeEqual.regression.test.ts`), Matriz de Similaridade Multidimensional em **94.4%**, 0 violações Anti-AI-Slop (`detect.mjs == []`), 0 violações P0 de acessibilidade (328 nós AXTree inspecionados), e Laudo de Auditoria Gauntlet Critic V5 com nota máxima **3.00 / 3.00 (Média 6D — PASS)** ([`QA_REPORT_workout-completed-push.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_workout-completed-push.md)).

---

## 🎯 Marco Atual Concluído: Notificação Web Push "Treino Finalizado" para o Coach (Fase 16 — PASS 3.00/3.00)
- **Objetivo**: Implementação ponta a ponta do sistema de notificação Web Push instantânea para o Treinador Gustavo quando qualquer aluno conclui um treino, com arquitetura serverless na Vercel (`api/workout-completed-push.ts`), autenticação timing-safe via SHA-256 e `crypto.timingSafeEqual`, idempotência atômica com trava em `workout_completion_notifications`, trigger assíncrono via `pg_net` em `workout_logs`, branding oficial GQ (`/icon-gq.png`), expurgo automático de assinaturas expiradas (404/410), respeito a horários de silêncio (`quiet_hours`) e extração resiliente de primeiro nome do aluno sem erros de schema PostgREST.
- **Entregáveis da Fatia Vertical (End-to-End)**:
  - **DDL Relacional, Idempotência & Extensão pg_net (`20261029000000_workout_completed_push.sql`)**:
    - Extensão `pg_net` habilitada no Postgres do Supabase.
    - Tabela de configuração interna `public.internal_push_config` com RLS estrito (acesso exclusivo service role / security definer).
    - Tabela de idempotência `public.workout_completion_notifications` com constraint `UNIQUE(dedupe_key)` e lock atômico por `push_sent_at`.
    - Trigger `trg_notify_coach_workout_completed` ativo em `workout_logs` disparando assincronamente a função `notify_coach_workout_completed()` via `net.http_post`.
  - **Endpoint Serverless Vercel (`api/workout-completed-push.ts`) & Edge Function (`supabase/functions/workout-completed-push/index.ts`)**:
    - Serverless Function Node.js nativa desacoplada da SPA através de rewrite regex em `vercel.json` (`/((?!api/).*)` -> `/index.html`).
    - Autenticação de webhook via constant-time comparison (`crypto.timingSafeEqual`) de hashes SHA-256 de tamanho fixo (32 bytes), rejeitando secrets vazios com HTTP 401.
    - Revalidação de estado em `workout_logs` checando `finished_at IS NOT NULL`.
    - Respeito integral a `preferences.push` e `preferences.student_workout_completed` do coach e janela de silêncio (`quiet_hours`), gravando em `notification_logs` sem disparar push ruidoso.
    - Disparo de Web Push RFC 8292 via biblioteca `web-push` e VAPID para todas as inscrições ativas do coach em `push_subscriptions`.
    - Expurgo em lote de endpoints inválidos/revogados (status HTTP 404 e 410 Gone).
  - **Bugfix Crítico de Schema PostgREST & Extração do Primeiro Nome (`getFirstName`)**:
    - Saneamento da query a `profiles` em ambos os pontos de entrada (`api/workout-completed-push.ts` e `supabase/functions/workout-completed-push/index.ts`) para `.select('full_name, email')`, eliminando a coluna inexistente `name` que gerava HTTP 400 no PostgREST e forçava fallback em `"Seu aluno"`.
    - Algoritmo `getFirstName` robusto: extrai e normaliza com capitalização pt-BR a primeira palavra de `full_name`; fallback inteligente pelo prefixo do `email` antes do `@` e delimitadores (`.`, `_`, `+`, `-`); e fallback final seguro para `"Seu aluno"`.
  - **Branding Oficial & Payload**:
    - Notificação configurada com título `"Treino Finalizado"`, mensagem `"<PrimeiroNome> finalizou o treino!"` (ex: `"Gabriel finalizou o treino!"`), ícone oficial GQ (`/icon-gq.png`) e deep-link direto para a ficha do aluno (`/coach/student/<studentId>`).
  - **Configuração de Produção & Infraestrutura**:
    - Populada tabela `public.internal_push_config` com a URL do endpoint de produção (`https://fitcoach-five.vercel.app/api/workout-completed-push`) e segredo de webhook.
    - Sincronizadas variáveis de ambiente no projeto Vercel (`fitcoach`) via Vercel CLI nos ambientes Production e Development: `SUPABASE_SERVICE_ROLE_KEY`, `WORKOUT_PUSH_WEBHOOK_SECRET`, `VAPID_SUBJECT`, `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` e `VITE_VAPID_PUBLIC_KEY`.
  - **Garantia de Qualidade & Testes**:
    - Suíte de regressão `tests/unit/studentFirstName.regression.test.ts` (13 testes cobrindo os 5 cenários e prevenindo reintrodução da coluna `name`).
    - Suíte `tests/unit/apiWorkoutCompletedPush.test.ts` (12 testes unitários do endpoint).
    - Suíte `tests/unit/workoutCompletedPush.test.ts` (15 testes unitários de lógica).
    - Suíte de regressão `tests/unit/timingSafeEqual.regression.test.ts` (6 testes de segurança).
    - 225/225 testes Vitest passando (100% em 23 suítes), 0 erros de compilação TypeScript (`tsc --noEmit`), build de produção Vite 100% OK em 8.00s.

---

## 🔒 Decisões Travadas (Locked Decisions)
- **ADR-025: Sanitização de Schema em Consultas PostgREST e Extração Determinística de Nome (Fase 16 Refinamento / Bugfix):** As consultas a `profiles` para montagem de payloads de notificação consultam estritamente colunas canônicas existentes no banco (`full_name, email`), erradicando a tentativa de seleção da coluna inexistente `name` que causava HTTP 400 no PostgREST. A resolução do primeiro nome do aluno (`getFirstName`) implementa normalização de capitalização em pt-BR da primeira palavra de `full_name`, com fallback determinístico pelo prefixo de `email` (descartando provedor e caracteres após separadores `.` ou `_`) e fallback final seguro para `"Seu aluno"`. Blindado permanentemente contra regressões de schema por `tests/unit/studentFirstName.regression.test.ts`.
- **ADR-023: Endpoint Serverless Vercel Node.js para Notificação Push de Treino Concluído com Idempotência Estrita e Timing-Safe Auth (Fase 16):** Rota `/api/workout-completed-push` em Node.js runtime da Vercel desacoplada da SPA (`vercel.json`), validação de webhook via SHA-256 e `crypto.timingSafeEqual`, revalidação de `finished_at` em `workout_logs`, deduplicação atômica via `push_sent_at IS NULL` em `workout_completion_notifications`, personalização com branding oficial GQ (`/icon-gq.png`), respeito a `quiet_hours` e preferências do coach, e expurgo automático de endpoints expirados (404/410 Gone).
- **ADR-024: Orquestração Desacoplada Supabase pg_net -> Vercel Serverless Function (Fase 16):** Trigger `trg_notify_coach_workout_completed` assíncrono via `net.http_post` em `workout_logs` consultando URL e secret em `public.internal_push_config` protegida por RLS estrito (service role/security definer). Falhas de rede ou serviço de push são isoladas e nunca bloqueiam a finalização de treino pelo aluno.
- **ADR-019: Consolidação Single-Coach e Fluxos Assistidos via WhatsApp Oficial (Fase 15 — C1, C2, C6, C7):** Extinção de rotas SaaS multi-coach (`/coach/plans`, `/coach/subscription`) e centralização de recuperação de senha (`@fitcoach.com`) e solicitações LGPD de exclusão de dados via deep-link oficial `https://wa.me/5511992616777` diretamente com o Treinador Gustavo.
- **ADR-020: Cálculo Metabólico Mifflin-St Jeor com Sanitização Antropométrica Determinística (Fase 15 — C9):** A Taxa Metabólica Basal (TMB) e o Gasto Energético Diário Total (GET/Manutenção) utilizam a equação científica de Mifflin-St Jeor com fator de atividade física persistido em `profiles.preferences.activity_level`, precedidos por sanitização automática de erros comuns de digitação (`750 -> 75.0 kg`, `1.75 -> 175 cm`).
- **ADR-021: Serialização Completa de 23 Campos das 4 Camadas em Templates de Séries (Fase 15 — C8):** Os templates de séries do editor (`SetTemplateManager.tsx`) serializam e desserializam integralmente os atributos das Camadas 1 a 4 (`set_method`, `drop_count`, `sub_sets`, `micro_rest_seconds`, `activation_reps`, `execution_mode`, `tempo`, `timer_mode`) e todos os alvos de Cardio/HIIT.
- **ADR-022: Saneamento de Queries PostgREST e Eliminação de N+1 na Importação de Treinos (Fase 15 — C5, C13):** Consultas a `students_data` e `workout_logs` utilizam estritamente colunas canônicas do schema (`birth_date`, `finished_at`), a rotina ativa no histórico do aluno é resolvida via `student_assignments`, e a busca de alunos no `WorkoutImportModal` opera em lote único `.in('student_id', studentIds)`.
- **ADR-018: Expansão Não Intrusiva e Resiliência em Telas Estreitas no ProfileCompletionBanner (Fase 14):** Arquitetura em padrão acordeão expansível (`isExpanded` padrão `false`), mantendo o estado recolhido enxuto com título sem truncar (`whitespace-nowrap`, remoção de `truncate`), percentual em pill e botão tátil expansor ("Ver mais" / "Ver menos" com chevron animado e touch target >= 44x44px). Ao expandir, exibe chips visuais dos campos pendentes (Foto, Peso, Idade, Altura) com ícones dedicados e botões ergonômicos de ação, preservando a lógica de adiamento (snooze de 3 dias via `localStorage` e Supabase) e coberto por teste de regressão dedicado.
- **ADR-015: Inferência de Horário de Treino Baseada em Mediana e Cold Start (Regras N2/N3):** O cálculo do horário habitual utiliza a mediana de minutos do dia dos treinos realizados em `workout_logs.started_at` para alunos com $\ge 3$ treinos, impedindo distorções por outliers. Alunos com $< 3$ treinos iniciam com cold start conservador às 16:30 nos dias Segunda, Quarta e Sexta ([1, 3, 5]), migrando automaticamente para o padrão estatístico após o 3º treino.
- **ADR-016: Quatro Escudos Anti-Spam e Políticas de Backoff em Notificações (Regra N4):** Prevenção matemática estrita de fadiga de alertas: (1) silêncio absoluto no dia se o aluno já concluiu qualquer treino; (2) teto rígido de 1 notificação diária por usuário; (3) teto semanal de 3 lembretes de treino; (4) backoff progressivo com 5 dias de pausa completa se o aluno ignorar 2 lembretes consecutivos sem treinar; e Quiet Hours invioláveis das 21:30 às 07:30 da manhã. Para onboarding de perfil, limita-se a 1 aviso inicial e 1 reforço após 4 dias se continuar incompleto.
- **ADR-017: Arquitetura Híbrida Web Push RFC 8292 com Preservação de Listeners de Timer no Service Worker (Regras N5/N6):** Manipuladores de `push` e `notificationclick` em `public/sw.js` são desacoplados e mantêm 100% de isolamento em relação aos timers de descanso em segundo plano (`SCHEDULE_REST_TIMER`/`CANCEL_REST_TIMER`) da Fase 13. O serviço `pushNotificationService.ts` converte chaves VAPID no formato RFC 8292 (`urlBase64ToUint8Array`) e detecta compatibilidade de PWA Standalone no iOS Safari 16.4+.
- **ADR-010: Estabilização de Referência de Usuário no AuthContext (Regra B1):** Eventos `TOKEN_REFRESHED` do Supabase disparados ao acender a tela ou retornar do segundo plano preservam a referência do objeto de usuário caso o `id` permaneça idêntico (`prev.id === next.id ? prev : next`), eliminando a desmontagem da árvore de componentes e a reinicialização de treinos em andamento.
- **ADR-011: Debounce e Grace Period na Detecção de Rede Móvel (Regra B2):** Eventos de `visibilitychange` aguardam 1200ms de debounce e aplicam grace period com singleton `inFlightProbe` antes de declarar o app offline, dando tempo para que os modems Wi-Fi e 4G/5G reestabeleçam a conexão TLS após o sleep do aparelho.
- **ADR-012: Canal Keep-Alive Silencioso e Alerta Triplo no Cronômetro (Regra B4):** Prevenção de suspensão de thread em segundo plano através de canal de áudio inaudível sintetizado em memória (WAV PCM 40Hz @ volume 0.01) em elemento HTML5 `<audio>`, combinado com Web Audio API para o som audível de término, vibração háptica via `navigator.vibrate` e notificação de sistema operacional via `ServiceWorkerRegistration.showNotification()`.
- **ADR-013: Cálculo Baseado em `Date.now()` para Extensão de Timers Expirados (Regra B5):** Clicar em `+15s` ou somar tempo quando o cronômetro expirar no passado calcula a nova data final a partir de `Math.max(Date.now(), currentRestEndTime) + 15000`, assegurando que o cronômetro receba 15 segundos reais e rearme os alarmes de segundo plano.
- **ADR-014: Persistência Atômica do Cronômetro em `active_workout` (Regra B6):** O timestamp `restEndTime`, `initialTime`, `restTimerLabel` e flag `timerActive` são persistidos de forma amortecida e consistente no `localStorage` sob o payload `active_workout`, sendo reconciliados imediatamente na inicialização de `WorkoutExecution.tsx`.
- **Estratégia Híbrida de Localização no WhatsApp Web (Regra W2):** A busca de conversas de alunos no WhatsApp Web prioriza a ativação da etiqueta/filtro **"Consultoria"** (quando disponível na conta WhatsApp Business), seguida de pesquisa pelas variantes normalizadas do telefone (`normalizePhoneVariants` lidando com o 9º dígito brasileiro) e fallback pelas variantes de nome (`buildStudentNameSearchVariants`).
- **Janela Temporal Incremental e Cache Local Idempotente (Regra W3):** O histórico de WhatsApp de cada aluno reside em `docs/students/.whatsapp_cache/{slug}.json` (ignorado pelo Git). Alunos sem cache prévio executam varredura **Cold Start de 75 dias**; alunos já sincronizados executam varredura **Incremental de 10 dias**, com deduplicação $O(N)$ por ID/chave composta.
- **Transcrição Única de Áudios PTT via Gemini 2.5 Flash com Cache Perpétuo (Regra W4):** Áudios de voz são extraídos via `FileReader` (Blob -> Base64) no contexto da página e transcritos via `gemini-2.5-flash:generateContent` com schema JSON estruturado e tags clínicas. Áudios já transcritos no cache local nunca são re-enviados à API, garantindo custo zero em re-execuções.
- **Estrutura de 7 Seções nos Dossiês de Alunos (Regra W5):** Os dossiês individuais (`docs/students/*.md`) seguem canonicamente 7 seções numeradas, alocando `## 6. Histórico de Conversas & Áudios (WhatsApp)` para o contexto conversacional/clínico e `## 7. Diretrizes para Revisões Semanais da Skill` para as regras operacionais, preservadas integralmente por `apply_approved_adjustments.mjs`.
- **Isolamento Granular de Vendor Chunks no Rollup / Vite (`manualChunks`):** Módulos pesados e autônomos de visualização/gráficos (`recharts`) residem compulsoriamente em chunk dedicado (`vendor-recharts`), erradicando dependências circulares entre chunks e otimizando o cache HTTP do navegador para os demais vendors (`vendor-react`, `vendor-supabase`).
- **Atualização Contínua da Base de Navegadores (`caniuse-lite`):** A base de dados do browserslist é mantida atualizada periodicamente através de `npx update-browserslist-db@latest` para assegurar compilações de produção com alvos de compatibilidade precisos e sem alertas obsoletos.
- **Sanitização Universal de `set_type` (`sanitizeSetType`):** Todas as inserções em `set_logs` (diretas no player, pela fila offline ou via auto-finalização de treinos obsoletos) passam compulsoriamente por `sanitizeSetType()` em `utils/specialSetTokens.ts`, normalizando variantes e aplicando fallback seguro para `'working'`.
- **Desdobramento de Dropsets & Compatibilidade no Postgres:** Sub-séries de dropset desdobram como tipo `'drop'`, mantendo conformidade com o enum nativo do PostgreSQL. Em paralelo, a migration `20261014000000_add_dropset_to_set_type_enum.sql` adicionou `'dropset'` ao tipo enumerado `set_type` no Postgres para retrocompatibilidade total com schemas legados e payloads desnormalizados.
- **Preservação Perpétua de Histórico na Fila Offline (Anti-Data-Loss):** A fila offline do aluno NUNCA descarta silenciosamente treinos realizados. Falhas de conexão retêm os itens na fila (`remainingQueue.push(item)`) com registro de `lastError`, protegendo o histórico do atleta até a rede ser restabelecida.
- **Suporte Completo a Sub-Séries (`sub_sets_records`) e Metadados nos Serviços:** O serviço de sincronização offline e o detector de treinos obsoletos (`staleWorkoutService.ts`) processam integralmente sub-séries concluídas de métodos avançados com todos os metadados das 4 camadas (`group_round`, `set_method`, `micro_set_index`, `execution_mode`, `tempo_used`, `timer_mode`).
- **Recuperação com Fidelidade Matemática e Empírica (Maria Aparecida 14/10/2026):** O treino de 14/10/2026 da aluna Maria Aparecida (`156372b5-22f3-4a0d-98c8-e91a36fce1fc`) foi restaurado com fidelidade matemática exata (17 séries, 5807.50 kg de volume, feedback técnico da panturrilha) e protegido por script de execução idempotente.
- **Taxonomia Ortogonal em 4 Camadas:** Separação estrita e independente entre Camada 1 (Agrupamento entre exercícios), Camada 2 (Método da série), Camada 3 (Modo de execução/cadência) e Camada 4 (Timers & Rest).
- **Tabela Relacional Dedicada `exercise_groups`:** Agrupamentos residem em tabela própria com integridade referencial, foreign keys e controle de rounds (`rounds`), tempo de descanso entre rounds (`rest_between_rounds_seconds`) e tempo de transição entre exercícios (`transition_rest_seconds`).
- **Rollback Cirúrgico Resiliente:** Persistência de treinos e auto-finalização no aluno possuem rollback explícito (`delete().eq('id', createdLogId)`) em caso de erro na gravação de séries, prevenindo registros órfãos.
- **Padrão Visual Nativo & Geometria Limpa:** Remoção de bordas laterais grossas (`border-l-4`) em favor da estética original arredondada e limpa do app. Cores de métodos atuam exclusivamente como fundo suave (`bg-*-50/60`) durante o estado ativo/pendente.
- **Transição Compulsória para Verde Claro no Check:** Qualquer série ou sub-série marcada com `[✓]` assume compulsoriamente o fundo verde claro padrão do aplicativo (`bg-emerald-100/70 dark:bg-emerald-900/30`), garantindo feedback visual consistente em toda a experiência de treino.
- **Independência Estrita de Sub-Séries & Drops:** O check na série mãe não auto-conclui sub-séries. Cada etapa fracionada exige check individual, respeitando o fluxo sequencial real do atleta.
- **Timer Único Inferior Padrão:** Micro-pausas de métodos (ex: 15s em Rest-Pause) e descansos convencionais compartilham a mesma infraestrutura do cronômetro inferior flutuante, eliminando poluição de múltiplos timers simultâneos em tela.

---

## 📊 Métricas de Qualidade
- **TypeScript:** 0 erros de tipagem estática (`tsc --noEmit`)
- **Testes Automatizados (Vitest):** 225 passed / 225 total (100% de sucesso em 23 suítes de teste)
  - `tests/unit/studentFirstName.regression.test.ts`: 13/13 passed
  - `tests/unit/timingSafeEqual.regression.test.ts`: 6/6 passed
  - `tests/unit/workoutCompletedPush.test.ts`: 15/15 passed
  - `tests/unit/apiWorkoutCompletedPush.test.ts`: 12/12 passed
  - `tests/unit/workoutHabitAnalyzer.test.ts`: 19/19 passed
  - `tests/unit/smartNotificationDispatcher.test.ts`: 5/5 passed
  - `utils/__tests__/smartNotificationDispatcher.regression.test.ts`: 2/2 passed
  - `tests/whatsappDossierSync.test.ts`: 22/22 passed
  - `tests/unit/muscleUtils.test.ts`: 9/9 passed
  - `utils/workoutHistoryGrouper.test.ts`: 5/5 passed
  - `tests/unit/offlineCacheService.test.ts`: 5/5 passed
  - `utils/sessionComparison.test.ts`: 13/13 passed
  - `utils/specialSetTokens.test.ts`: 14/14 passed
  - `utils/studentStatus.test.ts`: 20/20 passed
  - `tests/regression/activeWorkoutAndAuthSafety.regression.test.ts`: 7/7 passed
  - `utils/__tests__/metabolicCalculator.regression.test.ts`: 11/11 passed
  - `tests/regression/profileCompletionBanner.regression.test.tsx`: 5/5 passed
  - `tests/regression/workoutFinalizationEnum.regression.test.ts`: 6/6 passed
  - `tests/unit/phoneAndTextUtils.test.ts`: 8/8 passed
  - `utils/__tests__/selectionAndTemplates.regression.test.ts`: 6/6 passed
  - `tests/unit/staleWorkoutService.test.ts`: 8/8 passed
  - `tests/unit/pushNotificationService.test.ts`: 4/4 passed
  - `tests/background-lifecycle-timer.regression.test.ts`: 10/10 passed
- **Build de Produção:** Vite build 100% concluído gerando 787 módulos sem erros ou warnings (`npm run build`)
- **Matriz de Similaridade Multidimensional (UI Operate):** **94.4%** global ponderado (Layout 95%, Tipografia 94%, Mídia 92%, Componentes 96%, Copy 96%)
- **Acessibilidade:** 0 violações críticas P0 em 328 nós AXTree inspecionados (WAI-ARIA `role="dialog"`, touch targets $\ge 44\text{px}$, suporte a tecla `Escape` em 100% dos modais)
- **Conformidade Anti-AI-Slop:** 0 violações (`detect.mjs == []`, zero travessões longos `—` em botões/títulos, `tabular-nums` em todas as métricas numéricas)
- **Laudos Gauntlet Critic:**
  - **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_workout-completed-push.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_workout-completed-push.md)
  - **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_SINGLE_COACH_CONSOLIDATION.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_SINGLE_COACH_CONSOLIDATION.md)
  - **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_smart_notifications.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_smart_notifications.md)
  - **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_profile_banner_expansion.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_profile_banner_expansion.md)

---

## 📋 Pendências / Backlog Futuro & Integrações Externas
- **Pendência / Backlog Futuro — Item 2.11 (Camada 4 de Séries Especiais `timer_mode`):**
  - Implementar seletor EMOM / AMRAP / Tabata no editor de séries do coach (`Editor.tsx`) e cronômetro dedicado de rounds automáticos no player de musculação (`WorkoutExecution.tsx`).
- **Pendência Externa / Integrações — Diagnóstico do Webhook InfinitePay no Repositório `C:\Users\Gustavo\Desktop\Consultoria`:**
  - **Arquivos Auditados:** `src/lib/fitcoach/provisioning.ts` e `src/app/api/webhooks/infinitepay/route.ts`.
  - **Causa Raiz 1 (Divergência de E-mail Pessoal vs `@fitcoach.com` e Variação de Nome):** Na renovação via InfinitePay, `payload.customer.email` traz o e-mail pessoal do pagador, enquanto a conta original do aluno no Fitcoach usa `${nomeNormalizado}@fitcoach.com` (ou a coluna `email` em `public.profiles` está nula/diferente). Quando a busca por `targetEmail` falha (`provisioning.ts` L154), o fallback gera `${normalizedName}@fitcoach.com` (L168); qualquer variação no nome digitado no checkout ou no cartão (ex: preposição `"da"`, segundo nome omitido ou acentuação sem `normalize('NFD')` em `route.ts` L78) faz `existingProfile` resultar em `null`, disparando `auth.admin.createUser` e criando uma segunda conta para o mesmo aluno.
  - **Causa Raiz 2 (Ausência de Reconciliação por Pagamentos Anteriores e Telefone):** `provisioning.ts` não consulta a tabela `payments` do próprio banco GQFit por pagamentos anteriores aprovados (`fitcoach_user_id IS NOT NULL`) com o mesmo `customer_email` ou `customer_phone`, nem busca em `students_data`/`profiles` pelo telefone normalizado ou `full_name` (`ilike`).
  - **Causa Raiz 3 (Limite de Paginação em `listUsers()`):** Em `provisioning.ts` L201, `fitcoachSupabase.auth.admin.listUsers()` é chamado sem paginação (retorna apenas 50 usuários por padrão), falhando ao localizar alunos existentes quando a base ultrapassa 50 registros.
  - **Ação Recomendada no Projeto `Consultoria`:** Priorizar busca de `fitcoach_user_id` em pagamentos anteriores na tabela `payments` por e-mail/telefone, reconciliar por telefone normalizado e `full_name` (`ilike`), e unificar a função `normalizeUsername` com `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`.

---

## 🚀 Próximo Passo
- Planejar e executar a implementação do **Item 2.11** (Camada 4 de Séries Especiais `timer_mode`: seletor EMOM/AMRAP/Tabata no editor e cronômetro dedicado no player de musculação) quando priorizado pelo treinador.
- Aplicar a correção de reconciliação de contas na renovação do Webhook InfinitePay diretamente no repositório externo `C:\Users\Gustavo\Desktop\Consultoria` (`src/lib/fitcoach/provisioning.ts` e `src/app/api/webhooks/infinitepay/route.ts`).
- Configurar agendamento horário de produção para a Edge Function `supabase/functions/smart-notifications` via cron / pg_cron no período diurno (08:00 às 21:00).
