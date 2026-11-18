---
name: weekly-workout-adjuster
description: Prepara mensagens e perguntas para os check-ins da consultoria Fitcoach, confere quem registrou treino na semana e revisa os treinos após cada resposta. Cruza Fitcoach, Questionários e WhatsApp, propõe ajustes de carga, volume e execução e aplica as mudanças aprovadas pelo treinador.
---

# Weekly Workout Adjuster — Revisão Semanal de Treinos, Progressão e Adaptação (GQFit / Fitcoach)

## 1. Escolha a etapa solicitada

- **Quem treinou na semana.** Use a [conferência de registros](references/check-in-workflow.md#conferência-de-registros) para comparar as sessões com a lista do treinador. Respeite as exclusões e separe consultoria de personal.
- **Preparar mensagens.** Siga a [preparação do check-in](references/check-in-workflow.md#preparação-do-check-in). Entregue rascunhos e indique quem recebe link e em quais casos uma pergunta extra ajuda a decidir algo.
- **Revisar uma resposta.** Siga a [revisão após a resposta](references/check-in-workflow.md#revisão-após-a-resposta) e use as heurísticas abaixo para o aluno em pauta. Para personal, revise as cargas ou o ponto solicitado.
- **Aplicar ajustes aprovados.** Confira a prescrição atual e as mudanças manuais do treinador antes de aplicar o que foi autorizado. Releia os registros alterados e resuma o resultado.

## 2. Princípios Fundamentais

- **Aprovação.** Grave mudanças no banco somente dentro do escopo expressamente autorizado pelo treinador. A preparação de mensagens e a análise das respostas são etapas de consulta.
- **Personal.** O treinador registra sessões e feedbacks. Use as notas para a revisão solicitada, geralmente a calibração de `weight_target`. Personal fica fora da fila de questionários, mesmo quando registra treinos.
- **Progressão.** Use a execução recente e o menor incremento disponível na academia. Registre decisões e preferências duráveis no dossiê correspondente quando atualizar o acompanhamento.
- **Problemas do app.** Separe travamento, lentidão e falhas de registro das queixas de execução. Destaque os relatos técnicos em **Bugs do Fitcoach** quando forem relevantes.

---

## 3. Fontes e evidência

- **Fitcoach.** `workout_logs` mostra as sessões, `set_logs` mostra as séries registradas e `exercise_feedback_logs` contém comentários por exercício. Confira a rotina atual em `student_assignments`, `workouts`, `workout_items` e `workout_sets`.
- **Questionários.** Vincule `aluno` pelo `fitcoach_student_id` sempre que disponível. Use telefone e nome para corroborar a identidade se o vínculo estiver ausente. Confirme o tipo e a data de envio da resposta em `resposta_questionario`. Para a anamnese inicial (schemas `v1` legado e `v2` estruturado), leia `crmData.anamnese.resumo` emitido pelo `fetch_weekly_review.mjs`, considerando `agendaCombinada`, `alternancias`, `sessaoMaisPesadaSemana`, `cardio` (equipamentos favoritos, `aversaoCardioContinuo`, dias disponíveis, momento em relação ao treino na academia, janela de minutos antes/depois e horário), `maquinasConfirmadas`/`Ausentes`/`NaoSabe`, `alertasRevisaoTreinador`, `pendencias` e `perguntasSugeridasPrimeiroCheckin`, diferenciando explicitamente `"Não informado"` de `"Nenhum"`.
- **Preparação do 1º Check-in Pós-Anamnese:** Quando `recentCheckins.length === 0`, utilize `pendencias` e `perguntasSugeridasPrimeiroCheckin` da anamnese (ex.: rotina marcada como `varia`/`ainda_nao_sei`, alternâncias como quinta vs sábado, tempo real restante em dia coincidente com outro esporte, dias/horário/janela de cardio indefinidos ou aversão a cardio contínuo, máquinas marcadas como `"Não sei"`, tolerância a dor relatada ou calibração de cargas iniciais) para formular apenas perguntas que decidam ajustes reais — preservando sempre a aprovação do treinador antes de gravar qualquer ajuste ou nova pergunta.
- **WhatsApp.** Quando a conversa for relevante e estiver no escopo, siga o [procedimento de leitura](references/check-in-workflow.md#whatsapp-e-fallback). Diferencie relato direto, texto citado, rascunho do treinador e mídia sem conteúdo verificado.
- **Dossiê.** Use o histórico para entender equipamentos, preferências e decisões anteriores. Dê precedência às orientações recentes do treinador e à rotina vigente.

---

## 4. Heurísticas Técnicas de Decisão

Consulte o documento canônico `references/progression-heuristics.md` para aprofundamento.

### A. Gatilho Real de Progressão de Carga (Double Progression nas Faixas Canônicas `5–9`, `6–10`, `8–12`, `10–15`)
O treinador **NÃO exige** que o aluno bata o teto da faixa em todas as séries de trabalho (`10, 10, 10`), pois uma leve queda de 1 a 2 repetições na última série é fisiologicamente esperada sob esforço real:
- **Gatilho de Subida de Carga (Elegível para Progressão):**
  1. O aluno **bateu o teto da faixa nas 2 primeiras séries de trabalho (`working`)** e manteve a última série dentro da faixa (ex.: `10, 10, 8` ou `10, 10, 9` numa faixa `6–10`, ou `12, 12, 10` numa faixa `8–12`); **OU**
  2. A **média de repetições das séries de trabalho chegou muito perto do teto** ($\text{média} \ge \text{teto} - 0.7$, com todas as séries dentro da faixa), mantendo RPE compatível ($\le 9.0$) ou sem falha precoce caso o aluno não tenha preenchido o RPE.
  - **Ação:** Propor progressão de carga para a próxima semana, respeitando o menor incremento físico disponível no equipamento da academia do aluno.
- **Dentro da Faixa (Em Consolidação):** Se o aluno realizou `9, 8, 7 reps` numa faixa `6–10`:
  - **Ação:** Manter a carga atual. O objetivo semanal é ganhar repetições até atingir o teto nas 2 primeiras séries ou média próxima ao teto.
- **Dificuldade Recorrente de Progredir Carga ou Degrau Grande do Equipamento:**
  - Se o aluno tem dificuldade recorrente de subir carga mantendo a técnica limpa (ou o salto da máquina/halter é grande demais, como placas de 5 em 5 kg em isoladores), **sugerir migrar a faixa de repetições do exercício para `10–15 reps`** (`rest_seconds` de 60 a 75s).
- **Falha Precoce (Abaixo do Piso):** Se o aluno fez `4 reps` onde o piso era `6 reps`:
  - **Ação:** Sinalizar ao treinador para recalibrar carga ou checar fadiga acumulada / sono.

### B. A Física da Academia: Calibração de Incrementos
- **Máquinas:** Consultar o dossiê do aluno. Se a máquina tem placas de **5 em 5 kg**, propor o salto real de 5 kg (nunca propor saltos imaginários de 1 ou 2 kg se a máquina não suporta fracionamento).
- **Halteres:** Respeitar degraus usuais de **2 em 2 kg**. Subir de 18 kg para 20 kg exige consolidação prévia sólida nas 2 primeiras séries no teto com RPE ≤ 8.5.
- **Proporção Relativa:** Uma rosca subindo de 4 kg para 5 kg (+25%) em aluno iniciante é perfeitamente viável; mas de 18 kg para 20 kg (+11%) em avançado requer prudência.
- **Anilhas Livres:** Identificar pelo histórico se a academia dispõe de anilhas de 1 kg ou se o salto mínimo na barra é de 5 kg total (anilhas de 2.5 kg por lado).

### C. Triagem de Feedbacks (`workout_logs` + `exercise_feedback_logs`) e Travas Biomecânicas nas Substituições
- Quando o aluno relata desconforto com a postura ou execução de um exercício:
  - **TRAVAS BIOMECÂNICAS OBRIGATÓRIAS (`workout-prescriber`):** Toda sugestão de substituição de exercício **DEVE respeitar rigorosamente as 4 regras canônicas**:
    1. **Ordem de Estabilidade e Demanda do SNC:** Livre pesado/instável no início da sessão -> Máquina pesada guiada no miolo -> Isolador/cabo no final.
    2. **Apenas 1 Exercício por Padrão Articular na Mesma Sessão e Distribuição na Semana:** Nunca sugerir um substituto que duplique um padrão cinemático já presente naquela sessão (ex.: nunca colocar 2 puxadas verticais no mesmo dia; nunca colocar *Supino Inclinado + Desenvolvimento* juntos; separar padrões ao longo da semana).
    3. **Gestão de DOMS em Alongamento:** Exercícios com pico de sobrecarga em máximo alongamento (Stiff/RDL, Búlgaro profundo, Pullover, Crucifixo, Tríceps Francês/Overhead) devem ficar posicionados nas sessões com maior janela de descanso até a próxima sessão daquele músculo (72h+ ou pré-fim de semana).
    4. **Tierlist de Métodos (Tiers 1 a 4):** Caso envolva método de intensificação, respeitar a hierarquia do treinador (Tier 1: Muscle Round, Rest-Pause, Cluster, Myo-Reps; Tier 2: Dropset, Biset, Pareado Antagonista, Deadstop; Tier 3: Cadência Controlada, Pausa, Repetições Forçadas [apenas com spotter]; Tier 4: demais).
  - **Fluxo de Substituição / Forja:**
    1. O agente consulta o catálogo de `exercises` por variações correspondentes que respeitem as 4 travas acima (ex: *"Tríceps Francês Halteres Sentado"*).
    2. Se faltar uma variante adequada, proponha a criação via `exercise-sync-forge` e aplique quando o treinador autorizar o cadastro.
    3. Quando a adaptação couber numa nota de execução, proponha uma orientação para `coach_notes`, como *"Pode fazer sentado no banco com encosto a 90°."*

### D. Módulos Avançados de Inteligência Semanal
1. **Alerta de Fadiga / Recuperação para Ajuste Pontual (Sem Deload Programado):**
   - O treinador **NÃO faz semana de Deload programada** nem aplica corte automático de 30% das séries.
   - Em caso de sono ruim ($\le 2/5$), estresse ou DOMS excessivo somado a queda de rendimento, sugere ajuste pontual de volume ou intensidade apenas nos exercícios afetados.
2. **Alerta Interno de Aderência para o Coach:**
   - Quando um aluno regular fizer 0 ou 1 treino na semana e registrar *"Adesão: 1/5"*, emitir aviso interno no relatório para avaliação do treinador.
3. **Ciclo de Renovação de 4 a 6 Semanas & Acionamento Direto do `/workout-prescriber`:**
   - Ao atingir 4 a 6 semanas na rotina atual, sinalizar a janela de renovação e, com a aprovação do coach, acionar o `/workout-prescriber`.
4. **Monitoramento de Volume Semanal Ponderado (`muscle_weights`):**
   - Garantir 12 a 20 séries semanais ponderadas nos grupos musculares foco e ~6 a 10 séries nos demais grupos.

---

## 5. Dossiê Individual do Aluno (`Fitcoach/docs/students/{slug}.md`)

Os dossiês de alunos são mantidos exclusivamente em `Fitcoach/docs/students/{slug}.md` e o cache incremental de conversas em `Fitcoach/docs/students/.whatsapp_cache/{slug}.json`.

Estrutura Canônica:
- **Seção 1: Perfil Biomecânico & Anamnese:** Objetivos, restrições articulares, histórico de dores passadas (ou nota de aluno de personal sem questionário).
- **Seção 2: Mapa de Equipamentos & Física da Academia:** Degraus de máquinas, anilhas mínimas e pesos de halteres da academia do aluno.
- **Seção 3: Marcos de Carga Relevantes (PRs):** Tabela de recordes pessoais e cargas consolidadas nas faixas canônicas (`5–9`, `6–10`, `8–12`, `10–15`).
- **Seção 4: Histórico de Check-ins & Avaliações (Questionários):** Linha do tempo de check-ins (sono, DOMS, adesão, conforto).
- **Seção 5: Histórico de Feedbacks Textuais nos Treinos (Fitcoach):** Comentários e observações deixadas nas sessões.
- **Seção 6: Histórico de Conversas & Áudios (WhatsApp):** Mensagens e áudios transcritos dos últimos 7–10 dias.
- **Seção 7: Diretrizes para Revisões Semanais da Skill:** Orientações contínuas e histórico de ajustes aprovados pelo treinador.

---

## 6. Ferramentas

- [`list_weekly_workout_activity.mjs`](scripts/list_weekly_workout_activity.mjs) lista sessões no Fitcoach na semana civil, com contagens por aluno e dias locais.
- [`fetch_weekly_review.mjs`](scripts/fetch_weekly_review.mjs) busca telemetria e check-ins para revisão técnica. Use `--student="Nome ou ID"` para uma resposta individual. O filtro `--days=7` é móvel e o campo `whatsappHistory` vem de cache.
- [`apply_approved_adjustments.mjs`](scripts/apply_approved_adjustments.mjs) aplica ajustes aprovados. Confira o plano atual e os IDs das séries e exercícios. Depois da transação, leia as linhas afetadas e atualize o dossiê com o que foi realmente aplicado.
- [`generate_all_student_dossiers.mjs`](scripts/generate_all_student_dossiers.mjs) é para manutenção em lote quando solicitada.

Use o [modelo de relatório](references/report-template.md) quando houver vários ajustes para comparar. Para um único aluno, entregue os pontos que pedem decisão, o que convém manter e uma mensagem de retorno se solicitada.
