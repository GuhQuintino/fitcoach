# PRODUCT.md: Fitcoach

> Documento vivo de regras de negócio validadas com o coach (dono do produto). Cada feature registra as decisões tomadas no Discovery.

## Contexto do produto
- **Fitcoach:** app de prescrição e acompanhamento de treinos (coach ↔ aluno).
- **Stack:** Vite + React + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS).
- **Perfil Gauntlet:** `full-stack`. **Superfície:** Operate (ferramenta de trabalho), light e dark mode já existentes.

---

## Feature: Notificações Inteligentes Baseadas no Padrão do Aluno + Anti-Spam & Onboarding de Perfil (2026-10-25)

### Problema
1. O botão de notificações na dashboard do aluno (`pages/student/Dashboard.tsx`) possui uma bolinha vermelha estática (`bg-red-500`) que nunca apaga, e leva para uma tela (`pages/settings/Notifications.tsx`) que é 100% mockup (estado volátil, checkboxes sem `onChange`, nenhuma integração Web Push nem salvamento no Supabase).
2. Lembretes fixos diários incomodam alunos e causam cancelamento/desativação de notificações. O sistema precisa aprender os dias e horários habituais reais de treino de cada aluno a partir do histórico (`workout_logs`).
3. Alunos novos criados automaticamente muitas vezes não preenchem foto de perfil, peso, data de nascimento/idade e altura, prejudicando o acompanhamento do coach.

### Regras de Negócio Validadas com o Treinador (Discovery Q&A)
| # | Regra |
|---|---|
| N1 | **Inferência de Hábito de Treino (Alunos com >= 3 treinos):** Identificar dias habituais da semana (frequência >= 35% nas últimas 4 semanas) e calcular o **horário mediano** de início de treino do aluno. O lembrete é agendado no horário mediano habitual apenas nos dias habituais e apenas se ele ainda não treinou no dia. |
| N2 | **Alunos Novos (Cold Start < 3 treinos):** Disparar lembrete gentil à tarde, por volta das **16:30**, caso o aluno ainda não tenha registrado treino no dia. |
| N3 | **Blindagem Anti-Spam Estrita:**<br>- **Já treinou hoje:** Silêncio absoluto (zero lembretes se houver `workout_log` hoje).<br>- **Teto:** Máximo de 1 notificação por dia por aluno; máximo de 3 lembretes de treino por semana.<br>- **Regra de Backoff:** Se o aluno ignorar 2 lembretes consecutivos em dias diferentes sem abrir o app ou treinar, **pausar automaticamente novos lembretes por 5 dias**.<br>- **Quiet Hours:** Nenhuma notificação automática entre **21:30 e 07:30** (salvo treino noturno habitual). |
| N4 | **Lembrete de Onboarding / Perfil Incompleto:** Se o aluno novo ainda não preencheu foto de perfil, peso, data de nascimento/idade ou altura, enviar um lembrete gentil convidando a completar o perfil (máximo de 1 aviso inicial e 1 reforço após 4 dias se continuar incompleto). |
| N5 | **Central de Notificações Real e Badge Dinâmico:** A bolinha vermelha no sino da Dashboard só aparece quando houver notificações não lidas reais (`read_at IS NULL`). O aluno e o coach podem visualizar os últimos avisos e marcar como lidos. |
| N6 | **Web Push Nativo (PWA / VAPID):** O Service Worker (`public/sw.js`) escuta eventos de `push` com payload seguro e aciona `self.registration.showNotification`. As assinaturas (`push_subscriptions`) e preferências ficam sincronizadas no Supabase com RLS. |
| N7 | **Controle Autoral de Tópicos e Horário Personalizado:** A tela de configurações permite ativar/desativar tópicos individuais, visualizar o padrão aprendido pelo app e opcionalmente fixar um horário de preferência manual. |

---

## Feature: Séries Especiais & Métodos de Intensificação (Taxonomia em 4 Camadas) (2026-10-12)

### Problema
1. O aplicativo limitava a prescrição de exercícios ao modelo sequencial padrão (1 exercício por vez com descanso fixo), impossibilitando a prescrição de métodos consagrados de musculação (Biset, Triset, Giant Set, Pareado Antagonista).
2. Métodos avançados de intensificação (Dropset, Rest-Pause, Cluster Sets, Myo-Reps, FST-7, Muscle Round, Método 3/7, BFR) exigiam anotações informais em texto livre, resultando em perda de dados, métricas incorretas e sobrecarga manual para o aluno.
3. Não havia controle de cadência biomecânica (ex: fase excêntrica controlada, pausas isométricas, ponto zero) integrado às séries.
4. O timer de descanso disparava prematuramente durante transições de supersets, interrompendo o fluxo dinâmico da execução do aluno na academia.
5. Alunos e treinadores careciam de orientação contextual integrada ("o que é este método?", "qual intervalo exato devo dar?", "onde focar a intensidade?").

### A Solução: Taxonomia Ortogonal em 4 Camadas
Para evitar o acoplamento desordenado e a explosão combinatória de tipos no banco de dados, o domínio foi decomposto em 4 camadas ortogonais e combináveis:
- **Camada 1 — Agrupamento entre Exercícios:** Biset, Triset, Giant Set, Pareado Antagonista (ou Isolado). Controla `rounds`, tempo de descanso entre rounds e intervalo de transição.
- **Camada 2 — Método da Série:** Standard, Dropset, Rest-Pause, Cluster Set, Myo-Reps, Muscle Round, Método 3/7, FST-7, Oclusão Vascular (BFR). Configura micro-pausas, drops e sub-séries via parâmetros dinâmicos.
- **Camada 3 — Modo de Execução & Cadência:** Padrão, Cadência Lenta (4 dígitos E-P-C-P, ex: `4-0-1-0`), Isometria na Falha, Pico de Contração, Ponto Zero, Repetições Parciais, Repetições Forçadas, Carga Excêntrica Acentuada, 1 e 1/2, Onda de Força.
- **Camada 4 — Timers & Smart Rest:** Gestão adaptativa de cronômetros (Rest padrão de série, descanso longo entre rounds de agrupamento, e micro-timers rápidos de 10s a 20s para sub-séries).

### Regras de Negócio Validadas com o Treinador
| # | Regra |
|---|---|
| M1 | **Independência das Camadas:** Qualquer método de série (Camada 2) e qualquer modo de execução (Camada 3) podem ser combinados livremente com qualquer agrupamento (Camada 1) ou exercício isolado. |
| M2 | **Agrupamento no Editor:** O coach pode agrupar 2 ou mais exercícios em Biset, Triset, Giant Set ou Pareado Antagonista através de card dedicado (`ExerciseGroupCard`). O grupo define número de rounds, tempo de descanso pós-round, tempo de transição entre exercícios e notas instrutivas do grupo. A ação de desagrupar reverte os itens para exercícios sequenciais sem perda de dados. |
| M3 | **Desdobramento Cirúrgico de Dropsets:** Ao prescrever Dropsets, o sistema permite configurar a quantidade de reduções de carga e parâmetros de cada drop (carga decrescente, reps alvo e micro-pausa opcional), gerando sub-séries identificadas no player. |
| M4 | **Smart Rest Timer:** O cronômetro de descanso principal de final de exercício **NUNCA** dispara prematuramente no meio de um agrupamento. Entre exercícios do mesmo round, aplica-se o tempo de transição (se houver); o descanso longo do grupo dispara unicamente ao concluir o último exercício do round. |
| M5 | **Micro-Timers Automáticos:** Para métodos que exigem pausas intra-série (Rest-Pause, Cluster, Myo-Reps, Dropset), um contador regressivo flutuante de micro-pausa (10s a 20s) é ativado automaticamente na interface do aluno. |
| M6 | **Guia Pedagógico de Métodos ("?"):** Badges interativas com botão "?" abrem instantaneamente o `MethodGuideModal`, apresentando fundamentação científica, passo a passo prático, recomendações de carga/RPE e erros comuns em linguagem direta em PT-BR para treinador e aluno. |
| M7 | **Clonagem Profunda (Deep Clone):** Ao duplicar rotinas na Biblioteca ou prescrever modelos salvos para novos alunos, todos os registros em `exercise_groups` são clonados com novos UUIDs e integridade relacional, mantendo as 4 camadas intactas e sem queries N+1. |
| M8 | **Telemetria e Histórico Completo:** Cada série concluída grava metadados completos em `set_logs` (`set_method`, `group_round`, `micro_set_index`, `execution_mode`, `tempo_used`, `timer_mode`), preservando a fidelidade histórica em consultas e no `ExerciseHistoryModal`. |

### Fora do escopo
- Cronômetro de descanso obrigatório com bloqueio irreversível de tela (o aluno pode pular o descanso a qualquer momento se desejar).
- Prescrição por inteligência artificial gerativa de combinações automáticas de métodos (o treinador possui controle autoral total).

### Plano Técnico & Validação
- Migração Supabase: `supabase/migrations/20261012000000_special_sets_and_intensification.sql`
- Laudo Gauntlet Critic: `docs/gauntlet/QA_REPORT_special_sets.md` (PASS 3.00/3.00)
- Laudo Craft Auditor: `docs/gauntlet/CRAFT_AUDIT_special_sets.md` (PASS)
- Relatório de Testes: `docs/gauntlet/TEST_REPORT_special_sets.md` (PASS - 62 asserções)

---

## Feature: Histórico completo do exercício + fila de feedbacks do coach (2026-10-10)

### Problema
1. O modal de histórico do exercício (`components/shared/ExerciseHistoryModal.tsx`) só mostra os últimos 20 registros e agrupa por dia, misturando sessões do mesmo dia.
2. O coach vai e volta entre o editor do treino e `/coach/feedbacks` para ler o que o aluno escreveu.
3. Em `/coach/feedbacks`, para revisar o treino, o coach precisa abrir o perfil e lembrar qual treino o aluno marcou.

### Regras de negócio validadas
| # | Regra |
|---|---|
| R1 | O modal de histórico mostra **todos** os logs do exercício, sem limite de período ou de quantidade, tanto para o aluno quanto para o coach. |
| R2 | O histórico é agrupado por **sessão** (`workout_logs.id`), não por dia. |
| R3 | Cada sessão no modal mostra **apenas o feedback específico daquele exercício** (`exercise_feedback_logs.feedback_text`). Não mostra a observação geral da sessão. |
| R4 | **Aluno e coach** veem esse feedback no modal. |
| R5 | Cada card em `/coach/feedbacks` tem o botão **"Abrir treino"**, que navega para `/coach/editor?workout_id=…&student_id=…` e **marca o feedback como lido** automaticamente. |
| R6 | `/coach/feedbacks` tem o filtro **Não lidos / Todos** (padrão: Não lidos) com contador de não lidos. |
| R7 | Botão **"Marcar todos como lidos"**. |
| R8 | **Comparação com a sessão anterior do mesmo treino** (mesmo aluno, mesmo `workout_id`): resumo de volume no card fechado e delta da melhor série por exercício no card aberto. |
| R9 | **Destaque visual** para cards com feedback escrito (observação da sessão ou feedback por exercício), para o coach priorizar. |

### Fora do escopo
- Responder o feedback pelo card (chat).
- Filtro por aluno e agrupamento por aluno.

### Plano técnico
Ver `docs/gauntlet/PLAN_feedbacks_history.md`.

---

## Feature: Gestão e Localização Rápida de Alunos (`/coach/students`) & Sincronização com Dashboard (2026-10-10)

### Problema
1. `/coach/students` abre por padrão na aba "Todos" em vez de "Ativos", exigindo clique manual a cada acesso.
2. Contadores no topo de `/coach/students` são calculados sobre a lista filtrada da aba atual, distorcendo os números totais.
3. Desalinhamento com `/coach/dashboard`: o Dashboard considerava qualquer perfil com `status = 'active'` como ativo, ignorando a data de expiração da consultoria.
4. Os cards dos alunos não mostram quando foi o último treino do aluno (impossível saber se o aluno está engajado ou abandonou os treinos).
5. Falta botão de WhatsApp para alunos ativos (só existia para pendentes) e faltava ordenação por atividade recente.

### Regras de Negócio Validadas com o Coach
| # | Regra |
|---|---|
| S1 | **Classificação Canônica de Aluno:**<br>- **Ativo:** plano ativo no momento (`consultancy_expires_at >= agora` e cadastro ativo).<br>- **Pendente:** cadastro novo aguardando aprovação (`status = 'pending'`) **OU** plano vencido nos últimos 7 dias (período de tolerância/renovação).<br>- **Inativo:** sem plano ativo há mais de 7 dias (`agora - consultancy_expires_at > 7 dias`), ou sem plano, ou banido/rejeitado. |
| S2 | `/coach/students` abre diretamente na aba **Ativos** por padrão. |
| S3 | Os contadores do topo (Total, Ativos, Pendentes, Inativos) refletem os dados globais reais do coach, independentemente da aba ou busca selecionada. |
| S4 | **Sincronização 100% com `/coach/dashboard`:** o Dashboard passa a utilizar exatamente a mesma função pura (`utils/studentStatus.ts`) para calcular totais de ativos, pendentes e inativos. |
| S5 | **Informações reais no card do aluno:**<br>- Exibição do último treino concluído (ex: "Treinou hoje", "Treinou há 2 dias", ou alerta "Sem treinos há X dias" se > 7 dias, "Sem treinos registrados").<br>- Exibição do vencimento do plano com badge de urgência quando faltar <= 7 dias ou quando estiver vencido nos últimos 7 dias. |
| S6 | **Ações rápidas:**<br>- Link direto para WhatsApp disponível em todos os cards de alunos que tiverem telefone cadastrado.<br>- Acesso direto ao perfil/treinos.<br>- Modal de aprovação e ajuste de validade para pendentes. |
| S7 | **Ordenação Rápida:** permitir alternar entre "Último treino" (mais recentes primeiro) e "Nome (A-Z)". |
