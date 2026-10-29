# Push "Treino Finalizado" para o coach

Quando um aluno conclui um treino, o coach recebe: **"Treino Finalizado" / "<Primeiro nome> finalizou o treino!"**.
Ícone: `/icon-192.png` (não existe asset de logo GQ no repositório). Clique abre `/coach/student/<id do aluno>`.

## Arquitetura
1. Trigger `trg_notify_coach_workout_completed` em `workout_logs` (INSERT ou UPDATE de `finished_at`). Todos os caminhos de conclusão (`WorkoutExecution`, `staleWorkoutService`, `offlineSyncService`) inserem o log com `finished_at`, então o trigger cobre o sync offline.
2. Idempotência: `workout_completion_notifications.dedupe_key` (`student_id|workout_id|started_at`) é UNIQUE. Retentativas/rollback do sync offline recriam o log com novo ID mas a mesma chave. A Edge Function ainda "reivindica" o envio via `push_sent_at IS NULL`.
3. Edge Function `workout-completed-push`: revalida o log, resolve o coach, aplica preferências (`push`, `student_workout_completed`, horário de silêncio), grava em `notification_logs`, envia Web Push VAPID (`web-push`) a todas as assinaturas do coach e remove as expiradas (404/410).
4. Coach pode ligar/desligar o tópico em Configurações > Notificações ("Treinos Finalizados por Alunos").

## Passos manuais
1. Aplicar `supabase/migrations/20261029000000_workout_completed_push.sql`.
2. Configurar secrets: `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... WORKOUT_PUSH_WEBHOOK_SECRET=<segredo aleatório>`. A chave pública deve ser a mesma de `VITE_VAPID_PUBLIC_KEY`.
3. `supabase functions deploy workout-completed-push --no-verify-jwt`.
4. Inserir a configuração do trigger (SQL editor):
   ```sql
   INSERT INTO public.internal_push_config (key, value) VALUES
     ('workout_completed_push_url', 'https://<project-ref>.supabase.co/functions/v1/workout-completed-push'),
     ('workout_completed_push_secret', '<mesmo WORKOUT_PUSH_WEBHOOK_SECRET>')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
   ```
5. O coach deve ativar push em Configurações > Notificações (em iPhone, instalar o PWA na Tela de Início).

## Observações
- Entrega at-most-once: se a função cair após reivindicar o envio, não há reenvio.
- A função `smart-notifications` existente envia payload sem VAPID/criptografia; não foi alterada (fora do escopo).
