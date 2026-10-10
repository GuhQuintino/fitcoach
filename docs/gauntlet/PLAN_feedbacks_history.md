# Plano: histórico completo do exercício + agilizar `/coach/feedbacks`

**Perfil:** `full-stack` (Vite + React + Supabase). **Superfície:** Operate (ferramenta de trabalho do coach), sem mudança de identidade visual: segue os tokens e componentes que o app já usa.

---

## Fatia 1: `ExerciseHistoryModal` com histórico completo + feedback do exercício

Arquivo: [ExerciseHistoryModal.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/components/shared/ExerciseHistoryModal.tsx)
Afeta as duas telas que usam o modal: o aluno em `WorkoutExecution` e você em `ExerciseCard` (editor).

| Hoje | Depois |
|---|---|
| `.limit(20)` na query + `.slice(0, 20)` no resultado | **Sem limite.** Busca paginada em lotes de 1000 (`range`) até esgotar, porque o PostgREST corta em `max-rows` mesmo sem `.limit` |
| Agrupa por **dia**: duas sessões no mesmo dia se misturam e a numeração das séries fica errada | Agrupa por **sessão** (`workout_log.id`), com cabeçalho mostrando data, hora e nome do treino |
| Sem feedback escrito | Mostra o **feedback específico daquele exercício** (`exercise_feedback_logs.feedback_text`) no rodapé de cada sessão, visível para aluno e coach |
| Muitos `console.log` de debug | Remover |

**Query nova (1 request por lote, sem N+1):**
```ts
supabase.from('workout_logs')
  .select(`id, finished_at, workout:workouts(name),
           set_logs!inner(id, exercise_id, weight_kg, reps_completed, rpe_actual, set_type,
                          time_completed, distance_completed, speed_actual, hiit_cycles_completed,
                          exercise:exercises(exercise_type)),
           exercise_feedback_logs(exercise_id, feedback_text)`)
  .eq('student_id', studentId)
  .eq('set_logs.exercise_id', exerciseId)
  .eq('exercise_feedback_logs.exercise_id', exerciseId)
  .order('finished_at', { ascending: false })
  .range(from, from + 999)
```

**UX para listas longas:** a lista roda dentro do scroll do modal (que já existe). Um contador "N sessões" no cabeçalho. Sem cortes artificiais.

> [!WARNING]
> A fatia vai confirmar se a RLS de `exercise_feedback_logs` deixa o **aluno** ler os próprios registros. Se não deixar, entra uma migration com policy de `SELECT` restrita a `student_id = auth.uid()`. A policy do coach já funciona, porque a tela `/coach/feedbacks` lê essa tabela.

---

## Fatia 2: `/coach/feedbacks`, a fila de trabalho

Arquivo: [Feedbacks.tsx](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Feedbacks.tsx)

### 2.1 Botão "Abrir treino" (prioridade principal)
- Botão principal do card: navega para `/coach/editor?workout_id={log.workout_id}&student_id={log.student_id}`, o mesmo deep-link que o perfil do aluno já usa.
- Antes de navegar, **marca o feedback como lido** (update otimista; se falhar, só registra o erro e navega mesmo assim).
- Se o treino tiver sido apagado (`workout_id` nulo ou `workout` nulo), o botão fica desabilitado com o rótulo "Treino removido".
- "Perfil" vira uma ação secundária.

### 2.2 Filtro "Não lidos / Todos" com contador
- Segmented control no topo. Começa em **Não lidos**.
- O contador usa `select('id', { count: 'exact', head: true }).eq('read_by_coach', false)` e é atualizado sempre que algo é marcado como lido.
- **Paginação por cursor** (`lt('created_at', ultimoCreatedAt)`) no lugar de `range(offset)`. Com offset, marcar itens como lidos no filtro "Não lidos" desloca a lista e faz itens sumirem entre as páginas.
- Quando um item é marcado como lido no filtro "Não lidos", ele continua no lugar, só que esmaecido, até o próximo refresh. Assim o card não pula enquanto você lê.

### 2.3 "Marcar todos como lidos"
- Botão no cabeçalho, visível quando o contador for maior que 0. Pede confirmação inline ("Marcar N como lidos?").
- Um único `update({ read_by_coach: true }).in('student_id', studentIds).eq('read_by_coach', false)`.

### 2.4 Comparação com a sessão anterior do mesmo treino
- Para cada página carregada, **1 query extra em lote**: os `workout_logs` anteriores dos mesmos `workout_id`, com seus `set_logs`. Para cada card, o cliente escolhe a sessão imediatamente anterior (mesmo aluno, mesmo treino, `finished_at` menor).
- **Card fechado:** um badge de resumo, por exemplo "Volume ▲ 8%" (Σ carga×reps das séries de trabalho, sem aquecimento e sem preparatórias).
- **Card aberto:** em cada exercício, a melhor série atual comparada com a anterior (`▲ +2,5kg`, `▼ -2 reps`, `= igual`). Cardio e tempo comparam distância e tempo.
- Sem sessão anterior: badge "1ª vez".
- A lógica fica em uma função pura `utils/sessionComparison.ts`, para poder testar.

### 2.5 Destaque para cards com feedback escrito
- Card com `feedback_notes` ou algum `exercise_feedback_logs` recebe acento lateral e um ícone de comentário com a contagem ("2 comentários"), para você bater o olho e priorizar.
- Os comentários por exercício também aparecem no card fechado, como prévia de uma linha, sem precisar expandir.

---

## Fatia 3: testes e fechamento
- `vitest` para `sessionComparison.ts` (volume, melhor série, tipos cardio/tempo, sem sessão anterior) e para o agrupamento por sessão do modal.
- Build e type-check limpos.
- QA no navegador: modal com mais de 20 sessões (aluno e coach), filtro e contador, marcar todos, deep-link abrindo o treino certo, light e dark mode, viewport mobile.

## Fora do escopo (posso fazer depois)
- Responder o feedback direto do card (chat coach→aluno).
- Filtro por aluno e agrupamento por aluno: não foram escolhidos agora.
