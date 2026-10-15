export interface SpecialToken {
    id: string;
    label: string;
    shortLabel: string;
    icon: string;
    textColor: string;
    bgLight: string;
    border: string;
    badge: string;
    solidBadge: string;
    accentColor: string;
    description?: string;
}

// ═════════════════════════════════════════════════════════════════════
// CAMADA 1: AGRUPAMENTOS DE EXERCÍCIOS (GROUPS)
// ═════════════════════════════════════════════════════════════════════
export const GROUP_TOKENS: Record<string, SpecialToken> = {
    superset: {
        id: 'superset',
        label: 'BISET (2 EXERCÍCIOS)',
        shortLabel: 'BISET',
        icon: 'dynamic_feed',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        bgLight: 'bg-indigo-50/25 dark:bg-indigo-950/20',
        border: 'border-indigo-500/30 dark:border-indigo-500/40',
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        solidBadge: 'bg-indigo-600 text-white',
        accentColor: 'indigo',
        description: 'Dois exercícios executados consecutivamente sem descanso entre eles.'
    },
    triset: {
        id: 'triset',
        label: 'TRISET (3 EXERCÍCIOS)',
        shortLabel: 'TRISET',
        icon: 'view_carousel',
        textColor: 'text-purple-600 dark:text-purple-400',
        bgLight: 'bg-purple-50/25 dark:bg-purple-950/20',
        border: 'border-purple-500/30 dark:border-purple-500/40',
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        solidBadge: 'bg-purple-600 text-white',
        accentColor: 'purple',
        description: 'Três exercícios realizados em sequência ininterrupta sem descanso.'
    },
    giant_set: {
        id: 'giant_set',
        label: 'GIANT SET (CIRCUITO)',
        shortLabel: 'GIANT SET',
        icon: 'table_rows',
        textColor: 'text-pink-600 dark:text-pink-400',
        bgLight: 'bg-pink-50/25 dark:bg-pink-950/20',
        border: 'border-pink-500/30 dark:border-pink-500/40',
        badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800',
        solidBadge: 'bg-pink-600 text-white',
        accentColor: 'pink',
        description: 'Quatro ou mais exercícios emendados em sequência contínua.'
    },
    paired_antagonist: {
        id: 'paired_antagonist',
        label: 'PAREADO ANTAGONISTA',
        shortLabel: 'ANTAGONISTA',
        icon: 'swap_horiz',
        textColor: 'text-cyan-600 dark:text-cyan-400',
        bgLight: 'bg-cyan-50/25 dark:bg-cyan-950/20',
        border: 'border-cyan-500/30 dark:border-cyan-500/40',
        badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        solidBadge: 'bg-cyan-600 text-white',
        accentColor: 'cyan',
        description: 'Músculos opostos intercalados com descanso de transição moderado.'
    }
};

// ═════════════════════════════════════════════════════════════════════
// TIPOS DE SÉRIE (SET TYPES)
// ═════════════════════════════════════════════════════════════════════
export const SET_TYPE_TOKENS: Record<string, SpecialToken> = {
    warmup: {
        id: 'warmup',
        label: 'Aquecimento',
        shortLabel: 'W',
        icon: 'local_fire_department',
        textColor: 'text-amber-700 dark:text-amber-400',
        bgLight: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800/50',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        solidBadge: 'bg-amber-500 text-white',
        accentColor: 'amber',
        description: 'Série com carga reduzida para preparar articulações e musculatura.'
    },
    preparation: {
        id: 'preparation',
        label: 'Preparação / Feeder',
        shortLabel: 'P',
        icon: 'publish',
        textColor: 'text-cyan-600 dark:text-cyan-400',
        bgLight: 'bg-cyan-50 dark:bg-cyan-900/20',
        border: 'border-cyan-200 dark:border-cyan-800/50',
        badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        solidBadge: 'bg-cyan-500 text-white',
        accentColor: 'cyan',
        description: 'Série curta para aclimatar com a carga, sem gerar fadiga residual.'
    },
    working: {
        id: 'working',
        label: 'Trabalho (Normal)',
        shortLabel: 'Normal',
        icon: 'fitness_center',
        textColor: 'text-sky-600 dark:text-sky-400',
        bgLight: 'bg-sky-50 dark:bg-sky-900/20',
        border: 'border-sky-200 dark:border-sky-800/50',
        badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        solidBadge: 'bg-sky-500 text-white',
        accentColor: 'sky',
        description: 'Série principal de trabalho do treino. Focar na carga alvo.'
    },
    failure: {
        id: 'failure',
        label: 'Até a Falha',
        shortLabel: 'Falha',
        icon: 'bolt',
        textColor: 'text-red-600 dark:text-red-400',
        bgLight: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800/50',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
        solidBadge: 'bg-red-500 text-white',
        accentColor: 'red',
        description: 'Executar até o limite mecânico concêntrico involuntário.'
    },
    backoff: {
        id: 'backoff',
        label: 'Back-off',
        shortLabel: 'Back-off',
        icon: 'trending_down',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-emerald-200 dark:border-emerald-800/50',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        solidBadge: 'bg-emerald-500 text-white',
        accentColor: 'emerald',
        description: 'Redução de carga (10-20%) após a principal para acumular volume.'
    },
    drop: {
        id: 'drop',
        label: 'Dropset',
        shortLabel: 'Drop',
        icon: 'layers',
        textColor: 'text-purple-600 dark:text-purple-400',
        bgLight: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800/50',
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        solidBadge: 'bg-purple-600 text-white',
        accentColor: 'purple',
        description: 'Série até a falha, redução de carga e continuação sem intervalo.'
    },
    dropset: {
        id: 'dropset',
        label: 'Dropset',
        shortLabel: 'Drop',
        icon: 'layers',
        textColor: 'text-purple-600 dark:text-purple-400',
        bgLight: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800/50',
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        solidBadge: 'bg-purple-600 text-white',
        accentColor: 'purple',
        description: 'Série até a falha, redução de carga e continuação sem intervalo.'
    }
};

// ═════════════════════════════════════════════════════════════════════
// CAMADA 2: MÉTODOS DE SÉRIE (SET METHODS)
// ═════════════════════════════════════════════════════════════════════
export const METHOD_TOKENS: Record<string, SpecialToken> = {
    standard: {
        id: 'standard',
        label: 'Padrão (Sem Método)',
        shortLabel: 'Padrão',
        icon: 'check',
        textColor: 'text-slate-600 dark:text-slate-400',
        bgLight: 'bg-slate-50 dark:bg-slate-800/40',
        border: 'border-slate-200 dark:border-slate-700',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-slate-500 text-white',
        accentColor: 'slate',
        description: 'Execução normal da série com descanso convencional.'
    },
    dropset: {
        id: 'dropset',
        label: 'Dropset',
        shortLabel: 'Dropset',
        icon: 'layers',
        textColor: 'text-purple-600 dark:text-purple-400',
        bgLight: 'bg-purple-50/20 dark:bg-purple-950/10',
        border: 'border-purple-200/50 dark:border-purple-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-purple-600 text-white',
        accentColor: 'purple',
        description: 'Redução imediata de carga ao atingir a falha sem descanso.'
    },
    rest_pause: {
        id: 'rest_pause',
        label: 'Rest-Pause',
        shortLabel: 'Rest-Pause',
        icon: 'more_time',
        textColor: 'text-rose-600 dark:text-rose-400',
        bgLight: 'bg-rose-50/20 dark:bg-rose-950/10',
        border: 'border-rose-200/50 dark:border-rose-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-rose-600 text-white',
        accentColor: 'rose',
        description: 'Série pesada até a falha + micro-pausa de 10-15s + reps adicionais.'
    },
    cluster: {
        id: 'cluster',
        label: 'Cluster Sets',
        shortLabel: 'Cluster',
        icon: 'scatter_plot',
        textColor: 'text-blue-600 dark:text-blue-400',
        bgLight: 'bg-blue-50/20 dark:bg-blue-950/10',
        border: 'border-blue-200/50 dark:border-blue-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-blue-600 text-white',
        accentColor: 'blue',
        description: 'Fracionamento em mini-blocos com micro-pausa fixa de 15-20s.'
    },
    myo_reps: {
        id: 'myo_reps',
        label: 'Myo-Reps',
        shortLabel: 'Myo-Reps',
        icon: 'electric_bolt',
        textColor: 'text-amber-600 dark:text-amber-400',
        bgLight: 'bg-amber-50/20 dark:bg-amber-950/10',
        border: 'border-amber-200/50 dark:border-amber-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-amber-500 text-white',
        accentColor: 'amber',
        description: 'Série ativadora (12-20 reps) + mini-séries de 3-5 reps com pausa curta.'
    },
    muscle_round: {
        id: 'muscle_round',
        label: 'Muscle Round',
        shortLabel: 'Muscle Round',
        icon: 'rotate_right',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-emerald-50/20 dark:bg-emerald-950/10',
        border: 'border-emerald-200/50 dark:border-emerald-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-emerald-600 text-white',
        accentColor: 'emerald',
        description: 'Protocolo de 6 mini-séries de 4 reps com 10s de micro-pausa fixa.'
    },
    method_3_7: {
        id: 'method_3_7',
        label: 'Método 3/7',
        shortLabel: 'Método 3/7',
        icon: 'format_list_numbered',
        textColor: 'text-cyan-600 dark:text-cyan-400',
        bgLight: 'bg-cyan-50/20 dark:bg-cyan-950/10',
        border: 'border-cyan-200/50 dark:border-cyan-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-cyan-700 text-white',
        accentColor: 'cyan',
        description: 'Escada 3-4-5-6-7 reps com 15 segundos de descanso fixo entre elas.'
    },
    fst7: {
        id: 'fst7',
        label: 'FST-7',
        shortLabel: 'FST-7',
        icon: 'expand',
        textColor: 'text-fuchsia-600 dark:text-fuchsia-400',
        bgLight: 'bg-fuchsia-50/20 dark:bg-fuchsia-950/10',
        border: 'border-fuchsia-200/50 dark:border-fuchsia-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-fuchsia-600 text-white',
        accentColor: 'fuchsia',
        description: '7 séries de 10-12 reps com 30-45s de descanso para alongar fáscia.'
    },
    bfr: {
        id: 'bfr',
        label: 'BFR (Oclusão Vascular)',
        shortLabel: 'BFR',
        icon: 'compress',
        textColor: 'text-teal-600 dark:text-teal-400',
        bgLight: 'bg-teal-50/20 dark:bg-teal-950/10',
        border: 'border-teal-200/50 dark:border-teal-800/40',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-teal-600 text-white',
        accentColor: 'teal',
        description: 'Treino com manguito de oclusão e protocolo 30-15-15-15 reps.'
    }
};

// ═════════════════════════════════════════════════════════════════════
// CAMADA 3: MODOS DE EXECUÇÃO DO REP (EXECUTION MODES)
// ═════════════════════════════════════════════════════════════════════
export const EXECUTION_MODE_TOKENS: Record<string, SpecialToken> = {
    standard: {
        id: 'standard',
        label: 'Padrão (Cadência Livre)',
        shortLabel: 'Livre',
        icon: 'check',
        textColor: 'text-slate-600 dark:text-slate-400',
        bgLight: 'bg-slate-50 dark:bg-slate-800/40',
        border: 'border-slate-200 dark:border-slate-700',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-slate-500 text-white',
        accentColor: 'slate',
        description: 'Amplitude total e velocidade natural de repetição.'
    },
    tempo: {
        id: 'tempo',
        label: 'Cadência Controlada (Tempo)',
        shortLabel: 'Tempo',
        icon: 'timer',
        textColor: 'text-emerald-600 dark:text-emerald-400',
        bgLight: 'bg-emerald-50/40 dark:bg-emerald-950/20',
        border: 'border-emerald-200 dark:border-emerald-800',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        solidBadge: 'bg-emerald-600 text-white',
        accentColor: 'emerald',
        description: 'Controle em segundos da descida, pausas e subida (ex: 4-0-1-0).'
    },
    pause_reps: {
        id: 'pause_reps',
        label: 'Repetições com Pausa (Pause Reps)',
        shortLabel: 'Pausa',
        icon: 'pause_circle',
        textColor: 'text-sky-600 dark:text-sky-400',
        bgLight: 'bg-sky-50/40 dark:bg-sky-950/20',
        border: 'border-sky-200 dark:border-sky-800',
        badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        solidBadge: 'bg-sky-600 text-white',
        accentColor: 'sky',
        description: 'Parada isométrica de 2 a 3 segundos no ponto de maior tensão.'
    },
    deadstop: {
        id: 'deadstop',
        label: 'Deadstop Reps',
        shortLabel: 'Deadstop',
        icon: 'horizontal_rule',
        textColor: 'text-slate-600 dark:text-slate-400',
        bgLight: 'bg-slate-100 dark:bg-slate-800',
        border: 'border-slate-300 dark:border-slate-600',
        badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
        solidBadge: 'bg-slate-600 text-white',
        accentColor: 'slate',
        description: 'Apoio total no chão/suporte a cada repetição para zerar energia elástica.'
    },
    ponto_zero: {
        id: 'ponto_zero',
        label: 'Ponto Zero (Método Sardinha)',
        shortLabel: 'Ponto Zero',
        icon: 'radio_button_checked',
        textColor: 'text-amber-600 dark:text-amber-400',
        bgLight: 'bg-amber-50/40 dark:bg-amber-950/20',
        border: 'border-amber-200 dark:border-amber-800',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        solidBadge: 'bg-amber-500 text-white',
        accentColor: 'amber',
        description: 'Contração isométrica de 3 a 5s no ponto de máximo alongamento.'
    },
    lengthened_partial: {
        id: 'lengthened_partial',
        label: 'Parciais Alongadas',
        shortLabel: 'Parcial',
        icon: 'unfold_more',
        textColor: 'text-violet-600 dark:text-violet-400',
        bgLight: 'bg-violet-50/40 dark:bg-violet-950/20',
        border: 'border-violet-200 dark:border-violet-800',
        badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
        solidBadge: 'bg-violet-600 text-white',
        accentColor: 'violet',
        description: 'Repetições na metade inferior focadas no músculo em estiramento.'
    },
    twenty_ones: {
        id: 'twenty_ones',
        label: '21s (Método 21)',
        shortLabel: '21s',
        icon: 'counter_7',
        textColor: 'text-purple-600 dark:text-purple-400',
        bgLight: 'bg-purple-50/40 dark:bg-purple-950/20',
        border: 'border-purple-200 dark:border-purple-800',
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        solidBadge: 'bg-purple-600 text-white',
        accentColor: 'purple',
        description: '7 reps metade inferior + 7 reps metade superior + 7 reps completas.'
    },
    one_and_half: {
        id: 'one_and_half',
        label: '1.5 Reps (Uma e Meia)',
        shortLabel: '1.5 Reps',
        icon: 'exposure_plus_1',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        bgLight: 'bg-indigo-50/40 dark:bg-indigo-950/20',
        border: 'border-indigo-200 dark:border-indigo-800',
        badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        solidBadge: 'bg-indigo-600 text-white',
        accentColor: 'indigo',
        description: 'Descer tudo, subir até a metade, descer novamente e subir até o topo.'
    },
    negative: {
        id: 'negative',
        label: 'Repetições Negativas',
        shortLabel: 'Negativa',
        icon: 'south',
        textColor: 'text-rose-600 dark:text-rose-400',
        bgLight: 'bg-rose-50/40 dark:bg-rose-950/20',
        border: 'border-rose-200 dark:border-rose-800',
        badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        solidBadge: 'bg-rose-600 text-white',
        accentColor: 'rose',
        description: 'Ênfase na descida lenta (4 a 8s) com sobrecarga excêntrica.'
    },
    forced_reps: {
        id: 'forced_reps',
        label: 'Repetições Forçadas',
        shortLabel: 'Forçadas',
        icon: 'pan_tool_alt',
        textColor: 'text-orange-600 dark:text-orange-400',
        bgLight: 'bg-orange-50/40 dark:bg-orange-950/20',
        border: 'border-orange-200 dark:border-orange-800',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        solidBadge: 'bg-orange-600 text-white',
        accentColor: 'orange',
        description: 'Assistência de spotter para 2 a 4 reps extras após a falha concêntrica.'
    }
};

// ═════════════════════════════════════════════════════════════════════
// CAMADA 4: TIMER ENGINE (TIMER MODES)
// ═════════════════════════════════════════════════════════════════════
export const TIMER_MODE_TOKENS: Record<string, SpecialToken> = {
    standard: {
        id: 'standard',
        label: 'Descanso Tradicional',
        shortLabel: 'Tradicional',
        icon: 'hourglass_empty',
        textColor: 'text-slate-600 dark:text-slate-400',
        bgLight: 'bg-slate-50 dark:bg-slate-800/40',
        border: 'border-slate-200 dark:border-slate-700',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        solidBadge: 'bg-slate-500 text-white',
        accentColor: 'slate',
        description: 'Intervalo fixo pós-série para recuperação de fosfocreatina.'
    },
    emom: {
        id: 'emom',
        label: 'EMOM',
        shortLabel: 'EMOM',
        icon: 'schedule',
        textColor: 'text-teal-600 dark:text-teal-400',
        bgLight: 'bg-teal-50/40 dark:bg-teal-950/20',
        border: 'border-teal-200 dark:border-teal-800',
        badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        solidBadge: 'bg-teal-600 text-white',
        accentColor: 'teal',
        description: 'Execute a cada virada de minuto (00s); o restante é descanso.'
    },
    amrap: {
        id: 'amrap',
        label: 'AMRAP',
        shortLabel: 'AMRAP',
        icon: 'all_inclusive',
        textColor: 'text-cyan-600 dark:text-cyan-400',
        bgLight: 'bg-cyan-50/40 dark:bg-cyan-950/20',
        border: 'border-cyan-200 dark:border-cyan-800',
        badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        solidBadge: 'bg-cyan-600 text-white',
        accentColor: 'cyan',
        description: 'Máximo de repetições ou rounds em uma janela de tempo fixa.'
    },
    tabata: {
        id: 'tabata',
        label: 'Tabata',
        shortLabel: 'Tabata',
        icon: 'speed',
        textColor: 'text-orange-600 dark:text-orange-400',
        bgLight: 'bg-orange-50/40 dark:bg-orange-950/20',
        border: 'border-orange-200 dark:border-orange-800',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        solidBadge: 'bg-orange-600 text-white',
        accentColor: 'orange',
        description: '8 ciclos de 20s de esforço máximo por 10s de repouso (4 min).'
    }
};

// ═════════════════════════════════════════════════════════════════════
// HELPERS POLIMÓRFICOS
// ═════════════════════════════════════════════════════════════════════
export const getGroupToken = (type?: string | null): SpecialToken => {
    if (!type || !GROUP_TOKENS[type]) return GROUP_TOKENS.superset;
    return GROUP_TOKENS[type];
};

export const getSetTypeToken = (type?: string | null): SpecialToken => {
    if (!type || !SET_TYPE_TOKENS[type]) return SET_TYPE_TOKENS.working;
    return SET_TYPE_TOKENS[type];
};

export const getMethodToken = (method?: string | null): SpecialToken => {
    if (!method || !METHOD_TOKENS[method]) return METHOD_TOKENS.standard;
    return METHOD_TOKENS[method];
};

export interface MethodTheme {
    rowBg: string;           // ex: bg-rose-50/60 dark:bg-rose-950/20
    rowBorderLeft?: string;
    containerBg: string;     // ex: bg-rose-50/50 dark:bg-rose-950/25
    borderColor: string;     // ex: border-rose-500
    borderLight: string;     // ex: border-rose-200 dark:border-rose-800/60
    headerText: string;      // ex: text-rose-800 dark:text-rose-300
    subText: string;         // ex: text-rose-700 dark:text-rose-400
    accentText: string;      // ex: text-rose-600 dark:text-rose-400
    inputBorder: string;     // ex: border-rose-200 dark:border-rose-700 focus:border-rose-500
    checkActive: string;     // ex: bg-rose-600 text-white shadow-sm
    checkInactive: string;   // ex: bg-white dark:bg-slate-800 text-rose-600 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40
    dividerBorder: string;   // ex: border-rose-200/50 dark:border-rose-800/40
    badgeColor: string;      // ex: bg-rose-100 text-rose-800 border-rose-200
}

export const METHOD_THEMES: Record<string, MethodTheme> = {
    standard: {
        rowBg: '',
        rowBorderLeft: '',
        containerBg: 'bg-slate-50 dark:bg-slate-800/40',
        borderColor: 'border-slate-400 dark:border-slate-600',
        borderLight: 'border-slate-200 dark:border-slate-700',
        headerText: 'text-slate-800 dark:text-slate-300',
        subText: 'text-slate-700 dark:text-slate-400',
        accentText: 'text-slate-600 dark:text-slate-400',
        inputBorder: 'border-slate-200 dark:border-slate-700 focus:border-slate-500',
        checkActive: 'bg-slate-700 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-slate-600 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800',
        dividerBorder: 'border-slate-200/50 dark:border-slate-700/40',
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    },
    rest_pause: {
        rowBg: 'bg-rose-50/60 dark:bg-rose-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-rose-50/50 dark:bg-rose-950/25',
        borderColor: 'border-rose-500',
        borderLight: 'border-rose-200 dark:border-rose-800/60',
        headerText: 'text-rose-800 dark:text-rose-300',
        subText: 'text-rose-700 dark:text-rose-400',
        accentText: 'text-rose-600 dark:text-rose-400',
        inputBorder: 'border-rose-200 dark:border-rose-700 focus:border-rose-500',
        checkActive: 'bg-rose-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-rose-600 border border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40',
        dividerBorder: 'border-rose-200/50 dark:border-rose-800/40',
        badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    },
    dropset: {
        rowBg: 'bg-purple-50/60 dark:bg-purple-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-purple-50/50 dark:bg-purple-950/25',
        borderColor: 'border-purple-500',
        borderLight: 'border-purple-200 dark:border-purple-800/60',
        headerText: 'text-purple-800 dark:text-purple-300',
        subText: 'text-purple-700 dark:text-purple-400',
        accentText: 'text-purple-600 dark:text-purple-400',
        inputBorder: 'border-purple-200 dark:border-purple-700 focus:border-purple-500',
        checkActive: 'bg-purple-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-purple-600 border border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40',
        dividerBorder: 'border-purple-200/50 dark:border-purple-800/40',
        badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    },
    cluster: {
        rowBg: 'bg-blue-50/60 dark:bg-blue-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-blue-50/50 dark:bg-blue-950/25',
        borderColor: 'border-blue-500',
        borderLight: 'border-blue-200 dark:border-blue-800/60',
        headerText: 'text-blue-800 dark:text-blue-300',
        subText: 'text-blue-700 dark:text-blue-400',
        accentText: 'text-blue-600 dark:text-blue-400',
        inputBorder: 'border-blue-200 dark:border-blue-700 focus:border-blue-500',
        checkActive: 'bg-blue-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-blue-600 border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40',
        dividerBorder: 'border-blue-200/50 dark:border-blue-800/40',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    },
    myo_reps: {
        rowBg: 'bg-amber-50/60 dark:bg-amber-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-amber-50/50 dark:bg-amber-950/25',
        borderColor: 'border-amber-500',
        borderLight: 'border-amber-200 dark:border-amber-800/60',
        headerText: 'text-amber-800 dark:text-amber-300',
        subText: 'text-amber-700 dark:text-amber-400',
        accentText: 'text-amber-600 dark:text-amber-400',
        inputBorder: 'border-amber-200 dark:border-amber-700 focus:border-amber-500',
        checkActive: 'bg-amber-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-amber-600 border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40',
        dividerBorder: 'border-amber-200/50 dark:border-amber-800/40',
        badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    },
    muscle_round: {
        rowBg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-emerald-50/50 dark:bg-emerald-950/25',
        borderColor: 'border-emerald-500',
        borderLight: 'border-emerald-200 dark:border-emerald-800/60',
        headerText: 'text-emerald-800 dark:text-emerald-300',
        subText: 'text-emerald-700 dark:text-emerald-400',
        accentText: 'text-emerald-600 dark:text-emerald-400',
        inputBorder: 'border-emerald-200 dark:border-emerald-700 focus:border-emerald-500',
        checkActive: 'bg-emerald-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-emerald-600 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
        dividerBorder: 'border-emerald-200/50 dark:border-emerald-800/40',
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    },
    method_3_7: {
        rowBg: 'bg-cyan-50/60 dark:bg-cyan-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-cyan-50/50 dark:bg-cyan-950/25',
        borderColor: 'border-cyan-500',
        borderLight: 'border-cyan-200 dark:border-cyan-800/60',
        headerText: 'text-cyan-800 dark:text-cyan-300',
        subText: 'text-cyan-700 dark:text-cyan-400',
        accentText: 'text-cyan-600 dark:text-cyan-400',
        inputBorder: 'border-cyan-200 dark:border-cyan-700 focus:border-cyan-500',
        checkActive: 'bg-cyan-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-cyan-600 border border-cyan-300 dark:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/40',
        dividerBorder: 'border-cyan-200/50 dark:border-cyan-800/40',
        badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
    },
    fst7: {
        rowBg: 'bg-fuchsia-50/60 dark:bg-fuchsia-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-fuchsia-50/50 dark:bg-fuchsia-950/25',
        borderColor: 'border-fuchsia-500',
        borderLight: 'border-fuchsia-200 dark:border-fuchsia-800/60',
        headerText: 'text-fuchsia-800 dark:text-fuchsia-300',
        subText: 'text-fuchsia-700 dark:text-fuchsia-400',
        accentText: 'text-fuchsia-600 dark:text-fuchsia-400',
        inputBorder: 'border-fuchsia-200 dark:border-fuchsia-700 focus:border-fuchsia-500',
        checkActive: 'bg-fuchsia-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-fuchsia-600 border border-fuchsia-300 dark:border-fuchsia-700 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40',
        dividerBorder: 'border-fuchsia-200/50 dark:border-fuchsia-800/40',
        badgeColor: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800'
    },
    bfr: {
        rowBg: 'bg-teal-50/60 dark:bg-teal-950/20',
        rowBorderLeft: '',
        containerBg: 'bg-teal-50/50 dark:bg-teal-950/25',
        borderColor: 'border-teal-500',
        borderLight: 'border-teal-200 dark:border-teal-800/60',
        headerText: 'text-teal-800 dark:text-teal-300',
        subText: 'text-teal-700 dark:text-teal-400',
        accentText: 'text-teal-600 dark:text-teal-400',
        inputBorder: 'border-teal-200 dark:border-teal-700 focus:border-teal-500',
        checkActive: 'bg-teal-600 text-white shadow-sm',
        checkInactive: 'bg-white dark:bg-slate-800 text-teal-600 border border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40',
        dividerBorder: 'border-teal-200/50 dark:border-teal-800/40',
        badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    }
};

export const getMethodTheme = (method?: string | null): MethodTheme => {
    if (!method || !METHOD_THEMES[method]) return METHOD_THEMES.standard;
    return METHOD_THEMES[method];
};

export const getExecutionModeToken = (mode?: string | null): SpecialToken => {
    if (!mode || !EXECUTION_MODE_TOKENS[mode]) return EXECUTION_MODE_TOKENS.standard;
    return EXECUTION_MODE_TOKENS[mode];
};

export const getTimerModeToken = (timer?: string | null): SpecialToken => {
    if (!timer || !TIMER_MODE_TOKENS[timer]) return TIMER_MODE_TOKENS.standard;
    return TIMER_MODE_TOKENS[timer];
};

/**
 * Sanitiza e normaliza o tipo de série para garantir conformidade estrita com o enum do banco de dados:
 * ('warmup', 'working', 'failure', 'drop', 'preparation', 'backoff', 'deload', 'dropset')
 */
export function sanitizeSetType(type?: string | null): string {
    if (!type) return 'working';
    const lower = type.toLowerCase().trim();
    if (lower === 'dropset') return 'drop';
    if (['warmup', 'working', 'failure', 'drop', 'preparation', 'backoff', 'deload'].includes(lower)) {
        return lower;
    }
    return 'working';
}
