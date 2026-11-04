# Stage 1: tutorial sobre as telas reais com fixtures isoladas

Data: 2026-11-04. Revisão complementar após o usuário solicitar uso das telas reais em vez de composição visual paralela. Escopo deste levantamento: segurança dos efeitos; nenhum código alterado.

## Decisão e técnica recomendada

Renderizar os próprios Dashboard, Selection e WorkoutExecution com um sinal explícito de demonstração, dados fixture em memória e o overlay do tutorial. O sinal deve ser conhecido no primeiro render, antes de efeitos. Não hidratar fixtures depois de montar a tela em modo real: isso dispara consultas, restauração e potencial finalização de sessão antiga.

Preferir contexto/prop tipado compartilhado, com modo imutável durante cada montagem e remount por chave ao entrar/sair. Manter hooks incondicionais; aplicar guard dentro dos efeitos e no parâmetro dos hooks existentes. Não alterar identidade global do AuthContext ou trocar usuário real por falso: isso pode afetar autenticação, cache de perfil e outras superfícies. Suprimir os recursos com efeitos, preservando o JSX real e o shell.

Fixtures precisam de cópia profunda por sessão tutorial: handlers existentes mutam arrays/objetos de trabalho; não compartilhar um objeto singleton entre reinícios. Valores de exemplo claramente identificados. Dados reais de sessão, cache e fila nunca devem servir de fixture.

## Mapa de efeitos e isolamento obrigatório

Linhas do estado inspecionado antes desta revisão; implementação concorrente pode deslocá-las.

| Ponto | Efeito real | Proteção no tutorial |
|---|---|---|
| `Dashboard.tsx:36`, `Selection.tsx:102` | `useStaleWorkoutDetector(user?.id)` pode finalizar treino antigo com gravação e limpeza do storage. | Sempre chamar o hook; passar `undefined` no modo tutorial. Guard apenas no efeito pai é insuficiente. |
| `Dashboard.tsx:48-56` | Fetch, leitura da sessão ativa e `runStudentSmartNotificationCheck` (pode criar notificações). | Retornar antes de tudo; inicializar estado por fixtures. |
| `Dashboard.tsx:60`, `Selection.tsx:123` | Descarte remove treino real. | Bloquear handler em modo tutorial, mesmo se o botão estiver fora do spotlight. |
| `Dashboard.tsx:66+`, `Selection.tsx:131+` | Cache-first por usuário, queries Supabase, escrita de cache e notifyNetworkSuccess/Error. | Guard nas funções, antes de qualquer leitura/cache/rede; não emitir notificações globais de conectividade simuladas. |
| `Dashboard.tsx:347`, `NotificationBell.tsx:23-60` | Contagem de notificações e assinatura realtime Supabase. | Passar userId undefined em demonstração; preservar JSX do sino. Evitar abrir central real. |
| `MainLayout.tsx:23`, `OfflineBanner.tsx:6` | OfflineBanner monta useOnlineStatus que pode sincronizar fila real. | Não montar o componente ativo durante tutorial; apenas ocultá-lo com CSS NÃO desliga seus efeitos. Manter shell/navegação reais. |
| `useOnlineStatus.ts:134-208` | syncNow → flushOfflineQueue; online/focus/visibility e probe periódico15s podem acionar sync. | Suprimir hook via componente filho não montado ou suporte enabled explícito. Guard somente no botão Sincronizar é insuficiente. |
| `WorkoutExecution.tsx:176-189` | Mount adquire wake lock; cleanup libera lock e interrompe áudio global. | Retornar do efeito antes do setup E antes de registrar cleanup quando tutorial. Cleanup incondicional pode interromper recursos de treino real. |
| `WorkoutExecution.tsx:315-319` | fetchWorkoutData carrega e restaura sessão real. | Inicializar fixtures sem executar fetch; guard de função adicional protege invocações futuras. |
| `WorkoutExecution.tsx:362-387` | Timer de duração salva sessão em persistActiveWorkout a cada5s. | Guard no efeito E na persistência central; não usar fixture workoutId como justificativa para permitir escrita. |
| `WorkoutExecution.tsx:390-403` | Tick cardio/tempo avança estado; handler ao salvar chama saveToLocalStorage e descanso. | Estado local pode interagir; persistência/timers externos bloqueados. Evitar timers se não ensinados. |
| `WorkoutExecution.tsx:503-843` | getActiveWorkout, cache execution, Supabase, cache write, merge e autoFinalizeWorkout da sessão antiga. | Retornar antes de qualquer ramo. Não ler cache real nem disparar autoFinalizeWorkout em tutorial. |
| `WorkoutExecution.tsx:859-875` | saveToLocalStorage central é usada por check, cargas, sub-séries e feedback. | Guard antes de construir/persistir sessão. Mantém edição apenas em memória. |
| `WorkoutExecution.tsx:1246-1286` | Monitor descanso dispara áudio, vibração e notificação SW ao término/retorno da aba. | Efeito não deve registrar listeners/intervals em demonstração. |
| `WorkoutExecution.tsx:1290-1330` | start/cancel/ajuste de descanso fazem SW schedule/cancel e áudio global. | Guard em cada fronteira; cancel também muta recurso global e precisa ser bloqueado. Pode simular apenas estado visual. |
| `WorkoutExecution.tsx:1347+` | Auto complete abre modal manual e para descanso/áudio. | Guard no modo tutorial; o check demonstrativo não deve finalizar treino ou tocar recursos externos. |
| `WorkoutExecution.tsx:1380-1680` | confirmFinishWorkout faz insert/rollback/delete e fallback saveOfflineWorkout; removeActiveWorkout. | Retornar no início da confirmação, inclusive antes de offline fallback; impedir finalizar pelo botão fora do spotlight. |
| `WorkoutExecution.tsx:195+`, `248` | playTransitionBeep cria AudioContext; sendRestNotification chama SW. | Guard nas funções, não apenas no botão que normalmente as chama. |
| `ExerciseHistoryModal.tsx:44-88` | Abre consulta paginada de logs com user/exercise reais. | Não permitir modal consultivo com IDs reais; fixture/disabled explícito ou userId vazio. Vídeo/detalhes/guias estáticos podem continuar reais. |
| `VideoPlayerModal.tsx:12-23` | Listener Escape; mídia carrega URL ao abrir. | Cleanup existente adequado; fixture usa GIF local. Não há escrita de sessão. Coordenar Escape/foco com overlay. |
| `BottomNav.tsx` | Links navegam a telas reais sem query de tutorial. | Região externa ao alvo deve ficar inert; navegação autorizada pelo overlay preserva modo seguro. Nenhum efeito de dados no próprio BottomNav. |

## Contratos e bordas

- Hooks de referências/volume, medidas e expansão de detalhes podem executar: são estado local/DOM, sem persistência. Auto-scroll da preferência focusMode pode disputar posicionamento do overlay; coordenar ou desativar apenas esse comportamento durante tutorial.
- Se houver mudança de query na mesma rota, os guards devem estar nas dependências ou forçar remount. Closures antigas não podem continuar executando timers após troca para demonstração.
- Evitar mutar preferences reais (tema/foco) pelo tutorial: `AuthContext.updatePreferences` persiste perfil. Tornar controles externos inert e não chamá-lo para fixtures.
- Cleanup de listeners/observers/foco do overlay deve restaurar atributos/styles que alterou. Não remover caches nem cancelar globalmente notificações de sessão real na saída.
- Não remover AuthProvider ou alterar comportamento de refresh global: autenticação normal continua necessária e está fora do tutorial; a garantia é que a demonstração não inicia efeitos de treino/dados. Mutação global já em voo antes da entrada deve ser distinguida de efeito provocado pela demonstração na QA.

## Evidências a exigir na confirmação

- Percorrer sete passos montando JSX real com fixtures; verificar detalhes/vídeo/guia/check/feedback em memória.
- Pré-carregar sessão ativa recente E sessão antiga elegível para auto-finalização (>4h); ambas permanecem byte a byte após percurso e saída.
- Pré-carregar cache offline e fila pendente; comparar antes/depois e emitir online/visibility/focus; nenhuma sincronização provocada pelo tutorial.
- Aguardar mais de5s no player e mais de15s no shell para cobrir autosave e monitor de rede. Capturar tentativas de gravação Supabase, IndexedDB/localStorage, SW postMessage, wake lock e áudio, não apenas POST HTTP.
- Reentrar/reiniciar e confirmar fixture limpa; sair retorna perfil sem montar dashboard/seleção reais brevemente. Navegador voltar/query inválida não deve abrir player real com ID de fixture.

## Referências reutilizadas

`docs/gauntlet/student-tutorial-references.md`, screenshots incumbentes de dashboard/seleção/perfil em `.qatest/evidence/` e `docs/gauntlet/TOKENS.json`. Context7 já consultado nesta sessão: `/reactjs/react.dev`, [createPortal](https://react.dev/reference/react-dom/createPortal) e [useLayoutEffect](https://react.dev/reference/react/useLayoutEffect). Mantêm orientações de bubbling pelo React tree, medição antes de paint e cleanup de listeners/observers; nenhuma pesquisa de mercado adicional necessária para usar a própria interface.
