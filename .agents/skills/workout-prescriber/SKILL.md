---
name: workout-prescriber
description: Apoia a análise de anamnese, a leitura do histórico de evolução (cargas, RPE, feedbacks, desconfortos) e a montagem de rotinas de treino individualizadas no Fitcoach, com periodização, notas de execução e gravação no Supabase após aprovação do coach.
---

# Workout Prescriber — Apoio à Prescrição e Reestruturação de Treinos (Fitcoach)

## 1. Propósito e princípios

Esta skill ajuda o coach responsável a montar e renovar treinos para os alunos da consultoria Fitcoach. Ela **propõe**; o coach **decide**. Nenhuma rotina é gravada sem revisão e aprovação explícita do coach.

Princípios:
1. **Individualização:** toda decisão parte dos dados do aluno (objetivo declarado, nível, disponibilidade, preferências, histórico, equipamentos). Nenhuma decisão é tomada por sexo, idade, aparência ou estereótipo.
2. **Objetivo declarado pelo aluno:** ênfases musculares e metas vêm do que o aluno (ou o coach/nutricionista, com concordância do aluno) pediu. Não se presume o que "deveria" querer.
3. **Evidência com humildade:** as orientações abaixo são pontos de partida baseados em prática comum, não verdades absolutas. Quando houver incerteza, indicar como hipótese e deixar a escolha ao coach.
4. **Escopo:** a skill não diagnostica condições de saúde. Ela registra queixas, ajusta o treino de forma conservadora e sinaliza quando é preciso encaminhar.

Cenários de uso:
1. **Aluno novo:** a partir do dossiê e anamnese (histórico esportivo, queixas e restrições informadas, objetivos, dias e tempo disponíveis, local e equipamentos, preferências).
2. **Aluno recorrente / troca de ciclo:** acionado pontualmente ou integrado à skill **`weekly-workout-adjuster`** após discussão e aprovação com o coach: manter o que progride, renovar estímulos estagnados, adaptar a divisão de treino e recalibrar volume.

---

## 2. Triagem da anamnese e leitura do dossiê do aluno

### 0. Leitura Mandatória do Dossiê do Aluno (`Fitcoach/docs/students/{slug-aluno}.md`)
Antes de prescrever ou reestruturar qualquer rotina, o agente DEVE compulsoriamente executar `view_file` no dossiê do aluno em `Fitcoach/docs/students/{slug-aluno}.md`.
Se o arquivo existir, incorporar diretamente:
- **Perfil Biomecânico & Anamnese:** Restrições articulares, histórico de dores lombares/ombro/joelho, metas estéticas/atléticas e preferências declaradas.
- **Mapa de Equipamentos & Física da Academia do Aluno:** Degraus de máquinas de 5 em 5kg, anilhas mínimas (1kg vs 2.5kg), halteres disponíveis. *Nunca prescrever cargas ou incrementos que a academia do aluno não suporta fisicamente.*
- **Marcos de Carga Relevantes (PRs e Cargas Históricas):** Utilizar os recordes e cargas recentes para calibrar as séries preparatórias (`preparation`) e de trabalho (`working`) com máxima precisão, sem chutes às cegas.
- **Histórico de Queixas e Feedbacks:** Evitar reintroduzir variações que geraram desconforto em ciclos passados (ex: se relatou desconforto em tríceps em pé, prescrever sentado ou na polia).
- **Histórico de Conversas & Áudios (WhatsApp — Seção 6):** Absorver relatos informais trocados no WhatsApp particular do treinador (mensagens de texto e transcrições de áudios via Gemini sobre dores, mudanças de rotina, viagens, equipamentos da academia e dúvidas de execução).

### A. Dados mínimos e leitura da Anamnese Versionada (`v1` legado e `v2` estruturado)
Ler integralmente o bloco normalizado de `crmData.anamnese.resumo` e a Seção 1/2/7 do dossiê (`v1.0` ou `v2.0`), **diferenciando explicitamente `"Não informado"` (pendência em aberto) de `"Nenhum"` (negativa confirmada)**:
- **Agenda combinada real (Seg–Dom):** dias fixos de musculação, **dias alternativos/alternâncias** (ex.: *quinta ou sábado em semanas alternadas*), rotina marcada como `varia` ou `ainda_nao_sei`, outros esportes/atividades (modalidade, dias, duração, **qual sessão costuma ser mais puxada** e se coincide com musculação + tempo real disponível nos dias coincidentes).
  - *Regra de interferência esportiva:* nunca colocar sessão pesada de pernas/lombar ou pico de DOMS em alongamento (ver 3.3) na véspera imediata ou no mesmo turno da sessão mais puxada de outro esporte sem janela de recuperação adequada; em dias coincidentes com tempo reduzido (ex.: 45 min), ajustar o número de séries/exercícios e priorizar compostos eficientes ou pareados antagonistas.
  - *Quando houver alternância (ex.: Quinta ↔ Sábado):* planejar uma divisão que funcione bem tanto rodando na quinta quanto no sábado (respeitando espaçamento de recuperação antes/depois da sessão esportiva pesada) e nomear explicitamente a alternância na nota da sessão ou aprovação do coach.
- **Preferência, dias e logística de cardio (`cardio`):** modalidades favoritas (`esteira`, `escada`, `bike`, `remo`, `corda`, `elíptico`, `caminhada/corrida`), flag explícita de **aversão a cardio contínuo**, **dias disponíveis para cardio**, **horário predominante/específico**, **momento em relação ao treino na academia** (logo após, antes, no mesmo bloco ou horário separado/misto) e **quantos minutos existem antes ou depois da musculação**.
  - *Regra de calibração de gasto energético e aderência:* respeitar os aparelhos preferidos e **nunca** estourar a janela declarada antes/depois do treino na academia. Se houver **`aversaoCardioContinuo`**, evitar sessões contínuas longas/monótonas e alinhar com o coach alternativas toleráveis (sessões curtas, blocos dinâmicos, escada/corda ou metas de passos/NEAT). Se o aluno faz cardio **antes** do treino, evitar fadigar membros inferiores antes de sessões pesadas de perna.
- **Objetivo do 1º ciclo & Prioridades:** objetivo principal e até **3 grupos musculares prioritários**, além de eventual evento/prazo alvo.
- **Histórico, ficha atual & estagnação:** tempo na ficha atual, **onde o aluno sente que travou**, ficha anterior colada / prints privados anexados e **cargas + repetições recentes** informadas (usar como âncora real para calibrar séries preparatórias e `weight_target`).
- **Preferências e logística:** exercícios que gosta, prefere evitar ou não consegue fazer; se treina **sozinho ou com parceiro/spotter** (regra de segurança para `forced_reps`); e menor salto de peso da academia.
- **Equipamentos condicionados ao local + Checklist de Máquinas (GIF):** confirmar local (`academia`, `condominio`, `casa`, `misto`), pesos livres e máquinas marcadas no checklist visual (`sim` = usar livremente; `nao` = proibido prescrever; `nao_sei` = evitar como peça crítica ou incluir fallback em `coach_notes` e manter como pendência para o 1º check-in).
- **Saúde, recuperação, dores & documentos LGPD:** sono, trabalho/plantões que afetam o treino, **região + movimentos que incomodam + orientação profissional já recebida**, e sinalização de **anexos médicos privados (LGPD)** no painel do Questionários. Qualquer `alertasRevisaoTreinador` exige revisão explícita do coach antes de propor ou gravar a ficha.
- **Pendências abertas (`pendencias`):** listar no final da proposta para alimentar as perguntas extras do **1º check-in** via `/weekly-workout-adjuster`.

### B. Equipamentos e contexto
- **Academia completa (`academia` / `misto`):** máquinas confirmadas no checklist GIF, polias, barras e halteres. Nunca prescrever máquinas marcadas como indisponíveis (`nao`).
- **Academia compacta / condomínio (`condominio`):** halteres dentro do limite disponível, banco regulável, estação multiuso/polia, leg horizontal e elásticos conforme marcados.
- **Em casa (`casa`):** halteres ajustáveis/fixos respeitando **carga máxima informada em kg**, elásticos, barra fixa e peso corporal.
- Respeitar o menor incremento físico disponível (`incrementoMinimoPeso` e Seção 2 do dossiê): prescrever somente cargas viáveis.

### C. Queixas e restrições: abordagem geral
Para qualquer dor ou desconforto informado:
1. Registrar localização, intensidade, gatilhos (qual movimento/amplitude/carga) e há quanto tempo.
2. Usar a **tolerância individual** como critério: preferir variações que o aluno executa sem aumento de dor, e ajustar amplitude, carga, tempo excêntrico, posição ou tipo de implemento antes de eliminar um movimento.
3. Dar preferência a exercícios estáveis e de trajetória guiada quando a queixa é recente ou mal definida, e progredir conforme a resposta.
4. **Encaminhar ao coach e a um profissional de saúde** quando houver: dor aguda ou que piora, dor noturna ou em repouso, formigamento/perda de força, trauma recente, suspeita de lesão estrutural, sintomas durante esforço (ex.: dor no peito, tontura) ou qualquer queixa que o coach considere fora do seu escopo.

Pontos de partida frequentes (hipóteses a validar com o aluno, não regras):

| Região | Ajustes comuns a considerar |
| :--- | :--- |
| **Joelho** | Variar posição dos pés, amplitude e ângulo de trabalho; opções como afundo reverso, leg press, hack e extensora em amplitude confortável; controlar tempo excêntrico. Testar tolerância, pois a resposta varia muito entre pessoas. |
| **Lombar** | Remadas e puxadas com apoio de tronco, máquinas articuladas, exercícios de core em polia ou peso corporal, hiperextensão em amplitude confortável; ajustar carga e amplitude de movimentos de hinge. |
| **Ombro** | Variar pegada e plano de movimento; opções como chest press, pegada neutra, face pull e elevação lateral no cabo; respeitar amplitudes sem dor. |

Nenhuma dessas listas é exaustiva: exercícios "a evitar" para uma pessoa podem ser bem tolerados por outra, e o contrário também vale.

---

## 3. Arquitetura da rotina

### 3.1 Escolha da divisão, Volume Semanal Ponderado e Ciclo de Renovação
A divisão é definida por **objetivo, frequência disponível, recuperação, preferência e nível do aluno**, e nunca por sexo. Opções comuns:

| Dias/semana | Possibilidades |
| :--- | :--- |
| **2–3** | Fullbody, ou ABC conforme prioridade |
| **4** | Upper/Lower 2x, ou outra divisão por prioridade |
| **5** | Combinação de divisões (ex.: Upper/Lower + sessões de ênfase) conforme a prioridade do aluno |
| **6** | PPL 2x, ou equivalente, se a recuperação e o tempo permitirem |

- **Contabilização de Volume Semanal Ponderado (`muscle_weights`):**
  - O volume semanal é contabilizado utilizando o **sistema ponderado nativo do Fitcoach (`muscle_weights`)**, em que o motor primário soma `1.0` série por série de trabalho, sinergistas secundários somam `0.5` e estabilizadores/auxiliares somam `0.25`.
  - **Meta para Grupos Foco:** Buscar **12 a 20 séries semanais ponderadas** para os grupamentos musculares prioritários do aluno.
  - **Grupos Fora do Foco / Manutenção:** Manter volume menor (tipicamente 6 a 10 séries semanais ponderadas) suficiente para retenção ou progresso gradual sem competir pela recuperação sistêmica.
- **Ciclo Padrão de Renovação (4 a 6 Semanas) e Ausência de Deload Programado:**
  - O ciclo padrão de renovação/troca de rotina é de **4 a 6 semanas** (alinhado ao check-in mensal) ou quando o aluno enjoa da ficha / estagna nas progressões.
  - **Sem Semana de Deload Programada:** O treinador **NÃO faz semana de Deload programada** nem cria fichas específicas de deload. Caso o aluno relate fadiga alta ou sono ruim nos check-ins, fazem-se apenas **ajustes pontuais de volume ou intensidade** na própria rotina vigente.

- **Nomenclatura Canônica das Sessões de Treino:**
  - **Padrão Canônico Normal (Regra Geral Universal do Treinador):**
    O padrão obrigatório para 99% das prescrições segue estritamente a fórmula:
    `Treino (A, B, C...) - Foco (Superiores, Inferiores, Pull, Push, Legs, etc...) - Dia (Segunda, Terça, Quarta...)`
    *Exemplos Canônicos:*
    - `Treino A - Inferiores - Segunda`
    - `Treino B - Superiores - Terça`
    - `Treino C - Inferiores - Quarta`
    - `Treino D - Superiores - Sexta`
    - `Treino E - Inferiores - Sábado`
  - **Exceção de Combinado Flexível ou Rotina Variável (`varia` / `ainda_nao_sei` / alternâncias semanais):**
    Quando o treinador propõe ao aluno um combinado de dias mínimos obrigatórios + dias alternativos/bônus (ex.: aluno que troca Quinta por Sábado em semanas alternadas ou marcou rotina `varia` na anamnese), adota-se o formato limpo:
    `Treino Obrigatório 1 — <Foco>`, `Treino Obrigatório 2 — <Foco>`, `Treino Bônus 1 — <Foco>`, OU na nomenclatura por dia indica-se o combinado aprovado pelo coach (ex.: `Treino D - Superiores - Quinta ou Sábado`).
    *(Nunca usar colchetes ou frações como `[Obrigatório 1/3]`).*

### 3.2 Ordem Canônica dos Exercícios e Arquitetura da Sessão (Regra Rígida de Estabilidade e SNC)
O treinador adota uma progressão estrita de estabilidade mecânica e demanda neural ao longo da sessão de treino:

1. **Abertura da Sessão — O Exercício Livre Mais Instável ou de Maior Carga Total / Demanda do SNC:**
   - A sessão **SEMPRE** inicia pelo movimento multiarticular livre com maior grau de liberdade/instabilidade OU pelo exercício que mobiliza a maior tonelagem/carga total e máxima exigência do Sistema Nervoso Central (SNC).
   - *Exemplos:* Agachamento Livre com Barra, Levantamento Terra, Supino Reto com Barra/Halteres, Remada Curvada com Barra.
   - *Fundamento:* Executado no ápice do frescor neural e coordenação intermuscular, quando a capacidade de estabilização postural ativa está intacta.
2. **Miolo da Sessão — Transição para Exercícios Mais Estáveis em Máquinas Pesadas:**
   - Conforme a musculatura estabilizadora profunda e o SNC acumulam fadiga primária, a sessão migra para exercícios multiarticulares pesados em máquinas guiadas ou articuladas.
   - *Exemplos:* Leg Press 45º, Hack Squat, Chest Press articulado, Remada articulada ou com apoio no peito.
   - *Fundamento:* A máquina fornece estabilidade externa e trajetória fixa, permitindo que o aluno aplique esforço mecânico máximo nas fibras alvo sem risco de colapso de postura ou lesão por perda de equilíbrio.
3. **Fechamento da Sessão — Isoladores Uniarticulares e Cabos/Polias:**
   - Exercícios isoladores, polias e finalizadores metabólicos encerram o treino.
   - *Exemplos:* Cadeira Extensora, Tríceps Corda, Elevação Lateral no cabo, Crucifixo no Crossover, Mesa Flexora.
   - *Fundamento:* Risco zero de falha estrutural sistêmica; foco em acúmulo de estresse metabólico e fadiga localizada na musculatura alvo.
4. **Trabalhos Acessórios & Cardio:**
   - Panturrilhas, abdômen e antebraço (se presentes) ou cardio/condicionamento ao final da sessão, sem comprometer a integridade dos blocos de força e hipertrofia.

---

### 3.3 Perfil de Resistência e Ênfase em Alongamento (DOMS & Recovery Management)
- **Fisiologia do Dano Muscular:** Exercícios cujo perfil de resistência (torque / curva de força) impõe a maior sobrecarga mecânica na posição de **máximo alongamento muscular** (lengthened position / stretch-mediated hypertrophy) causam comprovadamente microlesões sarcoplasmáticas severas e alta dor muscular de início tardio (**DOMS** - Delayed Onset Muscle Soreness).
- *Exercícios Típicos de Pico em Alongamento:* RDL / Stiff com halteres ou barra, Agachamento Búlgaro profundo com passada longa, Pullover, Crucifixo com halteres em amplitude total, Tríceps Francês / Overhead, Crossover na polia alta com extensão posterior de braços, Rosca Bayesian no cabo.
- **Regra de Programação Semanal:**
  - Exercícios com perfil de pico em alongamento **DEVEM** ser posicionados preferencialmente nas sessões que antecedem a **maior janela de descanso semanal** do aluno (ex.: última sessão antes do fim de semana, ou quando houver uma folga de 72h+ até o próximo treino que recrute direta ou indiretamente aquele grupamento).
  - ❌ **PROIBIDO:** Posicionar exercícios com alta sobrecarga em alongamento imediatamente antes de um intervalo curto de 48h para o mesmo grupo muscular ou grupos fortemente sinergistas.

---

### 3.4 Regra de Ouro da Varredura Biomecânica: 1 Exercício por Padrão Articular na Sessão e Distribuição ao Longo da Semana
Para maximizar o estímulo hipertrófico em todas as porções musculares sem gerar sobrecarga cumulativa desnecessária em tendões e ligamentos:
- **Regra:** Em cada sessão, prescrever **apenas 1 exercício por padrão de movimento articular**. É estritamente proibido empilhar múltiplos exercícios que repliquem a mesma cinemática articular e o mesmo vetor de força na mesma sessão.
- **Repertório Teórico de Padrões Articulares vs. Prescrição Real Distribuída:**
  - *Nota sobre os 5 Padrões de Peitoral/Empurrar:* Os 5 exercícios clássicos (*1. Supino Reto [adução horizontal livre/SNC], 2. Crucifixo Máquina/Peck Deck [adução horizontal isolada guiada], 3. Desenvolvimento Máquina [flexão/abdução vertical guiada], 4. Pullover Halter/Máquina [extensão sagital], 5. Crossover Polia Alta [adução diagonal descendente]*) ilustram os 5 padrões articulares disponíveis para cobrir todas as porções anatômicas caso houvesse uma sessão exclusiva. Porém, **na prática o treinador NÃO prescreve um treino completo de 5 exercícios de um único músculo na mesma sessão**.
  - **Regra Prática do Treinador — Separar e Distribuir os Padrões ao Longo das Sessões da Semana:**
    - *Exemplo Prático Empurrar (Peito/Ombro):* Em uma sessão da semana utiliza **Supino Inclinado + Elevação Frontal** (ou Crucifixo/Crossover); na outra sessão da semana utiliza **Supino Reto + Desenvolvimento**. Assim, **nunca** se coloca *Supino Inclinado + Desenvolvimento* no mesmo dia (ambos compartilham o vetor de empurrar vertical-inclinado sobre o feixe clavicular e deltóide anterior).
    - *Exemplo Prático Costas (Puxar):* **Nunca** colocar duas puxadas verticais na mesma sessão (ex.: *Puxada Aberta + Puxada Fechada/Triângulo* no mesmo dia, mesmo com pegadas diferentes). Colocar **1 tipo de Puxada Vertical + Remada(s)** em uma sessão da semana, e **o outro tipo de Puxada Vertical + outro padrão de Remada** na outra sessão da semana.
    - *Extrapolação Obrigatória para Todos os Grupos Musculares (Pernas, Costas, Peito, Ombros, Braços):* Cabe ao agente separar os padrões de movimento articular em todos os grupamentos (ex.: em Pernas, separar e distribuir padrões de Agachamento/Leg Press, Hinge/Stiff/RDL, Cadeira Flexora [isquiotibiais em posição alongada] vs. Mesa Flexora [isquiotibiais em posição encurtada], Cadeira Extensora [reto femoral], Abdutora/Adutora) para que **nenhuma sessão tenha padrões redundantes** e **todas as porções musculares sejam estimuladas de forma complementar ao longo da semana**.

#### 3.4.1 Arquitetura Canônica dos Treinos de Inferiores (Proibição de Isolar 100% Anterior e Posterior)
O treinador **NÃO gosta de isolar exclusivamente Anterior (Quadríceps) e Posterior (Isquiotibiais/Glúteos)** em treinos de pernas, devido à quantidade limitada de padrões de movimento articular distintos possíveis para membros inferiores. Todo treino de inferiores trabalha a perna de forma integrada, variando a **ênfase** da sessão através da seleção de padrões.

> ⚠️ **Diretrizes Anti-Viés, Ordem Flexível e Equilíbrio Frequência × Volume Semanal:**
> - **A ordem em que os padrões estão listados abaixo NÃO é a ordem obrigatória de montagem da sessão:** A sequência real dentro do treino deve obedecer à **Regra 3.2 (Estabilidade e SNC: Livre/Mais Instável ou Maior Carga -> Máquina Guiada Pesada -> Isoladores/Cabos -> Acessórios)** e à prioridade muscular do dia.
> - **Equilíbrio entre Frequência de Estímulo e Volume Semanal (`muscle_weights`):** Como quadríceps, posteriores e glúteos recebem estímulos distribuídos em múltiplas sessões da semana, é fundamental calibrar o número de exercícios e séries por sessão em função da frequência semanal, fechando a meta de **12 a 20 séries semanais ponderadas** nos grupos foco sem gerar volume excessivo.
> - **Variedade de Repertório (Evitar Repetir Sempre o Mesmo Treino):** Alternar entre as opções do catálogo conforme o perfil, histórico, equipamentos e preferências de cada aluno:
>   - *Padrões de Agachamento / Dominância de Joelho:* `Agachamento Barra` (livre), `Agachamento - Smith`, `Leg Press 45° Tradicional`, `Leg Press Horizontal`, `Agachamento Hack`, `Agachamento Pêndulo`, `Agachamento Sumô - Halteres` / `Barra`, `Agachamento Goblet com Halter`, `Agachamento Búlgaro com Halteres` / `Smith`, `Afundo com Halteres` / `Barra`, `Afundo Reverso com Halteres` / `Barra`, `Avanço com Halteres`, `Subida no Banco com Halteres (Step-Up)`.
>   - *Padrões de Extensão de Joelho Puro:* `Cadeira Extensora Máquina` (padrão geral). *(Nota: **`Cadeira Extensora Unilateral` é restrita exclusivamente a alunos com dores articulares, queixas patelares ou problemas/assimetrias específicos**).*
>   - *Padrões de Hinge / Extensão de Quadril:* `Stiff / RDL Barra`, `Stiff / RDL - Halteres`, `Stiff - Smith`, `Levantamento Terra Barra`, `Levantamento Terra Sumô`, `Levantamento Terra - Trap bar`, `Elevação Pélvica Máquina`, `Elevação Pélvica no Smith Machine`, `Elevação Pélvica com Barra`, `Hiperextensão no Banco Romano` / `Extensão Lombar - Hiperextensão`.
>   - *Padrões de Flexão de Joelho Puro:* `Cadeira Flexora Máquina`, `Mesa Flexora Máquina`, `Flexora em Pé - Máquina`, `Flexão de Perna Unilateral em Pé com Caneleira`.
>   - *Padrões de Adução de Quadril:* `Cadeira Adutora` / `Cadeira Adutora na Máquina` (ou composto sinergista como `Agachamento Sumô`).
>   - *Isolados de Glúteo / Abdução:* `Glúteo na Polia`, `Glúteo Coice no Cabo na Polia Baixa`, `Glúteo Máquina`, `Cadeira Abdutora na Máquina`, `Glúteo em 4 Apoios com Caneleira no Banco`.
>   - *Isolados de Panturrilha:* Preferência por `Extensão de Panturrilha Máquina` ou `Cadeira Solear Panturrilha Sentado` (outras opções de variação: `Panturrilha no Leg Press`, `Panturrilha em Pé - Máquina` / `Smith` / `Halteres`).

1. **Treino de Inferiores com Ênfase em Anterior (Quadríceps):**
   - Mesmo com foco em anterior, **sempre inclui estímulo para posterior e adução**.
   - **Padrões de Movimento a Incluir na Sessão (ordem definida pela estabilidade/SNC):**
     - **1 Padrão de Movimento de Agachamento:** ex.: `Agachamento Barra`, `Agachamento - Smith`, `Leg Press 45° Tradicional`, `Leg Press Horizontal`, `Agachamento Hack`, `Afundo com Halteres`, `Agachamento Búlgaro`, `Agachamento Sumô`, etc.
     - **Complementar de Anterior (quando o volume semanal exigir):** Pode repetir mais **1 padrão complementar de Agachamento ou Extensão de Joelho** (ex.: combinar um agachamento livre/Smith/Hack com um `Leg Press 45° Tradicional` ou uma variação unilateral como `Afundo`/`Búlgaro`).
     - **1 Padrão de Extensão de Joelho Puro:** `Cadeira Extensora Máquina` *(usar `Cadeira Extensora Unilateral` apenas se o aluno tiver dores articulares ou problemas específicos)*.
     - **1 Padrão de Flexão de Joelho Puro (Estímulo de Posterior):** `Cadeira Flexora Máquina`, `Mesa Flexora Máquina` ou `Flexora em Pé - Máquina`.
     - **1 Padrão de Adução de Quadril:** `Cadeira Adutora`.
     - **1 Exercício Isolado para Panturrilha:** Preferencialmente `Extensão de Panturrilha Máquina` ou `Cadeira Solear Panturrilha Sentado` (ou `Panturrilha no Leg Press` / `Panturrilha em Pé`).

2. **Treino de Inferiores com Ênfase em Posterior & Glúteos:**
   - Mesmo com foco em posterior, **ainda inclui exercício(s) para a parte anterior** (`Cadeira Extensora Máquina` — ou `Cadeira Extensora Unilateral` apenas para alunos com dores articulares/problemas específicos — e, **se o volume semanal exigir, incluir também um `Leg Press 45° Tradicional`** ou variação equivalente).
   - Ao invés de basear o treino em múltiplos padrões de agachamento, os padrões da sessão englobam (ordem definida pela estabilidade/SNC):
     - **Padrão de Hinge / Extensão de Quadril:** ex.: `Stiff / RDL Barra` ou `Halteres`, `Levantamento Terra`, `Elevação Pélvica Máquina`, `Hiperextensão no Banco Romano`.
     - **1 Padrão de Flexão de Joelho Puro:** `Mesa Flexora Máquina`, `Cadeira Flexora Máquina` ou `Flexora em Pé - Máquina`.
     - **Isolado de Glúteo (Especialmente para Mulheres):** `Glúteo na Polia` ou `Glúteo Máquina` (podendo incluir `Cadeira Abdutora na Máquina` conforme objetivo/volume).
     - **Estímulo para Anterior:** `Cadeira Extensora Máquina` (ou `Cadeira Extensora Unilateral` somente em casos de dor articular/específicos) + **se o volume semanal exigir, incluir `Leg Press 45° Tradicional`** (ou variação de agachamento/passada compatível).
     - **1 Exercício Isolado para Panturrilha:** Preferencialmente `Extensão de Panturrilha Máquina` ou `Cadeira Solear Panturrilha Sentado`.

---

### 3.5 Seleção e Adição de Novos Exercícios (Skills Complementares)
- **Consulta inicial:** Sempre buscar primeiro no catálogo ativo (`exercises` com `is_archived = false`), priorizando variações que o aluno tolera, gosta e consegue executar com os equipamentos disponíveis.
- **Pragmatismo de Setup e Conveniência de Academia (Aderência Máxima):**
  - **Elevação Pélvica:** Se a academia do aluno possui máquina de elevação pélvica, **SEMPRE** prescrever `Elevação Pélvica Máquina` em vez de barra livre no banco (`Elevação Pélvica com Barra no Banco`). Montar barra com anilhas no banco livre gera atrito logístico imenso, cansaço antes da série e risco de desistência da aluna. Máquina fornece setup imediato, estabilidade e facilidade para progredir carga.
  - **Simplicidade dos Movimentos (Sem Firulas Desnecessárias):**
    - Preferir variações clássicas e consolidadas: `Rosca Martelo - Halteres` em vez de variações cruzadas (`Cross Body Rosca Martelo`); `Supino Reto - Máquina` em vez de títulos longos prolixos; `Puxada Neutra` direta quando for o estímulo vertical neutro.
  - **Intensidade no Abdômen (Sobrecarga Mensurável):**
    - Em fases de intensificação de força/hipertrofia de core, priorizar `Abdominal Máquina` (com seletor de placas) ou polia com carga, em vez de exercícios livres deitados no banco reto sem sobrecarga progressiva.
  - **Tratamento de Peso Corporal, Cargas Declaradas na Anamnese e Máquinas Sem Histórico (`weight_target: null`):**
    - **Peso Corporal:** Exercícios executados com o peso corporal (Pranchas, Body Saw, Elevação de pernas): cadastrar estritamente `weight_target: null` (e NUNCA `0 kg`), evitando que a interface do app exiba "0 kg" estranho para o aluno.
    - **Cargas Declaradas na Anamnese (`cargasRecentes`):** Se o aluno informou carga e repetições recentes para um exercício equivalente (ou padrão mecânico muito próximo), usar esse dado para calibrar séries preparatórias e propor carga inicial coerente ao coach.
    - **Máquinas sem Histórico do Aluno:** Para máquinas em que o aluno **não tem nenhum histórico registrado nem carga declarada na anamnese** e **não fez nenhum exercício muito parecido** (ex.: migrar de peso livre como `Elevação Pélvica com Barra` para `Elevação Pélvica Máquina`, de `Desenvolvimento com Halteres` para `Desenvolvimento Sentado Máquina`, ou estrear em `Abdominal Máquina`), deixar **`weight_target: null`** para que o aluno descubra e registre a carga real da máquina na primeira sessão, sem chutes arbitrários.
- **Exercício não encontrado no banco:** Se o agente quiser prescrever um exercício específico que **ainda não existe no banco de dados**, ele pode e deve utilizar em conjunto as skills do ecossistema Fitcoach para cadastrá-lo de forma canônica antes de vinculá-lo à rotina:
  1. **`exercise-sync-forge`**: automação ponta a ponta para encontrar o exercício em bases de referência, validar visualmente, baixar o GIF/vídeo, aplicar upscaling HD vetorizado (xBR2x 360x360 px, curvas limpas, zero dithering), traduzir, calcular pesos musculares (`muscle_weights`) e persistir no Supabase (incluindo git push automático de GIFs).
  2. **`exercise-instruction-standardizer`**: padronização biomecânica e redação pedagógica completa nas 4 seções canônicas (*Preparação*, *Execução Passo a Passo*, *Onde Sentir*, *Erros Comuns*), tom acessível para iniciantes e formato compatível com os parsers do aplicativo.

---

## 4. Séries, cargas, tempos de descanso, métodos especiais e anotações (`coach_notes`)

### 4.1 As 4 Faixas Canônicas de Repetições e Tempos de Descanso (`rest_seconds`)
O treinador prioriza **faixas de repetições mais amplas (longas)** para garantir que a progressão de carga (Double Progression) seja sólida, técnica e estável, evitando saltos de peso prematuros que deterioram a execução.

| Faixa Canônica | Descanso Canônico (`rest_seconds`) | Aplicação Biomecânica & Justificativa | Exemplos Canônicos de Exercícios |
| :--- | :--- | :--- | :--- |
| **`5–9 reps`** | **120 a 150s** | **Exercícios livres pesados com alta demanda do SNC:** Movimentos multiarticulares compostos livres onde a estabilização ativa e a fadiga neural são máximas. Faixa ideal para focar em tensão mecânica alta e recrutamento motor sem sobrecarga metabólica precoce. | Agachamento livre com barra, Levantamento Terra, Supino reto pesado com barra/halteres, Remada curvada livre. |
| **`6–10 reps`** | **90 a 120s** | **Máquinas pesadas e pesos livres com estabilidade guiada:** Movimentos multiarticulares em máquinas articuladas ou no Smith, onde a trajetória é estável e permite sobrecarga progressiva com alta segurança articular. | Leg Press 45º, Hack Squat, Chest Press na máquina, Remada articulada ou com apoio no peito. |
| **`8–12 reps`** | **60 a 90s** | **Isoladores uniarticulares e exercícios em cabos/polias:** Movimentos que isolam feixes específicos com tensão contínua. Faixa áurea para hipertrofia com baixo estresse articular e excelente conexão mente-músculo. | Cadeira extensora, Mesa flexora, Elevação lateral, Tríceps na polia, Rosca bíceps, Crossover. |
| **`10–15 reps`** | **60 a 75s** | **Prescrição Estratégica Adaptativa (Dificuldade de Progressão ou Técnica):** Aplicada especificamente quando o treinador identifica (via dossiê, feedbacks ou questionários) que o aluno tem **dificuldade em progredir cargas mantendo a técnica limpa**, para consolidação de padrão motor, proteção articular ou quando o degrau mínimo da máquina/halteres é grande demais. | Alunos com queixa de instabilidade articular, transição de exercícios novos ou máquinas com degrau de 5kg+. |

- **Individualidade Biológica nos Tempos de Descanso (`rest_seconds`):**
  - Quanto maior a **carga absoluta** mobilizada pelo aluno (tonelagem e estresse sistêmico), maior deve ser o tempo de recuperação dentro da faixa canônica (próximo ao teto da faixa).
  - **Mulheres normalmente descansam menos** (mais próximas ao piso da faixa canônica) devido à menor carga absoluta mobilizada e à recuperação metabólica inter-séries fisiologicamente mais rápida.

---

### 4.2 Tipos de série (`type`) e Arquitetura Real de Aquecimento, Feeders e Trabalho
- `warmup`: aquecimento articular/neural, em geral com carga leve (40–50% do peso de trabalho) e **número fixo de repetições** (ex.: `'10'` ou `'12'`, ou `'8'` em compostos pesados — **NUNCA colocar faixa de repetições como `'10-12'`**), descanso de **60s**. Fundo amarelo suave no app.
- `preparation`: preparatória/feeder, com carga próxima à de trabalho (65–85% escalonado) e **número fixo de poucas repetições** (ex.: `'5'`, `'4'` ou `'6'`, ou escalonado como `'5'` e `'3'` / `'4'` e `'2'` quando houver múltiplos feeders — **NUNCA colocar faixa de repetições como `'4-6'`**), recrutando unidades motoras e acostumando tendões/SNC ao peso sem gerar fadiga metabólica, descanso de **60 a 90s**. Fundo azul suave no app.
- `working`: séries de trabalho dentro da faixa de repetições canônica escolhida (`5–9`, `6–10`, `8–12` ou `10–15`), com esforço planejado (RPE 7 a 9) e descanso canônico da faixa (**60 a 150s**). Fundo padrão limpo no app.
- `failure`: até a falha mecânica concêntrica, apenas quando o coach decidir e o exercício for estritamente seguro para isso.
- `backoff`: série complementar com carga 10–20% menor logo após as séries pesadas principais, para acumular volume seguro sem sobrecarga articular. Fundo verde esmeralda suave no app.

#### Arquitetura Prática de Prescrição de Séries na Sessão:
1. **1º Exercício de cada grupo muscular grande da sessão:**
   - Prescrever **1 série de `warmup`** + **1 a 3 séries de `preparation` (feeders)** antes das séries `working`.
   - *Como definir o número de feeders (1 a 3):* Depende diretamente da **carga total máxima** mobilizada pelo aluno naquele exercício:
     - Alunos muito fortes que movimentam cargas absolutas altas (ex.: Agachamento/Leg Press muito pesado, Supino pesado) recebem **2 a 3 séries de `preparation` (feeders)** escalonando o peso progressivamente até a carga de trabalho.
     - Alunos iniciantes/intermediários com cargas absolutas moderadas ou baixas recebem **1 série de `preparation` (feeder)**.
2. **2º Exercício do mesmo grupo muscular na sessão:**
   - Depende da força/carga absoluta do aluno:
     - Se for um aluno forte que pega bastante peso: prescrever **1 série de `preparation` (feeder)** para ajuste neural/articular na nova trajetória antes das séries `working`.
     - Se o aluno ainda pega pouco peso: ir **direto para as séries de trabalho (`working`)**, pois a musculatura e as articulações já estão aquecidas pelo 1º exercício.
3. **Demais exercícios da sessão e isoladores:**
   - Ir **direto para as séries de trabalho (`working`)**, sem séries de aquecimento ou preparação redundantes.
4. **Volume de séries de trabalho (`working`) por exercício:**
   - Use **até 3 séries válidas por exercício**, incluindo séries de falha e séries com método especial. Quando precisar de quatro séries para o mesmo grupo, prefira duas em cada um de dois exercícios com estímulos complementares. Conte aquecimentos e preparatórias à parte.

---

### 4.3 Séries especiais e métodos de intensificação (Regras de Prudência e Pontualidade)

> ⚠️ **REGRA DE OURO DA INTENSIFICAÇÃO:**  
> **80% a 90% das séries de qualquer rotina DEVEM ser séries normais (straight sets) com foco em sobrecarga progressiva e execução sólida.**  
> Séries especiais e métodos de intensificação são ferramentas **estritamente pontuais e cirúrgicas** (um "tempero"), usadas para quebrar platôs, otimizar tempo ou gerar pico metabólico no final do treino. **NUNCA** devem ser colocadas em vários exercícios ou espalhadas pelo treino inteiro. Prescrever métodos em excesso atrapalha o registro de evolução de cargas, sobrecarrega a recuperação e eleva o risco de lesões.

#### 4.3.1 Tierlist Pessoal de Métodos de Intensificação do Treinador
Sempre que houver justificativa técnica para prescrever um método especial ou técnica de intensificação (respeitando o teto de no máximo 1 técnica por grupo muscular e 1–2 por sessão inteira), a seleção **DEVE priorizar rigorosamente a hierarquia de preferência do treinador**:

| Tier | Métodos | Diretrizes e Aplicação Biomecânica |
| :--- | :--- | :--- |
| **Tier 1 (Prioridade Máxima)** | **Muscle Round, Rest-Pause, Cluster Sets, Myo-Reps** | Os métodos preferidos do treinador para quebra de platô e acúmulo de repetições efetivas de alta qualidade com micropausas, mantendo excelente controle de carga em máquinas pesadas guiadas e isoladores. |
| **Tier 2 (Alta Prioridade)** | **Biset (`superset`), Pareado Antagonista (`paired_antagonist`), Deadstop Reps** | Métodos consolidados para aumento de densidade, otimização do tempo da sessão (Biset/Pareado) ou eliminação de inércia elástica e impulso (`deadstop`). |
| **Tier 3 (Contextual / Específico)** | **Cadência Controlada (`tempo`), Repetições com Pausa (`pause_reps`), Repetições Forçadas (`forced_reps`)** | Ferramentas cirúrgicas. `tempo` e `pause_reps` são ideais para alívio de queixas articulares e aprendizado motor. <br>⚠️ **Regra Rígida de Segurança para Repetições Forçadas:** Só prescrever se o aluno **explicitou no dossiê/anamnese que treina acompanhado por parceiro ou personal trainer (spotter presente)**. Jamais prescrever para quem treina sozinho pelo risco iminente de acidente. |
| **Tier 4 (Uso Excepcional / Raríssimo)** | **Dropset** *(quase nunca / restrição rígida de máquina)*, **Triset, Giant Set, Ponto Zero** | Reservados apenas para cenários excepcionais ou sob autorização explícita do coach. |

#### 4.3.2 Diretrizes de Uso Pontual:
1. **Nível do Aluno:**
   - **Iniciantes (menos de 6 meses):** **NÃO prescrever** métodos de alta fadiga (Dropset, Rest-Pause, Myo-Reps, Cluster). O iniciante precisa consolidar padrão motor e progredir em séries normais. A única exceção é cadência controlada (`execution_mode: 'tempo'`) para aprender o movimento ou proteger articulações.
   - **Intermediários (6 meses a 2 anos):** No máximo **1 método pontual por treino**, preferencialmente no último exercício isolador ou última série de máquina guiada.
   - **Avançados (+2 anos):** No máximo **1 a 2 métodos pontuais por sessão completa**.
2. **A Regra de Ouro do Dropset (Uso Raríssimo & Apenas em Máquinas de Seletor/Pinos):**
   - O Dropset deve ser usado **raramente (quase nunca)**.
   - **Condição Técnica Obrigatória:** Quando prescrito, SÓ pode ser aplicado em **máquinas com seletor de peso / pinos de placas (sem anilhas)** (ex.: Cadeira Extensora com torre de tijolos/placas).
   - ❌ **TERMINANTEMENTE PROIBIDO:** Em qualquer máquina carregada por anilhas (Leg Press 45º, Hack Squat de anilhas, Smith Machine), halteres ou barras. O aluno nunca deve ficar descarregando anilhas manualmente com a musculatura exausta.
3. **Preferência Rígida por Rest-Pause em Panturrilhas e Máquinas Guiadas (Rest-Pause > Dropset):**
   - **Panturrilhas (Leg Press, Solear, Smith):** O treinador prefere **estritamente Rest-Pause** na última série pesada de panturrilha em vez de Dropset. O Rest-Pause mantém a alta tensão mecânica da carga pesada (estímulo chave para panturrilha) e exige apenas uma pausa de 15s sem descer do aparelho, evitando o atrito de ter que descer para trocar pinos ou anilhas rapidamente enquanto a musculatura queima.
   - **Rest-Pause Duplo (2 blocos):** Em remadas ou máquinas guiadas pesadas, pode ser orientado na nota para 2 passagens ("na última série: chegue próximo da falha, descanse 15 segundos e complete mais 3 repetições, duas vezes").
   - **Elevação Lateral:** Evitar forçar Dropset; priorizar séries normais (`standard`) com progressão estável de carga para não degradar a técnica do deltóide lateral.
4. **Tetos de Prescrição:**
   - No máximo **1 técnica de intensificação por grupo muscular**.
   - No máximo **1 a 2 métodos especiais na sessão de treino inteira**.
   - Se já utilizou um Biset para economizar tempo, evite adicionar outros métodos na mesma sessão.
5. **Proibição de Empilhamento:**
   - **Nunca misturar mais de um método no mesmo exercício** (ex.: não prescrever Rest-Pause + Dropset juntos). Escolha apenas um método onde houver justificativa clara.
6. **Posicionamento Canônico:**
   - Métodos de esgotamento e alta fadiga (Rest-Pause, Myo-Reps, ou raramente Dropset) entram **exclusivamente na última série do último exercício** do grupo muscular (ex.: Séries 1 e 2 normais de trabalho; Série 3 com Rest-Pause).
7. **ZONAS PROIBIDAS (Segurança):**
   - **NUNCA** prescrever Rest-Pause, Dropset, Myo-Reps ou falha extrema em compostos multiarticulares livres pesados:
     - ❌ Agachamento Livre com Barra
     - ❌ Levantamento Terra / Stiff Livre Pesado
     - ❌ Supino Livre Reto/Inclinado com Barra ou Halteres Pesados
     - ❌ Remada Curvada Livre Pesada
   - **Onde prescrever com segurança:** Apenas em máquinas guiadas/articuladas (Smith, Hack, Leg Press, Chest Press guiado), polias e cabos (Extensora, Flexora, Elevação Lateral no cabo, Tríceps corda) ou exercícios com apoio estável de tronco.

---

#### Mapeamento das 4 Camadas no Fitcoach:

1. **Camada 1 — Agrupamento Estrutural (`exercise_groups`):**
   - `superset` (Biset): 2 exercícios consecutivos sem descanso entre eles.
     - *Quando usar:* Quando o aluno tem pouco tempo de treino (ex.: sessões de 40–50 min) e para grupos musculares **antagonistas** (ex.: Bíceps na Polia + Tríceps Corda) ou para panturrilha/abdômen ao final do treino. O descanso do grupo (`rest_seconds`, ex.: 60–90s) ocorre apenas após concluir os dois exercícios.
     - *Regra Mandatória de Rounds:* O campo `rounds` de `exercise_groups` **DEVE ser igual ao número total de séries** prescritas para os exercícios do grupo. Se os exercícios têm 1 série preparatória + 3 de trabalho (4 séries totais), o grupo DEVE ser configurado com `rounds: 4`, garantindo que o app execute todas as passagens sem cortar a última série.
   - `paired_antagonist`: 2 exercícios executados alternadamente com descanso entre cada um (ex.: Supino Máquina → desc. 75s → Remada Apoiada → desc. 75s). Economiza tempo mantendo alta capacidade de carga.
   - `triset` / `giant_set`: Uso excepcional, restrito a circuitos rápidos de abdômen ou treinos funcionais curtos.

2. **Camada 2 — Método de Série (`workout_sets.set_method`):**
   - `rest_pause`: Série pesada até falha técnica → pausa curta de 10–15s → repetições adicionais → pausa → repetições finais (`sub_sets: 2`, `micro_rest_seconds: 15`). **Obrigatório preencher `sub_sets` e `micro_rest_seconds` no banco**. Aplicar na última série de máquinas guiadas estáveis e panturrilhas.
   - `cluster`: Série pesada dividida em mini-blocos com 15–25s de descanso entre eles (`micro_rest_seconds: 20`).
   - `myo_reps`: 1 série ativadora de 12–15 reps + 3 a 4 mini-séries de 3–5 reps com 5s de pausa. Apenas em isoladores leves.
   - `muscle_round`: 6 mini-séries de 4 reps com 10s de pausa rígida.
   - `backoff`: Série regressiva mais leve (10–20% menos peso) após séries pesadas principais, acumulando volume sem sobrecarregar articulações.
   - `dropset`: Uso raríssimo (quase nunca), restrito exclusivamente a máquinas com seletor de peso/pinos (sem anilhas), com `drop_count: 1` ou `2`.

3. **Camada 3 — Modo de Execução Biomecânica (`workout_sets.execution_mode`):**
   - `tempo`: Cadência controlada (ex.: `tempo: '3-0-1-0'` = 3s descida excêntrica, 0s pausa embaixo, 1s subida, 0s repouso em cima). **Ferramenta ideal para queixas articulares (joelho, ombro)**: reduz a carga necessária mantendo tensão alta e eliminando impactos.
   - `pause_reps`: Pausa de 2–3s no ponto de maior alongamento ativo sob tensão (ex.: Leg Press, Puxada).
   - `deadstop`: Repouso completo no ponto morto para eliminar impulso e energia elástica.
   - `ponto_zero`: Pausa no ponto de maior estiramento muscular.

4. **Camada 4 — Cronometragem (`workout_sets.timer_mode`):**
   - `standard`: Padrão para quase todos os treinos.
   - `emom` / `amrap` / `tabata`: Reservados pontualmente para condicionamento ao final da sessão.

---

### 4.4 Anotações do coach (`coach_notes`) — Critério Estrito de Especificidade do Aluno

> ⚠️ **PRINCÍPIO FUNDAMENTAL DAS ANOTAÇÕES:**  
> **O próprio exercício no app Fitcoach já possui instruções pedagógicas completas** (Preparação, Execução Passo a Passo, Onde Sentir, Erros Comuns e GIF/vídeo demonstrativo). Portanto, **NÃO prescrever anotação redundante em todos os exercícios**.  
> As anotações (`coach_notes`) **DEVEM ser usadas APENAS E TÃO SOMENTE quando a execução ou o ajuste for mais específico para o caso particular daquele aluno**. Se a execução do aluno for a padrão normal do exercício, **`coach_notes` DEVE ser `null` (vazio)**.

Quando houver uma justificativa específica do aluno, aplicar as seguintes diretrizes:

1. **Ajuste Físico e Regulagem de Setup Individual (Prioridade Máxima):**
   - Altura específica da polia no cabo para o biotipo ou objetivo do aluno:
     - *"Polia na altura do joelho."* (ex.: Elevação lateral no cabo).
     - *"Polia na altura da cintura."* (ex.: Tríceps francês no cabo).
   - Ajuste de banco para proteção articular (ex.: lipedema / queixa patelar):
     - *"Banco alto."* (para bike estacionária, aliviando o joelho).
2. **Adaptação Biomecânica Específica para Restrições ou Queixas do Aluno:**
   - Limitação de amplitude personalizada para evitar dor:
     - *"Sem voltar o pé ao máximo da maquina nem esticar tudo em cima. Segure 2s no ponto alto."* (Cadeira Extensora para alívio patelofemoral).
     - *"Pés ligeiramente à frente da linha da barra (10 a 15 cm à frente). Desça em 3 segundos controlados e suba com força nos calcanhares."* (Smith).
     - *"Pés na METADE SUPERIOR da plataforma. Não trave os joelhos."* (Leg Press).
3. **Pistas Motoras Curtas e Diretas de Academia (Quando Necessárias para a Aluna):**
   - *"Desça até a altura do queixo."* (Desenvolvimento Máquina).
   - *"Flexione com intensidade até bater na bunda."* (Mesa Flexora).
   - *"Puxe o triângulo em direção ao início do peitoral até passar as mãos do queixo, ao voltar não precisa esticar o braço completamente nem soltar a escapula lá em cima."* (Puxada Neutra).
4. **Calibração Encorajadora Pontual de Cargas:**
   - *"Tente aumentar a carga pro abdômen trabalhar mais."*
   - *"Tente subir a carga para 40kg!"*
   - *"Na última série: faça até a falha técnica, descanse 15 segundos e faça mais 2 a 3 repetições!"* (instrução do Rest-Pause).
5. **O que NUNCA colocar (Regras Anti-AI-Slop de Linguagem):**
   - ❌ **Notas redundantes em exercícios básicos e intuitivos** (Supino Máquina, Rosca Martelo, Tríceps V, Abdominal Máquina, Esteira básica): manter `coach_notes: null`.
   - ❌ **Frases "vendedoras" ou justificativas genéricas explicando o benefício do exercício** (ex.: *"Excelente pra firmar a linha de cintura"*, *"Trabalha bem a lateral sem forçar"*). A nota diz **o que ajustar ou fazer**, não vende o exercício para o aluno.
   - ❌ **Metáforas ou analogias artificiais de IA** (ex.: *"como se fosse fechar o zíper de uma calça justa"*). Usar linguagem direta de academia.
   - ❌ Parágrafos longos descrevendo passo a passo do movimento (ex.: "deite no chão, segure o halter na mão direita..."). As instruções da skill `exercise-instruction-standardizer` já cumprem esse papel no app.
   - ❌ Explicações teóricas ou jargões anatômicos acadêmicos vazios ("para recrutar o feixe clavicular").
   - ❌ Cadastrar `0 kg` em exercícios de peso corporal (Body Saw, Pranchas, Abdominal Infra solo). Manter `weight_target: null`.
   - **Títulos das sessões:** preferir **`e`** em vez de **`&`** nos nomes dos treinos exibidos ao aluno (ex.: `Treino Bônus 1 - Abdômen e Cardio - Terça`).

---

## 5. Persistência no banco de dados (Supabase via session pooler)

**Pré-condição:** apresentar a rotina completa ao coach e só gravar após aprovação explícita.

### Conexão
- Ler `DATABASE_URL` do arquivo de ambiente do projeto (`.env.local` na raiz do Fitcoach).
- Ler o `coach_id` da configuração ou da sessão do coach logado, sem fixá-lo de forma rígida.
- Conectar via pooler do Supabase (porta 5432).
- Nunca exibir credenciais na conversa nem gravá-las em arquivos de rotina.

### Esquema relacional (com suporte a grupos e métodos especiais)
```sql
-- 1. Rotina template na biblioteca (ciclo padrão de 4 a 6 semanas)
INSERT INTO routines (coach_id, name, description, duration_weeks, is_template)
VALUES (:coach_id, 'Nome do Treino', '{"duration":"50-60","level":"Intermediário","frequency":"5"}', 4, true)
RETURNING id;

-- 2. Sessões da rotina (Padrão Canônico: Treino A - Foco - Dia)
INSERT INTO workouts (routine_id, name, order_index, day_number, description, duration_minutes)
VALUES (:routine_id, 'Treino A - Inferiores - Segunda', 1, 1, 'Descrição do foco', 60)
RETURNING id;

-- 3. (OPCIONAL) Grupo de exercícios quando houver Biset/Superset
INSERT INTO exercise_groups (workout_id, group_type, group_order, rest_seconds, rounds, transition_seconds, coach_notes)
VALUES (:workout_id, 'superset', 1, 90, 3, 0, 'Executar exercício A e ir imediatamente ao B sem descanso')
RETURNING id;

-- 4. Exercícios da sessão (usar apenas UUID de exercício ativo da tabela exercises)
-- Exercício solo (group_id e group_position nulos; coach_notes apenas se específico pro aluno, senão NULL):
INSERT INTO workout_items (workout_id, exercise_id, order_index, coach_notes, group_id, group_position)
VALUES (:workout_id, :exercise_id, 1, 'Pés na parte alta da plataforma', NULL, NULL)
RETURNING id;

-- Exercício agrupado em Biset:
INSERT INTO workout_items (workout_id, exercise_id, order_index, coach_notes, group_id, group_position)
VALUES (:workout_id, :exercise_id_b, 2, NULL, :group_id, 2)
RETURNING id;

-- 5. Séries do exercício (respeitando warmup 60s, preparation 60-90s e rest_seconds canônicos das faixas)
-- 1º exercício de grupo grande: 1 warmup (60s) + 1 a 3 preparation/feeders (60-90s) + working sets
-- IMPORTANTE: warmup e preparation usam SEMPRE número fixo de repetições (ex.: '10' e '5'), NUNCA faixas:
INSERT INTO workout_sets (
    workout_item_id, set_order, type, reps_target, weight_target, rest_seconds, rpe_target,
    set_method, execution_mode
)
VALUES
    (:workout_item_id, 1, 'warmup', '10', 40, 60, 5.0, 'standard', 'standard'),
    (:workout_item_id, 2, 'preparation', '5', 60, 90, 6.5, 'standard', 'standard');

-- Série normal de trabalho em exercício livre pesado (faixa 5–9, SNC alto -> descanso 120 a 150s):
INSERT INTO workout_sets (
    workout_item_id, set_order, type, reps_target, weight_target, rest_seconds, rpe_target,
    set_method, execution_mode
)
VALUES (
    :workout_item_id, 3, 'working', '5-9', 80, 150, 8.5,
    'standard', 'standard'
);

-- Série normal de trabalho em máquina pesada (faixa 6–10 -> descanso 90 a 120s):
INSERT INTO workout_sets (
    workout_item_id, set_order, type, reps_target, weight_target, rest_seconds, rpe_target,
    set_method, execution_mode
)
VALUES (
    :workout_item_id, 1, 'working', '6-10', 120, 120, 8.5,
    'standard', 'standard'
);

-- Série pontual com Rest-Pause (Tier 1) na última série de máquina guiada/isolador (OBRIGATÓRIO informar sub_sets e micro_rest_seconds):
INSERT INTO workout_sets (
    workout_item_id, set_order, type, reps_target, weight_target, rest_seconds, rpe_target,
    set_method, sub_sets, micro_rest_seconds, execution_mode
)
VALUES (
    :workout_item_id, 3, 'working', '8-12', 40, 90, 9.5,
    'rest_pause', 2, 15, 'standard'
);

-- Série adaptativa (faixa 10–15 -> descanso 60 a 75s) com Cadência Controlada para proteção articular / consolidação técnica:
INSERT INTO workout_sets (
    workout_item_id, set_order, type, reps_target, weight_target, rest_seconds, rpe_target,
    set_method, execution_mode, tempo
)
VALUES (
    :workout_item_id, 1, 'working', '10-15', 30, 75, 8.0,
    'standard', 'tempo', '3-0-1-0'
);
```

---

## 6. Checklist de execução

1. **Entrada Mandatória:** executar `view_file` no dossiê do aluno (`Fitcoach/docs/students/{slug-aluno}.md`) para absorver o perfil biomecânico, padrão de equipamentos da academia dele, histórico de queixas e PRs de cargas. Se faltarem dados, consultar o Questionários ou perguntar ao coach.
2. **Triagem, Cardio e Volume Semanal Ponderado (`muscle_weights`):**
   - Mapear objetivos, restrições, queixas e sinais de encaminhamento (seção 2C).
   - **Calibração de cardio e gasto energético:** considerar equipamentos aeróbios favoritos, eventual `aversaoCardioContinuo`, dias disponíveis para cardio, horário e janela real em minutos antes/depois da musculação (ou em horário separado).
   - Planejar **12 a 20 séries semanais ponderadas (`muscle_weights`)** para os grupos musculares foco do aluno e volume menor/manutenção para grupos fora do foco.
   - Definir ciclo de **4 a 6 semanas** (sem criar semana de Deload programada).
3. **Seleção Biomecânica, Anti-Redundância e Distribuição na Semana:**
   - Garantir **apenas 1 exercício por padrão de movimento articular** na mesma sessão e **distribuir os padrões ao longo das diferentes sessões da semana** (ex.: separar *Supino Inclinado + Elevação Frontal* em um dia e *Supino Reto + Desenvolvimento* no outro; em Costas, nunca colocar 2 puxadas verticais na mesma sessão, combinando *1 Puxada Vertical + Remada(s)* em cada sessão; extrapolar a separação de padrões para Pernas, Ombros e Braços).
   - **Arquitetura de Inferiores (NUNCA isolar 100% Anterior e Posterior; equilibrar frequência de estímulo com o volume semanal e variar exemplos sem viés):**
     - *Ênfase Anterior:* 1 padrão de agachamento (Agachamento Livre/Smith, Leg Press 45°/Horizontal, Hack, Afundo, Búlgaro, Sumô, etc.) + complementar de agachamento/extensão (se o volume exigir) + 1 extensão de joelho puro (`Cadeira Extensora Máquina`; usar `Cadeira Extensora Unilateral` apenas para alunos com dores articulares ou problemas específicos) + 1 flexão de joelho puro (`Cadeira Flexora` / `Mesa Flexora` / `Flexora em Pé`) + 1 padrão de adução (`Cadeira Adutora`) + 1 isolado para panturrilha (preferencialmente `Extensão de Panturrilha Máquina` ou `Cadeira Solear Panturrilha Sentado`).
     - *Ênfase Posterior:* Ao invés de basear em múltiplos agachamentos, colocar `Stiff / RDL` (+ `Elevação Pélvica Máquina` / `Banco Romano` se aplicável), `Mesa Flexora` (ou `Cadeira Flexora`), `Glúteo na Polia / na Máquina` (especialmente para mulheres) + estímulo para anterior (`Cadeira Extensora Máquina`, ou `Unilateral` só em caso de dor/problema específico, e **se o volume semanal exigir, incluir um `Leg Press 45° Tradicional`**) + 1 isolado para panturrilha (`Extensão de Panturrilha Máquina` ou `Cadeira Solear Panturrilha Sentado`). *(A ordem na ficha segue sempre a Regra 3.2 de estabilidade/SNC, e não a ordem textual acima).*
   - Respeitar a **progressão rígida de estabilidade e SNC**: iniciar pelo livre mais instável ou de maior carga/SNC -> transicionar para máquinas guiadas pesadas -> finalizar com isoladores e cabos.
   - Posicionar exercícios de **pico de resistência em alongamento** (RDL, Stiff, Búlgaro profundo, Pullover, Crucifixo, Tríceps Overhead) nas sessões que antecedem a maior janela de descanso semanal (72h+ ou pré-fim de semana) para gerenciar o DOMS.
   - **Pragmatismo e Conveniência de Setup:** Prescrever `Elevação Pélvica Máquina` sempre que a academia tiver o aparelho (evitando o atrito de montar barra com anilhas no chão); preferir variações limpas e diretas (`Rosca Martelo - Halteres`, `Supino Reto - Máquina`, `Puxada Neutra`); usar `Abdominal Máquina` para sobrecarga real; e cadastrar `weight_target: null` em exercícios livres de peso corporal.
   - **Nomenclatura Canônica das Sessões:**
     - **Padrão Normal (99% dos casos):** `Treino (A, B, C...) - Foco (...) - Dia (...)` (ex.: `Treino A - Inferiores - Segunda`, `Treino B - Superiores - Terça`).
     - **Exceção de Combinado Flexível:** Apenas sob orientação expressa do coach para alunos com rotina incerta, utilizar o formato limpo `Treino Obrigatório 1 — <Foco>`, `Treino Bônus 1 — <Foco>` (zero colchetes ou frações).
   - Consultar o catálogo ativo (`exercises` com `is_archived = false`). Se o exercício desejado não existir no banco, acionar **`exercise-sync-forge`** e **`exercise-instruction-standardizer`** para cadastrá-lo de forma canônica antes de vinculá-lo.
4. **Arquitetura de Séries (`warmup`, `preparation`, `working`), Faixas Canônicas, Tempos de Descanso e Métodos:**
   - **Séries de `warmup` e `preparation` com número fixo:** NUNCA usar faixas de repetições em séries de aquecimento ou preparatórias; cadastrar sempre um **número inteiro fixo** (ex.: `'10'` ou `'12'` no `warmup`; `'5'`, `'4'` ou `'6'` no `preparation`, ou escalonado como `'5'` e `'3'` quando houver mais de um feeder). Faixas de repetições são exclusivas das séries de trabalho (`working` / `backoff`).
   - **1º exercício de grupo grande da sessão:** 1 `warmup` (60s, reps fixas) + 1 a 3 `preparation` / feeders (60–90s, reps fixas, escalonado conforme a carga absoluta do aluno).
   - **2º exercício do mesmo grupo:** 1 `preparation` (reps fixas, se aluno forte/carga alta) ou direto para `working` (se carga baixa/moderada).
   - **Demais exercícios e isoladores:** direto para as séries válidas, com até três por exercício. Distribua volumes maiores entre exercícios complementares conforme a seção 4.2.
   - Aplicar estritamente as **4 faixas canônicas de repetições e seus respectivos descansos (`rest_seconds`)**:
     - `5–9 reps` (**120 a 150s** — livres pesados/SNC)
     - `6–10 reps` (**90 a 120s** — máquinas pesadas)
     - `8–12 reps` (**60 a 90s** — isoladores/cabos)
     - `10–15 reps` (**60 a 75s** — hiperextensão banco romano, panturrilhas, abdômen ou dificuldade de carga/técnica)
     - *Calibrar o descanso pela carga absoluta e individualidade biológica (mulheres normalmente mais próximas ao piso da faixa).*
   - **Métodos da Tierlist com Padrão do Coach:**
     - Priorizar **Rest-Pause** em panturrilhas e máquinas guiadas pesadas (`sub_sets: 2, micro_rest_seconds: 15` sempre preenchidos no banco).
     - **Dropset:** Usar **raramente (quase nunca)** e **estritamente em máquinas com seletor de peso/pinos (sem anilhas)**. Jamais em Leg Press, Hack de anilhas, Smith ou halteres.
     - Evitar forçar Dropset em elevação lateral (manter séries normais com progressão).
     - Garantir que a esmagadora maioria das séries (80–90%) sejam séries normais (straight sets), limitando a no máximo 1 técnica por grupo muscular e 1 a 2 por sessão inteira.
   - **Anotações (`coach_notes`):** O próprio exercício já possui instruções completas no app. Portanto, **NÃO prescrever notas redundantes em todos os exercícios**. Preencher `coach_notes` **apenas e tão somente quando houver execução ou ajuste específico pro caso do aluno** (altura da polia/banco, adaptação individual para dor/joelho, pista motora indispensável). Caso contrário, deixar `coach_notes: null`!
5. **Calibração de cargas (`weight_target`):** utilizar os PRs e cargas do dossiê como base para séries de preparação e trabalho. **Para máquinas em que o aluno não tem nenhum histórico registrado e não fez nenhum exercício muito parecido, deixar `weight_target: null`** (nunca `0 kg` e nunca chutar cargas arbitrárias de máquina desconhecida).
6. **Revisão com o Coach:** apresentar a rotina completa ao coach (nome da rotina, dias, sessões, séries, cargas, descansos e notas) e incorporar os ajustes discutidos.
7. **Gravação:** após aprovação explícita, executar o script em transação (`BEGIN ... COMMIT`), com `ROLLBACK` em caso de erro.
8. **Validação & Atualização do Dossiê:** confirmar a contagem de treinos, exercícios e séries na biblioteca (`/coach/library`) e atualizar o cabeçalho e a Seção 7 do dossiê do aluno (`Fitcoach/docs/students/{slug-aluno}.md`) registrando a nova rotina prescrita e a data da alteração.
