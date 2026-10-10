# Inteligência de Referência e Arquitetura Técnica: Gestão de Alunos & Dashboard

- **Projeto / Domínio:** Fitcoach (Plataforma de Prescrição e Acompanhamento de Treinos Coach ↔ Aluno)
- **Perfil Detectado:** `full-stack` (Vite + React 19 + TypeScript + Tailwind CSS + Supabase)
- **Feature Alvo:** Gestão e Localização Rápida de Alunos (`/coach/students`) & Sincronização com Dashboard
- **Data da Pesquisa:** 2026-10-10

---

## 1. Diagnóstico do Estado Atual do Código

### 1.1 `pages/coach/Dashboard.tsx`
- **Como carrega os dados hoje:**
  - Busca os alunos vinculados em `students_data` com `.select('id').eq('coach_id', user.id)`.
  - Busca os perfis correspondentes em `profiles` com `.select('status, id').in('id', studentIds)`.
  - Calcula contadores de ativos/pendentes/inativos com:
    ```typescript
    activeCount = profiles.filter(p => p?.status === 'active').length;
    pendingCount = profiles.filter(p => p?.status === 'pending').length;
    inactiveCount = profiles.filter(p => p?.status === 'inactive' || p?.status === 'banned').length;
    ```
- **Discrepância Crítica Identificada:**
  - O Dashboard considera qualquer perfil com `status === 'active'` como ativo, **ignorando completamente** a data de expiração da consultoria (`consultancy_expires_at`).
  - Um aluno cujo plano expirou há 3 meses continua sendo contado como "Ativo" no Dashboard e no anel de progresso percentual, gerando números falsos e divergentes de `/coach/students`.

### 1.2 `pages/coach/Students.tsx`
- **Como carrega os dados hoje:**
  - Faz uma query em `students_data` com join em `profiles`:
    ```typescript
    let query = supabase
        .from('students_data')
        .select(`
            id,
            consultancy_expires_at,
            profiles!students_data_id_fkey!inner (
                id,
                full_name,
                avatar_url,
                status,
                phone
            )
        `)
        .eq('coach_id', user.id);
    ```
  - Aplica filtros de banco dinâmicos baseados na aba selecionada (`selectedTab`):
    - `selectedTab === 'active'`: filtra `profiles.status = 'active'` e `consultancy_expires_at > agora`.
    - `selectedTab === 'pending'`: filtra `profiles.status = 'pending'`.
    - `selectedTab === 'inactive'`: filtra `status IN ('rejected', 'banned') OR (status = 'active' AND consultancy_expires_at < agora)`.
- **Bugs Críticos Identificados:**
  1. **Contadores Voláteis (Flutuantes):** Os cards do topo (*Total*, *Ativos*, *Pendentes*, *Inativos*) são calculados sobre `students.length` e sobre o array filtrado da aba atual (`students.filter(...)`). Quando o coach clica na aba "Pendentes", o Total passa a ser apenas o número de pendentes, e Ativos vira `0`!
  2. **Aba Inicial Inadequada:** A página inicia na aba `'all'` (Todos), forçando o coach a clicar em "Ativos" toda vez que entra na tela.
  3. **Ausência de Informação de Engajamento:** Não há qualquer indicação de quando o aluno treinou pela última vez, impedindo o coach de identificar rapidamente quem parou de treinar.
  4. **WhatsApp Restrito:** O botão de WhatsApp só é exibido para alunos pendentes, ficando inacessível para alunos ativos e inativos que possuem telefone cadastrado.

---

## 2. Estrutura Canônica das Tabelas e Relações

### 2.1 Tabela `public.profiles`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID` (PK) | Chave primária (referencia `auth.users(id)`) |
| `email` | `TEXT` | E-mail do usuário |
| `role` | `user_role` (`admin`, `coach`, `student`) | Papel do usuário no sistema |
| `full_name` | `TEXT` | Nome completo do aluno |
| `avatar_url` | `TEXT` | URL pública da foto de perfil |
| `status` | `account_status` (`pending`, `active`, `rejected`, `banned`) | Status da conta |
| `phone` | `TEXT` | Telefone com DDD (formato livre ou E.164) |
| `created_at` | `TIMESTAMPTZ` | Data de criação |

### 2.2 Tabela `public.students_data`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID` (PK) | Chave primária e FK para `profiles(id)` ON DELETE CASCADE |
| `coach_id` | `UUID` (FK) | ID do coach responsável (`profiles.id`) |
| `consultancy_expires_at` | `TIMESTAMPTZ` | Data/hora de expiração do plano de consultoria |
| `birth_date` | `DATE` | Data de nascimento |
| `height_cm` / `weight_kg` | `DECIMAL` | Medidas antropométricas |
| `goal` / `notes` | `TEXT` | Objetivos e notas do treinador |

### 2.3 Tabela `public.workout_logs`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | `UUID` (PK) | ID da sessão de treino |
| `student_id` | `UUID` (FK) | ID do aluno (`profiles.id`) |
| `workout_id` | `UUID` (FK) | ID do treino prescrito (`workouts.id`) |
| `started_at` | `TIMESTAMPTZ` | Início da sessão |
| `finished_at` | `TIMESTAMPTZ` | Conclusão da sessão (NULL = treino em andamento ou abandonado) |

---

## 3. Estratégia de Query para o Último Treino (Anti-N+1)

### 3.1 O Problema do N+1
Se para cada card de aluno na lista o componente fizesse uma consulta individual (`supabase.from('workout_logs').select('finished_at').eq('student_id', id)...`), para uma lista de 30 alunos seriam disparadas 30 requisições HTTP adicionais, sobrecarregando a rede e gerando lentidão visível na UI.

### 3.2 Estratégia Recomendada: Batching em Lote com Map Client-Side (O(N))
Não exige migração SQL no banco remoto e funciona com 100% de compatibilidade imediata.

1. **Passo 1 (Coleta dos IDs):** Extrair o array de IDs dos alunos carregados pelo coach:
   ```typescript
   const studentIds = studentsData.map(s => s.id);
   ```

2. **Passo 2 (Single Batch Query):** Disparar **uma única query** filtrando pelos alunos do coach, trazendo apenas os treinos finalizados ordenados decrescentemente por `finished_at`:
   ```typescript
   const { data: logs, error } = await supabase
       .from('workout_logs')
       .select('student_id, finished_at')
       .in('student_id', studentIds)
       .not('finished_at', 'is', null)
       .order('finished_at', { ascending: false });
   ```

3. **Passo 3 (Mapeamento em O(N)):** Como a lista já vem ordenada por `finished_at desc`, a primeira ocorrência de cada `student_id` no array é garantidamente o seu treino mais recente:
   ```typescript
   const lastWorkoutMap = new Map<string, string>();
   logs?.forEach(log => {
       if (log.student_id && log.finished_at && !lastWorkoutMap.has(log.student_id)) {
           lastWorkoutMap.set(log.student_id, log.finished_at);
       }
   });
   ```

4. **Complexidade:** 1 query SQL + O(K) de redução no cliente (onde K é o número total de treinos dos alunos, tipicamente processado em < 2ms em JavaScript).

### 3.3 Estrutura de Indexação Recomendada
Para garantir que a query batch acima execute com performance máxima no Postgres:
```sql
CREATE INDEX IF NOT EXISTS idx_workout_logs_student_finished 
ON public.workout_logs(student_id, finished_at DESC) 
WHERE finished_at IS NOT NULL;
```

---

## 4. Análise da Função RPC `approve_student`

### 4.1 Implementação no Banco (`Approve Student RPC.sql`)
```sql
CREATE OR REPLACE FUNCTION public.approve_student(
    student_uuid UUID,
    expiration_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- 1. Validação de segurança: apenas o coach do aluno pode aprovar
    IF NOT EXISTS (
        SELECT 1 FROM public.students_data 
        WHERE id = student_uuid AND coach_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Not your student');
    END IF;

    -- 2. Atualiza status do perfil para 'active'
    UPDATE public.profiles
    SET status = 'active'
    WHERE id = student_uuid;

    -- 3. Atualiza data de expiração da consultoria
    UPDATE public.students_data
    SET consultancy_expires_at = expiration_date
    WHERE id = student_uuid;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.2 Diagnóstico e Ajustes Necessários no Frontend
- **Status do RPC:** A função SQL está **100% funcional** e possui as proteções adequadas (`SECURITY DEFINER` com checagem de vínculo de `coach_id = auth.uid()`).
- **Ponto de Falha no Frontend (`Students.tsx:100-106`):**
  Atualmente o frontend faz:
  ```typescript
  const { data, error } = await supabase.rpc('approve_student', {
      student_uuid: approvingStudent.id,
      expiration_date: new Date(expirationDate).toISOString()
  });
  if (error) throw error;
  ```
  - **Atenção:** Como o RPC trata exceções internamente via `EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, ...);`, se o retorno for `{ success: false, error: 'Unauthorized...' }`, o Supabase **não lança erro HTTP** (`error` é `null`!).
  - **Correção Recomendada:** Verificar explicitamente no frontend:
    ```typescript
    if (error) throw error;
    if (data && !data.success) {
        throw new Error(data.error || 'Falha ao aprovar aluno');
    }
    ```

---

## 5. Especificação do Módulo Canônico: `utils/studentStatus.ts`

Para unificar de forma definitiva o cálculo de status entre `/coach/dashboard` e `/coach/students`, deve ser criado o arquivo `utils/studentStatus.ts` com funções puras e testáveis.

### 5.1 Tipos Canônicos
```typescript
export type StudentStatusState = 'active' | 'pending' | 'inactive';

export interface StudentStatusInfo {
    state: StudentStatusState;
    label: string;
    badgeColor: 'emerald' | 'amber' | 'red';
    description?: string;
}

export interface StudentInput {
    id?: string;
    consultancy_expires_at?: string | null;
    profiles?: {
        status?: string | null;
        [key: string]: any;
    } | null;
    status?: string | null;
}
```

### 5.2 Regras de Negócio de `classifyStudent`
Seguindo rigorosamente a **Regra S1** do `PRODUCT.md`:
1. Se `status === 'pending'` (cadastro novo aguardando aprovação do coach) -> `'pending'`.
2. Se `status === 'rejected'` ou `status === 'banned'` -> `'inactive'`.
3. Se não possui `consultancy_expires_at` (sem plano cadastrado) -> `'inactive'`.
4. Se possui `consultancy_expires_at`:
   - Se `data_expiracao >= agora`: Plano vigente -> `'active'`.
   - Se `data_expiracao < agora`:
     - Calcular dias decorridos desde a expiração: `dias_vencido = Math.floor((agora - data_expiracao) / 86400000)`.
     - Se `dias_vencido <= 7`: Janela de tolerância / renovação -> `'pending'`.
     - Se `dias_vencido > 7`: Vencido há mais de 7 dias -> `'inactive'`.

### 5.3 Regras de `calculateDashboardStats`
```typescript
export interface DashboardStudentStats {
    total: number;
    active: number;
    pending: number;
    inactive: number;
    activePercentage: number;
}
```
- Recebe a lista bruta de alunos do coach.
- Itera sobre todos os alunos aplicando `classifyStudent(student)`.
- `activePercentage`: `total > 0 ? Math.round((active / total) * 100) : 0`.
- Essa função pura alimenta tanto os 4 cards de `/coach/students` quanto o card geral e o anel SVG de `/coach/dashboard`.

### 5.4 Regras de `formatLastWorkout`
Recebe `finishedAt: string | null`:
- Se `!finishedAt`:
  - `label`: `"Sem treinos registrados"`
  - `isStale`: `true`
  - `daysAgo`: `null`
  - `badgeVariant`: `'muted'`
- Se `finishedAt` existe:
  - Calcular diferença em dias civis em relação a hoje (`agora`):
    - `daysAgo === 0`: `label: "Treinou hoje"`, `isStale: false`, `badgeVariant: 'emerald'`
    - `daysAgo === 1`: `label: "Treinou ontem"`, `isStale: false`, `badgeVariant: 'emerald'`
    - `daysAgo >= 2 && daysAgo <= 7`: `label: "Treinou há ${daysAgo} dias"`, `isStale: false`, `badgeVariant: 'slate'`
    - `daysAgo > 7`: `label: "Sem treinar há ${daysAgo} dias"`, `isStale: true` (alerta de engajamento!), `badgeVariant: 'amber'`

### 5.5 Regras de `formatPlanExpiration`
Recebe `expiresAt: string | null`:
- Se `!expiresAt`: `label: "Sem plano ativo"`, `urgency: 'expired'`
- Se `expiresAt`:
  - `diffDays = Math.ceil((exp - agora) / 86400000)`:
    - `diffDays > 7`: `"Vence em ${diffDays} dias"` (`urgency: 'normal'`)
    - `1 <= diffDays <= 7`: `"Vence em ${diffDays} dias"` (`urgency: 'warning'` - destaque visual âmbar)
    - `diffDays === 0`: `"Vence hoje"` (`urgency: 'urgent'` - destaque visual âmbar/vermelho)
    - `-7 <= diffDays < 0`: `"Venceu há ${Math.abs(diffDays)} dias (renovação)"` (`urgency: 'grace'` - alerta de renovação)
    - `diffDays < -7`: `"Vencido há ${Math.abs(diffDays)} dias"` (`urgency: 'expired'`)

---

## 6. Inventário de Componentes Visuais e Padrões da UI

Para assegurar total consistência visual com o Design System do Fitcoach (Superfície *Operate*):

### 6.1 Abas de Filtro (Tabs)
- Localização: `pages/coach/Students.tsx:232-255`
- Padrão canônico:
  - Container: `flex items-center gap-2 overflow-x-auto no-scrollbar pb-1`
  - Botão ativo: `bg-slate-900 dark:bg-white text-white dark:text-slate-900`
  - Botão inativo: `bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700`
  - Altura mínima acessível: `min-h-[44px]`
  - Badge numérico embutido no botão: `<span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700">14</span>`

### 6.2 Badges de Status do Aluno
- **Ativo:**
  - Ponto: `w-2 h-2 rounded-full bg-emerald-500`
  - Texto: `text-xs text-slate-500 font-medium` ou badge de pílula `bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400`
- **Pendente:**
  - Ponto: `w-2 h-2 rounded-full bg-amber-500`
  - Texto: `text-xs text-amber-600 dark:text-amber-400 font-semibold`
  - Container no topo: `bg-amber-500 p-4 rounded-2xl shadow-lg shadow-amber-500/30 text-white animate-pulse`
- **Inativo:**
  - Ponto: `w-2 h-2 rounded-full bg-red-500`
  - Texto: `text-xs text-red-500 font-medium`

### 6.3 Botão Rápido de WhatsApp
- Formatação de link: `utils/phoneUtils.ts` (`formatToWhatsappUrl(phone)`)
- Estilo do botão no card:
  ```tsx
  <a
      href={formatToWhatsappUrl(student.profiles?.phone)}
      target="_blank"
      rel="noreferrer"
      aria-label={`Falar no WhatsApp com ${student.profiles?.full_name}`}
      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
      title="WhatsApp"
  >
      <span className="material-symbols-rounded text-xl" aria-hidden="true">chat</span>
  </a>
  ```

### 6.4 Seletor de Ordenação Rápida
- Posicionado junto ou acima da lista:
  - Alternância entre:
    1. **"Último treino"** (mais recentes primeiro)
    2. **"Nome (A-Z)"** (ordem alfabética)
- Ícones Material Symbols: `swap_vert` ou `sort`.

---

## 7. Próximos Passos para o Builder (Stage 2)

1. **Criar `utils/studentStatus.ts`** com as funções puras descritas na Seção 5.
2. **Criar suíte de testes `utils/studentStatus.test.ts`** cobrindo todos os cenários de expiração e formatação.
3. **Atualizar `pages/coach/Dashboard.tsx`**:
   - Ajustar query para trazer `consultancy_expires_at` junto dos alunos.
   - Substituir cálculo inline por `calculateDashboardStats()`.
4. **Atualizar `pages/coach/Students.tsx`**:
   - Iniciar na aba `'active'` por padrão.
   - Carregar todos os alunos uma vez e calcular estatísticas globais fixas.
   - Executar query em lote para `workout_logs` com mapa `lastWorkoutMap`.
   - Exibir badge do último treino com alerta para > 7 dias.
   - Exibir badge de vencimento com urgência.
   - Disponibilizar botão de WhatsApp para todos os alunos com telefone.
   - Implementar ordenação por "Último treino" e "Nome (A-Z)".
