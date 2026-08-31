# DECISIONS — Registro Permanente de Decisões de Arquitetura & Design

## ADR-001: Unificação de Cores do WhatsApp via Tokens Semânticos
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** Havia cores hardcoded `#25D366` e variações arbitrárias nos botões de convite, perfil e aprovação.
- **Decisão:** Criados tokens `@theme` no CSS (`--color-whatsapp: #25D366` e `--color-whatsapp-dark: #20bd5a`) e classes `bg-whatsapp`, `text-whatsapp`, `shadow-whatsapp/20`.

## ADR-002: Desacoplamento do Timer de Treino do Estado de Inputs
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** A cada caractere digitado nas caixas de peso/reps, o `useEffect` do cronômetro era destruído e recriado via `setInterval`.
- **Decisão:** Utilizados `exercisesRef` e `startTimeRef` para manter a persistência contínua do timer sem disparar recriações de intervalo, e modais foram envolvidos com `React.memo`.

## ADR-003: Proteção contra Rotas Incompletas e Alias de Retorno
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** Clicar na seta de voltar de `/student/workout/:id` direcionava para `/student/workout`, gerando tela vazia.
- **Decisão:** O botão de voltar foi redefinido para `/student/selection` e adicionados `<Route path="workout" element={<Navigate to="/student/selection" replace />} />` e rotas catch-all `*` em todos os painéis.

## ADR-004: Touch Targets Padronizados em 44x44px (WCAG 2.5.5)
- **Data:** 31/08/2026
- **Status:** Aceito e Implementado
- **Contexto:** Botões de PSE 1-10 e abas de filtros tinham alturas entre 32px e 36px.
- **Decisão:** Reorganizados os botões de nota em grid 5x2 responsivo com `min-h-[44px]` e todas as abas e botões de ação receberam `min-h-[44px]`.

## ADR-005: Clareza Pedagógica nas Metas de Prescrição
- **Data:** 31/08/2026
- **Status:** Em Planejamento / Proposta Ativa
- **Contexto:** Alunos iniciantes e intermediários enfrentam dificuldade em interpretar pills comprimidas como `100KG`, `3-7R` e `@9.5` na coluna ANTERIOR.
- **Decisão Proposta:** Criar distinção visual explícita entre Histórico Anterior e Meta Prescrita, com chips legíveis, micro-ajuda ao toque e suporte semântico.
