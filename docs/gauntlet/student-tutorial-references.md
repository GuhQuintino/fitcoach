# Referências técnicas: conclusão automática e tutorial

Data: 2026-11-04. Stage 1. Perfil: frontend-framework (SPA React/Vite com serviços Supabase existentes). Pesquisa restrita à extensão solicitada; não altera referências globais.

## Stack e superfície incumbente

package.json: React/React DOM ^19.2.3, React Router DOM ^7.11.0, Vite ^6.2.0, TypeScript ~5.8.2, Tailwind ^4.1.18, Vitest ^5.0.3. Scripts: npm run build e npm test. Supabase existente, sem necessidade de novo contrato de banco para esta feature.

Referências reais locais inspecionadas visualmente: `.qatest/evidence/f4-student-dashboard-375-dark.png` e `.qatest/evidence/f3-student-selection-375-light.png`. A primeira mostra card azul Treino Atual, texto branco, fundo slate escuro e navegação inferior; a segunda mostra cards brancos arredondados A/B/C e CTA visual azul. Também disponível `.qatest/evidence/f4-student-profile-375-dark.png`. Capturas são evidência de layout existente, não evidência do novo tutorial.

Tokens existentes: `docs/gauntlet/TOKENS.json`: primary #0ea5e9, light #38bdf8, dark #0284c7; backgrounds #fff/#0f172a, cards #fff/#1e293b. Preservar tipografia, raios, Material Symbols e tamanhos de toque existentes. Modo Impeccable: Operate.

## Mapa preciso do código

As linhas abaixo correspondem ao estado anterior à implementação.

| Arquivo / linha | Evidência / ponto de integração |
|---|---|
| `App.tsx:162-174` | Rotas aluno: dashboard, selection, workout/:id, profile e settings. HashRouter em 197. |
| `pages/student/Profile.tsx:766` | Seção Configurações; links Notificações em 770 e Privacidade em 779. Incluir entrada Tutorial aqui. |
| `pages/student/Dashboard.tsx:436-459` | Link para /student/selection contém card Treino Atual e Toque para ver seus treinos. |
| `pages/student/Selection.tsx:354-407` | Link de cada treino para /student/workout/:id; índice 0 exibe letra A. Banner de sessão ativa em 280-307. |
| `pages/student/WorkoutExecution.tsx:52-96` | Estado de séries contém completed, drops[].completed e sub_sets_records[].completed. |
| `pages/student/WorkoutExecution.tsx:313-318` | Efeito busca treino por usuário/id. Isolar demonstração antes de consultas/sessão ativa. |
| `pages/student/WorkoutExecution.tsx:360-387` | Timer persiste sessão a cada 5 s com persistActiveWorkout. Demonstração precisa desativar também essa persistência automática. |
| `pages/student/WorkoutExecution.tsx:451-498` | setsCompleted e volume derivados por efeito. Não usar esse contador como sinal único de completude de intensificações. |
| `pages/student/WorkoutExecution.tsx:501-843` | fetchWorkoutData carrega dados e restaura treino; pode tratar outra sessão como antiga. Evitar executar em demonstração isolada. |
| `pages/student/WorkoutExecution.tsx:859` | saveToLocalStorage persiste sessão ativa; bloquear em demonstração. |
| `pages/student/WorkoutExecution.tsx:909-968` | toggleDropCompletion marca drop, pode marcar mãe quando todos drops concluídos e inicia descanso. |
| `pages/student/WorkoutExecution.tsx:1008-1076` | toggleSubSetCompletion marca sub-série, pode marcar mãe, aciona micro-pausa ou descanso. |
| `pages/student/WorkoutExecution.tsx:1079-1241` | toggleSetCompletion marca mãe sem marcar filhos, preenche valores implícitos, timers e navegação por grupo. |
| `pages/student/WorkoutExecution.tsx:1336-1341` | handleFinishWorkout valida setsCompleted e abre finishModalOpen. |
| `pages/student/WorkoutExecution.tsx:1344-1660` | confirmFinishWorkout salva cabeçalho/séries/feedback e fallback offline. Reutilizar sem duplicar salvamento. |
| `pages/student/WorkoutExecution.tsx:1960-2021` | Thumbnail abre mídia; nome/Toque para detalhes expande descrição. |
| `pages/student/WorkoutExecution.tsx:2040-2048` | Notas do coach. |
| `pages/student/WorkoutExecution.tsx:2080-2084` | Ícones de série abrem guia: aquecimento âmbar, falha vermelho, dropset roxo, preparatória ciano, principal azul. |
| `pages/student/WorkoutExecution.tsx:2117-2137` | Sugestões: carga azul, repetições verde, PSE roxo. Explicar significado textual além da cor. |
| `pages/student/WorkoutExecution.tsx:2436-2439` | Check de série com aria-label/data-testid. |
| `pages/student/WorkoutExecution.tsx:2610-2627` | Feedback do exercício e persistência ao editar. |
| `pages/student/WorkoutExecution.tsx:2668` | Botão manual Concluir. |
| `pages/student/WorkoutExecution.tsx:2915-2927` | Timer HIIT marca série completed e persiste; precisa acionar mesma checagem automática. |
| `pages/student/WorkoutExecution.tsx:3102-3129` | FinishWorkoutModal recebe flag de abertura e confirmFinishWorkout; dialog z-300. |

## Arquitetura recomendada e armadilhas

- Extrair predicado puro de completude: precisa de pelo menos uma série; todas as séries mãe completas E todos drops/sub-séries presentes completos. Um .every vazio não deve finalizar treino vazio.
- Disparar abertura por transição de incompleto para completo, com proteção contra carregamento, submissão e demonstração. Não observar apenas contagem de séries: ela ignora sub-séries e atualiza em efeito separado. Reutilizar abertura do modal e confirmação já existentes.
- Cancelamento não pode reabrir modal em qualquer alteração de feedback. Resetar proteção ao mudar treino ou nova transição incompleto→completo.
- Demonstração isolada: proteger todos efeitos de sessão, timers, fetch/restore, salvamento/filas e navegação indevida. Preferir estado/contexto próprio ou fixture demonstrativa com sinal explícito, nunca ID que possa atingir dados reais.
- Tutorial compartilhado entre rotas, com passos declarativos e alvos estáveis (data attributes). Aguardar conteúdo renderizado; tratar alvo ausente e usuário sem rotina de forma explícita.
- Spotlight deve respeitar stacking context: portal em document.body evita corte por overflow. Desfocar quatro regiões externas ao recorte ou técnica equivalente; não desfocar ancestral do alvo, que tornaria o próprio alvo borrado.
- Painel alcançável em mobile, com avanço/voltar/sair e indicador de progresso. Gerenciar foco, Escape e restauração de foco. Background não deve aceitar ações de treino real durante tutorial.
- Medir alvo após render; atualizar em scroll/resize/ResizeObserver com cleanup. Limitar reflows e respeitar prefers-reduced-motion.

## Documentação atual consultada via Context7

Resolve React → `/reactjs/react.dev` (fonte oficial, High, score 82.15). Duas consultas específicas:

1. [createPortal](https://react.dev/reference/react-dom/createPortal): portal muda posição física no DOM, mantém contexto e bubbling pela árvore React; conter propagação de eventos do overlay quando necessário. Atenção explícita à acessibilidade ao criar diálogos e gestão de foco.
2. [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect): medir getBoundingClientRect antes do repaint evita salto visual de tooltip. Usar só para medições necessárias, pois bloqueia paint; declarar dependências e cleanup de observadores/listeners. Efeitos executam no cliente.

Nenhuma tecnologia especializada nova é necessária. React, roteamento e Supabase já têm infraestrutura/skills no ambiente; nenhuma skill sintetizada e nenhum novo pacote indicado.

## Evidência e validação pendentes

Não há screenshot do novo tutorial antes da construção, nem métricas novas de acessibilidade/performance. Não foram inventadas métricas de similaridade. Os arquivos de referência locais e tokens já satisfazem pesquisa visual incumbente para esta extensão pontual, conforme orientação do orquestrador. Validar comportamento em desktop/celular após implementar e registrar achados reais, inclusive limitações de ambiente/autenticação.
