# Plano: Otimização de `/coach/students` & Sincronização com Dashboard

**Perfil:** `full-stack` (Vite + React + Supabase).  
**Superfície:** Operate (ferramenta de gestão do coach). Mantém integralmente os padrões de cores, botões e tipografia do Fitcoach.

---

## 1. Regras de Negócio e Definições de Status (Unificação)

| Estado | Critério Canônico | Onde se aplica |
|---|---|---|
| **Ativo** | `profiles.status === 'active'` **E** `consultancy_expires_at >= agora` | Dashboard & Students |
| **Pendente** | `profiles.status === 'pending'` (novo cadastro) **OU** `consultancy_expires_at` vencido nos últimos 7 dias (tolerância/renovação) | Dashboard & Students |
| **Inativo** | Sem plano há mais de 7 dias (`agora - expires_at > 7 dias`), sem plano cadastrado, ou `rejected`/`banned` | Dashboard & Students |

---

## 2. Fatia 1: Núcleo Canônico de Status & Sincronização do Dashboard

- **Novo arquivo:** [`utils/studentStatus.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.ts)
  - `classifyStudent(student: { status?: string, consultancy_expires_at?: string | null }) -> 'active' | 'pending' | 'inactive'`
  - `calculateDashboardStats(students: any[]) -> { total, active, pending, inactive, activePercentage }`
  - `formatLastWorkout(date: string | null) -> { label: string, isStale: boolean, daysAgo: number | null }` (ex: "Hoje", "Há 2 dias", "Sem treinos há 15 dias" com alerta)
- **Atualização em [`pages/coach/Dashboard.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Dashboard.tsx):**
  - O Dashboard passa a buscar os alunos vinculados trazendo `consultancy_expires_at` junto com `profiles(id, status)`.
  - Os contadores de **Ativos**, **Pendentes** e **Inativos** do Dashboard utilizam `calculateDashboardStats()`.
  - Resultado: o número de alunos ativos no Dashboard será **rigorosamente idêntico** ao número de ativos em `/coach/students`.

---

## 3. Fatia 2: Reformulação de [`pages/coach/Students.tsx`](file:///c:/Users/Gustavo/Desktop/Fitcoach/pages/coach/Students.tsx)

### 3.1 Aba Inicial & Contadores Globais
- **Aba padrão:** Inicia diretamente em **Ativos** (`selectedTab = 'active'`).
- **Contadores do topo fixos:** Os cartões *Total*, *Ativos*, *Pendentes* e *Inativos* no topo mostram a contagem geral da base do coach, sem flutuar ou zerar ao alternar de aba ou digitar na busca.
- **Badges nas abas:** Cada aba exibe seu contador (ex: *Ativos (14)*, *Pendentes (2)*, *Inativos (3)*, *Todos (19)*).

### 3.2 Busca & Ordenação Rápida
- **Busca instantânea:** Filtro reativo no cliente sobre os dados já carregados (sem debounce atrasado).
- **Ordenação:**
  - **Último treino:** Alunos que treinaram mais recentemente no topo (identifica engajados e alunos inativos rapidamente).
  - **Nome (A-Z):** Ordem alfabética clássica para achar alguém específico.

### 3.3 Enriquecimento do Card do Aluno
- **Último Treino:** Query otimizada em lote trazendo a data do último `workout_logs` de cada aluno (`finished_at`).
  - Badge visual: *"Treinou há 2 dias"*, *"Treinou hoje"*, ou destaque de alerta âmbar/vermelho se estiver *"Sem treinar há mais de 7 dias"*.
- **Vencimento do Plano:**
  - Destaque em âmbar se vencer nos próximos 7 dias (*"Vence em 3 dias"*).
  - Destaque em vermelho suave se tiver vencido nos últimos 7 dias (*"Venceu há 2 dias - Pendente de renovação"*).
- **Ações Rápidas por Card:**
  - **WhatsApp:** Ícone verde com link direto para o WhatsApp para **todos** os alunos com telefone cadastrado.
  - **Editar Vencimento:** Botão de calendário para ajuste rápido da validade.
  - **Ver Perfil:** Botão para abrir o perfil/treinos do aluno.
  - **Aprovar:** Botão de check para alunos com cadastro pendente.

---

## 4. Fatia 3: Testes Automatizados, Build & Auditoria

- Testes unitários no Vitest: [`utils/studentStatus.test.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/utils/studentStatus.test.ts)
  - Casos de alunos com plano vigente, vencidos há 2 dias (pendente), vencidos há 10 dias (inativo), novos cadastros sem plano e formatação de último treino.
- Verificação de build limpo (`npm run build`).
- Ciclo de auditoria Gauntlet (Stage 4 com critic).
