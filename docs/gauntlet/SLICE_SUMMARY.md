# Slice Summary - Expansão e Responsividade do ProfileCompletionBanner

- **Status:** COMPLETED
- **Perfil / Stack:** frontend-framework (React 19 + TypeScript + Vite + Tailwind CSS + Lucide/Material Symbols)
- **Arquivos Criados/Modificados:**
  - `components/student/ProfileCompletionBanner.tsx`: Adição do estado expansível (`isExpanded`), proteção contra truncamento de texto ("Complete seu perfil" nunca truncado), botão/setinha expansora com feedback visual ("Ver mais" / "Ver menos" com chevron giratório e `aria-expanded`), painel expansível de detalhes com chips/badges dos campos pendentes e ações ("Lembrar depois" e "Preencher perfil").
  - `tests/regression/profileCompletionBanner.regression.test.tsx`: Teste de regressão cobrindo renderização no mobile, presença do título não-truncado, botão de expansão com atributos ARIA, chips de pendências e regras de desativação/snooze.

### Entregas End-to-End da Fatia:
1. **Dados & Modelos:** Reutilização estrita da interface `ProfileCompletenessResult` de `types/notifications.ts` com tipagem 100% segura.
2. **Serviços & Contratos:** Preservação integral do snooze de 3 dias via `localStorage` e Supabase `updatePreferences`, respeitando opt-out de tópicos (`profile_completion !== false`) e auto-ocultação quando `isComplete: true`.
3. **Interface & Componentes:**
   - **Estado Recolhido:** Linha limpa no topo da Dashboard, ícone de perfil em badge âmbar, título legível sem truncar ("Complete seu perfil" + pill de porcentagem), botão expansor ("Ver mais" + `expand_more` animado) e botão "X" de fechar.
   - **Estado Expandido:** Rotação suave do chevron para cima (`rotate-180`), painel `#profile-banner-details` contendo mensagem explicativa completa, badges visuais com ícones para cada pendência (Foto, Peso, Idade, Altura) e botões ergonômicos de ação.
   - **Acessibilidade:** WCAG 2.1 AA com touch targets >= 44x44px, estados de foco `focus-visible:ring-2 focus-visible:ring-primary`, atributos `aria-expanded` e `aria-controls`.
4. **Testes & Validação:**
   - `vitest run`: 16 suítes / 160 testes passaram (100% de sucesso).
   - `tsc --noEmit`: Compilação limpa com 0 erros.

### Desvios / Decisões Técnicas (Deviation Rules):
- **Regra 1 (Bug Fix Autônomo & Prevenção de Truncamento):** Removida a classe `truncate` do título do cabeçalho que causava a abreviação para "Co..." em viewports estreitos (~360px). O cabeçalho foi reorganizado com `shrink-0` e `whitespace-nowrap` no título e distribuição proporcional de espaço, mantendo os botões de ação completos dentro do painel expansível.

### Handover para Stage 3 / Stage 4:
- O componente está pronto para auditoria pelo `craft-auditor` e `gauntlet-critic`.
