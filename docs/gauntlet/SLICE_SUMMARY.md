# Slice Summary - Filtro de Feedbacks por Aluno no Coach Portal (`/coach/feedbacks`)

- **Status:** COMPLETED
- **Perfil / Stack:** `full-stack` / PWA (React 19 + TypeScript 5.8 + Vite 6 + Tailwind CSS 4 + Supabase Postgres/Auth + Vitest 5)
- **Arquivos Criados/Modificados:**
  - `utils/coachFeedbackFilters.ts`: Criação de módulo de lógica pura com `normalizeStudentsList`, `filterStudentsBySearch`, `buildWorkoutLogsFilterScope`, `formatMarkAllAsReadPrompt`, `formatMarkAllSuccessToast` e `getStudentFilterOption`.
  - `components/coach/StudentFilterCombobox.tsx`: Implementação de componente seletor suspenso inteligente e acessível (WAI-ARIA `role="combobox"`, `role="listbox"`, `role="option"`, `aria-expanded`, `aria-haspopup`, `aria-controls`, `aria-selected`), touch target $\ge 44 \times 44\text{px}$, botão de limpeza rápida em 1 clique ("X"), campo de busca em tempo real com `autoFocus`, ordenação alfabética e fechamento com `Escape` ou clique externo.
  - `pages/coach/Feedbacks.tsx`: Integração completa do filtro por aluno com persistência ortogonal nas abas "Não lidos" e "Todos", reset obrigatório do cursor de paginação (`lastCreatedAtRef.current = null`), query dinâmica de `workout_logs` com `.eq('student_id', selectedStudentId)` vs `.in('student_id', studentIds)` (Anti-N+1), contagem contextual de não lidos (`unreadCount`) e confirmação/execução de "Marcar todos como lidos" isolada no escopo do aluno selecionado.
  - `tests/unit/coachFeedbackFilters.regression.test.ts`: Criação de suíte de testes de regressão automatizada cobrindo 21 cenários de normalização, acentuação em pt-BR, busca tolerante, escopos de query, formatação de prompts/toasts e marcação WAI-ARIA do componente.

### Entregas End-to-End da Fatia:
1. **Dados & Modelos:** 
   - Consulta otimizada em lote aos alunos do treinador via join `students_data` com `profiles!students_data_id_fkey!inner(id, full_name, avatar_url)` (Zero N+1).
   - Query dinâmica em `workout_logs` que alterna entre `.eq('student_id', selectedStudentId)` e `.in('student_id', studentIds)`.
2. **Serviços & Contratos:** 
   - Módulo puro `utils/coachFeedbackFilters.ts` isolando toda a lógica de negócio, transformações e formatações para facilidade de manutenção e testes unitários.
3. **Interface & Componentes:** 
   - Componente `StudentFilterCombobox` aderente à Superfície Operate do Impeccable, com contraste WCAG AA/AAA, temas Claro e Escuro, feedback visual de filtro ativo e empty states contextualizados ("Nenhum feedback pendente para {Aluno}" com botão de restauração "Ver todos os alunos").
4. **Testes & Validação:** 
   - `npx vitest run tests/unit/coachFeedbackFilters.regression.test.ts`: 21/21 testes aprovados.
   - `npm test`: 28 arquivos de teste, 283/283 testes aprovados (100% de sucesso).
   - `npx tsc --noEmit`: 0 erros de compilação TypeScript.
   - `npm run build`: Build de produção Vite concluído com sucesso em 9.01s (código limpo, zero truncamento).

### Desvios / Decisões Técnicas (Deviation Rules):
- **Regra 1 (Bug Fix Autônomo) & Anti-Regression Mandate:** Implementada suíte dedicada de testes de regressão cobrindo o ciclo de vida completo do filtro e prevenindo os 4 pitfalls mapeados (cursor temporal residual, mutação em lote fora de escopo, quebra de layout mobile e queries N+1).

### Handover para Stage 3 / Stage 4:
- Rota para auditoria:
  - `/#/coach/feedbacks`: Verificar o combobox de seleção de aluno, busca em tempo real, alternância entre abas "Não lidos" e "Todos", reset de paginação e ação de marcar como lidos isolada por aluno.
