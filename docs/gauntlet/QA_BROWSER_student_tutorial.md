# QA Browser: tutorial do aluno e conclusão automática

- Data: 2026-11-04.
- Resultado: PASS nos fluxos inspecionados, sem alteração em banco real.
- Ambiente: Chromium headless via Puppeteer; build de produção servido em `http://127.0.0.1:3001`. Sessão sintética de aluno, todas as requisições Supabase e `/api` interceptadas com fixtures. Nenhuma credencial de aluno ou coach foi usada.
- Evidências estruturadas: `.qatest/student-tutorial-tour-results.json`, `.qatest/student-tutorial-expanded-results.json`, `.qatest/student-tutorial-autocomplete-results.json`, `.qatest/student-tutorial-metrics.json`.

## Comportamento verificado

Tutorial: 78 verificações aprovadas (26 por viewport), em 375×667 claro, 768×1024 escuro e 1440×900 escuro. Os sete passos percorrem dashboard, seleção e execução demonstrativa; destaque nítido, fundo borrado, alvo e painel sem sobreposição no estado inicial de cada passo, sem overflow horizontal. Nome abre instruções, imagem abre GIF real, ícone de série explica aquecimento, campos e check funcionam somente na demonstração, feedback aceita texto. Voltar preserva a prática; Concluir retorna ao perfil e restaura foco no botão Tutorial; esse botão reinicia o roteiro e Escape encerra.

Segurança: zero mutações remotas durante a demonstração. Um treino em andamento foi preservado byte a byte, nas chaves global e específica do aluno. Em teste adicional, um treino abandonado há cinco horas também permaneceu intacto, sem disparar finalização automática por abandono.

Conclusão automática no componente real `WorkoutExecution`: sete verificações aprovadas com dropset de duas reduções. Marcar a série principal não abre avaliação com drops pendentes; o primeiro drop também não abre; o último abre o mesmo diálogo “Finalizar e avaliar treino” do fluxo manual. Cancelar não reabre o diálogo após nova renderização, e o botão manual continua disponível. Abrir a avaliação não grava histórico nem envia notificações.

## Inspeção visual, teclado e acessibilidade

Capturas reais inspecionadas: `.qatest/student-tutorial-375-step6.png`, `.qatest/student-tutorial-768-step3.png` e `.qatest/student-tutorial-375-expanded-dark.png`. Tipografia, cores de carga/repetições/PSE, espaçamento e identidade correspondem à interface incumbente; textos e controles estão legíveis. O conteúdo explicado fica nítido e o restante borrado.

Teste adicional de vídeo e instruções expandidos em 375×667, claro e escuro: GIF carregado, botão “Fechar demonstração” alcançável rolando a página (fim em 386,25 px, painel começando em 402 px). A expansão pode exigir rolagem, sem deixar controles permanentemente encobertos. Confirmação atual: imagem decodificada, fontes prontas e geometria estável por quatro frames antes da rolagem instantânea.

Árvore AX via CDP confirma diálogo com nome do passo. Inspeção focada: zero controles ativos sem nome, regiões não selecionadas `inert` e `aria-hidden`, Tab e Shift+Tab circulam entre os controles do tutorial, foco inicial em Próximo e retorno ao botão de entrada. Zero exceções de página e zero erros de console nas três execuções completas e nas duas inspeções de expansão. Isso é uma auditoria focada nos controles da feature, não uma certificação WCAG completa.

## Limites e observações

- Não foram usados axe-core nem Lighthouse, que não estão instalados neste projeto. Não foi produzida pontuação de performance, contraste automatizado global ou similaridade numérica. Não há mockup aprovado do tutorial para uma comparação percentual; a comparação visual foi qualitativa com a UI incumbente.
- Uma tentativa no servidor Vite de desenvolvimento capturou tela sem Tailwind durante recompilação/HMR. Esse resultado não foi aceito como evidência do produto. A confirmação final usa o build de produção e aguarda CSS computado antes de medir. O arquivo de falha anterior foi removido após essa confirmação para evitar confusão com resultados finais.
- Na repetição do teste expandido, o script inicial mediu a página após apenas 150 ms de rolagem, mas o CSS global usa `scroll-behavior: smooth`: o botão ainda estava no meio da animação. O harness foi corrigido para aguardar a decodificação da imagem, as fontes e a estabilização do layout, usar `behavior: 'instant'` na rolagem de preparação e aguardar dois frames antes de medir. A asserção original de alcance permaneceu estrita e passou em claro e escuro; nenhuma alteração no produto foi necessária.
- Testes de gravação final do treino não enviam dados a serviços reais: o escopo desta alteração é abrir o fluxo de avaliação já existente. A persistência final permanece no fluxo original.

## Reprodução

1. `npm run build` e `npm run preview -- --host 127.0.0.1 --port 3001`.
2. `node .qatest/student-tutorial-tour.mjs`.
3. `node .qatest/student-tutorial-expanded.mjs`.
4. Com Vite na porta 3000: `node .qatest/student-tutorial-autocomplete.mjs`.

Os scripts usam um contexto de navegador novo e respondem localmente às requisições de dados.
