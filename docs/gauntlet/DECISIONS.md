# DECISIONS — Registro Permanente de Decisões de Arquitetura & Design

## ADR-001: Unificação de Cores do WhatsApp via Tokens Semânticos
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** Havia cores hardcoded `#25D366` e variações arbitrárias nos botões de convite, perfil e aprovação.
- **Decisão:** Criados tokens `@theme` no CSS (`--color-whatsapp: #25D366` e `--color-whatsapp-dark: #20bd5a`) e classes `bg-whatsapp`, `text-whatsapp`, `shadow-whatsapp/20`.

## ADR-002: Desacoplamento do Timer de Treino do Estado de Inputs
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** A cada caractere digitado nas caixas de peso/reps, o `useEffect` do cronômetro era destruído e recriado via `setInterval`.
- **Decisão:** Utilizados `exercisesRef` e `startTimeRef` para manter a persistência contínua do timer sem disparar recriações de intervalo, e modais foram envolvidos com `React.memo`.

## ADR-003: Proteção contra Rotas Incompletas e Alias de Retorno
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** Clicar na seta de voltar de `/student/workout/:id` direcionava para `/student/workout`, gerando tela vazia.
- **Decisão:** O botão de voltar foi redefinido para `/student/selection` e adicionados `<Route path="workout" element={<Navigate to="/student/selection" replace />} />` e rotas catch-all `*` em todos os painéis.

## ADR-004: Touch Targets Padronizados em 44x44px (WCAG 2.5.5)
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** Botões de PSE 1-10 e abas de filtros tinham alturas entre 32px e 36px.
- **Decisão:** Reorganizados os botões de nota em grid 5x2 responsivo com `min-h-[44px]` e todas as abas e botões de ação receberam `min-h-[44px]`.

## ADR-005: Clareza Pedagógica nas Metas de Prescrição
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** Alunos iniciantes e intermediários enfrentam dificuldade em interpretar pills comprimidas como `100KG`, `3-7R` e `@9.5` na coluna ANTERIOR.
- **Decisão:** Criada distinção visual explícita entre Histórico Anterior e Meta Prescrita, com chips legíveis, micro-ajuda ao toque e suporte semântico.

## ADR-006: Estratégia Híbrida de Localização de Conversas no WhatsApp Web (Regra W2)
- **Data:** 17/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Números de telefone cadastrados nos bancos (`Fitcoach` e `Questionários`) podem variar quanto ao DDI `55` e ao 9º dígito móvel brasileiro, e nomes de contatos no WhatsApp Web podem estar abreviados ou rotulados na etiqueta de negócio.
- **Decisão:** O localizador automatizado (`locateAndOpenStudentChat`) ativa prioritariamente o filtro/etiqueta **"Consultoria"** no WhatsApp Web, pesquisa em seguida pelas variantes normalizadas do telefone (`normalizePhoneVariants`: completo, sem 55, com/sem 9º dígito e sufixo de 8 dígitos) e utiliza variantes do nome do aluno (`buildStudentNameSearchVariants`) como fallback.

## ADR-007: Janela Temporal Incremental e Cache Local Idempotente por Aluno (Regra W3)
- **Data:** 17/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Extrair todo o histórico de conversas do WhatsApp Web em toda revisão semanal seria lento e redundante, enquanto apenas 7 dias seriam insuficientes para o primeiro mapeamento de contexto do aluno.
- **Decisão:** Adotada janela temporal adaptativa (`resolveSyncWindowDays`): **75 dias** (faixa 60–90 dias) na primeira sincronização (`cold_start`) e **10 dias** (faixa 7–14 dias) nas revisões semanais subsequentes (`incremental`), persistindo os dados em `docs/students/.whatsapp_cache/{slug}.json` (ignorado no `.gitignore`) com merge idempotente por chave única.

## ADR-008: Transcrição Única de Áudios PTT via Gemini 2.5 Flash Multimodal (Regra W4)
- **Data:** 17/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Muitos alunos relatam dores articulares, trocas de equipamentos na academia ou limitações de rotina através de mensagens de voz (PTT) no WhatsApp.
- **Decisão:** Mensagens de áudio dentro da janela de sincronização têm seus blobs extraídos via `FileReader` (Base64) no contexto da página e enviados à API REST `gemini-2.5-flash:generateContent` com schema JSON determinístico (`transcript`, `clinicalSummary`, `relevantForTraining`, `tags`). A transcrição fica salva perpetuamente no cache local associada ao ID da mensagem, evitando re-transcrições.

## ADR-009: Estrutura Canônica de 7 Seções nos Dossiês Individuais de Alunos (Regra W5)
- **Data:** 17/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Os dossiês em `docs/students/*.md` possuíam 6 seções e precisavam incorporar o histórico de conversas e áudios do WhatsApp sem perder as diretrizes de revisão nem quebrar atualizações futuras.
- **Decisão:** A seção `## 6. Histórico de Conversas & Áudios (WhatsApp)` foi padronizada com subseções de **Destaques Clínicos & Biomecânicos Extraídos** e **Registro Cronológico Recente**, renumerando as diretrizes operacionais para `## 7. Diretrizes para Revisões Semanais da Skill` com migração automática garantida em `upsertWhatsAppSectionInDossier` e `apply_approved_adjustments.mjs`.

## ADR-010: Estabilização de Referência de Usuário no AuthContext (Regra B1)
- **Data:** 18/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Ao retornar do segundo plano ou desbloquear a tela do celular, o Supabase dispara eventos assíncronos `TOKEN_REFRESHED` com novos ponteiros de objeto de usuário, causando remontagem em cascata de hooks e recarga desnecessária de telas de treino ativas.
- **Decisão:** O estado no `AuthContext` adota estabilização por comparação de ID (`prev?.id === next?.id ? prev : next`) e hidratação síncrona `getCachedAuthProfile` com Stale-While-Revalidate, eliminando spinners bloqueantes e recargas espúrias ao acordar o celular.

## ADR-011: Debounce e Grace Period na Detecção de Rede Móvel (Regra B2)
- **Data:** 18/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Ao ligar a tela do aparelho, o navegador dispara eventos `visibilitychange` antes que os modems Wi-Fi e 4G/5G tenham reestabelecido os sockets de rede, disparando falsos banners de "Sem conexão / Modo offline".
- **Decisão:** O utilitário `useOnlineStatus.ts` aplica debounce de 1.2s após retorno de visibilidade e retentativa com grace period de 900ms para probes de rede, além de deduplicação via singleton `inFlightProbe`.

## ADR-012: Canal Keep-Alive Silencioso e Alerta Triplo no Cronômetro (Regra B4)
- **Data:** 18/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** O sistema operacional móvel suspende timers JavaScript (`setTimeout`/`setInterval`) e threads em abas em segundo plano após ~30 a 60 segundos com tela bloqueada, impedindo o toque de fim de descanso.
- **Decisão:** Implementado canal keep-alive silencioso em memória (WAV PCM 40Hz @ volume 0.01) em elemento HTML5 `<audio>`, complementado por Web Audio API para o som de alerta, vibração física do aparelho (`navigator.vibrate`) e notificação nativa com som e vibração do sistema operacional via `ServiceWorkerRegistration.showNotification()`.

## ADR-013: Cálculo Baseado em `Date.now()` para Extensão de Timers Expirados (Regra B5)
- **Data:** 18/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Quando o cronômetro expirava em background há mais de 15 segundos, o botão `+15s` somava ao `restEndTime` vencido no passado, fazendo o cronômetro continuar zerado visualmente após o clique.
- **Decisão:** A adição de tempo calcula a nova meta através de `Math.max(Date.now(), restEndTime) + 15000`, assegurando que o cronômetro receba 15 segundos reais e rearme os alarmes de segundo plano.

## ADR-014: Persistência Atômica do Cronômetro em `active_workout` (Regra B6)
- **Data:** 18/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Se o sistema operacional descartar a aba por pressão de memória durante o treino, o cronômetro de descanso era perdido ao reabrir.
- **Decisão:** O estado do cronômetro (`restEndTime`, `initialTime`, `restTimerLabel`, `timerActive`) é gravado de forma amortecida e consistente no `localStorage` sob o payload `active_workout`, sendo reconciliado imediatamente na inicialização de `WorkoutExecution.tsx`.

## ADR-015: Inferência de Horário de Treino Baseada em Mediana e Cold Start (Regras N2/N3)
- **Data:** 25/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Treinos esporádicos em horários atípicos (ex: um treino isolado às 06:00 ou 23:00) distorciam médias aritméticas simples, levando a notificações em horários inadequados. Além disso, alunos novos não possuem histórico suficiente para inferência estatística.
- **Decisão:** O motor `workoutHabitAnalyzer.ts` calcula a mediana de minutos do dia a partir de `workout_logs.started_at` para alunos com >= 3 treinos, conferindo imunidade a outliers. Para alunos em cold start (< 3 treinos), é estabelecido o horário padrão conservador de 16:30 com dias sugeridos Segunda, Quarta e Sexta-feira ([1, 3, 5]), com transição automática após o 3º treino concluído.

## ADR-016: Quatro Escudos Anti-Spam e Políticas de Backoff em Notificações (Regra N4)
- **Data:** 25/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Notificações repetitivas e invasivas causam fadiga de alertas, opt-outs e desinstalação de PWAs fitness.
- **Decisão:** Foram codificados 4 escudos matemáticos estritos: (1) silêncio absoluto no dia se o aluno já concluiu qualquer treino; (2) teto rígido de 1 notificação diária por usuário; (3) teto de 3 lembretes de treino por semana; (4) backoff progressivo com 5 dias de pausa completa se o aluno ignorar 2 lembretes consecutivos sem treinar; além de Quiet Hours invioláveis das 21:30 às 07:30 da manhã. Para onboarding de perfil, limita-se a no máximo 1 aviso inicial e 1 reforço após 4 dias, cessando definitivamente em seguida.

## ADR-017: Arquitetura Híbrida Web Push RFC 8292 com Preservação de Listeners de Timer no Service Worker (Regras N5/N6)
- **Data:** 25/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** A inclusão de notificações push nativas via Service Worker (`push` e `notificationclick`) corria risco de conflitar com os timers de descanso em segundo plano previamente blindados na Fase 13 (`SCHEDULE_REST_TIMER` e `CANCEL_REST_TIMER`), além da necessidade de suportar iOS Standalone PWA (iOS 16.4+).
- **Decisão:** Os manipuladores de eventos em `public/sw.js` foram desacoplados em listeners puros isolados, garantindo que eventos de push não interfiram no canal de áudio keep-alive ou nos timers locais de descanso. O serviço `pushNotificationService.ts` converte chaves VAPID no padrão RFC 8292 (`urlBase64ToUint8Array`) e valida os pré-requisitos de `window.navigator.standalone` no Safari iOS antes de solicitar permissão.

## ADR-018: Expansão Não Intrusiva e Resiliência em Telas Estreitas no ProfileCompletionBanner (Fase 14)
- **Data:** 25/10/2026
- **Status:** Aceito e Implementado
- **Contexto:** Em viewports mobile compactos (~360px), o título do banner de completude de perfil sofria truncamento para "Co..." devido à classe `truncate` e layout rígido horizontal, além de ocupar espaço vertical desproporcional caso todos os detalhes fossem exibidos de forma estática permanente.
- **Decisão:** O componente foi arquitetado em padrão de acordeão expansível (`isExpanded` padrão `false`), mantendo o estado recolhido enxuto com título legível sem truncar (`whitespace-nowrap`, remoção de `truncate`), percentual em pill e botão tátil expansor ("Ver mais" / "Ver menos" com chevron animado e touch target >= 44x44px). Ao expandir, exibe chips visuais dos campos pendentes (Foto, Peso, Idade, Altura) com ícones dedicados e botões ergonômicos de ação, preservando a lógica de adiamento (snooze de 3 dias via `localStorage` e Supabase) e cobrindo integralmente o comportamento com teste de regressão dedicado passando 100%.


