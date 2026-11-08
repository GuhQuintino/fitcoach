# Inteligência de Referência e Padrão de Mercado — Fitcoach

- **Projeto / Domínio:** Fitcoach Pro (Plataforma PWA Exclusiva de Prescrição e Acompanhamento de Treinos — Treinador Gustavo ↔ Alunos)
- **Perfil Detectado:** `full-stack` / PWA (Vite 6 + React 19 + TypeScript 5.8 + Tailwind CSS 4 + Supabase Postgres/Auth/Storage/Edge Functions + Service Worker)
- **Data da Pesquisa:** `2026-11-08T09:35:00-03:00`

---

## Slice Atual: Filtro de Feedbacks por Aluno no Coach Portal (`/coach/feedbacks`)

### 1. Contexto de Negócio e Proposta de Valor
Na versão anterior, ao acessar a tela `/coach/feedbacks`, o treinador precisava percorrer toda a fila agregada de feedbacks da carteira para inspecionar as sessões de determinado aluno.
Com esta nova funcionalidade:
- O coach pode selecionar rapidamente um aluno específico em um seletor suspenso inteligente com busca instantânea (`combobox`).
- O filtro é ortogonal e persiste/funciona tanto na aba **"Não lidos"** (auditando pendências imediatas daquele aluno) quanto na aba **"Todos"** (revisando o histórico evolutivo de treinos do aluno).
- A seleção de "Todos os alunos" restaura a visão macro da carteira completa.
- O contador de treinos não lidos (`unreadCount`) e a ação em lote "Marcar todos como lidos" adaptam-se cirurgicamente ao aluno selecionado.

---

### 2. Padrões de Arquitetura de Dados & Queries no Supabase

#### 2.1. Recuperação dos Alunos do Treinador (`students_data` + `profiles`)
Para popular o seletor com todos os alunos do coach de forma limpa, sem N+1 e com dados atualizados de foto e nome:
```ts
const { data, error } = await supabase
    .from('students_data')
    .select(`
        id,
        profiles!students_data_id_fkey!inner (
            id,
            full_name,
            avatar_url
        )
    `)
    .eq('coach_id', user.id);
```
- **Normalização e Ordenação:**
  Mapear para a interface de opção:
  ```ts
  interface StudentFilterOption {
      id: string; // 'all' ou UUID do aluno
      full_name: string;
      avatar_url: string | null;
  }
  ```
  Ordenando alfabeticamente pelo primeiro nome / nome completo usando `full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' })`.

#### 2.2. Query Dinâmica de `workout_logs` com Suporte a Filtro por Aluno
A função `fetchFeedbacks` constrói a query respeitando o escopo do filtro:
```ts
let query = supabase
    .from('workout_logs')
    .select(`
        id,
        student_id,
        workout_id,
        started_at,
        finished_at,
        effort_rating,
        feedback_notes,
        read_by_coach,
        created_at,
        profiles!student_id (
            id,
            full_name,
            avatar_url
        ),
        workout:workouts (id, name),
        set_logs (
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
            completed_at,
            exercise:exercises (id, name, exercise_type)
        ),
        exercise_feedback_logs (
            id,
            exercise_id,
            feedback_text,
            sentiment,
            created_at
        )
    `);

// Filtro por Aluno Específico vs. Carteira Completa
if (selectedStudentId && selectedStudentId !== 'all') {
    query = query.eq('student_id', selectedStudentId);
} else {
    query = query.in('student_id', studentIds);
}

// Filtro de Leitura (Aba 'unread' vs 'all')
if (filter === 'unread') {
    query = query.eq('read_by_coach', false);
}

// Paginação por Cursor Temporal (created_at)
if (!isInitial && lastCreatedAtRef.current) {
    query = query.lt('created_at', lastCreatedAtRef.current);
}

query = query.order('created_at', { ascending: false }).limit(PAGE_SIZE);
```

#### 2.3. Contagem Contextual de Não Lidos (`fetchUnreadCount`)
O contador de pendências no badge e na aba reflete o escopo filtrado:
```ts
const fetchUnreadCount = useCallback(async (targetStudentId: string | null, allStudentIds: string[]) => {
    try {
        let query = supabase
            .from('workout_logs')
            .select('id', { count: 'exact', head: true })
            .eq('read_by_coach', false);

        if (targetStudentId && targetStudentId !== 'all') {
            query = query.eq('student_id', targetStudentId);
        } else if (allStudentIds.length > 0) {
            query = query.in('student_id', allStudentIds);
        } else {
            setUnreadCount(0);
            return;
        }

        const { count, error } = await query;
        if (!error && count !== null) {
            setUnreadCount(count);
        }
    } catch (err) {
        // Silencioso
    }
}, []);
```

#### 2.4. Ação "Marcar Todos Como Lidos" no Escopo do Aluno
Se o treinador estiver com um aluno selecionado, a confirmação exibe:
`"Marcar {unreadCount} treinos de {nome} como lidos?"`
E a execução atualiza unicamente os treinos daquele aluno:
```ts
let updateQuery = supabase
    .from('workout_logs')
    .update({ read_by_coach: true })
    .eq('read_by_coach', false);

if (selectedStudentId && selectedStudentId !== 'all') {
    updateQuery = updateQuery.eq('student_id', selectedStudentId);
} else {
    updateQuery = updateQuery.in('student_id', studentIds);
}
```

---

### 3. Padrão de UX & WAI-ARIA do Combobox Acessível (`StudentFilterCombobox`)

#### 3.1. Anatomia do Componente
1. **Trigger Button:**
   - Touch Target: $\ge 44 \times 44\text{px}$ (`min-h-[44px]`).
   - Apresentação: Avatar do aluno selecionado + Nome (ou ícone `groups` para "Todos os alunos").
   - Ação de Limpeza Rápida: Botão "X" embutido quando um aluno está selecionado, permitindo restaurar "Todos os alunos" em 1 clique sem precisar abrir o menu.
   - Chevron dinâmico (`unfold_more` ou `expand_more`) com transição de rotação no estado aberto.
   - Atributos WAI-ARIA:
     * `role="combobox"`
     * `aria-expanded={isOpen}`
     * `aria-haspopup="listbox"`
     * `aria-controls="student-combobox-listbox"`
     * `aria-label="Filtrar feedbacks por aluno"`
2. **Painel Suspenso (Dropdown):**
   - Posicionamento absoluto (`absolute top-full mt-2 left-0 sm:right-0 sm:left-auto z-50 w-72 sm:w-80`).
   - Superfície visual: `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden`.
3. **Campo de Busca Integrado:**
   - Input de texto no topo com ícone de lupa (`search`), placeholder `"Buscar aluno por nome..."` e foco automático ao abrir.
   - Busca em tempo real utilizando `matchesSearch` (`utils/textUtils.ts`), eliminando acentos (`NFD`) e sem sensibilidade a maiúsculas/minúsculas.
4. **Lista de Opções (`role="listbox"`):**
   - Item 1: **"Todos os alunos"** (com ícone `groups` e contagem total de alunos).
   - Itens 2..N: Alunos filtrados, com avatar, nome completo e indicador de seleção ativa (`check`).
   - Cada item possui `role="option"`, `aria-selected={isSelected}` e altura mínima $\ge 44\text{px}$.
   - Mensagem de estado vazio caso a busca não localize correspondências: *"Nenhum aluno encontrado"*.
5. **Acessibilidade de Teclado e Dismiss:**
   - `Escape`: fecha o dropdown imediatamente e devolve o foco para o botão trigger.
   - Clique fora: listener no evento `pointerdown`/`mousedown` fechando o seletor com segurança.
   - `ArrowDown` / `ArrowUp` / `Enter`: suporte para percorrer itens e confirmar seleção.

---

### 4. Pitfalls Técnicos Mapeados & Prevenção

- ⚠️ **Pitfall 1 — Cursor de Paginação Desalinhado (Stale Pagination Cursor):**
  Se o treinador paginar múltiplos registros na visão agregada e em seguida selecionar um aluno, a query de paginação herdaria `lastCreatedAtRef.current` antigo, omitindo os treinos mais recentes do aluno selecionado.
  *Mitigação:* Resetar obrigatoriamente `lastCreatedAtRef.current = null` e chamar `fetchFeedbacks(true)` sempre que `selectedStudentId` for alterado.
- ⚠️ **Pitfall 2 — Inconsistência do Botão "Marcar todos como lidos":**
  Marcar todos os treinos da carteira inteira enquanto o coach visualiza apenas um aluno específico geraria efeito colateral indesejado em alunos não inspecionados.
  *Mitigação:* Limitar o escopo do update em lote exatamente ao `selectedStudentId` quando o filtro estiver ativo.
- ⚠️ **Pitfall 3 — Quebra de Layout e Touch Targets no Mobile:**
  Agrupar o segmented control ("Não lidos" / "Todos") e o combobox de alunos sem flexibilidade pode quebrar em telas de $375\text{px}$.
  *Mitigação:* Estrutura flexível responsiva (`flex flex-col sm:flex-row items-stretch sm:items-center gap-3`), garantindo botões com `min-h-[44px]` e touch target seguro.
- ⚠️ **Pitfall 4 — N+1 Queries na Busca de Alunos:**
  Carregar detalhes do perfil aluno por aluno resultaria em dezenas de requisições HTTP simultâneas.
  *Mitigação:* Carregamento único em lote com join explícito `profiles!students_data_id_fkey!inner(...)` no início da sessão do componente e cache local em estado.

---

### 5. Blindagem por Teste de Regressão Obrigatório
Criar a suíte dedicada `tests/unit/coachFeedbackFilters.regression.test.ts` cobrindo:
1. Normalização de lista de alunos e ordenação alfabética com acentuação em português.
2. Filtragem de busca instantânea (`matchesSearch`) com caracteres acentuados, maiúsculas, minúsculas e espaços extras.
3. Resolução da query e parâmetros de filtro (`eq('student_id', id)` vs `in('student_id', ids)`).
4. Reset do cursor temporal de paginação (`lastCreatedAtRef = null`) na troca de aluno ou aba.
5. Comportamento do contador `unreadCount` e escopo de marcação em lote isolado por aluno.

---

## 1. Stack e Compatibilidade de Versões
- **Frontend & Bundler:** React `^19.2.3`, React Router DOM `^7.11.0`, Vite `^6.2.0`, TypeScript `~5.8.2`, Tailwind CSS `^4.1.18`.
- **Backend & BaaS:** `@supabase/supabase-js` `^2.89.0` (Auth, Postgres, Realtime, Storage buckets `avatars`, `evolution-photos`, `exercises`, Edge Functions em Deno).
- **Testes Automatizados:** Vitest `^5.0.3` (suítes unitárias em `tests/unit/` e `utils/`, suítes de regressão obrigatórias em `tests/regression/`).

---

## 2. Skills Especializadas Disponíveis no Ambiente
- **`supabase` & `supabase-postgres-best-practices`:** `.agents/skills/supabase/SKILL.md`
- **`web-push-pwa`:** `.agents/skills/web-push-pwa/SKILL.md`
- **`impeccable`:** `.agents/skills/impeccable/SKILL.md`
- **`trainer-crm-patterns`:** `C:\Users\Gustavo\.gemini\config\skills\trainer-crm-patterns\SKILL.md`

---

## 3. Referências Visuais e Tokens DTCG (Hard Gate Stage 1)
- **Capturas Visuais de Referência Salvas:**
  - `docs/gauntlet/assets/references/01-student-dashboard-ref.png`
  - `docs/gauntlet/assets/references/02-student-history-ref.png`
  - `docs/gauntlet/assets/references/03-student-profile-ref.png`
  - `docs/gauntlet/assets/references/04-coach-workout-editor-ref.png`
- **Tokens DTCG Mapeados:** `docs/gauntlet/TOKENS.json` (e espelho em `TOKENS.json` na raiz).
