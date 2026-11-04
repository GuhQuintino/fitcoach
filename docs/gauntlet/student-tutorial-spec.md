# Especificação: conclusão automática e tutorial do aluno

Data: 2026-11-04. Stage 0. Fonte: pedido do treinador nesta conversa e código existente.

## Comportamentos solicitados

1. Ao marcar a última série pendente como feita, incluindo todos os drops e sub-séries de intensificação, abrir automaticamente a mesma avaliação/resumo exibida pelo botão Concluir. A confirmação de esforço, comentário e salvamento permanece no fluxo existente.
2. Nas Configurações do perfil do aluno, oferecer botão Tutorial, reiniciável a qualquer momento.
3. Tutorial sequencial com fundo borrado, alvo destacado, explicação e botão Próximo: dashboard (Treino Atual / Toque para ver seus treinos), seleção (Treino A), execução (nome e detalhes, vídeo, notas do coach), primeira série (ícone, sugestões e cores, registro e check), feedback por exercício.
4. Feedback: explicar por que relatar execução, dificuldade e desconfortos periodicamente ajuda o treinador.
5. Preservar identidade visual, português, temas e uso em celular. Oferecer saída do tutorial e navegação acessível por teclado.

## Decisão operacional

O treinador confirmou demonstração segura. O tutorial deve navegar pelas telas correspondentes com demonstração explicitamente identificada, sem iniciar/salvar uma sessão real, alterar cargas, histórico ou treino em andamento.

## Critérios verificáveis

- Série mãe marcada, mas drop/sub-série pendente: nenhuma abertura automática.
- Último filho marcado e todas as demais séries completas: abrir avaliação existente uma vez.
- Nenhuma série ou carregamento em curso: nenhuma abertura automática.
- Cancelar avaliação: não reabrir por edição de feedback ou atualização de render; desfazer e completar novamente pode produzir nova transição.
- Exercícios de tempo/HIIT usam a mesma verificação de completude quando seus timers marcam séries.
- O tutorial percorre dashboard, seleção e execução de demonstração; explica cada item solicitado e pode ser encerrado/reiniciado.
- Tutorial não escreve em sessão ativa, banco ou fila offline; não descarta sessão existente.
- Desktop e celular: texto legível, controles alcançáveis, foco visível e alvo sem ficar encoberto pelo painel.

## Escopo

Alteração do frontend existente. Nenhuma migração, nova integração, publicação ou mudança de prescrição foi solicitada.

## Ajuste validado: fidelidade ao uso real

O treinador esclareceu que o problema da demonstração era a posição e a aparência dos elementos no uso real, não o conteúdo das notas ou metas. Por isso, o tutorial deve montar Dashboard, Selection, WorkoutExecution, MainLayout e controles/modais reais, com fixtures isoladas em memória. Não é permitido manter uma interface paralela simplificada, reordenar itens ou aplicar CSS de tamanho/padding/tipografia aos controles para acomodar o tutorial. O spotlight é um overlay fixo medido sobre anchors do markup existente; navegação e efeitos externos ficam bloqueados no contexto demo.
