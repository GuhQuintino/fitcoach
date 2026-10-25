# STATE — Fitcoach Pro

**Última Atualização:** 25 de Outubro de 2026  
**Fase Ativa:** Fase 14 — Notificações Inteligentes Baseadas no Padrão do Aluno + Anti-Spam & Onboarding de Perfil (Concluída com Sucesso) — com Refinamento de Expansão e Responsividade Mobile do ProfileCompletionBanner Aprovado  
**Status Global:** Saúde excelente e blindada, 0 erros TypeScript (`tsc --noEmit`), build de produção Vite 100% aprovado (10.04s, 788 módulos), 160 testes automatizados Vitest passando (100% em 16 arquivos de teste, incluindo 5/5 na suíte de regressão dedicada `tests/regression/profileCompletionBanner.regression.test.tsx`, 19/19 em `tests/unit/workoutHabitAnalyzer.test.ts` e 10/10 na suíte de regressão `tests/background-lifecycle-timer.regression.test.ts`), conformidade estrita Anti-AI-Slop sem truncamentos ou código placeholder, e Laudos de Auditoria Gauntlet Critic com nota máxima **3.00 / 3.00 (Média 6D — PASS)** ([`QA_REPORT_smart_notifications.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_smart_notifications.md) e [`QA_REPORT_profile_banner_expansion.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_profile_banner_expansion.md)).

---

## 🎯 Marco Atual Concluído
- **Objetivo**: Sistema completo de notificações inteligentes personalizadas por aluno com aprendizagem estatística de hábitos de treino (horário mediano e dias frequentes), cold start suave (16:30 padrão), proteção anti-spam com 4 escudos matemáticos rígidos, onboarding gentil de completude de perfil (foto, peso, idade/nasc, altura), Web Push nativo via Service Worker (RFC 8292 VAPID) com preservação íntegra dos timers de descanso em segundo plano, badge reativo em tempo real no sino de notificações e centro de configurações completo.
- **Entregáveis da Fatia Vertical (End-to-End)**:
  - **Dados & Modelos Supabase ([`supabase/migrations/20261025000000_smart_notifications.sql`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/migrations/20261025000000_smart_notifications.sql))**:
    - Criação das tabelas relacionais `public.push_subscriptions` e `public.notification_logs` no banco de produção do Supabase via session pooler.
    - Índice parcial `idx_notification_logs_user_unread` (`WHERE read_at IS NULL`) garantindo consultas de contagem no sino em tempo sub-milissegundo $O(1)$.
    - Índice composto `idx_notification_logs_user_topic_created` para frequency capping e avaliação instantânea de políticas de backoff.
    - Coluna `preferences` JSONB em `profiles` e ativação de RLS estrito com políticas de isolamento por `auth.uid() = user_id`.
  - **Motor Estatístico de Hábitos & 4 Escudos Anti-Spam ([`utils/workoutHabitAnalyzer.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/workoutHabitAnalyzer.ts))**:
    - Cálculo da mediana de minutos do dia a partir dos registros reais de treino em `workout_logs.started_at` para alunos com $\ge 3$ treinos, garantindo imunidade a treinos esporádicos fora de hora.
    - Cold start determinístico às 16:30 nos dias Segunda, Quarta e Sexta para novos alunos com $< 3$ treinos.
    - Implementação estrita dos 4 Escudos Anti-Spam: (1) silêncio absoluto no dia se o aluno já concluiu qualquer treino; (2) teto diário rígido de 1 notificação por usuário; (3) teto semanal de 3 lembretes de treino; (4) backoff progressivo de 5 dias após 2 lembretes consecutivos ignorados sem treinar; e Quiet Hours invioláveis das 21:30 às 07:30 da manhã.
    - Avaliação de completude de perfil (foto, peso, idade/nascimento, altura) com política de no máximo 1 aviso inicial e 1 reforço após 4 dias se continuar incompleto, cessando em seguida.
  - **Web Push Nativo & Preservação do Service Worker ([`public/sw.js`](file:///c:/Users/Gustavo/Desktop/Fitcoach/public/sw.js), [`utils/pushNotificationService.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/pushNotificationService.ts))**:
    - Service Worker atualizado preservando 100% dos listeners `'SCHEDULE_REST_TIMER'` e `'CANCEL_REST_TIMER'` da Fase 13, integrando listeners nativos de `push` com parsing seguro de payload e `notificationclick` com navegação inteligente em abas existentes ou novas janelas.
    - Conversão de chaves VAPID RFC 8292 (`urlBase64ToUint8Array`), detecção de suporte a Web Push PWA Standalone no iOS Safari 16.4+ e sincronização bidirecional de inscrições com `push_subscriptions`.
  - **Despachante & Edge Function ([`utils/smartNotificationDispatcher.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/smartNotificationDispatcher.ts), [`supabase/functions/smart-notifications/index.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/supabase/functions/smart-notifications/index.ts))**:
    - Utilitário puro de despacho com persistência em `notification_logs` e marcação de leitura individual e em lote.
    - Edge Function em Deno pronta para execução agendada diurna via `pg_cron` ou webhook externo.
  - **Componentes do Aluno & Interface ([`components/student/NotificationBell.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/student/NotificationBell.tsx), [`components/student/ProfileCompletionBanner.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/student/ProfileCompletionBanner.tsx), [`pages/student/Dashboard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/student/Dashboard.tsx), [`pages/settings/Notifications.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/settings/Notifications.tsx))**:
    - Substituição da bolinha vermelha estática pelo `NotificationBell`, exibindo badge dinâmico animado e contagem real via Supabase Realtime (apenas renderiza quando `unreadCount > 0`).
    - `ProfileCompletionBanner` renderizando alerta esportivo não invasivo com percentual de preenchimento, arquitetura de acordeão expansível ("Ver mais" / "Ver menos" com chevron dinâmico animado em 180°), proteção total contra truncamento de texto em telas compactas (~360px), painel colapsável `#profile-banner-details` exibindo chips visuais ricos com ícones para pendências (Foto, Peso, Idade, Altura), botões táteis ergonômicos (touch targets >= 44x44px), botão dispensar com snooze de 3 dias via `localStorage` e Supabase `updatePreferences`, e CTA direto para `/student/profile`.
    - Centro de configurações funcional em `/student/settings/notifications` com ativação de Web Push, card de Padrão de Treino Aprendido com badge de precisão e override manual, controle granular de tópicos, customização de Quiet Hours e histórico de alertas recentes.
  - **Validação Automatizada Abrangente**:
    - Suíte de regressão dedicada em [`tests/regression/profileCompletionBanner.regression.test.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/tests/regression/profileCompletionBanner.regression.test.tsx) com 5/5 testes passando, validando montagem no mobile, título não truncado, acessibilidade ARIA (`aria-expanded`, `aria-controls`), toggle interativo e política de snooze/opt-out.
    - Suíte de 19 testes automatizados em [`tests/unit/workoutHabitAnalyzer.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/tests/unit/workoutHabitAnalyzer.test.ts) cobrindo todos os cenários e escudos anti-spam.
    - Suítes de serviço em [`tests/unit/pushNotificationService.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/tests/unit/pushNotificationService.test.ts) e [`tests/unit/smartNotificationDispatcher.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/tests/unit/smartNotificationDispatcher.test.ts).
    - 160/160 testes aprovados na suíte global Vitest (16 arquivos, 100% de sucesso em ~2.91s).
    - Laudos Gauntlet Critic aprovados com nota máxima **3.00 / 3.00 (Média 6D — PASS)** ([`QA_REPORT_smart_notifications.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_smart_notifications.md) e [`QA_REPORT_profile_banner_expansion.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_profile_banner_expansion.md)).

---

## 🔒 Decisões Travadas (Locked Decisions)
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
- **Testes Automatizados (Vitest):** 160 passed / 160 total (100% de sucesso em 16 arquivos de teste em ~2.91s)
  - `tests/whatsappDossierSync.test.ts`: 22/22 passed
  - `utils/studentStatus.test.ts`: 20/20 passed
  - `tests/unit/workoutHabitAnalyzer.test.ts`: 19/19 passed
  - `utils/specialSetTokens.test.ts`: 14/14 passed
  - `utils/sessionComparison.test.ts`: 13/13 passed
  - `tests/background-lifecycle-timer.regression.test.ts`: 10/10 passed
  - `tests/unit/muscleUtils.test.ts`: 9/9 passed
  - `tests/unit/phoneAndTextUtils.test.ts`: 8/8 passed
  - `tests/unit/staleWorkoutService.test.ts`: 8/8 passed
  - `tests/regression/activeWorkoutAndAuthSafety.regression.test.ts`: 7/7 passed
  - `tests/regression/workoutFinalizationEnum.regression.test.ts`: 6/6 passed
  - `tests/regression/profileCompletionBanner.regression.test.tsx`: 5/5 passed
  - `utils/workoutHistoryGrouper.test.ts`: 5/5 passed
  - `tests/unit/offlineCacheService.test.ts`: 5/5 passed
  - `tests/unit/smartNotificationDispatcher.test.ts`: 5/5 passed
  - `tests/unit/pushNotificationService.test.ts`: 4/4 passed
- **Build de Produção:** Vite build 100% concluído em 10.04s gerando 788 módulos sem erros ou warnings (`npm run build`)
- **Acessibilidade:** 0 violações críticas P0 (WAI-ARIA `role="dialog"`, touch targets $\ge 44\text{px}$, suporte a tecla `Escape` em 100% dos modais, `aria-expanded` e `aria-controls` no banner)
- **Conformidade Anti-AI-Slop:** 0 violações (zero travessões longos `—` em botões/títulos, sem emojis em badges, sem gradientes artificiais "AI purple")
- **Laudos Gauntlet Critic:**
  - **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_smart_notifications.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_smart_notifications.md)
  - **3.00 / 3.00 (Média 6D — PASS)** em [`QA_REPORT_profile_banner_expansion.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_profile_banner_expansion.md)

---

## 🚀 Próximo Passo
- Configurar agendamento horário de produção para a Edge Function `supabase/functions/smart-notifications` via cron / pg_cron no período diurno (08:00 às 21:00) e substituir credenciais VAPID de desenvolvimento pelas chaves definitivas do ambiente de produção (`VITE_VAPID_PUBLIC_KEY`).
