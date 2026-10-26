# Inteligência de Referência e Padrão de Mercado — Fitcoach

- **Projeto / Domínio:** Fitcoach Pro (Plataforma PWA Exclusiva de Prescrição e Acompanhamento de Treinos — Treinador Gustavo ↔ Alunos)
- **Perfil Detectado:** `full-stack` / PWA (Vite 6 + React 19 + TypeScript 5.8 + Tailwind CSS 4 + Supabase Postgres/Auth/Storage/Edge Functions + Service Worker)
- **Data da Pesquisa:** `2026-10-25T20:05:00-03:00`

---

## 1. Stack e Compatibilidade de Versões
- **Frontend & Bundler:** React `^19.2.3`, React Router DOM `^7.11.0`, Vite `^6.2.0`, TypeScript `~5.8.2`, Tailwind CSS `^4.1.18`.
- **Backend & BaaS:** `@supabase/supabase-js` `^2.89.0` (Auth, Postgres, Realtime, Storage buckets `avatars`, `evolution-photos`, `exercises`, Edge Functions em Deno).
- **Testes Automatizados:** Vitest `^5.0.3` (suítes unitárias em `tests/unit/` e `utils/`, suítes de regressão obrigatórias em `tests/regression/`).

---

## 2. Mapeamento Arquitetural das 3 Fatias Verticais (Fase 15 — Consolidação Definitiva do App)

### Slice 1: Fundação Single-Coach, Limpeza de Código Morto, Fluxos WhatsApp (Login/Privacidade) & Correção dos Bugs Silenciosos de Notificações
1. **Extinção de `/coach/plans`, `/coach/subscription` e Código Morto:**
   - `App.tsx`: remover imports lazy de `Plans` e `SubscriptionDetails` e remover `<Route path="/coach/plans" ... />` e `<Route path="/coach/subscription" ... />`.
   - `components/BottomNav.tsx`: remover `{ path: '/coach/plans', icon: 'card_membership', label: 'Planos' }` de `coachLinks` (mantendo 4 abas simétricas: `Home`, `Treinos`, `Alunos`, `Perfil`).
   - Remover fisicamente os arquivos mortos: `pages/coach/Plans.tsx`, `pages/coach/SubscriptionDetails.tsx` e `contexts/RoleContext.tsx`.
2. **Fluxo `"Esqueceu a senha?"` em `pages/Login.tsx`:**
   - Substituir o toast estático por um modal acessível (`role="dialog"`, `aria-modal="true"`, suporte a `Escape`) onde o aluno digita seu **Nome ou Login (`@fitcoach.com`)** (pré-preenchido com o campo `email` da tela se já digitado) e clica em **"Solicitar Nova Senha no WhatsApp"**, abrindo `https://wa.me/5511992616777?text=...` com mensagem formatada para o treinador Gustavo.
3. **Configurações de Privacidade (`pages/settings/Privacy.tsx`):**
   - Remover todos os 4 switches de privacidade (`Mostrar Bio`, `Mostrar Foto de Perfil`, `Análise de Performance`, `Histórico de Treino Privado`).
   - No botão **"Solicitar Exclusão de Todos os Dados"**, abrir diretamente `https://wa.me/5511992616777?text=...` identificando o nome/e-mail do usuário autenticado (`user?.email`).
4. **Correção dos Bugs Silenciosos de Notificações:**
   - `utils/smartNotificationDispatcher.ts`:
     - Na query de `students_data`, selecionar `'weight_kg, birth_date, height_cm'` (removendo a coluna inexistente `age`).
     - Na query de `workout_logs`, selecionar `'id, started_at, finished_at'` (substituindo a coluna inexistente `completed_at` e mapeando `completed_at: l.finished_at` se necessário para compatibilidade com `WorkoutLogSample`).
   - `supabase/functions/smart-notifications/index.ts`:
     - Converter horário atual para o fuso `-03:00` (Brasília: `utcHours - 3`) e respeitar `quiet_hours_start` e `quiet_hours_end` customizados de cada aluno (com fallback `21:30` e `07:30`).
     - Aplicar o **Escudo 3 (Regra de Backoff)**: consultar os últimos registros em `notification_logs` do aluno; se houver $\ge 2$ lembretes consecutivos ignorados (`read_at IS NULL AND clicked_at IS NULL`) sem treino realizado após eles e o último lembrete ignorado tiver menos de 5 dias, pular o envio.
     - Buscar as assinaturas ativas do aluno em `public.push_subscriptions` e disparar a entrega Web Push (registrando o resultado e removendo endpoints expirados `404`/`410`).
   - `types/notifications.ts` & `pages/settings/Notifications.tsx`:
     - Adicionar `coach_feedback?: boolean` e `system_updates?: boolean` em `NotificationPreferences`.
     - Em `Notifications.tsx`, corrigir o tópico do Coach de `'evolution_photos'` para `'coach_feedback'` (`Novos Feedbacks de Alunos`), incluir `coach_feedback` e `system_updates` no `useMemo` de `notifPrefs` e garantir persistência completa no `updatePreferences`.

---

### Slice 2: Experiência do Aluno — Seleção de Treinos, Dashboard, Histórico Interativo, Cálculo Metabólico (`metabolicCalculator.ts`) & Galeria de Evolução
1. **Seleção de Treinos (`pages/student/Selection.tsx`) & Clonagem na Biblioteca (`pages/coach/Library.tsx`):**
   - Em `pages/coach/Library.tsx` (`handleAssign`), incluir `duration_minutes: w.duration_minutes ?? null` e `description: w.description ?? null` no `.insert` de `workouts` ao clonar a rotina para o aluno.
   - Em `pages/student/Selection.tsx`:
     - Remover a função morta `getDifficultyColor`.
     - Resolver a duração real de cada treino: priorizar `workout.duration_minutes`, seguido do metadado `duration` extraído do JSON de `routine.description` (ex: `"60 min"`), com fallback para `"~60 min"`.
     - Remover o badge/texto estático `"Ver detalhes"` do card do treino.
     - No botão `info` do cabeçalho, criar helper `formatRoutineInfoToast(description, name)` que faz parse seguro quando `routine.description` é JSON (`{ duration, level, frequency, description }`) e exibe texto legível (ex: `"📋 Nível: Intermediário • Frequência: 4x/sem • Duração: 60 min"`), nunca exibindo chaves JSON cruas.
2. **Dashboard do Aluno (`pages/student/Dashboard.tsx`):**
   - No card superior do cabeçalho, remover `"Plano Atual"` e `"Consultoria Pro"`.
   - Exibir em destaque o **Nível atual do aluno** (`Nível {gamification.level} • {gamification.current_xp} XP`), barra de progresso de XP e a explicação clara: *"Cada treino concluído soma 100 XP. A cada 1.000 XP (10 treinos), você sobe de nível!"*.
   - Manter o badge/indicador `"Expira em"` com data formatada (`DD/MM/AAAA`) e dias restantes.
   - Remover integralmente o card estático `"Dica do dia"` no final da página.
3. **Histórico do Aluno (`pages/student/History.tsx`):**
   - Remover a função morta `formatDuration`.
   - Corrigir a query da rotina ativa no gráfico de volume por músculo: consultar `student_assignments` com `.select('routine_id, routines(*)').eq('student_id', user!.id).eq('is_active', true).maybeSingle()` e buscar os `workouts` por `assignment.routine_id`.
   - Tornar os dias do calendário mensal interativos: quando `active === true`, renderizar um `<button type="button">` clicável que localiza o treino correspondente naquele dia (`currentYear`, `currentMonth`, `day`), expande seus detalhes (`setExpandedLog(targetLog.id)`), aplica destaque visual temporário (`highlightedLogId`) e executa `document.getElementById(\`workout-log-card-\${targetLog.id}\`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })`.
4. **Utilitário Metabólico (`utils/metabolicCalculator.ts`) + `pages/student/Profile.tsx` + `pages/coach/StudentProfileView.tsx`:**
   - Criar `utils/metabolicCalculator.ts` com funções puras e determinísticas:
     - `normalizeWeightKg(raw)`: converte strings/números tratando erros de digitação sem separador decimal (`300..2500` -> divide por `10`, ex: `750` -> `75.0`, `825` -> `82.5`; `30000..250000` -> divide por `1000`, ex: `75000` -> `75.0`) e valida faixa humana plausível `30 kg` a `250 kg`.
     - `normalizeHeightCm(raw)`: se o valor estiver entre `1.00` e `2.50` (metros, ex: `1.75` ou `"1,75"`), multiplica por `100` (`175 cm`); se estiver entre `1000` e `2500`, divide por `10`; valida faixa plausível `100 cm` a `250 cm`.
     - `calculateExactAge(birthDate, fallbackAge?)`: calcula a idade exata considerando mês e dia atuais em relação a `birth_date`, com fallback seguro.
     - `resolveActivityMultiplier(activityLevel?, routineWeeklyFrequency?)`: retorna o fator de atividade (`sedentary: 1.2`, `light: 1.375`, `moderate: 1.55`, `intense: 1.725`, `very_intense: 1.9`), inferindo automaticamente pela frequência semanal da rotina ativa quando o aluno não tiver selecionado manualmente.
     - `calculateMetabolicProfile({ weightKg, heightCm, birthDate, age, gender, activityLevel, routineWeeklyFrequency })`: calcula TMB pela equação de Mifflin-St Jeor (`male`: $+5$, `female`: $-161$, `other`: média $-78$) e Manutenção Calórica ($\text{TMB} \times \text{fator}$).
   - Integrar `metabolicCalculator.ts` em `pages/student/Profile.tsx` (incluindo validação no `handleSave` com normalização automática e seletor de **Nível de Atividade Física** salvo em `preferences.activity_level`) e em `pages/coach/StudentProfileView.tsx` (exibindo TMB e Manutenção Calórica reais do aluno para o treinador).
5. **Galeria de Fotos de Evolução (`components/student/EvolutionGallery.tsx`):**
   - Criar helper `extractStoragePathFromPublicUrl(url, bucketName)` e, em `deletePhoto`, remover o arquivo físico via `supabase.storage.from('evolution-photos').remove([filePath])` além de excluir o registro na tabela `evolution_photos`.

---

### Slice 3: Ferramentas do Coach — Templates de Séries 4 Camadas, Upload Multimídia de Exercícios, Importação O(1) sem N+1, Perfil/Changelog & Testes de Regressão
1. **Templates de Séries (`components/coach/editor/SetTemplateManager.tsx`):**
   - Atualizar `handleSave` e `handleLoad` para serializar e restaurar integralmente todos os campos das 4 camadas de séries especiais (`type`, `weight_target`, `reps_target`, `rest_seconds`, `rpe_target`, `set_method`, `drop_count`, `sub_sets`, `micro_rest_seconds`, `activation_reps`, `execution_mode`, `tempo`, `timer_mode`, `notes`) e todos os campos de cardio/HIIT (`time_target`, `distance_target`, `speed_target`, `incline_target`, `is_hiit`, `hiit_work_seconds`, `hiit_rest_seconds`, `hiit_rounds`, `hiit_cycles`, `hiit_work_speed`, `hiit_rest_speed`).
2. **Cadastro/Edição de Exercícios (`components/coach/exercises/ExerciseFormModal.tsx`):**
   - Permitir informar URL/caminho OU enviar arquivo diretamente (`<input type="file" accept="video/*,image/gif,image/webp,image/png,image/jpeg" />`) com upload para o Supabase Storage (bucket `exercises` / fallback `avatars`) e preenchimento automático de `video_url` e `image_url` conforme o tipo de mídia, exibindo preview imediato.
3. **Importação de Treinos sem N+1 (`components/coach/editor/WorkoutImportModal.tsx`):**
   - Buscar os alunos do coach (`students_data` com `profiles:id(full_name, avatar_url)`), filtrar o `searchTerm` em memória sobre `profiles.full_name` (eliminando o filtro `.ilike('profiles.full_name', ...)` que quebrava quando vazio/aninhado) e buscar todas as rotinas ativas em **uma única query batch** (`supabase.from('student_assignments').select('student_id, routine_id, routines(*)').in('student_id', studentIds).eq('is_active', true)`), reduzindo a complexidade de $O(N)$ round-trips para $O(1)$.
4. **Perfil do Coach (`pages/coach/Profile.tsx`) & Atualizações (`pages/coach/Updates.tsx`):**
   - Em `pages/coach/Profile.tsx`, exibir o e-mail do treinador (`profile.email || user?.email`) no cabeçalho e na seção de informações pessoais.
   - Em `pages/coach/Updates.tsx`, adicionar a seção **Novidades da Plataforma (Changelog)** listando as entregas reais recentes (Notificações Inteligentes & Anti-Spam, Cronômetro Blindado em 2º Plano, Séries Especiais em 4 Camadas, Sincronização de Dossiês WhatsApp, Cálculo Metabólico Inteligente e Consolidação Single-Coach).
5. **Suíte de Testes Unitários e de Regressão:**
   - `tests/unit/metabolicCalculator.test.ts`: cobrindo normalização de peso (`750` -> `75`, `825` -> `82.5`, `75000` -> `75`, limites `30..250`), normalização de altura (`1.75` -> `175`, `"1,75"` -> `175`, limites `100..250`), cálculo de idade por `birth_date`, Mifflin-St Jeor por gênero e multiplicadores de atividade física.
   - `tests/regression/appConsolidation.regression.test.ts`: cobrindo formatação legível de metadados JSON da rotina, preservação das 4 camadas e HIIT nos templates de séries, extração de path do Storage na exclusão de fotos de evolução e correção das queries sem colunas inexistentes.

---

## 3. Pitfalls Técnicos Mapeados (Armadilhas a Evitar)
- ⚠️ **Filtro `.ilike()` em tabela relacionada no PostgREST (`WorkoutImportModal.tsx`):** Filtrar `.ilike('profiles.full_name', ...)` sem `!inner` ou com relacionamento `profiles:id` causa erro ou retorna linhas com `profiles: null`. **Mitigação:** Buscar os alunos do coach (volume pequeno, < 100 registros) e filtrar por `s.profiles?.full_name` em memória, combinando com `.in('student_id', studentIds)` em `student_assignments`.
- ⚠️ **Colunas inexistentes em `routines` e `students_data`:** `routines` não possui `student_id` nem `is_active` (a relação fica em `student_assignments`), e `students_data` possui `birth_date` (não `age`) e `workout_logs` possui `finished_at` (não `completed_at`).
- ⚠️ **Extração de caminho do Supabase Storage:** As URLs públicas seguem o formato `.../storage/v1/object/public/evolution-photos/<user_id>/<timestamp>.<ext>`. O método `.remove([path])` exige apenas `<user_id>/<timestamp>.<ext>` (sem o nome do bucket no início).

---

## 4. Skills Especializadas Disponíveis no Ambiente
- **`supabase` & `supabase-postgres-best-practices`:** `.agents/skills/supabase/SKILL.md`
- **`web-push-pwa`:** `.agents/skills/web-push-pwa/SKILL.md`
- **`impeccable`:** `.agents/skills/impeccable/SKILL.md`

---

## 5. Referências Visuais e Tokens DTCG (Hard Gate Stage 1)
- **Capturas Visuais de Referência Salvas:**
  - `docs/gauntlet/assets/references/01-student-dashboard-ref.png`
  - `docs/gauntlet/assets/references/02-student-history-ref.png`
  - `docs/gauntlet/assets/references/03-student-profile-ref.png`
  - `docs/gauntlet/assets/references/04-coach-workout-editor-ref.png`
- **Tokens DTCG Mapeados:** `docs/gauntlet/TOKENS.json` (e espelho em `TOKENS.json` na raiz).
