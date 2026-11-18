# Laudo de Avaliação Técnica - Correção de Fuso Horário (`America/Sao_Paulo`) e Horários por Exercício

- **Versão:** V3 (Re-auditoria Pós-Correção Cirúrgica)
- **Perfil do Projeto:** `frontend-framework`
- **Stack:** React + Vite + TypeScript + Vitest + Supabase
- **Subagente Executor:** gauntlet-builder
- **Data/Hora:** 2026-11-18T12:20:47Z

---

### Sinais Determinísticos Medidos:
- **Type-Check (`npx tsc --noEmit`):** `SUCCESS` (exit code 0, 0 erros)
- **Suíte Completa (`npm test`):** `30` arquivos de teste passando / `301` testes passando (`0` falhas, duração `2.88s`, Vitest `5.0.3`)
- **Regressão Sob UTC (`$env:TZ='UTC'; npx vitest run utils/dateTime.regression.test.ts utils/workoutHistoryGrouper.test.ts`):** `2` arquivos passando / `20` testes passando (`utils/workoutHistoryGrouper.test.ts`: `8/8`; `utils/dateTime.regression.test.ts`: `12/12`; `Start at 12:18:36` em UTC, duração `417ms`)
- **Build de Produção (`npm run build`):** `SUCCESS` (`vite v6.4.1`, `799` módulos transformados, concluído em `8.43s`)
- **Scan de Regressão Residual (`Select-String`):**
  - `toLocaleDateString|toLocaleTimeString|toLocaleString|// \.\.\.` em `pages`, `components`, `utils`: apenas chamadas internas em `utils/dateTime.ts` (linhas 136, 152, 170, 201, 217, 233) e formatação numérica em `Feedbacks.tsx:771`, `StudentProfileView.tsx:699` e `History.tsx:311`; `0` ocorrências de `// ...`.
  - `.split('T')` em `pages`, `components`, `utils`, `contexts`: apenas comentário em `utils/dateTime.ts:91` e data de nascimento pura (`YYYY-MM-DD`) em `utils/metabolicCalculator.ts:142`.

---

### Verificação Goal-Backward (Exists / Substantive / Wired):
- **Level 1 (Exists):** Todos os arquivos da fatia e dos testes existem fisicamente no repositório (`utils/dateTime.ts`, `utils/dateTime.regression.test.ts`, `utils/workoutHistoryGrouper.ts`, `utils/workoutHistoryGrouper.test.ts`, `utils/staleWorkoutService.ts`, `utils/offlineSyncService.ts`, `pages/student/WorkoutExecution.tsx`, `pages/student/History.tsx`, `pages/SubscriptionExpired.tsx`, `pages/coach/StudentProfileView.tsx`, `components/shared/ExerciseHistoryModal.tsx`).
- **Level 2 (Substantive):**
  - **`pages/student/History.tsx` (Bloqueante da V2 100% eliminado):**
    - `daysInMonth` e `firstDayOfMonth` (linhas 102–103) ancorados em meio-dia UTC (`Date.UTC(year, month + 1, 0, 12, 0, 0).getUTCDate()` e `Date.UTC(year, month, 1, 12, 0, 0).getUTCDay()`).
    - `currentYear` e `currentMonth` (linhas 105–107) derivados via `getDatePartsSP(selectedDate)`.
    - Botões de navegação de mês anterior/próximo (linhas 382 e 390) ancorados em `new Date(Date.UTC(currentYear, currentMonth ± 1, 1, 12, 0, 0))`, eliminando o recuo de mês em dispositivos com `TZ >= UTC+0` e mantendo alinhamento entre `formatMonthYearSP(selectedDate)` (linha 375) e o grid do calendário.
    - `handleCalendarDayClick` (linhas 120–136) usa `const dateStr = formatLocalDateKey(targetLog.started_at)` (`toLocalDateKeySP`), alinhado 1:1 com `id={isFirstOfDate ? 'history-log-' + dateKey : 'workout-log-card-' + log.id}` (linha 469) e `findLogForDay` via `getDatePartsSP` (linhas 111–116).
    - `getVolumeByMuscleForSelectedPeriod` (linhas 215–229) filtra `monthLogs` com `getDatePartsSP(log.started_at)` e calcula `activeWeeks` com `parseDateSafe(toLocalDateKeySP(log.started_at))`, `Date.UTC(..., 0, 1, 12, 0, 0)` e getters UTC (`getUTCFullYear()`, `getUTCDay()`).
    - `isToday` (linhas 412–413) usa `getDatePartsSP(new Date())`.
  - **`pages/SubscriptionExpired.tsx` (Observação da V2 eliminada):**
    - Linhas 62–67 chamam `formatDateBR(dateToFormat, { day: '2-digit', month: 'long', year: 'numeric' })` diretamente sem `new Date(dateToFormat)` intermediário, preservando a ancoragem ao meio-dia UTC de `parseDateSafe` em `utils/dateTime.ts` para strings `YYYY-MM-DD` e retornando `'Data Inválida'` quando `formatDateBR` devolve string vazia.
  - **`utils/dateTime.regression.test.ts` (Cobertura sob `TZ=UTC` ampliada):**
    - Adicionados 3 novos testes (linhas 133–181, totalizando 12 casos): validação de `getDatePartsSP` e `formatMonthYearSP` para datas ancoradas em `Date.UTC(year, month, 1, 12, 0, 0)` inclusive viradas `month = -1` (dez/2025) e `month = 12` (jan/2027); formatação por extenso de `YYYY-MM-DD` via `formatDateBR` sem recuo de 1 dia e retorno vazio em entrada inválida; ancoragem de `parseDateSafe(toLocalDateKeySP(...))` em `12:00:00Z` preservando ano e dia da semana UTC em `America/Sao_Paulo`.
  - **Demais arquivos da fatia (`WorkoutExecution.tsx`, `staleWorkoutService.ts`, `offlineSyncService.ts`, `workoutHistoryGrouper.ts`, `ExerciseHistoryModal.tsx`, `StudentProfileView.tsx` e demais páginas):** Preservados íntegros conforme `git diff` completo inspecionado.
  - **Observação não bloqueante (código pré-existente fora do diff de correção):** `getWeeklyVolumeData`/`getWeekKey` em `pages/student/History.tsx` (linhas 142–160) e em `pages/coach/StudentProfileView.tsx` (linhas 275–294 e 361–366) ainda utilizam getters locais do `Date` (`getDay()`, `getFullYear()`, `setHours()`), o que só altera a fronteira semanal caso um dispositivo fora de `America/Sao_Paulo` avalie treinos de domingo entre 21:00 e 23:59 BRT. Não constitui bloqueante para o escopo desta entrega.
- **Level 3 (Wired):** Todo o fluxo está conectado de ponta a ponta entre `utils/dateTime.ts`, calendário e cards de `pages/student/History.tsx`, `pages/SubscriptionExpired.tsx`, execução/sincronização de treinos (`WorkoutExecution.tsx`, `staleWorkoutService.ts`, `offlineSyncService.ts`), agrupador (`workoutHistoryGrouper.ts`) e `ExerciseHistoryModal.tsx`.

---

### Verificação Booleana da Rubrica 6D:
- **D1 Funcionalidade & Requisitos:** 3 / 3 *(fluxos centrais, navegação/clique do calendário em `History.tsx`, formatação em `SubscriptionExpired.tsx`, horários por exercício e estados de borda validados)*
- **D2 Robustez & Estabilidade:** 3 / 3 *(zero erros de runtime/tipagem, fallback seguro para logs legados e validação nula/inválida em `dateTime.ts`)*
- **D3 Qualidade de Implementação & Anti-Slop:** 3 / 3 *(helpers centralizados, zero stubs/truncamentos `// ...`, zero secrets, contratos tipados e sem regressões)*
- **D4 Consistência Arquitetural & Stack Nativa:** 2 / 3 *(padrão React/TS/Vitest seguido e helpers SP consolidados; -1 por `getWeekKey` pré-existente em `History.tsx:142–160` e `StudentProfileView.tsx:275–294, 361–366` ainda usar getters locais)*
- **D5 Performance & Eficiência:** 3 / 3 *(helpers puros com `Intl.DateTimeFormat`, zero queries N+1 adicionais, build de produção limpo em `8.43s`)*
- **D6 Testabilidade, Segurança & Conformidade:** 3 / 3 *(`30/30` suítes e `301/301` testes passando em `npm test`; `2/2` suítes e `20/20` testes passando sob `TZ=UTC`)*

**Média 6D Consolidada:** 2.83 / 3.00

---

### Veredito Formal: PASS

### Bloqueantes Identificados:
- Nenhum.

### Maior Gap Acionável Único (Se FAIL):
- N/A (aprovado com `PASS`). *Nota opcional de backlog:* migrar `getWeekKey` em `pages/student/History.tsx:142–160` e `pages/coach/StudentProfileView.tsx:275–294, 361–366` para ancoragem `America/Sao_Paulo` em janela futura.

### Critério Objetivo de Aceitação:
- Critérios da V2 atendidos integralmente: correções em `pages/student/History.tsx` e `pages/SubscriptionExpired.tsx` verificadas em código, regressão automatizada passando sob `$env:TZ='UTC'` (`20/20`), `npx tsc --noEmit` (0 erros), `npm test` (`301/301`) e `npm run build` (`SUCCESS`).
