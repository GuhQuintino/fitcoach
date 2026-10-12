# Slice Summary - Correção de Race Condition, Deduplicação Offline e Rollback de Workout Logs

- **Status:** COMPLETED
- **Perfil / Stack:** full-stack (React 19 + TypeScript + Vite + Supabase / PostgreSQL)
- **Arquivos Criados/Modificados:**
  - `pages/student/WorkoutExecution.tsx`: Adicionada trava de submissão concorrente/duplo clique (`isSubmitting` state + ref `isSubmittingRef`), desativação de controles e botões no `FinishWorkoutModal`, seleção de esforço desvinculada do submit imediato, e rollback cirúrgico de `workout_logs` órfão no `catch` antes do fallback para a fila offline.
  - `utils/offlineSyncService.ts`: Implementada deduplicação e idempotência no `flushOfflineQueue` (reaproveitando `workout_log` prévio com mesmo `student_id`, `workout_id` e `started_at`), rollback automático caso inserção de séries falhe, e limite máximo de retentativas `MAX_SYNC_RETRIES = 3` para prevenir loops infinitos na fila.
  - `utils/staleWorkoutService.ts`: Adicionado rollback com exclusão do `workout_log` recém-criado em caso de erro na persistência de séries durante auto-finalização de treino.
  - `scripts/test_offline_suite.ts`: Atualizado para validar a constante canônica `MAX_SYNC_RETRIES = 3`.

### Entregas End-to-End da Fatia:
1. **Dados & Modelos:**
   - Limpeza direta no banco de dados Supabase via session pooler: 8 duplicatas órfãs (`0ae87bf9-9711-4b45-bcf9-ec05d0c98a40`, `4de3b8f1-0587-4e62-b92a-5d366f3f54b2`, `d911d1b2-c3ed-4f97-aff2-5a17da0fa84b`, `d9e30921-b0c3-4e69-8e92-da188d1860a6`, `b596f3ae-191f-4255-9774-f1af9c462011`, `5b33c98a-d23b-4bd3-b2dd-e66afced5613`, `8ba9a26b-21be-4e96-8492-5eed89c687b3`, `08d36a89-09cf-49a4-ac5b-6b7ca0bd3b0c`) do Gabriel Pontes de 08/10 foram removidas com integridade total, preservando o registro canônico `0cbd5ee0-107e-438a-b718-8a0463de8241`.
2. **Serviços & Contratos:**
   - Atomicidade garantida em `confirmFinishWorkout`, `flushOfflineQueue` e `autoFinalizeWorkout` através de rollback imediato se `workout_logs` for inserido mas a gravação de séries falhar.
   - Idempotência no sincronismo offline que reutiliza o ID de cabeçalho existente em vez de reinserir duplicatas a cada ciclo de heartbeat/reconexão.
   - Proteção de retry queue (`MAX_SYNC_RETRIES = 3`).
3. **Interface & Componentes:**
   - Prevenção de duplo disparo na interface do aluno (`WorkoutExecution.tsx` / `FinishWorkoutModal`): botões de nota de esforço alteram o valor selecionado sem disparar submit prematuro; o envio ocorre pelo botão de confirmação com loading spinner e bloqueio de cliques concorrentes.
4. **Testes & Validação:**
   - Suíte `vitest`: 37/37 testes unitários passando.
   - Suíte offline `scripts/test_offline_suite.ts`: 24/24 testes passando.
   - Build de produção (`vite build`): concluído sem erros.
