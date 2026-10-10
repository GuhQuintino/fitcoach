# Slice Summary - Gestão e Localização Rápida de Alunos & Sincronização com Dashboard

- **Status:** COMPLETED
- **Perfil / Stack:** `full-stack` (Vite + React 19 + TypeScript + Tailwind CSS + Supabase)
- **Data da Entrega:** 2026-10-10
- **Arquivos Criados/Modificados:**
  - [`utils/studentStatus.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.ts): Módulo canônico puro para classificação de status de alunos (`classifyStudent`), contadores estatísticos consolidados (`calculateDashboardStats`), formatação de engajamento do último treino (`formatLastWorkout`), urgência de vencimento de plano (`formatPlanExpiration`) e configurações visuais de badges (`getStatusBadgeConfig`).
  - [`utils/studentStatus.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.test.ts): Suíte completa com 20 testes unitários no Vitest cobrindo todos os cenários da Regra S1, carência de renovação (7 dias), cálculo de engajamento relativo e urgência de expiração.
  - [`pages/coach/Dashboard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Dashboard.tsx): Atualização para consumir `consultancy_expires_at` junto aos alunos e utilizar `calculateDashboardStats` e `classifyStudent`, eliminando discrepâncias de contagem e garantindo alinhamento 100% idêntico com a tela de alunos.
  - [`pages/coach/Students.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Students.tsx): Reformulação completa da página de alunos. Padrão inicial em "Ativos", carregamento otimizado com query batch anti-N+1 para último treino de todos os alunos (`workout_logs`), contadores globais fixos no topo, contadores dinâmicos nas abas, busca instantânea em memória, seletor de ordenação ("Último treino" / "Nome A-Z"), cards táteis enriquecidos com badges de atividade e vencimento, links de WhatsApp em todos os alunos com telefone e modal unificado para aprovação e edição de validade do plano.

---

### Entregas End-to-End da Fatia:

1. **Dados & Modelos:**
   - Consumo unificado do modelo relacional `students_data` com FK `profiles` (`profiles!students_data_id_fkey!inner`).
   - Query em lote anti-N+1 na tabela `workout_logs` trazendo o último treino de todos os alunos em O(1) requisições com mapeamento client-side em Map O(N).

2. **Serviços & Contratos:**
   - Regra S1 estritamente codificada e isolada em módulo puro:
     - `active`: cadastro ativo com plano vigente (`consultancy_expires_at >= agora`).
     - `pending`: novos cadastros aguardando aprovação (`status = 'pending'`) ou planos vencidos há no máximo 7 dias (janela de tolerância para renovação).
     - `inactive`: planos vencidos há mais de 7 dias, alunos sem plano ou contas rejeitadas/banidas.
   - Sincronização matemática exata entre Dashboard e Students via `calculateDashboardStats`.
   - RPC `approve_student` com tratamento explícito de resposta de segurança (`if (data && !data.success) throw new Error(...)`).

3. **Interface & Componentes (Superfície Operate):**
   - **Contadores Fixos Globais:** 4 cards no topo (*Total*, *Ativos*, *Pendentes*, *Inativos*) calculados sobre a base completa do coach, sem flutuação por aba ou busca.
   - **Abas Dinâmicas:** Exibição da quantidade por status em cada aba (`Ativos (X)`, `Pendentes (Y)`, etc.).
   - **Busca & Ordenação Instantâneas:** Filtro em tempo real sem latência de debounce e seletor rápido por "Último treino" e "Nome (A-Z)".
   - **Cards de Alunos Ricos e Táteis:**
     - Badges com contraste WCAG AA para status (Esmeralda/Âmbar/Rosa).
     - Badge do último treino com destaque em âmbar para alunos sem treinar há mais de 7 dias (alerta de desengajamento).
     - Badge de vencimento com aviso de urgência (faltando <= 7 dias ou em tolerância de renovação).
     - Botão de WhatsApp direto em todos os alunos com telefone cadastrado (`min-h-[44px]`).
     - Botão de editar vencimento (`edit_calendar`) com atalhos de data (+30d, +60d, +90d, +1 ano).
     - Botão de aprovação rápida (`check`) para alunos pendentes.
     - Botão de navegação ao perfil completo (`arrow_forward`).

4. **Testes & Validação:**
   - Suíte `utils/studentStatus.test.ts`: **20/20 testes aprovados** (total de 37 testes na suite global do Vitest).
   - Build de produção do Vite: **código 0 sem erros** (`npm run build` concluído em 8.14s).

---

### Desvios / Decisões Técnicas (Deviation Rules):
- **Regra 1 (Anti-N+1 Batching):** Em vez de consultar individualmente o último treino de cada aluno ou forçar uma view complexa no Supabase remoto, foi implementada uma única query batch com filtro `in('student_id', studentIds)` ordenada por `finished_at desc` e agrupada em `Map<string, string>`. Isso garante performance instantânea mesmo com dezenas de alunos.
- **Regra 2 (Modal Duplo-Uso):** O modal de aprovação foi generalizado para permitir tanto aprovar novos alunos pendentes (via RPC) quanto editar a validade de alunos já aprovados (via update em `students_data`), incluindo atalhos de dias rápidos para melhor ergonomia do treinador.

---

### Handover para Stage 3 / Stage 4:
- Rotas para validação:
  - `/coach/dashboard`: validar contadores e sincronização de alunos ativos/pendentes/inativos.
  - `/coach/students`: validar abertura padrão na aba Ativos, contadores fixos no topo, busca instantânea, ordenação por último treino, badges táteis, link WhatsApp e modal de aprovação/edição de vencimento.
