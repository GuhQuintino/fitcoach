# Slice Summary - Webhook Serverless & Push "Treino Finalizado" (Fitcoach Pro)

- **Status:** COMPLETED
- **Perfil / Stack:** full-stack / TypeScript, Node.js, Vercel Serverless Functions, Supabase PostgreSQL (pg_net, RLS, triggers), Web Push (VAPID)
- **Arquivos Criados/Modificados:**
  - `supabase/functions/_shared/workoutCompletedPush.ts`: Atualizado `DEFAULT_PUSH_ICON` para `/icon-gq.png`.
  - `tests/unit/workoutCompletedPush.test.ts`: Atualizado teste de payload para validar `/icon-gq.png`.
  - `api/workout-completed-push.ts`: Nova Serverless API Route na Vercel (Node.js runtime) com validação de webhook via `timingSafeEqual`, revalidação de log no banco, idempotência estrita com claim em `workout_completion_notifications`, personalização de payload com ícone oficial GQ, inserção em `notification_logs`, envio de push para subscriptions do coach e exclusão de endpoints expirados (404/410).
  - `vercel.json`: Ajustado rewrite de SPA com exclusão de rotas de API (`/((?!api/).*)` -> `/index.html`) para permitir roteamento nativo da Serverless Function.
  - `.env.local`: Injetadas as credenciais VAPID (`VITE_VAPID_PUBLIC_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`), segredo de webhook (`WORKOUT_PUSH_WEBHOOK_SECRET`) e service role key (`SUPABASE_SERVICE_ROLE_KEY`).
  - `tests/unit/apiWorkoutCompletedPush.test.ts`: Nova suíte de testes com 12 casos cobrindo `timingSafeEqual`, autenticação e métodos HTTP do `handler`, revalidação, idempotência, silêncio noturno (`quiet_hours`), tópicos desativados e expurgo de assinaturas 410.
  - `public/icon-gq.png`: Ícone oficial GQ da Consultoria copiado e validado.
  - `scripts/setup_workout_push_config.mjs`: Script executado para aplicar migração `20261029000000_workout_completed_push.sql` e gravar chaves em `public.internal_push_config`.

### Entregas End-to-End da Fatia:
1. **Dados & Modelos:**
   - Executada a migração `20261029000000_workout_completed_push.sql` no Supabase com extensão `pg_net`.
   - Criada tabela `public.internal_push_config` com RLS habilitado (acessível exclusivamente por service role / security definer).
   - Inseridas as configurações no banco:
     - `workout_completed_push_url`: `https://fitcoach-five.vercel.app/api/workout-completed-push`
     - `workout_completed_push_secret`: `f8a42c9e1b7d5a3e0f6c2d8b4a9e1c3f7b5d2e0a8c6f4a2b0e8d6c4a2f0e8b6a`
   - Criada tabela de idempotência `public.workout_completion_notifications` com constraint UNIQUE(`dedupe_key`).
   - Trigger `trg_notify_coach_workout_completed` ativo em `workout_logs` disparando `notify_coach_workout_completed()` que invoca a URL configurada via `net.http_post`.
2. **Serviços & Contratos:**
   - Rota Serverless Vercel `api/workout-completed-push.ts` pronta para produção, protegida por timing-safe constant-time comparison de hash SHA-256.
   - Sincronizadas variáveis de ambiente no projeto Vercel (`fitcoach`) via Vercel CLI nos ambientes `Production` e `Development`:
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `WORKOUT_PUSH_WEBHOOK_SECRET`
     - `VAPID_SUBJECT`
     - `VAPID_PRIVATE_KEY`
     - `VAPID_PUBLIC_KEY`
     - `VITE_VAPID_PUBLIC_KEY`
3. **Interface & Componentes:**
   - Ícone da notificação push configurado como `/icon-gq.png` (branding oficial GQ).
   - Ação da notificação redireciona o coach diretamente para a ficha do aluno (`/coach/student/${studentId}`).
4. **Testes & Validação:**
   - `npx tsc --noEmit`: 0 erros de tipagem estrita (discriminated union `PushDecision` estreitada corretamente via `decision.send === false`).
   - `npm test`: 22 suites de teste e 212 testes unitários/regressão passando com 100% de sucesso.
   - `npm run build`: Vite build passando com 0 erros em 9.2s.

### Desvios / Decisões Técnicas (Deviation Rules):
- **Regra 1 (Bug Fix Autônomo - Tipagem Estrita TypeScript):** No endpoint `api/workout-completed-push.ts`, a verificação de `PushDecision` foi ajustada de `!decision.send` para `decision.send === false`, permitindo que o compilador TypeScript estreite com precisão a união discriminada `{ send: true } | { send: false; reason: ... }`, sanando o erro TS2339 e garantindo 0 erros em `npx tsc --noEmit`.
- **Regra 1 (Bug Fix Autônomo - Credenciais VAPID):** No endpoint `api/workout-completed-push.ts`, a validação das credenciais VAPID foi posicionada imediatamente antes do envio das mensagens de push (em vez de bloquear a revalidação de dados), permitindo que requisições idempotentes ou com treinos não-concluídos retornem status sem erro 500 mesmo em ambientes com chaves de push parciais.

### Handover para Stage 3 / Stage 4:
- Endpoint pronto para acionamento HTTP via POST: `https://fitcoach-five.vercel.app/api/workout-completed-push`.
- Header obrigatório: `x-webhook-secret: f8a42c9e1b7d5a3e0f6c2d8b4a9e1c3f7b5d2e0a8c6f4a2b0e8d6c4a2f0e8b6a`.
- Payload de acionamento: `{ "workout_log_id": "<uuid>", "student_id": "<uuid>", "coach_id": "<uuid>" }`.
