# PRODUCT.md: Fitcoach

> Documento vivo de regras de negócio validadas com o coach (dono do produto). Cada feature registra as decisões tomadas no Discovery.

## Contexto do produto
- **Fitcoach:** Aplicativo exclusivo de prescrição e acompanhamento de treinos do treinador **Gustavo** (`role: 'admin' | 'coach'`, WhatsApp `5511992616777`) e seus alunos. Não há modelo SaaS multi-coach, não há limite `max_students` e não há planos de assinatura para coaches.
- **Stack:** Vite + React 19 + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, Storage, Edge Functions, RLS) + Service Worker PWA.
- **Perfil Gauntlet:** `full-stack`. **Superfície:** Operate (ferramenta de trabalho esportiva de alta precisão), Light e Dark Mode adaptativos.

---

## Feature: Consolidação Definitiva do App — Serviço Exclusivo do Treinador Gustavo, Eliminação de Mockups & Correção de Bugs Silenciosos (2026-10-25)

### Problema
1. O aplicativo ainda carregava resquícios de um modelo SaaS multi-coach (rotas `/coach/plans`, `/coach/subscription`, aba "Planos" na navegação do coach, limites de alunos e referências a planos de treinador).
2. Diversas telas continham elementos estáticos/mockups ou dados imprecisos: duração fixa `~60 min` e badge estático `"Ver detalhes"` na seleção de treinos, toast exibindo JSON cru no botão `info` da rotina, textos `"Plano Atual / Consultoria Pro"` e card estático `"Dica do dia"` no Dashboard do aluno, calendário mensal sem interação no Histórico, switches fictícios de privacidade e botão `"Esqueceu a senha?"` apenas com toast genérico.
3. O cálculo de Taxa Metabólica Basal (TMB) e Manutenção Calórica não tratava erros comuns de digitação de peso/altura (ex: `750` em vez de `75.0 kg`, `1.75` m em vez de `175` cm), não considerava o sexo biológico em todas as visões e usava fator de atividade fixo (`1.35`).
4. Quatro bugs silenciosos afetavam funcionalidades de bastidores: colunas inexistentes em `smartNotificationDispatcher.ts` (`age`, `completed_at`), ausência de disparo Web Push real e regra de backoff na Edge Function `smart-notifications`, colisão de chaves de preferências do coach em `Notifications.tsx` e busca quebrada com N+1 queries em `WorkoutImportModal.tsx`.

### Regras de Negócio Validadas com o Treinador (Discovery Q&A)

| # | Domínio | Regra de Negócio Validada |
|---|---|---|
| **C1** | **Modelo de Negócio Exclusivo** | Aplicativo exclusivo do treinador **Gustavo** (`role: 'admin' | 'coach'`, WhatsApp `5511992616777`) e seus alunos. Não existem outros coaches, não há limite `max_students` e não existem planos comerciais para treinadores. |
| **C2** | **Extinção de `/coach/plans` e `/coach/subscription`** | Remover as rotas `/coach/plans` e `/coach/subscription` de `App.tsx`, remover a aba `"Planos"` do `BottomNav.tsx` do coach e excluir os arquivos mortos `pages/coach/Plans.tsx` e `pages/coach/SubscriptionDetails.tsx`. |
| **C3** | **Seleção de Treinos (`/student/selection`)** | 1. Exibir a duração real definida pelo coach no treino atribuído (`workout.duration_minutes`, com fallback para o metadado `duration` do JSON de `routine.description` e fallback final `60 min`).<br>2. Garantir que, ao clonar uma rotina na biblioteca (`pages/coach/Library.tsx` → `handleAssign`), os campos `duration_minutes` e `description` de cada `workout` sejam copiados integralmente para a rotina do aluno.<br>3. Retirar o badge/texto estático `"Ver detalhes"` do card do treino.<br>4. Corrigir o botão `info` do cabeçalho de `Selection.tsx` para fazer parse seguro do JSON em `routine.description` e exibir de forma legível `Duração`, `Nível` e `Frequência semanal` (ou texto limpo se não for JSON), nunca exibindo JSON cru no toast. |
| **C4** | **Dashboard do Aluno (`/student/dashboard`)** | 1. No card superior do aluno, remover os textos `"Plano Atual"` e `"Consultoria Pro"`.<br>2. Substituir pela exibição em destaque do **Nível atual do aluno** (`Nível X • Y XP`) acompanhada de uma **breve explicação de como o nível é calculado**: *"Cada treino concluído soma 100 XP. A cada 1.000 XP (10 treinos), você sobe de nível!"*.<br>3. Manter o indicador de validade (`Expira em: DD/MM/AAAA` ou dias restantes).<br>4. Remover completamente o card estático `"Dica do dia"` no final da tela. |
| **C5** | **Histórico do Aluno (`/student/history`)** | 1. Tornar os dias do calendário mensal interativos: ao clicar em um dia que possui treino concluído, rolar suavemente (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) até o card da sessão correspondente na lista abaixo, expandindo ou aplicando destaque visual temporário (`ring-2 ring-primary`) no card.<br>2. Corrigir o bug da query de rotina ativa no gráfico de volume prescrito por músculo: buscar a rotina ativa através da tabela `student_assignments` (`.eq('student_id', user.id).eq('is_active', true)`) em vez de filtrar colunas inexistentes (`student_id`, `is_active`) diretamente em `routines`. |
| **C6** | **Fluxo "Esqueceu a senha?" (`/login`)** | Como os alunos utilizam login `@fitcoach.com`, clicar em `"Esqueceu a senha?"` abre um modal limpo e acessível onde o aluno informa seu **Nome ou Login (`@fitcoach.com`)** e clica em **"Solicitar Nova Senha no WhatsApp"**, abrindo `https://wa.me/5511992616777?text=...` com mensagem preenchida solicitando a redefinição diretamente ao treinador Gustavo. |
| **C7** | **Configurações de Privacidade (`/student/settings/privacy` e `/coach/settings/privacy`)** | 1. Remover todos os 4 switches de privacidade (`Mostrar Bio`, `Mostrar Foto de Perfil`, `Análise de Performance`, `Histórico de Treino Privado`).<br>2. No botão **"Solicitar Exclusão de Todos os Dados"**, abrir diretamente o WhatsApp do treinador (`5511992616777`) com mensagem pré-preenchida identificando o nome e o e-mail do usuário solicitando a exclusão dos dados. |
| **C8** | **Templates de Séries (`SetTemplateManager.tsx`)** | Ajustar `handleSave` e `handleLoad` para preservar e restaurar **todas** as opções de séries especiais (4 camadas: `type`, `set_method`, `drop_count`, `sub_sets`, `micro_rest_seconds`, `activation_reps`, `execution_mode`, `tempo`, `timer_mode`, `notes`) e todos os campos de cardio/HIIT (`time_target`, `distance_target`, `speed_target`, `incline_target`, `is_hiit`, `hiit_work_seconds`, `hiit_rest_seconds`, `hiit_rounds`, `hiit_cycles`, `hiit_work_speed`, `hiit_rest_speed`). |
| **C9** | **Cálculo de TMB e Manutenção Calórica (`utils/metabolicCalculator.ts`, `Profile.tsx`, `StudentProfileView.tsx`)** | Criar utilitário compartilhado e testado (`utils/metabolicCalculator.ts`) que:<br>1. **Normaliza erros de digitação de peso:** converte automaticamente inteiros sem vírgula (ex: `750` -> `75.0 kg`, `825` -> `82.5 kg`, `75000` -> `75.0 kg`) e valida a faixa humana plausível (`30 kg` a `250 kg`), bloqueando/sanitizando valores inválidos no salvamento do perfil com feedback claro ao aluno.<br>2. **Normaliza erros de altura:** se o aluno digitar em metros (`1.75` ou `1,75`), converte automaticamente para centímetros (`175 cm`); valida faixa plausível (`100 cm` a `250 cm`).<br>3. **Calcula idade exata** a partir de `birth_date` (com fallback seguro se ausente/inválida).<br>4. **Considera `gender`** (`male`, `female`, `other`) na fórmula de Mifflin-St Jeor.<br>5. **Seletor de Nível de Atividade Física:** adiciona seletor no Perfil do Aluno (salvo em `profiles.preferences.activity_level`), usando a frequência semanal da rotina ativa do aluno como padrão inteligente quando não selecionado manualmente (`sedentary: 1.2`, `light: 1.375` [1-2x], `moderate: 1.55` [3-4x], `intense: 1.725` [5-6x], `very_intense: 1.9`). |
| **C10** | **Galeria de Fotos de Evolução (`EvolutionGallery.tsx`)** | Sem campo de observação; ao excluir uma foto, extrair o path relativo a partir da `image_url` (após `/evolution-photos/`) e remover também o arquivo físico do bucket `evolution-photos` no Supabase Storage (`supabase.storage.from('evolution-photos').remove([filePath])`), além de deletar o registro na tabela `evolution_photos`. |
| **C11** | **Cadastro/Edição de Exercícios (`ExerciseFormModal.tsx`)** | Aceitar qualquer tipo de mídia tanto por URL/caminho quanto por upload direto de arquivo (`video/*`, `image/gif`, `image/webp`, `image/png`, `image/jpeg`), realizando upload para o Supabase Storage e preenchendo `video_url` / `image_url` de forma transparente de acordo com o formato. |
| **C12** | **Remoção de Código Morto & Atualização de Perfil/Changelog** | 1. Remover `contexts/RoleContext.tsx`, `pages/coach/Plans.tsx`, `pages/coach/SubscriptionDetails.tsx` e funções mortas (`getDifficultyColor` em `Selection.tsx`, `formatDuration` não usada em `History.tsx`).<br>2. Exibir o `email` do treinador em `pages/coach/Profile.tsx` (com fallback para `user.email`).<br>3. Atualizar `pages/coach/Updates.tsx` incluindo seção de Changelog / Entregas Recentes do Sistema junto às pendências operacionais. |
| **C13** | **Correção dos 4 Bugs Silenciosos** | 1. `utils/smartNotificationDispatcher.ts`: remover coluna inexistente `age` da query em `students_data` e substituir `completed_at` por `finished_at` na query de `workout_logs`.<br>2. `supabase/functions/smart-notifications/index.ts`: implementar envio de Web Push (ou invocação de payload VAPID para `push_subscriptions` dos alunos elegíveis), respeitar `quiet_hours_start` e `quiet_hours_end` customizados de cada aluno no fuso `-03:00` (Brasília) e aplicar a regra de backoff (pausar por 5 dias após 2 notificações ignoradas seguidas sem treino).<br>3. `pages/settings/Notifications.tsx`: corrigir a colisão de chave do Coach (`coach_feedback` em vez de `evolution_photos`), incluir `system_updates` e `coach_feedback` na normalização e persistência de preferências, e manter apenas switches conectados.<br>4. `components/coach/editor/WorkoutImportModal.tsx`: corrigir a busca por nome de aluno filtrando sobre os perfis carregados (sem falhar no PostgREST embedded filter) e eliminar o N+1 queries buscando todas as atribuições ativas (`student_assignments`) em uma única query `.in('student_id', studentIds)`. |

---

### Pendências Documentadas (Backlog Futuro)
- **Item 2.11 — Camada 4 de Séries Especiais (`timer_mode` Avançado):** Implementar seletor dedicado de protocolos `EMOM`, `AMRAP` e `Tabata` no editor de séries do coach e cronômetro específico de rounds automáticos no player de musculação (`WorkoutExecution.tsx`). Atualmente o campo `timer_mode` já é preservado no banco e nos templates com valor padrão `'standard'`.

---

### Diagnóstico Técnico Externo: Bug de Duplicação de Contas na Renovação via InfinitePay (`C:\Users\Gustavo\Desktop\Consultoria`)

Conforme solicitado pelo treinador, foi realizada a auditoria estática completa dos arquivos `C:\Users\Gustavo\Desktop\Consultoria\src\lib\fitcoach\provisioning.ts` e `C:\Users\Gustavo\Desktop\Consultoria\src\app\api\webhooks\infinitepay\route.ts`.

#### Causa Raiz Exata da Duplicação na Renovação:
1. **Desalinhamento entre E-mail do Checkout/InfinitePay e E-mail Canônico `@fitcoach.com` (`provisioning.ts` linhas 154–187):**
   - No primeiro acesso ou quando criado pelo coach/sistema, o aluno recebe no Fitcoach um e-mail gerado no formato `${nomeNormalizado}@fitcoach.com` (ex: `mariasilva@fitcoach.com`), ou um e-mail A.
   - Ao renovar pela InfinitePay, o webhook (`webhooks/infinitepay/route.ts` linha 20) recebe `payload.customer.email` (o e-mail pessoal digitado pelo aluno no pagamento da InfinitePay, ex: `maria.pessoal@gmail.com`) e `payload.customer.name` (o nome do portador do cartão/PIX ou digitado no checkout).
   - Em `provisioning.ts`:
     - **Passo 1 (linha 141):** `payment.fitcoach_user_id` vem `null` em um novo checkout ou link externo da InfinitePay.
     - **Passo 2 (linha 154):** Busca em `public.profiles` por `.eq('email', targetEmail)` (`maria.pessoal@gmail.com`). Como no Fitcoach o e-mail salvo é `mariasilva@fitcoach.com` (ou a coluna `email` em `public.profiles` está nula/diferente), a busca retorna `null`.
     - **Passo 3 (linha 168):** O código gera `fitcoachEmail = "${normalizedName}@fitcoach.com"` a partir de `targetName` e busca em `public.profiles` por `.eq('email', fitcoachEmail)`. **Basta qualquer mínima diferença no nome informado na renovação** (ex: `"Maria da Silva"` vs `"Maria Silva"`, abreviação de sobrenome, nome do titular do cartão ou ausência de `email` sincronizado na tabela `public.profiles`) para que `profileByGeneratedEmail` retorne `null`.
2. **Ausência de Reconciliação por Pagamentos Anteriores, Telefone ou Nome (`provisioning.ts` & `route.ts`):**
   - O `provisioning.ts` **nunca consulta a própria tabela `payments` do banco GQFit** em busca de pagamentos anteriores aprovados com o mesmo `customer_email` ou `customer_phone` que já possuam `fitcoach_user_id` preenchido.
   - Também **não consulta `students_data` / `profiles` pelo telefone normalizado (`phone`)** nem faz busca tolerante por `full_name` (`ilike`) vinculada ao coach Gustavo.
3. **Bug de Paginação no Fallback de `listUsers()` (`provisioning.ts` linha 201):**
   - Quando `auth.admin.createUser` falha ou quando o usuário existe em `auth.users` mas não foi achado em `public.profiles`, a linha 201 chama `fitcoachSupabase.auth.admin.listUsers()` sem parâmetros, que retorna apenas os primeiros **50 usuários** (`perPage: 50` padrão do GoTrue). Como o Fitcoach já possui mais de 50 contas, alunos antigos fora da página 1 nunca são encontrados.
4. **Normalização Inconsistente no Webhook Retroativo (`webhooks/infinitepay/route.ts` linha 78):**
   - Na linha 78, o fallback gera `${name.toLowerCase().replace(/\s+/g, '')}@fitcoach.com` **sem remover acentos** (`normalize('NFD')`), divergindo da normalização feita em `provisioning.ts` (linhas 169–173).

#### Solução Recomendada para o Projeto `Consultoria`:
1. Antes de criar qualquer usuário no Fitcoach, consultar na tabela `payments` do GQFit se já existe algum registro anterior com `fitcoach_user_id IS NOT NULL` para o mesmo `customer_email` OU `customer_phone` (comparando últimos 8–9 dígitos do telefone).
2. Caso não encontre em `payments`, buscar no banco do Fitcoach (`profiles` / `students_data`) por:
   - E-mail exato (`targetEmail` e `${normalizedName}@fitcoach.com`);
   - Telefone normalizado (comparando os últimos 8 dígitos sem depender do 9º dígito ou DDI);
   - `full_name` (`ilike`) entre os alunos do coach Gustavo (`coach_id = '4836a457-fdd3-4df7-8b69-9d881be270f2'`).
3. Somente se nenhuma dessas 4 chaves encontrar o aluno existente é que `auth.admin.createUser` deve ser chamado.

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

---

## Feature: Histórico completo do exercício + fila de feedbacks do coach (2026-10-10)

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

---

## Feature: Gestão e Localização Rápida de Alunos (`/coach/students`) & Sincronização com Dashboard (2026-10-10)

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
