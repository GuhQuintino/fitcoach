# Inteligência de Referência e Arquitetura Técnica

- **Projeto / Domínio:** Fitcoach (Plataforma de Prescrição e Acompanhamento de Treinos Coach ↔ Aluno)
- **Perfil Detectado:** `full-stack` (Vite + React 19 + TypeScript + Tailwind CSS + Supabase)
- **Feature Alvo:** Histórico Completo do Exercício + Fila de Feedbacks do Coach
- **Data da Pesquisa:** 2026-10-10

---

## 1. Schema Real do Banco de Dados

Com base na inspeção dos schemas DDL (`Brainstorm/Databases-Implementados/Full database.sql`), migrations (`supabase/migrations/20260630011641_milestone1_schema.sql`) e tipos (`types/supabase.ts`):

### 1.1 Tabela `public.workout_logs`
- **Colunas:**
  - `id`: `UUID` (Primary Key, default `uuid_generate_v4()`)
  - `student_id`: `UUID` (NOT NULL, FK `profiles.id` ON DELETE CASCADE)
  - `workout_id`: `UUID` (NULLable, FK `workouts.id` ON DELETE SET NULL)
  - `started_at`: `TIMESTAMPTZ` (NOT NULL)
  - `finished_at`: `TIMESTAMPTZ` (NULLable)
  - `effort_rating`: `INTEGER` (NULLable, escala 1 a 10)
  - `feedback_notes`: `TEXT` (NULLable, observação geral da sessão pelo aluno)
  - `read_by_coach`: `BOOLEAN` (DEFAULT `false`, flag de leitura consumida por `Feedbacks.tsx:54` e `Dashboard.tsx:129`)
  - `created_at`: `TIMESTAMPTZ` (DEFAULT `now()`)

### 1.2 Tabela `public.set_logs`
- **Colunas:**
  - `id`: `UUID` (Primary Key, default `uuid_generate_v4()`)
  - `workout_log_id`: `UUID` (NOT NULL, FK `workout_logs.id` ON DELETE CASCADE)
  - `exercise_id`: `UUID` (NOT NULL, FK `exercises.id` ON DELETE RESTRICT)
  - `set_type`: `ENUM` / `TEXT` (default `'working'`, valores: `'warmup'`, `'working'`, `'failure'`, `'drop'`, `'preparation'`)
  - `weight_kg`: `NUMERIC` (NULLable, carga utilizada)
  - `reps_completed`: `INTEGER` (NULLable, repetições realizadas)
  - `rpe_actual`: `INTEGER` / `NUMERIC` (NULLable, percepção de esforço na série)
  - `completed_at`: `TIMESTAMPTZ` (DEFAULT `now()`) — **Nota:** a tabela NÃO possui `created_at`; o registro de conclusão é `completed_at`.
  - `time_completed`: `INTEGER` (NULLable, segundos para exercícios isométricos/cardio)
  - `distance_completed`: `NUMERIC` (NULLable, km)
  - `speed_actual`: `NUMERIC` (NULLable, km/h)
  - `hiit_cycles_completed`: `INTEGER` (NULLable, rounds concluídos)
- **Nota sobre ordem:** A tabela NÃO possui coluna `set_number` no DDL. No frontend, a ordenação de séries é feita pela sequência cronológica de inserção ou índice de iteração (`idx + 1`).

### 1.3 Tabela `public.exercise_feedback_logs`
- **Colunas:**
  - `id`: `UUID` (Primary Key, default `gen_random_uuid()`)
  - `workout_log_id`: `UUID` (NOT NULL, FK `workout_logs.id` ON DELETE CASCADE)
  - `exercise_id`: `UUID` (NOT NULL, FK `exercises.id` ON DELETE RESTRICT)
  - `feedback_text`: `TEXT` (NOT NULL, comentário técnico sobre o exercício específico)
  - `sentiment`: `TEXT` (NULLable)
  - `created_at`: `TIMESTAMPTZ` (DEFAULT `now()`)
  - `CONSTRAINT unique_exercise_feedback_per_workout`: `UNIQUE (workout_log_id, exercise_id)`
- **Atenção:** A tabela **NÃO possui** coluna `student_id`. A relação com o aluno é estritamente via `workout_log_id -> workout_logs.student_id`.

---

## 2. Row Level Security (RLS) e SQL Proposto

### 2.1 Análise das Policies Existentes
1. **`exercise_feedback_logs`:**
   - Policy de Aluno (`supabase/migrations/20260630011641_milestone1_schema.sql` linhas 48-61):
     `CREATE POLICY "Student manage exercise feedback logs" ON public.exercise_feedback_logs FOR ALL TO authenticated USING (workout_log_id IN (SELECT id FROM public.workout_logs WHERE student_id = auth.uid()));`
     - **Veredito:** O aluno **já possui** permissão de `SELECT` (pois a policy é `FOR ALL`).
   - Policy de Coach:
     `CREATE POLICY "Coach see exercise feedback logs" ON public.exercise_feedback_logs FOR SELECT TO authenticated USING (workout_log_id IN (SELECT wl.id FROM public.workout_logs wl JOIN public.students_data sd ON wl.student_id = sd.id WHERE sd.coach_id = auth.uid()));`
     - **Veredito:** O coach já consegue ler os feedbacks de exercícios dos seus alunos.

2. **`workout_logs` (Ponto de Atenção Crítico):**
   - No schema canônico (`Brainstorm/Databases-Implementados/Full database.sql:277`):
     - Coach possui apenas `FOR SELECT`: `CREATE POLICY "Coach see logs" ON workout_logs FOR SELECT ...`
     - Aluno possui `FOR ALL`: `CREATE POLICY "Student manage logs" ON workout_logs FOR ALL USING (student_id = auth.uid());`
   - **Risco:** O coach precisa atualizar `read_by_coach = true` em `workout_logs` (tanto unitariamente ao clicar ou ao abrir treino, quanto em lote via "Marcar todos como lidos"). Sem uma policy explícita de `UPDATE` para coaches em `workout_logs`, o PostgREST rejeita a atualização ou falha silenciosamente (0 rows atualizadas).

### 2.2 Migração Proposta (Se Necessário no Ambiente Remoto)
Arquivo sugerido: `supabase/migrations/20261010000000_feedbacks_coach_update_rls.sql`
```sql
-- 1. Garantir índice para performance do filtro de não lidos e leitura de logs
CREATE INDEX IF NOT EXISTS idx_workout_logs_coach_unread 
ON public.workout_logs(student_id, read_by_coach) 
WHERE read_by_coach = false;

-- 2. Permitir que o coach atualize read_by_coach dos treinos dos seus alunos vinculados
DROP POLICY IF EXISTS "Coach update read_by_coach" ON public.workout_logs;
CREATE POLICY "Coach update read_by_coach"
ON public.workout_logs
FOR UPDATE
TO authenticated
USING (
  student_id IN (
    SELECT id FROM public.students_data WHERE coach_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT id FROM public.students_data WHERE coach_id = auth.uid()
  )
);
```

---

## 3. Sintaxe Validada do supabase-js v2 (com Fonte Context7)

Versão do projeto: `@supabase/supabase-js: ^2.89.0`.

### 3.1 Embed Aninhado com `!inner` vs. Embed Opcional
Fonte: Context7 `/supabase/supabase-js` (`test/relationships-join-operations.test.ts` e `test/resource-embedding.test.ts`).

- **Regra de ouro:**
  - `set_logs!inner(...)`: A anotação `!inner` força um `INNER JOIN` no PostgREST. Ao aplicar `.eq('set_logs.exercise_id', exerciseId)`, a query descarta qualquer `workout_logs` que não contenha séries para aquele exercício.
  - `exercise_feedback_logs(...)`: NÃO utilizar `!inner`. Como demonstrado em `resource-embedding.test.ts`, aplicar filtro por coluna embutida sem `!inner` (`.eq('exercise_feedback_logs.exercise_id', exerciseId)`) filtra apenas as linhas do recurso embutido, retornando `[]` quando não houver correspondência, **sem descartar o registro pai (`workout_logs`)**.

```typescript
const { data, error } = await supabase
  .from('workout_logs')
  .select(`
    id,
    finished_at,
    workout:workouts(name),
    set_logs!inner(
      id,
      exercise_id,
      weight_kg,
      reps_completed,
      rpe_actual,
      set_type,
      time_completed,
      distance_completed,
      speed_actual,
      hiit_cycles_completed,
      exercise:exercises(exercise_type)
    ),
    exercise_feedback_logs(
      exercise_id,
      feedback_text
    )
  `)
  .eq('student_id', studentId)
  .eq('set_logs.exercise_id', exerciseId)
  .eq('exercise_feedback_logs.exercise_id', exerciseId)
  .order('finished_at', { ascending: false })
  .range(from, from + 999);
```

### 3.2 Paginação Range e Limite max-rows do PostgREST
Fonte: Context7 `/supabase/supabase-js` (`PostgrestTransformBuilder.ts`).
- `.range(from, to)` é **inclusivo em ambos os lados**: gera `limit = to - from + 1` e `offset = from`.
- PostgREST possui um limite de segurança no servidor (`max-rows = 1000` por padrão). Qualquer `.limit()` superior ou query sem limite é truncada em 1000.
- Para obter o histórico completo sem cortes artificiais, o cliente deve paginar em lotes com loop:
  ```typescript
  let allLogs: any[] = [];
  let from = 0;
  const BATCH_SIZE = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + BATCH_SIZE - 1);
    if (error) throw error;
    if (data && data.length > 0) {
      allLogs = [...allLogs, ...data];
      from += data.length;
      hasMore = data.length === BATCH_SIZE;
    } else {
      hasMore = false;
    }
  }
  ```

### 3.3 Contador de Não Lidos (`count: 'exact', head: true`)
Fonte: Context7 `/supabase/supabase-js` (`PostgrestQueryBuilder.ts`).
- `head: true` instrui o PostgREST a executar uma requisição HTTP `HEAD`.
- `count: 'exact'` envia o header `Prefer: count=exact`.
- Resposta: `{ count: number, data: null, error: null }`. Consumo de banda de dados: 0 bytes.
```typescript
const { count, error } = await supabase
  .from('workout_logs')
  .select('id', { count: 'exact', head: true })
  .in('student_id', studentIds)
  .eq('read_by_coach', false);
```

---

## 4. Setup de Testes Automatizados

### 4.1 Estado Atual
- `package.json`: Apenas `"dev"`, `"build"` e `"preview"`. Nenhuma dependência de `vitest` ou `jest`.
- `vite.config.ts`: Sem bloco `test`.
- `testsprite_tests/`: Testes E2E rodando scripts com Puppeteer (direcionados a testes de sistema/fluxo completo), sem runner unitário leve para funções utilitárias TypeScript.

### 4.2 Setup Mínimo Recomendado (Vitest)
Compatível com Vite `^6.2.0` e React `^19.2.3`:
```powershell
npm install -D vitest
```
- Em `package.json` adicionar:
  ```json
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
  ```
- Criação de suíte de testes unitários para a Fatia 3:
  - `utils/sessionComparison.test.ts`: Testa cálculo de delta de volume, identificação da melhor série, exercícios do tipo tempo/cardio e cenário de primeira sessão ("1ª vez").
  - `utils/workoutHistoryGrouper.test.ts`: Testa o agrupamento por `workout_logs.id` (evitando a mistura de sessões do mesmo dia).

---

## 5. Mapeamento do Deep-Link do Editor

- **URL:** `/coach/editor?workout_id={workout_id}&student_id={student_id}`
- **Leitura em `pages/coach/Editor.tsx`:**
  - Linhas 40-41:
    ```typescript
    const workoutId = searchParams.get('workout_id');
    const studentId = searchParams.get('student_id');
    ```
- **Habilitação do Histórico no `ExerciseCard.tsx`:**
  - Linha 621 de `Editor.tsx`: `studentId={studentId}` é propagado para o componente `ExerciseCard`.
  - Linhas 281-286 de `ExerciseCard.tsx`: Se `studentId` for fornecido, renderiza o botão com ícone de histórico.
  - Linhas 853-861 de `ExerciseCard.tsx`: Renderiza condicionalmente o `<ExerciseHistoryModal isOpen={showHistoryModal} studentId={studentId} exerciseId={...} />`.
- **Cenário de Workout Deletado:**
  - Em `Editor.tsx:116-123`, a query `supabase.from('workouts').select('*, routines(name)').eq('id', workoutId).single()` lança erro `PGRST116` (0 rows). O `catch` apenas registra o erro, deixando `workout === null` e `items === []`.
  - **Mitigação no Feedbacks.tsx:** Quando `log.workout_id` for nulo ou `log.workout` não existir, o botão "Abrir treino" no card de feedback deve ser renderizado como desabilitado (`disabled`) com o texto "Treino removido", evitando levar o coach para um editor sem dados.

---

## 6. Padrões de UI Reutilizáveis (Design System Fitcoach)

### 6.1 Segmented Control / Tabs
Referência canônica existente no app: [pages/admin/Dashboard.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/admin/Dashboard.tsx#L297-L313).
- **Container:** `flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700`
- **Aba Ativa:** `bg-sky-500 text-white shadow-lg shadow-sky-500/25`
- **Aba Inativa:** `text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700`

### 6.2 Botões de Ação
- **Botão Primário Compacto:** [pages/coach/Feedbacks.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Feedbacks.tsx#L205)
  `min-h-[44px] px-4 py-2.5 bg-primary/10 text-primary rounded-xl text-xs font-black hover:bg-primary hover:text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95`
- **Botão "Abrir Treino" (Destaque Principal):** [pages/coach/StudentProfileView.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/StudentProfileView.tsx#L570)
  `w-full bg-white dark:bg-slate-800 text-primary border border-primary/20 hover:border-primary/40 font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm text-sm`
- **Botão de Confirmação Inline:**
  Para a ação "Marcar todos como lidos", substitui-se `window.confirm` por um toggle inline:
  `flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in text-xs` com botão de confirmação (`bg-primary text-white font-bold px-3 py-1.5 rounded-lg`) e cancelamento.

### 6.3 Ícones e Tokens de Cor
- **Ícones (`material-symbols-rounded`):**
  - `check_circle`: lido
  - `done_all`: marcar todos como lidos
  - `open_in_new` / `edit_note`: abrir treino no editor
  - `comment`: feedback escrito por exercício
  - `expand_more`: expandir/recolher detalhes
  - `history_toggle_off`: estado vazio de histórico
- **Cores (`tailwind.config.js`):**
  - `primary`: `#0EA5E9` (Sky 500)
  - `sky`: `text-sky-600 dark:text-sky-400`, `bg-sky-50 dark:bg-sky-900/20`
  - `amber`: `bg-amber-50/50 dark:bg-amber-500/10 border-amber-100/50 dark:border-amber-500/20 text-amber-600 dark:text-amber-400` para destaque de feedback textual.

---

## 7. Status de Skills Especializadas

- As skills `.agents/skills/supabase/SKILL.md` e `.agents/skills/supabase-postgres-best-practices/SKILL.md` já estão presentes no projeto.
- Nenhuma tecnologia externa não documentada foi adicionada. Nenhuma skill adicional precisa ser sintetizada neste momento.

---

## 8. Principais Riscos e Diretrizes para o Builder (Stage 2)

1. **Bug do Offset vs. Cursor no Filtro "Não Lidos":**
   Ao filtrar por `read_by_coach = false`, a paginação tradicional por offset faz itens pularem quando o coach marca itens como lidos.
   *Mitigação:* Manter itens lidos na visualização atual esmaecidos até recarregar, ou utilizar paginação por cursor (`lt('created_at', lastTimestamp)`).
2. **PostgREST Max-Rows em Histórico de Exercício:**
   Não confiar em queries sem limit para trazer todos os registros. Sempre paginar em blocos de 1000 com `.range()`.
3. **Foreign Key `student_id` ausente em `exercise_feedback_logs`:**
   Nunca tentar filtrar `.eq('exercise_feedback_logs.student_id', id)`. O vínculo é exclusivamente através de `workout_log_id`.
