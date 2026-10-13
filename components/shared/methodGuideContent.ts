export interface MethodGuideItem {
    id: string;
    layer: 'group' | 'set_method' | 'execution_mode' | 'timer_mode';
    name: string;
    shortName: string;
    icon: string;
    badgeColor: string; // Tailwind classes
    summary: string;
    howToPerform: string[];
    whenToUse: string;
    recoveryOrTips: string;
    cautions?: string;
}

export const METHOD_GUIDE_ITEMS: Record<string, MethodGuideItem> = {
    // ═════════════════════════════════════════════════════════════════════
    // CAMADA 1: AGRUPAMENTO DE EXERCÍCIOS
    // ═════════════════════════════════════════════════════════════════════
    superset: {
        id: 'superset',
        layer: 'group',
        name: 'Biset / Superset',
        shortName: 'Biset',
        icon: 'dynamic_feed',
        badgeColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        summary: 'Dois exercícios executados consecutivamente sem descanso entre eles.',
        howToPerform: [
            'Execute todas as repetições do primeiro exercício até a meta.',
            'Sem descansar, passe imediatamente para o segundo exercício da dupla.',
            'Descanse apenas após terminar as repetições do segundo exercício.'
        ],
        whenToUse: 'Excelente para economizar tempo na sessão e elevar a densidade do treino, seja agrupando o mesmo grupo muscular (agonista-agonista) ou grupos distintos.',
        recoveryOrTips: 'Descanse de 90 a 120 segundos ao final de cada round completo.'
    },
    triset: {
        id: 'triset',
        layer: 'group',
        name: 'Triset',
        shortName: 'Triset',
        icon: 'view_carousel',
        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        summary: 'Três exercícios realizados em sequência ininterrupta sem descanso intermediário.',
        howToPerform: [
            'Faça o exercício 1, transicione imediatamente para o exercício 2 e em seguida para o exercício 3.',
            'Não faça pausas entre os exercícios do round.',
            'O relógio de descanso oficial só dispara ao finalizar o terceiro exercício.'
        ],
        whenToUse: 'Ideal para exaurir diferentes porções de um músculo grande (ex: deltoides anterior, lateral e posterior) ou treinos metabólicos com tempo reduzido.',
        recoveryOrTips: 'Programe de 90 a 150 segundos de descanso entre os rounds.'
    },
    giant_set: {
        id: 'giant_set',
        layer: 'group',
        name: 'Giant Set (Série Gigante)',
        shortName: 'Giant Set',
        icon: 'table_rows',
        badgeColor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800',
        summary: 'Quatro ou mais exercícios emendados em sequência contínua (circuito de força).',
        howToPerform: [
            'Prepare todos os pesos e aparelhos antes de iniciar.',
            'Execute a série de cada exercício na ordem estabelecida sem parar.',
            'Respire fundo e hidrate-se somente ao terminar o circuito todo.'
        ],
        whenToUse: 'Aumenta exponencialmente o estresse metabólico e o gasto calórico com alto estímulo cardiovascular associado à hipertrofia.',
        recoveryOrTips: 'Descanso amplo de 2 a 3 minutos entre cada round completo.'
    },
    paired_antagonist: {
        id: 'paired_antagonist',
        layer: 'group',
        name: 'Pareado Antagonista (APS)',
        shortName: 'Antagonista',
        icon: 'swap_horiz',
        badgeColor: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        summary: 'Dois exercícios que trabalham grupos musculares opostos, intercalando descanso moderado.',
        howToPerform: [
            'Execute o exercício A (ex: Supino para Peito).',
            'Descanse um intervalo moderado (ex: 60 a 90 segundos).',
            'Execute o exercício B (ex: Remada para Costas).',
            'Descanse novamente o mesmo intervalo antes de retornar ao exercício A.'
        ],
        whenToUse: 'Padrão ouro em fisiologia de força: enquanto um músculo se recupera, o oposto trabalha sem perda de rendimento neuromuscular.',
        recoveryOrTips: 'Transição com 60 a 90 segundos entre cada exercício.'
    },

    // ═════════════════════════════════════════════════════════════════════
    // CAMADA 2: MÉTODOS DE SÉRIE (INTENSIFICAÇÃO)
    // ═════════════════════════════════════════════════════════════════════
    dropset: {
        id: 'dropset',
        layer: 'set_method',
        name: 'Dropset',
        shortName: 'Dropset',
        icon: 'layers',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        summary: 'Série levada à falha, seguida de redução imediata de carga sem descanso.',
        howToPerform: [
            'Faça as repetições prescritas com a carga normal até a falha ou proximidade.',
            'Sem soltar o equipamento por mais de 5 segundos, reduza a carga em 20% a 30%.',
            'Continue executando o máximo de repetições possíveis com a nova carga.',
            'Se houver múltiplos drops configurados, repita a redução sucessivamente.'
        ],
        whenToUse: 'Última série de um exercício para recrutar unidades motoras de reserva e gerar estresse metabólico máximo.',
        recoveryOrTips: 'Descanso normal somente após finalizar o último drop.'
    },
    rest_pause: {
        id: 'rest_pause',
        layer: 'set_method',
        name: 'Rest-Pause',
        shortName: 'Rest-Pause',
        icon: 'more_time',
        badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        summary: 'Série pesada até a falha, micro-pausa de 10 a 15s e repetições extras com a mesma carga.',
        howToPerform: [
            'Faça a série inicial pesada até a falha concêntrica.',
            'Solte a barra/halteres e descanse estritamente por 10 a 15 segundos respirando fundo.',
            'Retome o mesmo peso e realize o máximo de repetições que conseguir (geralmente 2 a 4 reps).',
            'Repita a micro-pausa e nova tentativa conforme prescrito pelo treinador.'
        ],
        whenToUse: 'Permite acumular grande volume com alta intensidade de carga sem precisar diminuir o peso.',
        recoveryOrTips: 'Mantenha o cronômetro ativo nas micro-pausas. Não ultrapasse 20 segundos.'
    },
    cluster: {
        id: 'cluster',
        layer: 'set_method',
        name: 'Cluster Sets',
        shortName: 'Cluster',
        icon: 'scatter_plot',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        summary: 'Série pesada fracionada em pequenos blocos de repetições com micro-pausas planejadas.',
        howToPerform: [
            'Em vez de fazer 1 série contínua de 8 reps, faça blocos como 3 + 3 + 2 repetições.',
            'Entre cada bloco de repetições, descanse de 15 a 20 segundos.',
            'A carga utilizada é significativamente maior do que numa série contínua de 8 repetições.'
        ],
        whenToUse: 'Ganhos de força máxima e potência neuromuscular, minimizando a perda de velocidade de barra.',
        recoveryOrTips: 'Use micro-pausas de 15 a 25 segundos entre os sub-sets.'
    },
    myo_reps: {
        id: 'myo_reps',
        layer: 'set_method',
        name: 'Myo-Reps (Borge Fagerli)',
        shortName: 'Myo-Reps',
        icon: 'electric_bolt',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        summary: 'Série ativadora moderada seguida de mini-séries de alta densidade.',
        howToPerform: [
            'Execute a série de ativação: 12 a 20 repetições até RPE 9-10 (1 RIR).',
            'Guarde o peso, respire profundamente 3 a 5 vezes (aproximadamente 5 a 10 segundos).',
            'Faça uma mini-série de 3 a 5 repetições.',
            'Descanse 5-10s e repita até completar 4 a 5 mini-séries ou até perder repetições.'
        ],
        whenToUse: 'Hipertrofia eficiente em curto espaço de tempo em exercícios com máquinas ou cabos.',
        recoveryOrTips: 'Mantenha a micro-pausa ultracurta (5 a 10s).'
    },
    muscle_round: {
        id: 'muscle_round',
        layer: 'set_method',
        name: 'Muscle Round (Scott Stevenson)',
        shortName: 'Muscle Round',
        icon: 'rotate_right',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        summary: 'Protocolo Fortitude Training: 6 mini-séries de 4 repetições com 10 segundos de descanso fixo.',
        howToPerform: [
            'Selecione uma carga correspondente a 10-12RM (com a qual você faria cerca de 10 reps máximas).',
            'Execute 4 repetições. Descanse 10 segundos no relógio.',
            'Repita mais 4 repetições e 10s de descanso até completar 6 mini-séries (total de 24 reps).',
            'A 5ª e a 6ª mini-série devem ser extremamente desafiadoras, chegando à falha.'
        ],
        whenToUse: 'Recrutamento completo de fibras e alto estresse tensional com segurança biomecânica.',
        recoveryOrTips: 'O timer de 10s deve ser rigoroso. Ao falhar antes da 6ª mini-série, interrompa.'
    },
    method_3_7: {
        id: 'method_3_7',
        layer: 'set_method',
        name: 'Método 3/7',
        shortName: 'Método 3/7',
        icon: 'format_list_numbered',
        badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        summary: 'Sequência progressiva: 3, 4, 5, 6 e 7 reps com 15 segundos de micro-pausa fixa.',
        howToPerform: [
            'Use carga moderada (aproximadamente 70% de 1RM).',
            'Faça 3 reps → descanse 15s → faça 4 reps → descanse 15s → faça 5 reps → descanse 15s → faça 6 reps → descanse 15s → faça 7 reps.',
            'Totaliza 25 repetições em um único protocolo.'
        ],
        whenToUse: 'Estudos científicos comprovam hipertrofia e ganhos de força equivalentes a múltiplos sets convencionais em fração do tempo.',
        recoveryOrTips: 'Não aumente a micro-pausa além de 15 segundos.'
    },
    fst7: {
        id: 'fst7',
        layer: 'set_method',
        name: 'FST-7 (Hany Rambod)',
        shortName: 'FST-7',
        icon: 'expand',
        badgeColor: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800',
        summary: '7 séries de 10 a 12 repetições com descanso curto de 30 a 45 segundos para alongar a fáscia.',
        howToPerform: [
            'Realizado no último exercício do grupo muscular (preferencialmente máquinas isoladoras).',
            'Execute 7 séries com 10-12 repetições.',
            'O intervalo entre cada uma das 7 séries deve ser de estritamente 30 a 45 segundos.',
            'Nos intervalos, realize alongamento suave ou pose isométrica do músculo trabalhado.'
        ],
        whenToUse: 'Pump máximo, hidratação celular e alongamento da fáscia conjuntiva muscular.',
        recoveryOrTips: 'Beba água entre as séries e mantenha a cadência uniforme.'
    },
    bfr: {
        id: 'bfr',
        layer: 'set_method',
        name: 'BFR (Restrição de Fluxo / Oclusão)',
        shortName: 'BFR (Kaatsu)',
        icon: 'compress',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        summary: 'Oclusão vascular com manguito/faixa e protocolo 30-15-15-15 com cargas leves.',
        howToPerform: [
            'Aplique o manguito ou faixa elástica na porção proximal do membro (pressão 7/10, sem cortar pulso arterial).',
            'Use carga leve (20% a 30% de 1RM).',
            'Série 1: 30 reps → descanso 30s.',
            'Série 2: 15 reps → descanso 30s.',
            'Série 3: 15 reps → descanso 30s.',
            'Série 4: 15 reps → retire o manguito.'
        ],
        whenToUse: 'Reabilitação articular, atletas lesionados ou finalização de hipertrofia com carga mecânica mínima nas articulações.',
        recoveryOrTips: 'Nunca oclua a ponto de perder pulsação distal ou sentir formigamento severo.'
    },

    // ═════════════════════════════════════════════════════════════════════
    // CAMADA 3: MODO DE EXECUÇÃO DO REP (BIOMECÂNICA)
    // ═════════════════════════════════════════════════════════════════════
    tempo: {
        id: 'tempo',
        layer: 'execution_mode',
        name: 'Cadência Controlada (Tempo)',
        shortName: 'Tempo',
        icon: 'timer',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        summary: 'Notação de 4 dígitos indicando a velocidade exata de cada fase da repetição (ex: 4-0-1-0).',
        howToPerform: [
            '1º Dígito (Excêntrica): segundos descendo o peso (ex: 4s).',
            '2º Dígito (Pausa Inferior): segundos parado na posição alongada (ex: 0s).',
            '3º Dígito (Concêntrica): segundos subindo o peso (ex: 1s ou "X" explosivo).',
            '4º Dígito (Pausa Superior): segundos em contração no topo (ex: 0s).'
        ],
        whenToUse: 'Elimina impulsos indevidos, padroniza o Tempo Sob Tensão (TUT) e protege articulações.',
        recoveryOrTips: 'Conte os segundos mentalmente de forma uniforme sem acelerar.'
    },
    pause_reps: {
        id: 'pause_reps',
        layer: 'execution_mode',
        name: 'Repetições com Pausa (Pause Reps)',
        shortName: 'Pausa',
        icon: 'pause_circle',
        badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        summary: 'Parada isométrica de 2 a 3 segundos no ponto de maior tensão a cada repetição.',
        howToPerform: [
            'Desça a carga de forma controlada até o ponto de amplitude máxima.',
            'Faça uma parada estática completa de 2 a 3 segundos mantendo a musculatura ativada.',
            'Suba com força controlada sem dar tranco.'
        ],
        whenToUse: 'Corrige pontos de estagnação (sticking points) e elimina o rebote elástico.',
        recoveryOrTips: 'Não relaxe o músculo durante a pausa; mantenha rigidez abdominal e escapular.'
    },
    deadstop: {
        id: 'deadstop',
        layer: 'execution_mode',
        name: 'Deadstop Reps',
        shortName: 'Deadstop',
        icon: 'horizontal_rule',
        badgeColor: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
        summary: 'O peso repousa completamente no suporte ou chão a cada repetição, zerando a energia elástica.',
        howToPerform: [
            'A cada repetição, apoie a barra nos pinos de segurança ou no solo por 1 a 2 segundos.',
            'Aguarde a dissipação total da energia do movimento.',
            'Inicie a nova repetição a partir da inércia pura.'
        ],
        whenToUse: 'Desenvolvimento de força de partida (starting strength) e alívio de compressão na coluna.',
        recoveryOrTips: 'Comum em Levantamento Terra, Supino no Pin e Remada Cavalheiro.'
    },
    ponto_zero: {
        id: 'ponto_zero',
        layer: 'execution_mode',
        name: 'Ponto Zero (Método Sardinha)',
        shortName: 'Ponto Zero',
        icon: 'radio_button_checked',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        summary: 'Contração isométrica máxima de 3 a 5 segundos no estiramento total do músculo.',
        howToPerform: [
            'Na fase de maior alongamento (onde o peso quer te esticar), congele a posição por 3 a 5 segundos.',
            'Mantenha contração ativa máxima sem relaxar os tendões.',
            'Retorne à fase concêntrica sem nenhum tranco ou impulso.'
        ],
        whenToUse: 'Desativa o fuso muscular e anula o reflexo miotático, forçando recrutamento de fibras profundas.',
        recoveryOrTips: 'Reduza a carga usual em 30% a 40% para suportar a isometria extrema.'
    },
    lengthened_partial: {
        id: 'lengthened_partial',
        layer: 'execution_mode',
        name: 'Parciais Alongadas (Lengthened Partials)',
        shortName: 'Parcial Alongada',
        icon: 'unfold_more',
        badgeColor: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
        summary: 'Repetições parciais focadas exclusivamente na porção alongada do movimento.',
        howToPerform: [
            'Após atingir a incapacidade de completar repetições inteiras, continue realizando repetições na metade inferior do movimento.',
            'Mova o peso do estiramento máximo até o meio do percurso e retorne ao estiramento.',
            'Execute 4 a 8 parciais até a falha completa.'
        ],
        whenToUse: 'Ciência moderna comprovou que a hipertrofia mediada pelo estiramento é superior na porção alongada.',
        recoveryOrTips: 'Mantenha amplitude segura para não sobrecarregar as articulações além da capacidade.'
    },
    twenty_ones: {
        id: 'twenty_ones',
        layer: 'execution_mode',
        name: '21s (Método 21)',
        shortName: '21s',
        icon: 'counter_7',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        summary: '7 repetições na metade inferior + 7 repetições na metade superior + 7 completas seguidas.',
        howToPerform: [
            '7 reps: do ponto inicial até a metade do movimento.',
            '7 reps: da metade do movimento até a contração máxima.',
            '7 reps: amplitude completa de ponta a ponta sem descanso.',
            'Total: 21 repetições contínuas.'
        ],
        whenToUse: 'Clássico para bíceps, elevações laterais ou cadeira extensora, gerando queimação ácida intensa.',
        recoveryOrTips: 'Carga reduzida em cerca de 40% do normal.'
    },
    one_and_half: {
        id: 'one_and_half',
        layer: 'execution_mode',
        name: '1.5 Repetições (Uma e Meia)',
        shortName: '1.5 Reps',
        icon: 'exposure_plus_1',
        badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        summary: 'Descer tudo, subir até a metade, descer tudo novamente e então subir até o topo.',
        howToPerform: [
            'Desça a carga até o ponto de amplitude total.',
            'Suba apenas até a metade do curso.',
            'Desça novamente ao fundo.',
            'Suba completamente até a posição inicial. Isso conta como 1 repetição.'
        ],
        whenToUse: 'Dobra o tempo sob tensão na porção mais difícil do exercício (ex: agachamento, elevação pélvica).',
        recoveryOrTips: 'Controle respiratório no meio da repetição fracionada.'
    },
    negative: {
        id: 'negative',
        layer: 'execution_mode',
        name: 'Repetições Negativas (Excêntricas)',
        shortName: 'Negativa',
        icon: 'south',
        badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        summary: 'Ênfase e controle na descida ultra lenta (4 a 8 segundos) com carga supramáxima.',
        howToPerform: [
            'Com auxílio do parceiro de treino ou impulso controlado, posicione o peso no topo.',
            'Resista à gravidade segurando a descida por 5 a 8 segundos completos.',
            'Receba ajuda imediata para subir novamente e repita.'
        ],
        whenToUse: 'Estímulo de sobrecarga excêntrica pesada para ganhos rápidos de força estrutural.',
        recoveryOrTips: 'Gera alto dano tecidual; use com moderação e não em toda sessão.'
    },
    forced_reps: {
        id: 'forced_reps',
        layer: 'execution_mode',
        name: 'Repetições Forçadas',
        shortName: 'Forçadas',
        icon: 'pan_tool_alt',
        badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        summary: 'Assistência sutil de spotter para realizar 2 a 4 repetições além da falha concêntrica.',
        howToPerform: [
            'Faça as repetições normais até a falha concêntrica involuntária.',
            'O parceiro de treino (spotter) aplica apenas a força mínima necessária na subida para a barra continuar em movimento.',
            'A fase de descida continua sendo 100% controlada por você.'
        ],
        whenToUse: 'Ultrapassar platôs de força e recrutar fibras em exaustão extrema.',
        recoveryOrTips: 'O spotter não deve carregar o peso por você; apenas auxiliar a transpor o sticking point.'
    },

    // ═════════════════════════════════════════════════════════════════════
    // CAMADA 4: TIMER ENGINE (CRONOMETRAGEM)
    // ═════════════════════════════════════════════════════════════════════
    standard: {
        id: 'standard',
        layer: 'timer_mode',
        name: 'Descanso Tradicional',
        shortName: 'Tradicional',
        icon: 'hourglass_empty',
        badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
        summary: 'Intervalo de descanso livre e fixo pós-série para recuperação de fosfocreatina.',
        howToPerform: [
            'Complete a série e inicie o cronômetro de descanso pré-programado.',
            'Aguarde o alarme antes de iniciar a próxima série.'
        ],
        whenToUse: 'Padrão da musculação tradicional e treinos de força pura.',
        recoveryOrTips: 'Geralmente 60 a 90s para hipertrofia e 2 a 3 minutos para força.'
    },
    emom: {
        id: 'emom',
        layer: 'timer_mode',
        name: 'EMOM (Every Minute on the Minute)',
        shortName: 'EMOM',
        icon: 'schedule',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        summary: 'A cada virada de minuto (00s), execute a meta; o restante do minuto é o seu descanso.',
        howToPerform: [
            'O relógio começa em 60s em contagem regressiva.',
            'Realize a meta de repetições o mais eficientemente possível.',
            'Se você levar 25 segundos para completar, tem 35 segundos de descanso até o próximo minuto.',
            'No segundo 00, o próximo round inicia imediatamente.'
        ],
        whenToUse: 'Treinos de condicionamento funcional, calistenia, densidade de força e cross training.',
        recoveryOrTips: 'Mantenha ritmo sustentável para não queimar a musculatura nos primeiros rounds.'
    },
    amrap: {
        id: 'amrap',
        layer: 'timer_mode',
        name: 'AMRAP (As Many Reps As Possible)',
        shortName: 'AMRAP',
        icon: 'all_inclusive',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        summary: 'Máximo de repetições ou rounds possíveis dentro de um limite de tempo fixado.',
        howToPerform: [
            'Dispare o cronômetro da janela de tempo (ex: 2 a 5 minutos).',
            'Execute o máximo de repetições com boa técnica que seu corpo aguentar até o alarme zerar.',
            'Anote o número final de repetições alcançadas para progressão futura.'
        ],
        whenToUse: 'Desafios de resistência muscular, teste de capacidade de trabalho e encerramento de treino.',
        recoveryOrTips: 'Não sacrifique a postura nem a amplitude em busca de velocidade.'
    },
    tabata: {
        id: 'tabata',
        layer: 'timer_mode',
        name: 'Protocolo Tabata',
        shortName: 'Tabata',
        icon: 'speed',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        summary: '8 rounds de 20 segundos de esforço máximo intercalados por 10 segundos de descanso total (4 min).',
        howToPerform: [
            'Round 1: 20s de esforço na velocidade máxima.',
            'Descanso 1: 10s de repouso completo.',
            'Repita essa alternância por exatamente 8 ciclos (total de 4 minutos).',
            'O cronômetro avisa as transições com bips sonoros.'
        ],
        whenToUse: 'Potência anaeróbica máxima, condicionamento VO2 máx e alta oxidação lipídica pós-treino (EPOC).',
        recoveryOrTips: 'Dedique 100% de esforço em cada janela de 20 segundos.'
    }
};

/** Categorias para navegação por abas dentro do Modal */
export const METHOD_GUIDE_CATEGORIES = [
    { id: 'all', label: 'Todos' },
    { id: 'group', label: '1. Agrupamentos (Biset/Triset)' },
    { id: 'set_method', label: '2. Métodos de Série' },
    { id: 'execution_mode', label: '3. Execução do Rep' },
    { id: 'timer_mode', label: '4. Timer & Condicionamento' }
] as const;
