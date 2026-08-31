# CARTÃO DE TAREFA: PRESCRICAO-CLARA-01 — Clareza Pedagógica nas Recomendações do Coach

## 1. Identificação & Objetivo
- **ID:** `PRESCRICAO-CLARA-01`
- **Título:** Redesenho e Desmistificação da Recomendação de Carga, Repetições e PSE/RPE na Execução do Treino.
- **Responsável:** Gauntlet Builder & Impeccable Design Engine.
- **Status:** Em Planejamento / Proposta de Design.

---

## 2. Contexto & Problema do Usuário
- **Cenário Atual:**
  Na tela de execução de treino do aluno (`pages/student/WorkoutExecution.tsx`), a coluna de histórico/metas comprime na mesma célula o peso anterior (ex: `60kg x 6`) e até 3 micro-pills coloridas com abreviações técnicas (ex: `100KG`, `3-7R`, `@9.5`).
- **Problema de UX e Cognição:**
  1. O título da coluna é apenas `"ANTERIOR"`, misturando o passado (o que fiz na semana passada) com o presente (o que o treinador quer que eu faça hoje).
  2. Alunos iniciantes não entendem a sigla `3-7R` (pensam em séries, minutos ou repetições isoladas) nem `@9.5` (notação de RIR/RPE que requer conhecimento prévio).
  3. O espaço em telas compactas (<390px) comprime os badges, causando quebras feias e dificultando a leitura em movimento na academia.

---

## 3. Fator "Uau" & Referência Visual
- **Fator "Uau":**
  - O aluno bate o olho na série e entende instantaneamente a estratégia prescrita pelo treinador através de uma hierarquia visual limpa e amigável.
  - Ao tocar em qualquer indicador de meta (`3-7 reps` ou `PSE @9.5`), um **Micro-Guia Explicativo em Popover/Modal** surge com linguagem acolhedora e humana (ex: *"🎯 Meta do Coach: Tente fazer entre 3 e 7 repetições com carga próxima de 100kg. Pare quando sentir que não aguentaria mais nenhuma repetição completa — PSE 9.5"*).
  - Placeholders inteligentes nos campos de inserção de peso e repetições refletem a meta de forma suave, guiando a digitação.

---

## 4. Escopo
- **Incluído:**
  - Redesenho do cabeçalho da tabela de séries e da célula de histórico/meta em `pages/student/WorkoutExecution.tsx`.
  - Distinção visual clara entre **"Último Treino"** (histórico) e **"Meta de Hoje"** (prescrição do treinador).
  - Tooltips / modal de ajuda contextual ao tocar nos chips de meta (`kg`, `reps`, `PSE/RPE`).
  - Suporte completo aos modos Claro e Escuro com tokens Tailwind v4.
  - Acessibilidade WAI-ARIA integral com `aria-label` e touch targets conformes.
- **Não Incluído:**
  - Alteração no banco de dados Supabase ou no modelo de dados de treinos.
  - Mudanças na lógica de cálculo de volume e histórico.

---

## 5. Riscos & Mitigações
- **Risco 1 (Poluição Visual em Telas Pequenas):** Exibir muito texto em telas móveis pode aumentar o scroll.
  - *Mitigação:* Usar layout hierárquico em 2 linhas sutis ou badges compactos com ícones intuitivos e expansão por toque.
- **Risco 2 (Regressão no Formulário de Inputs):** Alterar a grade pode espremer os inputs de peso e repetições.
  - *Mitigação:* Manter dimensões mínimas confortáveis ($\ge 44\text{px}$) e testar em viewport móvel de 360px.

---

## 6. Rubrica de Sucesso 6D
- **D1 Funcionalidade:** Metas de peso, reps, tempo e PSE/RPE legíveis para todos os tipos de treino (Reps, Tempo, Cardio, HIIT).
- **D2 Robustez:** Funciona 100% offline e com dados pré-preenchidos ou vazios.
- **D3 Experiência / Uau:** Aluno entende a meta sem esforço mental; micro-guia ao tocar nos chips.
- **D4 Theming:** Cores integradas com o tema escuro e claro sem classes arbitrárias soltas.
- **D5 Performance:** Zero re-renders adicionais no timer.
- **D6 Testabilidade:** `tsc --noEmit` = 0 e 0 violações `detect.mjs`.
