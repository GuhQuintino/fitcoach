/**
 * Normalizador canônico de Anamnese GQFit (v1 legado + v2 estruturado) para os scripts do Fitcoach.
 * Mantém paridade estrita com Questionários (`src/domain/anamnese/normalizer.ts`) e Consultoria (`src/lib/anamnese/v2.ts`).
 *
 * Regras:
 * - Compatível com anamneses v1 legadas e v2 estruturadas.
 * - Diferencia explicitamente "Não informado" de "Nenhum".
 * - Produz agenda combinada Seg-Dom (com alternâncias e coincidência de tempo), sessão mais pesada,
 *   prioridades do ciclo, máquinas/equipamentos, histórico, alertas clínicos e pendências do 1º check-in.
 */

export const DAYS_OF_WEEK = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

export const DAY_LABELS = {
  seg: { short: 'Seg', full: 'Segunda-feira' },
  ter: { short: 'Ter', full: 'Terça-feira' },
  qua: { short: 'Qua', full: 'Quarta-feira' },
  qui: { short: 'Qui', full: 'Quinta-feira' },
  sex: { short: 'Sex', full: 'Sexta-feira' },
  sab: { short: 'Sáb', full: 'Sábado' },
  dom: { short: 'Dom', full: 'Domingo' },
};

export const MACHINE_LABELS = {
  // Pernas
  'cadeira-extensora': 'Cadeira Extensora',
  'cadeira-flexora': 'Cadeira Flexora',
  'mesa-flexora': 'Mesa Flexora',
  'flexora-em-pe': 'Flexora em Pé (Unilateral)',
  'leg-press-45': 'Leg Press 45°',
  'leg-press-horizontal': 'Leg Press Horizontal',
  'agachamento-hack': 'Agachamento Hack',
  'agachamento-pendulo': 'Agachamento Pêndulo (Pendulum Squat)',
  'smith-machine': 'Smith Machine (Barra Guiada)',
  'cadeira-adutora': 'Cadeira Adutora',
  'panturrilha-sentado': 'Panturrilha Sentado (Sóleo)',
  'panturrilha-em-pe-maquina': 'Panturrilha em Pé Máquina',
  // Glúteos
  'cadeira-abdutora': 'Cadeira Abdutora',
  'elevacao-pelvica-maquina': 'Máquina de Elevação Pélvica (Hip Thrust)',
  'gluteo-maquina': 'Máquina de Glúteo / Coice',
  // Costas & Lombar
  'puxada-polia': 'Puxada Alta na Polia (Pulley)',
  'puxada-articulada': 'Puxada Articulada / Convergente',
  'remada-baixa': 'Remada Baixa na Polia (Triângulo)',
  'remada-maquina': 'Remada Máquina (Apoio no Peito)',
  'remada-t-bar': 'Remada T-Bar (Apoio no Peito)',
  'remada-cavalinho': 'Remada Cavalinho',
  'graviton': 'Graviton (Barra / Paralela Assistida)',
  'pullover-maquina': 'Pullover Máquina',
  'lombar-maquina': 'Lombar Máquina (Extensão Sentado)',
  'banco-romano': 'Banco Romano (Hiperextensão 45°)',
  // Peito
  'supino-maquina': 'Supino Máquina (Chest Press)',
  'supino-inclinado-maquina': 'Supino Inclinado Máquina',
  'crucifixo-maquina': 'Crucifixo Máquina (Voador com Manoplas)',
  'peck-deck': 'Peck Deck (Apoio de Antebraço)',
  'polia-crossover': 'Polia / Crossover Regulável',
  'paralelas': 'Paralelas (Estação Livre)',
  // Ombros
  'desenvolvimento-maquina': 'Desenvolvimento Máquina',
  'elevacao-lateral-maquina': 'Elevação Lateral Máquina',
  'crucifixo-inverso-maquina': 'Crucifixo Inverso Máquina (Posterior de Ombro)',
  // Braços
  'rosca-scott-maquina': 'Rosca Scott Máquina',
  'rosca-biceps-maquina': 'Rosca Bíceps Máquina',
  'triceps-maquina': 'Tríceps Máquina (Extensão com Apoio)',
  'paralelas-maquina': 'Paralelas Máquina (Mergulho Sentado)',
  // Abdômen
  'abdominal-maquina': 'Abdominal Máquina',
};

const CARDIO_EQUIPMENT_LABELS = {
  esteira: 'Esteira',
  escada: 'Escada (simulador)',
  bike: 'Bike / Bicicleta ergométrica',
  remo: 'Remo ergômetro',
  corda: 'Corda',
  eliptico: 'Elíptico / Transport',
  caminhada_corrida_rua: 'Caminhada / Corrida na rua',
  sem_preferencia: 'Sem preferência',
};

const CARDIO_STATUS_LABELS = {
  definido: 'Rotina / dias definidos',
  varia: 'Varia conforme a semana',
  ainda_nao_sei: 'Ainda não sei',
  nao_faco: 'Não faz cardio agora',
  nao_informado: 'Não informado',
};

const CARDIO_MOMENT_LABELS = {
  na_academia_depois: 'Na academia, logo depois do treino',
  na_academia_antes: 'Na academia, antes do treino',
  na_academia_durante_flexivel: 'Na academia, no mesmo bloco do treino (durante ou antes/depois)',
  horario_separado: 'Em horário separado do treino',
  misto: 'Misto (parte junto do treino + parte separado)',
  varia: 'Varia conforme a semana',
  ainda_nao_sei: 'Ainda não sei',
  nao_se_aplica: 'Não se aplica',
};

const CARDIO_HORARIO_LABELS = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  mesmo_da_musculacao: 'Mesmo turno/horário da musculação',
  varia: 'Varia',
  ainda_nao_sei: 'Ainda não sei',
  nao_se_aplica: 'Não se aplica',
};

const TEMPO_FICHA_LABELS = {
  nao_se_aplica: 'Não se aplica (iniciando agora)',
  menos_1_mes: 'Menos de 1 mês',
  '1_a_3_meses': '1 a 3 meses',
  '3_a_6_meses': '3 a 6 meses',
  mais_6_meses: 'Mais de 6 meses',
  varia: 'Varia / sem ficha fixa',
  nao_informado: 'Não informado',
};

const PARCEIRO_LABELS = {
  sozinho: 'Treina sozinho(a)',
  com_parceiro_spotter: 'Treina com parceiro / spotter',
  as_vezes: 'Às vezes tem parceiro / spotter',
  nao_informado: 'Não informado',
};

const INCREMENTO_LABELS = {
  padrao_academia: 'Padrão de academia (saltos de 1,25–2,5 kg)',
  micro_anilhas_disponiveis: 'Tem micro-anilhas / incrementos pequenos',
  saltos_grandes_maquina: 'Máquinas com saltos grandes (5–10 kg) ou halteres espaçados',
  ainda_nao_sei: 'Não informado / ainda não observou',
};

const STUCK_LABELS = {
  cargas: 'Cargas travadas',
  constancia: 'Constância na semana',
  recuperacao: 'Recuperação / cansaço',
  dor_desconforto: 'Dor ou desconforto',
  falta_de_tempo: 'Tempo de treino',
  tecnica_conexao: 'Técnica / conexão muscular',
  estagnacao_visual: 'Estagnação visual',
};

const RECOVERY_FACTOR_LABELS = {
  trabalho_fisico_longo: 'Trabalho físico intenso / muitas horas em pé ou sentado',
  plantao_turno: 'Plantões / turnos irregulares',
  sono_irregular: 'Sono curto ou fragmentado',
  estresse_alto: 'Estresse elevado',
  outro_esporte: 'Desgaste de outro esporte/atividade',
  viagens_frequentes: 'Viagens frequentes',
};

const LOCAL_TREINO_LABELS = {
  academia: 'Academia comercial',
  condominio: 'Academia de condomínio',
  casa: 'Treino em casa',
  misto: 'Misto (academia + casa/condomínio)',
};

const OBJETIVO_LABELS = {
  hipertrofia: 'Hipertrofia / Ganho de Massa',
  emagrecimento: 'Emagrecimento e Definição',
  recomposicao: 'Recomposição Corporal',
  definicao: 'Definição Muscular',
  forca: 'Força e Performance',
  condicionamento: 'Condicionamento Físico',
  condicionamento_esportivo: 'Apoio a outro esporte',
  saude: 'Saúde e Qualidade de Vida',
  saude_longevidade: 'Saúde, Energia e Longevidade',
  reabilitacao: 'Fortalecimento / Retorno seguro',
  outro: 'Outro',
};

const NIVEL_LABELS = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

const SONO_LABELS = {
  excelente: 'Excelente',
  otima: 'Ótima',
  boa: 'Boa',
  regular: 'Regular',
  ruim: 'Ruim',
  nao_informado: 'Não informado',
};

const ESTRESSE_LABELS = {
  baixo: 'Baixo',
  moderado: 'Moderado',
  alto: 'Alto',
  muito_alto: 'Muito alto',
  nao_informado: 'Não informado',
};

const LOTACAO_ACADEMIA_LABELS = {
  tranquila: 'Tranquila (fácil revezar)',
  moderada: 'Moderada',
  lotada_pico: 'Lotada (horário de pico)',
  nao_se_aplica: 'Não se aplica',
  nao_informado: 'Não informado',
};

function formatBodyFatPercent(val) {
  const s = asNonEmptyString(val);
  if (!s) return 'Não informado';
  return `${s.replace(/%+$/, '').trim()}%`;
}

function asNonEmptyString(val) {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isExplicitNoneText(val) {
  const s = asNonEmptyString(val)?.toLowerCase();
  if (!s) return false;
  return ['nenhum', 'nenhuma', 'nao', 'não', 'nada', 'sem', 'nenhum exercicio', 'nenhum exercício'].includes(s);
}

function formatTextDiffNone(val, explicitStatus) {
  if (explicitStatus === 'nenhum') return 'Nenhum';
  if (explicitStatus === 'nao_informado') return 'Não informado';
  const s = asNonEmptyString(val);
  if (!s) return 'Não informado';
  if (isExplicitNoneText(s)) return 'Nenhum';
  return s;
}

function parseNumericHeightLegacy(val) {
  const s = asNonEmptyString(val);
  if (!s) return { cm: null, display: 'Não informado' };
  const cleaned = s.replace(/\s*cm\s*$/i, '').replace(/\s*m\s*$/i, '').replace(',', '.').trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return { cm: null, display: `${s} (verificar unidade)` };
  if (n >= 1.1 && n <= 2.4 && /m/i.test(s)) {
    const cm = Math.round(n * 1000) / 10;
    return { cm, display: `${cm} cm` };
  }
  if (n >= 110 && n <= 240) {
    return { cm: Math.round(n * 10) / 10, display: `${Math.round(n * 10) / 10} cm` };
  }
  if (n >= 1.1 && n <= 2.4) {
    return { cm: Math.round(n * 1000) / 10, display: `${Math.round(n * 1000) / 10} cm (legado)` };
  }
  return { cm: null, display: `${s} (ambíguo — revisar)` };
}

function parseNumericWeightLegacy(val) {
  const s = asNonEmptyString(val);
  if (!s) return { kg: null, display: 'Não informado' };
  const cleaned = s.replace(/\s*kg\s*$/i, '').replace(',', '.').trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 30 || n > 300) {
    return { kg: null, display: `${s} (revisar)` };
  }
  const kg = Math.round(n * 10) / 10;
  return { kg, display: `${kg} kg` };
}

function formatFrequencyLabel(freq) {
  if (freq === 'varia') return 'Varia';
  if (freq === 'ainda_nao_sei') return 'Ainda não sei';
  if (typeof freq === 'number') return `${freq}x/semana`;
  return 'Não informado';
}

function formatDurationLabel(dur) {
  if (dur === 'varia') return 'Varia';
  if (dur === 'ainda_nao_sei') return 'Ainda não sei';
  if (typeof dur === 'number') return `${dur} min`;
  return 'Não informado';
}

function isDayKey(val) {
  return typeof val === 'string' && DAYS_OF_WEEK.includes(val);
}

export function normalizeAnamneseContent(rawContent) {
  const content = rawContent && typeof rawContent === 'object' ? rawContent : {};
  const isV2 = content.version === 2 || content.schemaVersion === '2.0';

  if (!isV2) {
    return normalizeLegacyV1(content);
  }

  const heightCm =
    typeof content.heightCm === 'number' && Number.isFinite(content.heightCm)
      ? content.heightCm
      : parseNumericHeightLegacy(content.height).cm;
  const weightKg =
    typeof content.weightKg === 'number' && Number.isFinite(content.weightKg)
      ? content.weightKg
      : parseNumericWeightLegacy(content.weight).kg;

  const agendaRaw = content.agendaSemanal || {};
  const muscRaw = agendaRaw.musculacao || {};
  const outrasRaw = agendaRaw.outrasAtividades || {};

  const diasFixos = Array.isArray(muscRaw.diasFixos) ? muscRaw.diasFixos.filter(isDayKey) : [];
  const alternancias = Array.isArray(muscRaw.alternancias)
    ? muscRaw.alternancias
        .filter((a) => a && isDayKey(a.diaPrincipal) && isDayKey(a.diaAlternativo))
        .map((a, idx) => {
          const freqTxt =
            a.frequencia === 'semanas_alternadas'
              ? 'semanas alternadas'
              : a.frequencia === 'quinzenal'
                ? 'quinzenal'
                : 'quando necessário';
          const label = `${DAY_LABELS[a.diaPrincipal].full} ou ${DAY_LABELS[a.diaAlternativo].full} (${freqTxt})`;
          return {
            id: a.id || `alt-${idx}`,
            diaPrincipal: a.diaPrincipal,
            diaAlternativo: a.diaAlternativo,
            frequencia: a.frequencia || 'semanas_alternadas',
            observacao: a.observacao || undefined,
            label,
          };
        })
    : [];

  const agendaStatus =
    agendaRaw.status === 'definida' || agendaRaw.status === 'varia' || agendaRaw.status === 'ainda_nao_sei'
      ? agendaRaw.status
      : 'nao_informado';

  const agendaStatusLabel =
    agendaStatus === 'definida'
      ? 'Rotina definida'
      : agendaStatus === 'varia'
        ? 'Varia conforme a semana'
        : agendaStatus === 'ainda_nao_sei'
          ? 'Ainda não sabe / vai definir'
          : 'Não informado';

  const metaDiasStr = formatFrequencyLabel(muscRaw.metaDiasPorSemana);
  const duracaoPadraoStr = formatDurationLabel(muscRaw.duracaoPadraoMinutos);
  const horarioMap = {
    manha: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
    varia: 'Varia',
    ainda_nao_sei: 'Ainda não sei',
  };
  const horarioStr = horarioMap[muscRaw.horarioPreferido] || 'Não informado';

  const outrasPossui =
    outrasRaw.possui === 'sim' || outrasRaw.possui === 'nenhum' ? outrasRaw.possui : 'nao_informado';
  const itensAtividadesRaw =
    outrasPossui === 'sim' && Array.isArray(outrasRaw.itens) ? outrasRaw.itens : [];

  const atividadesNormalized = itensAtividadesRaw.map((item, idx) => {
    const diasArr = Array.isArray(item.dias) ? item.dias.filter(isDayKey) : [];
    const diasDisplay =
      item.dias === 'varia'
        ? 'Varia'
        : item.dias === 'ainda_nao_sei'
          ? 'Ainda não sei'
          : diasArr.length > 0
            ? diasArr.map((d) => DAY_LABELS[d].short).join(', ')
            : 'Não informado';

    const heavyDaysFromGrid = DAYS_OF_WEEK.filter((d) => item.intensidadePorDia?.[d] === 'pesada');
    const sessPuxada = item.sessaoMaisPuxada || {};
    let sessaoMaisPuxadaDisplay = 'Não informado';
    if (sessPuxada.tipo === 'dia_especifico') {
      const diaNome = isDayKey(sessPuxada.dia) ? DAY_LABELS[sessPuxada.dia].full : 'Dia específico';
      sessaoMaisPuxadaDisplay = sessPuxada.descricao ? `${diaNome} — ${sessPuxada.descricao}` : diaNome;
    } else if (heavyDaysFromGrid.length > 0) {
      const diasTxt = heavyDaysFromGrid.map((d) => DAY_LABELS[d].full).join(', ');
      sessaoMaisPuxadaDisplay = sessPuxada.descricao ? `${diasTxt} — ${sessPuxada.descricao}` : diasTxt;
    } else if (sessPuxada.tipo === 'todas_leves') {
      sessaoMaisPuxadaDisplay = 'Todas com intensidade leve';
    } else if (sessPuxada.tipo === 'varia') {
      sessaoMaisPuxadaDisplay = 'Varia conforme a semana';
    } else if (sessPuxada.tipo === 'ainda_nao_sei') {
      sessaoMaisPuxadaDisplay = 'Ainda não sei';
    }

    const coincideMap = {
      sim: 'Sim (no mesmo dia)',
      nao: 'Não coincide',
      as_vezes: 'Às vezes coincide',
      ainda_nao_sei: 'Ainda não sei',
    };
    const coincideDisplay = coincideMap[item.coincideComMusculacao] || 'Não informado';
    const diasCoincidentes =
      item.coincideComMusculacao === 'nao'
        ? []
        : Array.isArray(item.diasCoincidentes)
          ? item.diasCoincidentes.filter(isDayKey)
          : [];
    const tempoCoinc =
      item.coincideComMusculacao === 'nao'
        ? 'Não se aplica'
        : formatDurationLabel(item.tempoDisponivelMusculacaoNoDiaCoincidenteMinutos);

    return {
      raw: item,
      diasArr,
      diasCoincidentes,
      heavyDaysFromGrid,
      summary: {
        id: item.id || `act-${idx}`,
        modalidade: asNonEmptyString(item.modalidade) || 'Atividade não especificada',
        frequenciaDisplay: formatFrequencyLabel(item.frequenciaSemanal),
        diasDisplay,
        duracaoDisplay: formatDurationLabel(item.duracaoAproximadaMinutos),
        sessaoMaisPuxadaDisplay,
        coincideDisplay,
        tempoMusculacaoCoincidenteDisplay: tempoCoinc,
      },
    };
  });

  const cardioRaw = content.cardio && typeof content.cardio === 'object' ? content.cardio : {};
  const cardioStatusRaw = asNonEmptyString(cardioRaw.status);
  const cardioStatus =
    cardioStatusRaw === 'definido' ||
    cardioStatusRaw === 'varia' ||
    cardioStatusRaw === 'ainda_nao_sei' ||
    cardioStatusRaw === 'nao_faco'
      ? cardioStatusRaw
      : 'nao_informado';
  const cardioEquipIds = Array.isArray(cardioRaw.equipamentosPreferidos)
    ? cardioRaw.equipamentosPreferidos.map((x) => String(x)).filter(Boolean)
    : [];
  const cardioEquipLabels = cardioEquipIds.map((id) => CARDIO_EQUIPMENT_LABELS[id] || id);
  const aversaoCardioContinuo = Boolean(cardioRaw.aversaoCardioContinuo);
  const cardioEquipDisplay =
    cardioEquipLabels.length > 0
      ? cardioEquipLabels.join(', ')
      : aversaoCardioContinuo
        ? 'Aversão a cardio contínuo (avaliar alternativas)'
        : cardioStatus === 'nao_faco'
          ? 'Não faz cardio agora'
          : 'Não informado';

  const cardioDiasArr = Array.isArray(cardioRaw.diasDisponiveis)
    ? cardioRaw.diasDisponiveis.filter(isDayKey)
    : [];
  let cardioDiasDisplay = 'Não informado';
  if (cardioStatus === 'nao_faco' || cardioRaw.diasDisponiveis === 'nao_se_aplica') {
    cardioDiasDisplay = 'Não se aplica';
  } else if (cardioRaw.diasDisponiveis === 'varia') {
    cardioDiasDisplay = 'Varia conforme a semana';
  } else if (cardioRaw.diasDisponiveis === 'ainda_nao_sei') {
    cardioDiasDisplay = 'Ainda não sei';
  } else if (cardioDiasArr.length > 0) {
    cardioDiasDisplay = cardioDiasArr.map((d) => DAY_LABELS[d].short).join(', ');
  } else if (cardioStatus === 'varia') {
    cardioDiasDisplay = 'Varia conforme a semana';
  } else if (cardioStatus === 'ainda_nao_sei') {
    cardioDiasDisplay = 'Ainda não sei';
  }

  const cardioMomentRaw = asNonEmptyString(cardioRaw.momentoEmRelacaoAoTreino) || 'nao_se_aplica';
  const cardioMomentLabel =
    cardioStatus === 'nao_faco'
      ? 'Não se aplica'
      : cardioStatus === 'nao_informado'
        ? 'Não informado'
        : CARDIO_MOMENT_LABELS[cardioMomentRaw] || cardioMomentRaw;

  const cardioTempoRaw = cardioRaw.tempoDisponivelMinutos;
  const cardioTempoDisplay =
    cardioStatus === 'nao_faco'
      ? 'Não se aplica'
      : cardioStatus === 'nao_informado' && (cardioTempoRaw === undefined || cardioTempoRaw === 'nao_se_aplica')
        ? 'Não informado'
        : cardioTempoRaw === 'nao_se_aplica'
          ? 'Não se aplica'
          : typeof cardioTempoRaw === 'number' || (typeof cardioTempoRaw === 'string' && /^\d+$/.test(cardioTempoRaw))
            ? `${Number(cardioTempoRaw)} min`
            : cardioTempoRaw === 'varia'
              ? 'Varia'
              : cardioTempoRaw === 'ainda_nao_sei'
                ? 'Ainda não sei'
                : 'Não informado';

  const cardioHorarioRaw = asNonEmptyString(cardioRaw.horarioPreferido) || 'nao_se_aplica';
  const cardioHorarioLabel =
    cardioStatus === 'nao_faco'
      ? 'Não se aplica'
      : cardioStatus === 'nao_informado' && cardioHorarioRaw === 'nao_se_aplica'
        ? 'Não informado'
        : cardioHorarioRaw === 'mesmo_da_musculacao'
          ? `Mesmo turno da musculação (${horarioStr})`
          : CARDIO_HORARIO_LABELS[cardioHorarioRaw] || cardioHorarioRaw;
  const cardioHorarioEsp = asNonEmptyString(cardioRaw.horarioEspecifico);
  const cardioObs = asNonEmptyString(cardioRaw.observacoes) || '';

  const cardioResumoCompleto =
    cardioStatus === 'nao_informado'
      ? 'Não informado'
      : cardioStatus === 'nao_faco'
        ? `Não faz cardio${aversaoCardioContinuo ? ' (aversão a cardio contínuo)' : ''}`
        : [
            cardioEquipDisplay,
            aversaoCardioContinuo && cardioEquipLabels.length > 0 ? 'Aversão a cardio contínuo' : '',
            cardioDiasDisplay !== 'Não informado' ? `Dias: ${cardioDiasDisplay}` : '',
            cardioMomentLabel !== 'Não informado' && cardioMomentLabel !== 'Não se aplica' ? cardioMomentLabel : '',
            cardioTempoDisplay !== 'Não informado' && cardioTempoDisplay !== 'Não se aplica'
              ? `Tempo: ${cardioTempoDisplay}`
              : '',
            cardioHorarioLabel !== 'Não informado' && cardioHorarioLabel !== 'Não se aplica'
              ? `Horário: ${cardioHorarioLabel}${cardioHorarioEsp ? ` (${cardioHorarioEsp})` : ''}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ');

  const altPrincipalMap = new Map();
  const altReservaMap = new Map();
  for (const alt of alternancias) {
    altPrincipalMap.set(alt.diaPrincipal, alt);
    altReservaMap.set(alt.diaAlternativo, alt);
  }

  const gradeCombinada = DAYS_OF_WEEK.map((dia) => {
    let musculacao = 'nao';
    let alternanciaNota;

    if (diasFixos.includes(dia)) {
      musculacao = 'fixo';
    } else if (altPrincipalMap.has(dia)) {
      musculacao = 'alternativa_principal';
      alternanciaNota = altPrincipalMap.get(dia).label;
    } else if (altReservaMap.has(dia)) {
      musculacao = 'alternativa_reserva';
      alternanciaNota = altReservaMap.get(dia).label;
    } else if (agendaStatus === 'varia' || agendaStatus === 'ainda_nao_sei') {
      musculacao = 'varia';
    }

    const outrasDoDia = [];
    let tempoCoincidenteDia = null;
    let explicitCoincideDia = false;

    for (const act of atividadesNormalized) {
      if (!act.diasArr.includes(dia)) continue;

      const intensidadeDia =
        act.raw.intensidadePorDia?.[dia] ||
        (act.raw.sessaoMaisPuxada?.tipo === 'dia_especifico' && act.raw.sessaoMaisPuxada?.dia === dia
          ? 'pesada'
          : act.raw.sessaoMaisPuxada?.tipo === 'todas_leves'
            ? 'leve'
            : 'nao_informada');
      const maisPuxada =
        (act.raw.sessaoMaisPuxada?.tipo === 'dia_especifico' && act.raw.sessaoMaisPuxada?.dia === dia) ||
        intensidadeDia === 'pesada';

      outrasDoDia.push({
        modalidade: act.summary.modalidade,
        intensidade: intensidadeDia,
        duracaoDisplay: act.summary.duracaoDisplay,
        maisPuxada,
      });

      const coincideAqui =
        act.raw.coincideComMusculacao !== 'nao' &&
        (act.raw.coincideComMusculacao === 'sim' ||
          act.raw.coincideComMusculacao === 'as_vezes' ||
          act.diasCoincidentes.includes(dia));

      if (act.diasCoincidentes.includes(dia)) {
        explicitCoincideDia = true;
      }

      if (
        (musculacao !== 'nao' || act.diasCoincidentes.includes(dia)) &&
        coincideAqui &&
        act.summary.tempoMusculacaoCoincidenteDisplay !== 'Não se aplica' &&
        act.summary.tempoMusculacaoCoincidenteDisplay !== 'Não informado'
      ) {
        tempoCoincidenteDia = act.summary.tempoMusculacaoCoincidenteDisplay;
      }
    }

    const coincide =
      outrasDoDia.length > 0 &&
      (musculacao === 'fixo' ||
        musculacao === 'alternativa_principal' ||
        musculacao === 'alternativa_reserva' ||
        explicitCoincideDia);

    const partes = [];
    if (musculacao === 'fixo') partes.push('Musculação (fixo)');
    else if (musculacao === 'alternativa_principal') partes.push(`Musculação (opção principal — ${alternanciaNota})`);
    else if (musculacao === 'alternativa_reserva') partes.push(`Musculação (opção alternativa — ${alternanciaNota})`);
    else if (musculacao === 'varia') {
      partes.push(agendaStatus === 'ainda_nao_sei' ? 'Musculação (a definir)' : 'Musculação (varia)');
    }

    for (const o of outrasDoDia) {
      const tagPuxada = o.maisPuxada ? ' [MAIS PESADA]' : o.intensidade !== 'nao_informada' ? ` [${o.intensidade}]` : '';
      partes.push(`${o.modalidade}${tagPuxada}`);
    }
    if (coincide && tempoCoincidenteDia) {
      partes.push(`Tempo musculação: ${tempoCoincidenteDia}`);
    }

    const cardioDisponivel = cardioStatus !== 'nao_faco' && cardioDiasArr.includes(dia);
    if (cardioDisponivel) {
      partes.push(
        cardioTempoDisplay !== 'Não informado' &&
          cardioTempoDisplay !== 'Não se aplica' &&
          cardioTempoDisplay !== 'Varia' &&
          cardioTempoDisplay !== 'Ainda não sei'
          ? `Cardio (${cardioTempoDisplay})`
          : 'Cardio disponível',
      );
    }

    return {
      dia,
      label: DAY_LABELS[dia].full,
      shortLabel: DAY_LABELS[dia].short,
      musculacao,
      alternanciaNota,
      outrasAtividades: outrasDoDia,
      coincide,
      cardioDisponivel,
      tempoMusculacaoNoDiaDisplay: tempoCoincidenteDia,
      resumoDia: partes.length > 0 ? partes.join(' + ') : 'Descanso / livre',
    };
  });

  const heavyDerived = atividadesNormalized
    .filter((a) => a.raw.sessaoMaisPuxada?.tipo === 'dia_especifico' || a.heavyDaysFromGrid.length > 0)
    .map((a) => `${a.summary.modalidade}: ${a.summary.sessaoMaisPuxadaDisplay}`);

  const sessaoMaisPesadaSemana =
    asNonEmptyString(agendaRaw.sessaoMaisPesadaSemana) ||
    (heavyDerived.length > 0
      ? heavyDerived.join(' | ')
      : outrasPossui === 'nenhum'
        ? 'Nenhum outro esporte/atividade'
        : atividadesNormalized.some(
            (a) => a.raw.sessaoMaisPuxada?.tipo === 'todas_leves' && a.heavyDaysFromGrid.length === 0,
          )
          ? 'Sem sessão pesada extra (outras atividades leves)'
          : 'Não informado');

  const fixosTxt =
    diasFixos.length > 0
      ? diasFixos.map((d) => DAY_LABELS[d].short).join(', ')
      : agendaStatus === 'varia'
        ? 'varia por semana/escala'
        : agendaStatus === 'ainda_nao_sei'
          ? 'a definir'
          : 'nenhum fixo';
  const altTxt = alternancias.length > 0 ? ` | Alternância: ${alternancias.map((a) => a.label).join('; ')}` : '';
  const musculacaoResumo = `${metaDiasStr} · Fixos: ${fixosTxt}${altTxt} · ${duracaoPadraoStr} (${horarioStr})`;

  const outrasAtividadesResumo =
    outrasPossui === 'nenhum'
      ? 'Nenhum outro esporte ou atividade física'
      : outrasPossui === 'nao_informado'
        ? 'Não informado'
        : atividadesNormalized
            .map(
              (a) =>
                `${a.summary.modalidade} (${a.summary.frequenciaDisplay}, dias: ${a.summary.diasDisplay}, duração: ${a.summary.duracaoDisplay}, mais puxada: ${a.summary.sessaoMaisPuxadaDisplay}, coincide: ${a.summary.coincideDisplay}${
                  a.summary.tempoMusculacaoCoincidenteDisplay !== 'Não se aplica'
                    ? `, tempo p/ musculação no dia: ${a.summary.tempoMusculacaoCoincidenteDisplay}`
                    : ''
                })`,
            )
            .join(' | ');

  const objRaw = content.objetivos || {};
  const prioridades = Array.isArray(objRaw.gruposMuscularesPrioritarios)
    ? objRaw.gruposMuscularesPrioritarios.filter((g) => typeof g === 'string' && g.trim().length > 0).slice(0, 3)
    : [];
  const prioridadesStatus =
    prioridades.length > 0
      ? 'selecionados'
      : objRaw.gruposPrioritariosStatus === 'nenhum'
        ? 'nenhum'
        : 'nao_informado';
  const prioridadesDisplay =
    prioridades.length > 0
      ? prioridades.join(', ')
      : prioridadesStatus === 'nenhum'
        ? 'Nenhum (desenvolvimento geral equilibrado)'
        : 'Não informado';

  const histRaw = content.historicoTreino || {};
  const stuckTags = Array.isArray(histRaw.ondeTravouTags)
    ? histRaw.ondeTravouTags.map((t) => STUCK_LABELS[t] || t)
    : [];
  const stuckDetalhes = asNonEmptyString(histRaw.ondeTravouDetalhes);
  const ondeTravouStatus =
    histRaw.ondeTravouStatus === 'nenhum'
      ? 'nenhum'
      : stuckTags.length > 0 || stuckDetalhes
        ? 'identificado'
        : 'nao_informado';
  const ondeTravouDisplay =
    ondeTravouStatus === 'nenhum'
      ? 'Nenhum bloqueio identificado'
      : ondeTravouStatus === 'nao_informado'
        ? 'Não informado'
        : [...stuckTags, stuckDetalhes].filter(Boolean).join(' — ');

  const printsTreino = Array.isArray(histRaw.printsTreino) ? histRaw.printsTreino : [];
  const cargasRecentes = Array.isArray(histRaw.cargasRecentes) ? histRaw.cargasRecentes : [];
  const cargasRecentesStatus =
    cargasRecentes.length > 0
      ? 'informadas'
      : histRaw.cargasRecentesStatus === 'nenhum'
        ? 'nenhum'
        : 'nao_informado';

  const prefRaw = content.preferenciasELogistica || {};
  const eqRaw = content.equipamentos || {};
  const localRaw = eqRaw.localTreino || content.trainingLocation;
  const localTreino = LOCAL_TREINO_LABELS[localRaw] || asNonEmptyString(localRaw) || 'Não informado';
  const horarioLotacaoAcademia =
    localRaw === 'casa' || localRaw === 'condominio'
      ? 'Não se aplica'
      : LOTACAO_ACADEMIA_LABELS[asNonEmptyString(eqRaw.horarioLotacaoAcademia) || ''] || 'Não informado';

  const maquinasMap =
    eqRaw.maquinasDisponiveis && typeof eqRaw.maquinasDisponiveis === 'object'
      ? eqRaw.maquinasDisponiveis
      : {};
  const maquinasConfirmadas = [];
  const maquinasAusentes = [];
  const maquinasNaoSabe = [];

  for (const [id, status] of Object.entries(maquinasMap)) {
    const item = { id, nome: MACHINE_LABELS[id] || id };
    if (status === 'sim') maquinasConfirmadas.push(item);
    else if (status === 'nao') maquinasAusentes.push(item);
    else if (status === 'nao_sei') maquinasNaoSabe.push(item);
  }

  const outrosEquipamentos = [
    ...(Array.isArray(eqRaw.pesosLivresAcademia) ? eqRaw.pesosLivresAcademia : []),
    ...(Array.isArray(eqRaw.equipamentosCondominio) ? eqRaw.equipamentosCondominio : []),
    ...(Array.isArray(eqRaw.equipamentosCasa) ? eqRaw.equipamentosCasa : []),
  ];

  const ambienteResumo = [
    localTreino,
    horarioLotacaoAcademia !== 'Não se aplica' && horarioLotacaoAcademia !== 'Não informado'
      ? `Lotação: ${horarioLotacaoAcademia}`
      : null,
    maquinasConfirmadas.length > 0 ? `${maquinasConfirmadas.length} máquinas confirmadas` : null,
    maquinasAusentes.length > 0 ? `${maquinasAusentes.length} ausentes` : null,
    outrosEquipamentos.length > 0 ? `${outrosEquipamentos.length} itens livres/casa/cond.` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const recRaw = content.recuperacaoESaude || {};
  const fatoresIds = Array.isArray(recRaw.fatoresQueAfetamTreino)
    ? recRaw.fatoresQueAfetamTreino.map((id) => RECOVERY_FACTOR_LABELS[id] || id)
    : [];
  const fatoresStatus =
    recRaw.fatoresQueAfetamTreinoStatus === 'sim' || recRaw.fatoresQueAfetamTreinoStatus === 'nenhum'
      ? recRaw.fatoresQueAfetamTreinoStatus
      : fatoresIds.length > 0
        ? 'sim'
        : 'nao_informado';
  const fatoresDisplay =
    fatoresStatus === 'nenhum'
      ? 'Nenhum fator relatado'
      : fatoresStatus === 'nao_informado'
        ? 'Não informado'
        : fatoresIds.length > 0
          ? fatoresIds.join(', ')
          : asNonEmptyString(recRaw.detalhesRotinaRecuperacao) || 'Sim (ver detalhes)';

  const dorRaw = recRaw.dorOuLesao || {};
  const dorStatus = dorRaw.possui === 'sim' || dorRaw.possui === 'nenhum' ? dorRaw.possui : 'nao_informado';
  const dorRegioes = Array.isArray(dorRaw.regioes) ? dorRaw.regioes : [];
  const movimentosQueIncomodam =
    dorStatus === 'nenhum' ? 'Nenhum' : asNonEmptyString(dorRaw.movimentosQueIncomodam) || 'Não informado';
  const orientacaoProfissional =
    dorStatus === 'nenhum'
      ? 'Nenhuma'
      : asNonEmptyString(dorRaw.orientacaoProfissionalRecebida) || 'Não informada';

  const condRaw = recRaw.condicaoMedicaOuMedicacao || {};
  const condStatus = condRaw.possui === 'sim' || condRaw.possui === 'nenhum' ? condRaw.possui : 'nao_informado';
  const condDesc = condStatus === 'nenhum' ? 'Nenhuma' : asNonEmptyString(condRaw.descricao) || 'Não informada';
  const condMeds = condStatus === 'nenhum' ? 'Nenhum' : asNonEmptyString(condRaw.medicamentos) || 'Não informado';
  const condOrient =
    condStatus === 'nenhum'
      ? 'Nenhuma'
      : asNonEmptyString(condRaw.orientacaoMedicaOuRestricao) || 'Não informada';

  const documentosMedicos = Array.isArray(recRaw.documentosMedicos) ? recRaw.documentosMedicos : [];

  const alertasRevisaoTreinador = [];
  if (dorStatus === 'sim') {
    alertasRevisaoTreinador.push(
      `REVISÃO CLÍNICA — Dor/lesão em ${dorRegioes.join(', ') || 'região informada'}: evitar/adaptar "${movimentosQueIncomodam}".`,
    );
  }
  if (condStatus === 'sim') {
    alertasRevisaoTreinador.push(
      `REVISÃO MÉDICA — Condição/medicação relatada: ${condDesc}${
        condOrient !== 'Não informada' ? ` (Orientação: ${condOrient})` : ''
      }.`,
    );
  }
  if (documentosMedicos.length > 0) {
    alertasRevisaoTreinador.push(
      `ANEXO MÉDICO PRIVADO (LGPD) — ${documentosMedicos.length} arquivo(s) enviado(s) para revisão do treinador antes da prescrição.`,
    );
  }
  if (
    atividadesNormalized.some(
      (a) => a.raw.sessaoMaisPuxada?.tipo === 'dia_especifico' || a.heavyDaysFromGrid.length > 0,
    )
  ) {
    alertasRevisaoTreinador.push(
      `INTERFERÊNCIA ESPORTIVA — Considerar ${sessaoMaisPesadaSemana} no espaçamento de volume e DOMS (especialmente pernas/lombar).`,
    );
  }

  const summary = {
    schemaVersion: '2.0',
    isLegacy: false,
    submissionId: asNonEmptyString(content.submissionId),
    identificacao: {
      nome: asNonEmptyString(content.fullName) || 'Não informado',
      idade: asNonEmptyString(content.age) ? `${content.age} anos` : 'Não informado',
      genero: asNonEmptyString(content.gender) || 'Não informado',
      whatsapp: asNonEmptyString(content.whatsapp) || 'Não informado',
      profissao: asNonEmptyString(content.profession) || 'Não informado',
      alturaCm: heightCm,
      pesoKg: weightKg,
      alturaDisplay: heightCm ? `${heightCm} cm` : 'Não informado',
      pesoDisplay: weightKg ? `${weightKg} kg` : 'Não informado',
      gorduraCorporal: formatBodyFatPercent(content.bodyFat),
    },
    agenda: {
      status: agendaStatus,
      statusLabel: agendaStatusLabel,
      observacaoRotina: asNonEmptyString(agendaRaw.observacaoRotina) || '',
      metaDiasPorSemanaDisplay: metaDiasStr,
      duracaoPadraoDisplay: duracaoPadraoStr,
      horarioPreferidoDisplay: horarioStr,
      diasFixos,
      alternancias,
      musculacaoResumo,
      outrasAtividadesStatus: outrasPossui,
      outrasAtividadesResumo,
      outrasAtividades: atividadesNormalized.map((a) => a.summary),
      sessaoMaisPesadaSemana,
      gradeCombinada,
    },
    cardio: {
      status: cardioStatus,
      statusLabel: CARDIO_STATUS_LABELS[cardioStatus] || 'Não informado',
      equipamentosPreferidos: cardioEquipLabels,
      equipamentosDisplay: cardioEquipDisplay,
      aversaoCardioContinuo,
      diasDisponiveis: cardioDiasArr,
      diasDisplay: cardioDiasDisplay,
      momento: cardioMomentRaw,
      momentoLabel: cardioMomentLabel,
      tempoDisponivelMinutos: cardioTempoRaw ?? null,
      tempoDisponivelDisplay: cardioTempoDisplay,
      horarioPreferidoDisplay: cardioHorarioLabel,
      horarioEspecifico: cardioHorarioEsp,
      observacoes: cardioObs,
      resumoCompleto: cardioResumoCompleto,
    },
    objetivos: {
      objetivoPrincipal:
        OBJETIVO_LABELS[asNonEmptyString(objRaw.objetivoPrincipal) || ''] ||
        asNonEmptyString(objRaw.objetivoPrincipal) ||
        'Não informado',
      prioridadesStatus,
      prioridades,
      prioridadesDisplay,
      detalhes: asNonEmptyString(objRaw.detalhesObjetivo) || 'Não informado',
      prazoOuEvento: formatTextDiffNone(objRaw.prazoOuEventoAlvo),
    },
    historico: {
      nivel:
        NIVEL_LABELS[asNonEmptyString(histRaw.fitnessLevel) || ''] ||
        asNonEmptyString(histRaw.fitnessLevel) ||
        'Não informado',
      situacaoAtual: asNonEmptyString(histRaw.situacaoAtual) || 'Não informado',
      tempoFichaAtual: TEMPO_FICHA_LABELS[histRaw.tempoNaFichaAtual] || 'Não informado',
      ondeTravouStatus,
      ondeTravouDisplay,
      fichaAtualTexto: asNonEmptyString(histRaw.fichaAtualTexto),
      printsTreino,
      cargasRecentesStatus,
      cargasRecentes,
    },
    preferenciasELogistica: {
      gosta: formatTextDiffNone(prefRaw.exerciciosQueGosta, prefRaw.exerciciosQueGostaStatus),
      evitar: formatTextDiffNone(prefRaw.exerciciosParaEvitar, prefRaw.exerciciosParaEvitarStatus),
      naoConsegue: formatTextDiffNone(prefRaw.exerciciosQueNaoConsegue, prefRaw.exerciciosQueNaoConsegueStatus),
      treinaComParceiro: PARCEIRO_LABELS[prefRaw.treinaComParceiro] || 'Não informado',
      incrementoMinimoPeso: INCREMENTO_LABELS[prefRaw.incrementoMinimoPeso] || 'Não informado',
    },
    equipamentos: {
      localTreino,
      horarioLotacaoAcademia,
      ambienteResumo,
      maquinasConfirmadas,
      maquinasAusentes,
      maquinasNaoSabe,
      outrosEquipamentos,
      cargaMaximaDisponivelKg: asNonEmptyString(eqRaw.cargaMaximaDisponivelKg) || 'Não informado',
      observacoes: asNonEmptyString(eqRaw.observacoesEquipamentos) || 'Nenhuma',
    },
    observacoesAdicionais: {
      expectativas: asNonEmptyString(content.expectations) || 'Não informado',
      restricoesAlimentares: formatTextDiffNone(content.dietRestrictions),
      comoEncontrou: asNonEmptyString(content.howFoundMe) || 'Não informado',
    },
    saudeERecuperacao: {
      fatoresStatus,
      fatoresDisplay,
      detalhesRotinaRecuperacao: asNonEmptyString(recRaw.detalhesRotinaRecuperacao) || 'Não informado',
      qualidadeSono:
        SONO_LABELS[asNonEmptyString(recRaw.qualidadeSono) || ''] ||
        asNonEmptyString(recRaw.qualidadeSono) ||
        'Não informado',
      horasSonoMedia: asNonEmptyString(recRaw.horasSonoMedia) || 'Não informado',
      nivelEstresse:
        ESTRESSE_LABELS[asNonEmptyString(recRaw.nivelEstresse) || ''] ||
        asNonEmptyString(recRaw.nivelEstresse) ||
        'Não informado',
      dorOuLesao: {
        status: dorStatus,
        regioes: dorRegioes,
        movimentosQueIncomodam,
        orientacaoProfissional,
        requerRevisaoTreinador: dorStatus === 'sim',
      },
      condicaoMedica: {
        status: condStatus,
        descricao: condDesc,
        medicamentos: condMeds,
        orientacaoMedica: condOrient,
        requerRevisaoTreinador: condStatus === 'sim' || documentosMedicos.length > 0,
      },
      documentosMedicos,
      alertasRevisaoTreinador,
    },
    midiaELgpd: {
      naoEnviouFotos:
        Boolean(content.naoEnviarFotosAgora) ||
        !content.photos ||
        (!content.photos.front && !content.photos.back && !content.photos.side),
      lgpdConsent: Boolean(content.lgpdConsent),
      sensitiveHealthDataConsent: Boolean(content.sensitiveHealthDataConsent ?? content.lgpdConsent),
      lgpdConsentAt: asNonEmptyString(content.lgpdConsentAt),
    },
    pendencias: [],
    perguntasSugeridasPrimeiroCheckin: [],
  };

  buildPendenciasECheckin(summary, content);
  return summary;
}

function normalizeLegacyV1(content) {
  const heightParsed = parseNumericHeightLegacy(content.height);
  const weightParsed = parseNumericWeightLegacy(content.weight);
  const rawOther = asNonEmptyString(content.currentActivity);
  const outrasStatus = !rawOther
    ? 'nao_informado'
    : isExplicitNoneText(rawOther) || rawOther.toLowerCase().includes('sedentar')
      ? 'nenhum'
      : 'sim';

  const hasInj = content.hasInjuries === 'sim' ? 'sim' : content.hasInjuries === 'nao' ? 'nenhum' : 'nao_informado';
  const hasDis = content.hasDiseases === 'sim' ? 'sim' : content.hasDiseases === 'nao' ? 'nenhum' : 'nao_informado';

  const rawPriority = asNonEmptyString(content.musclePriority);
  const prioridadesStatus = !rawPriority
    ? 'nao_informado'
    : isExplicitNoneText(rawPriority)
      ? 'nenhum'
      : 'selecionados';
  const prioridades =
    prioridadesStatus === 'selecionados' && rawPriority
      ? rawPriority.split(/[,;/]+/).map((p) => p.trim()).filter(Boolean).slice(0, 3)
      : [];

  const alertasRevisaoTreinador = [];
  if (hasInj === 'sim') {
    alertasRevisaoTreinador.push(
      `REVISÃO CLÍNICA (Anamnese v1) — Lesão/dor relatada: ${asNonEmptyString(content.injuryDescription) || 'sem detalhes'}.`,
    );
  }
  if (hasDis === 'sim') {
    alertasRevisaoTreinador.push(
      `REVISÃO MÉDICA (Anamnese v1) — Condição relatada: ${asNonEmptyString(content.diseaseDescription) || 'sem detalhes'}.`,
    );
  }

  const daysStr = asNonEmptyString(content.daysPerWeek) || 'Não informado';
  const timeStr = asNonEmptyString(content.timePerWorkout) || 'Não informado';
  const prefStr = asNonEmptyString(content.preferredTime) || 'Não informado';

  const summary = {
    schemaVersion: '1.0',
    isLegacy: true,
    submissionId: null,
    identificacao: {
      nome: asNonEmptyString(content.fullName) || 'Não informado',
      idade: asNonEmptyString(content.age) ? `${content.age} anos` : 'Não informado',
      genero: asNonEmptyString(content.gender) || 'Não informado',
      whatsapp: asNonEmptyString(content.whatsapp) || 'Não informado',
      profissao: asNonEmptyString(content.profession) || 'Não informado',
      alturaCm: heightParsed.cm,
      pesoKg: weightParsed.kg,
      alturaDisplay: heightParsed.display,
      pesoDisplay: weightParsed.display,
      gorduraCorporal: formatBodyFatPercent(content.bodyFat),
    },
    agenda: {
      status: daysStr === 'Não informado' ? 'nao_informado' : 'definida',
      statusLabel: 'Anamnese v1 (sem grade diária detalhada)',
      observacaoRotina: '',
      metaDiasPorSemanaDisplay: daysStr,
      duracaoPadraoDisplay: timeStr,
      horarioPreferidoDisplay: prefStr,
      diasFixos: [],
      alternancias: [],
      musculacaoResumo: `${daysStr} · ${timeStr} (${prefStr}) [legado v1]`,
      outrasAtividadesStatus: outrasStatus,
      outrasAtividadesResumo:
        outrasStatus === 'nenhum' ? 'Nenhum' : outrasStatus === 'nao_informado' ? 'Não informado' : rawOther,
      outrasAtividades: [],
      sessaoMaisPesadaSemana: outrasStatus === 'nenhum' ? 'Nenhum' : 'Não informado (legado v1)',
      gradeCombinada: DAYS_OF_WEEK.map((dia) => ({
        dia,
        label: DAY_LABELS[dia].full,
        shortLabel: DAY_LABELS[dia].short,
        musculacao: 'nao',
        outrasAtividades: [],
        coincide: false,
        cardioDisponivel: false,
        tempoMusculacaoNoDiaDisplay: null,
        resumoDia: 'Sem grade diária na anamnese v1',
      })),
    },
    cardio: {
      status: 'nao_informado',
      statusLabel: 'Não informado (legado v1)',
      equipamentosPreferidos: [],
      equipamentosDisplay: 'Não informado (legado v1)',
      aversaoCardioContinuo: false,
      diasDisponiveis: [],
      diasDisplay: 'Não informado (legado v1)',
      momento: 'nao_se_aplica',
      momentoLabel: 'Não informado (legado v1)',
      tempoDisponivelMinutos: null,
      tempoDisponivelDisplay: 'Não informado (legado v1)',
      horarioPreferidoDisplay: 'Não informado (legado v1)',
      horarioEspecifico: null,
      observacoes: '',
      resumoCompleto: 'Não informado (legado v1)',
    },
    objetivos: {
      objetivoPrincipal:
        OBJETIVO_LABELS[asNonEmptyString(content.primaryGoal) || ''] ||
        asNonEmptyString(content.primaryGoal) ||
        'Não informado',
      prioridadesStatus,
      prioridades,
      prioridadesDisplay:
        prioridades.length > 0
          ? prioridades.join(', ')
          : prioridadesStatus === 'nenhum'
            ? 'Nenhum'
            : 'Não informado',
      detalhes: asNonEmptyString(content.goalDetails) || 'Não informado',
      prazoOuEvento: 'Não informado',
    },
    historico: {
      nivel:
        NIVEL_LABELS[asNonEmptyString(content.fitnessLevel) || ''] ||
        asNonEmptyString(content.fitnessLevel) ||
        'Não informado',
      situacaoAtual: asNonEmptyString(content.trainingHistory) || 'Não informado',
      tempoFichaAtual: 'Não informado',
      ondeTravouStatus: 'nao_informado',
      ondeTravouDisplay: 'Não informado (legado v1)',
      fichaAtualTexto: null,
      printsTreino: [],
      cargasRecentesStatus: 'nao_informado',
      cargasRecentes: [],
    },
    preferenciasELogistica: {
      gosta: 'Não informado',
      evitar: 'Não informado',
      naoConsegue: 'Não informado',
      treinaComParceiro: 'Não informado',
      incrementoMinimoPeso: 'Não informado',
    },
    equipamentos: {
      localTreino: LOCAL_TREINO_LABELS[content.trainingLocation] || asNonEmptyString(content.trainingLocation) || 'Não informado',
      horarioLotacaoAcademia: 'Não informado',
      ambienteResumo: LOCAL_TREINO_LABELS[content.trainingLocation] || asNonEmptyString(content.trainingLocation) || 'Não informado',
      maquinasConfirmadas: [],
      maquinasAusentes: [],
      maquinasNaoSabe: [],
      outrosEquipamentos: [],
      cargaMaximaDisponivelKg: 'Não informado',
      observacoes: 'Não informado (legado v1)',
    },
    observacoesAdicionais: {
      expectativas: asNonEmptyString(content.expectations) || 'Não informado',
      restricoesAlimentares: formatTextDiffNone(content.dietRestrictions),
      comoEncontrou: asNonEmptyString(content.howFoundMe) || 'Não informado',
    },
    saudeERecuperacao: {
      fatoresStatus: 'nao_informado',
      fatoresDisplay: 'Não informado (legado v1)',
      detalhesRotinaRecuperacao: 'Não informado',
      qualidadeSono:
        SONO_LABELS[asNonEmptyString(content.sleepQuality) || ''] ||
        asNonEmptyString(content.sleepQuality) ||
        'Não informado',
      horasSonoMedia: 'Não informado',
      nivelEstresse:
        ESTRESSE_LABELS[asNonEmptyString(content.stressLevel) || ''] ||
        asNonEmptyString(content.stressLevel) ||
        'Não informado',
      dorOuLesao: {
        status: hasInj,
        regioes: [],
        movimentosQueIncomodam:
          hasInj === 'nenhum' ? 'Nenhum' : asNonEmptyString(content.injuryDescription) || 'Não informado',
        orientacaoProfissional: hasInj === 'nenhum' ? 'Nenhuma' : 'Não informada',
        requerRevisaoTreinador: hasInj === 'sim',
      },
      condicaoMedica: {
        status: hasDis,
        descricao: hasDis === 'nenhum' ? 'Nenhuma' : asNonEmptyString(content.diseaseDescription) || 'Não informada',
        medicamentos:
          hasDis === 'nenhum' && !asNonEmptyString(content.medications)
            ? 'Nenhum'
            : asNonEmptyString(content.medications) || 'Não informado',
        orientacaoMedica: hasDis === 'nenhum' ? 'Nenhuma' : 'Não informada',
        requerRevisaoTreinador: hasDis === 'sim',
      },
      documentosMedicos: [],
      alertasRevisaoTreinador,
    },
    midiaELgpd: {
      naoEnviouFotos: !content.photos || (!content.photos.front && !content.photos.back && !content.photos.side),
      lgpdConsent: Boolean(content.lgpdConsent),
      sensitiveHealthDataConsent: Boolean(content.lgpdConsent),
      lgpdConsentAt: null,
    },
    pendencias: [],
    perguntasSugeridasPrimeiroCheckin: [],
  };

  buildPendenciasECheckin(summary, content);
  return summary;
}

function buildPendenciasECheckin(summary, rawContent) {
  const pendencias = [];
  const perguntas = [];

  if (summary.agenda.status === 'varia' || summary.agenda.status === 'ainda_nao_sei') {
    pendencias.push({
      id: 'pend-agenda-variavel',
      codigo: 'agenda_variavel',
      categoria: 'agenda',
      severidade: 'alta',
      titulo: 'Agenda semanal variável ou indefinida',
      motivo: `Aluno marcou "${summary.agenda.statusLabel}". Confirmar padrão real dos últimos 7 dias antes de fixar divisão rígida.`,
    });
    perguntas.push({
      id: 'chk-agenda-real',
      texto: 'Na primeira semana com o treino novo, quais dias exatos você conseguiu treinar e quanto tempo durou cada sessão?',
      tipo: 'texto_longo',
      obrigatoria: true,
      origemPendencia: 'agenda_variavel',
    });
  }

  if (summary.agenda.alternancias.length > 0) {
    const descAlt = summary.agenda.alternancias.map((a) => a.label).join('; ');
    pendencias.push({
      id: 'pend-agenda-alternancia',
      codigo: 'agenda_alternancia',
      categoria: 'agenda',
      severidade: 'media',
      titulo: `Alternância semanal prevista (${descAlt})`,
      motivo: 'Verificar qual opção rodou nesta semana e se o descanso entre sessões funcionou bem.',
    });
    perguntas.push({
      id: 'chk-alternancia-semana',
      texto: `Nesta semana você usou o dia principal ou o dia alternativo (${descAlt})? O encaixe funcionou bem na recuperação?`,
      tipo: 'texto_curto',
      obrigatoria: true,
      origemPendencia: 'agenda_alternancia',
    });
  }

  const coincideSemTempo = summary.agenda.outrasAtividades.some(
    (a) =>
      (a.coincideDisplay.startsWith('Sim') || a.coincideDisplay.startsWith('Às vezes')) &&
      (a.tempoMusculacaoCoincidenteDisplay === 'Varia' ||
        a.tempoMusculacaoCoincidenteDisplay === 'Ainda não sei' ||
        a.tempoMusculacaoCoincidenteDisplay === 'Não informado'),
  );
  if (coincideSemTempo) {
    pendencias.push({
      id: 'pend-tempo-coincidente',
      codigo: 'tempo_dia_coincidente',
      categoria: 'agenda',
      severidade: 'alta',
      titulo: 'Tempo real para musculação no dia coincidente com outro esporte indefinido',
      motivo: 'Necessário confirmar quantos minutos sobram para ajustar volume de séries nesse dia.',
    });
    perguntas.push({
      id: 'chk-tempo-coincidente',
      texto: 'Nos dias em que treinou musculação e outro esporte, o treino de musculação coube confortavelmente no tempo que você tinha?',
      tipo: 'escolha_unica',
      opcoes: ['Sim, sobrou tempo', 'Ficou no limite, mas deu', 'Ficou apertado, precisei cortar séries/exercícios'],
      obrigatoria: true,
      origemPendencia: 'tempo_dia_coincidente',
    });
  }

  if (
    summary.agenda.sessaoMaisPesadaSemana &&
    !summary.agenda.sessaoMaisPesadaSemana.startsWith('Nenhum') &&
    !summary.agenda.sessaoMaisPesadaSemana.startsWith('Não informado') &&
    !summary.agenda.sessaoMaisPesadaSemana.startsWith('Sem sessão')
  ) {
    perguntas.push({
      id: 'chk-fadiga-sessao-pesada',
      texto: `Como seu corpo recuperou entre a sessão mais pesada (${summary.agenda.sessaoMaisPesadaSemana}) e os treinos de musculação próximos a ela?`,
      tipo: 'escala_1_5',
      obrigatoria: true,
      origemPendencia: 'interferencia_esporte',
    });
  }

  const esporteComAgendaIndefinida = summary.agenda.outrasAtividades.some(
    (a) =>
      a.diasDisplay === 'Varia' ||
      a.diasDisplay === 'Ainda não sei' ||
      a.coincideDisplay === 'Ainda não sei',
  );
  if (esporteComAgendaIndefinida) {
    pendencias.push({
      id: 'pend-esporte-agenda',
      codigo: 'esporte_agenda_indefinida',
      categoria: 'agenda',
      severidade: 'alta',
      titulo: 'Dias ou coincidência de outro esporte indefinidos',
      motivo: 'Confirmar em quais dias ocorreu o outro esporte/atividade e se coincidiu com a musculação.',
    });
    perguntas.push({
      id: 'chk-esporte-agenda',
      texto: 'Em quais dias desta semana você praticou seu outro esporte/atividade e algum coincidiu com a musculação?',
      tipo: 'texto_longo',
      obrigatoria: true,
      origemPendencia: 'esporte_agenda_indefinida',
    });
  }

  if (
    summary.cardio.status === 'ainda_nao_sei' ||
    summary.cardio.status === 'varia' ||
    summary.cardio.diasDisplay === 'Ainda não sei' ||
    summary.cardio.diasDisplay === 'Varia conforme a semana' ||
    summary.cardio.tempoDisponivelDisplay === 'Ainda não sei'
  ) {
    pendencias.push({
      id: 'pend-cardio-agenda',
      codigo: 'cardio_logistica_indefinida',
      categoria: 'cardio',
      severidade: 'media',
      titulo: 'Dias, horário ou janela de cardio variáveis/indefinidos',
      motivo: `Confirmar quantas sessões, dias e tempo real antes/depois do treino para calibrar o gasto energético (${summary.cardio.statusLabel}).`,
    });
    perguntas.push({
      id: 'chk-cardio-semana',
      texto: 'Quantos dias e minutos reais você conseguiu encaixar de cardio nesta semana (e em qual equipamento/horário)?',
      tipo: 'texto_longo',
      obrigatoria: true,
      origemPendencia: 'cardio_logistica_indefinida',
    });
  } else if (summary.cardio.status === 'nao_informado') {
    pendencias.push({
      id: 'pend-cardio-nao-informado',
      codigo: 'cardio_nao_informado',
      categoria: 'cardio',
      severidade: 'media',
      titulo: 'Preferência e disponibilidade de cardio não informadas',
      motivo: 'Levantar modalidades favoritas, dias disponíveis, horário e minutos antes/depois do treino.',
    });
    perguntas.push({
      id: 'chk-cardio-inicial',
      texto: 'Qual modalidade de cardio você prefere (esteira, escada, bike, remo, corda) e quantos minutos teria antes/depois do treino ou em horário separado?',
      tipo: 'texto_longo',
      obrigatoria: false,
      origemPendencia: 'cardio_nao_informado',
    });
  }

  if (summary.cardio.aversaoCardioContinuo) {
    pendencias.push({
      id: 'pend-cardio-aversao',
      codigo: 'cardio_aversao_continuo',
      categoria: 'cardio',
      severidade: 'baixa',
      titulo: 'Aluno sinalizou aversão a cardio contínuo',
      motivo: 'Evitar sessões longas/monótonas; calibrar gasto energético via meta de passos, blocos curtos ou alternativas dinâmicas toleráveis.',
    });
  }

  const localLower = summary.equipamentos.localTreino.toLowerCase();
  if (
    !summary.isLegacy &&
    (localLower.includes('casa') || localLower.includes('condomínio')) &&
    summary.equipamentos.outrosEquipamentos.length === 0 &&
    summary.equipamentos.observacoes === 'Nenhuma'
  ) {
    pendencias.push({
      id: 'pend-equipamentos-casa-cond',
      codigo: 'equipamentos_local_incompleto',
      categoria: 'equipamento',
      severidade: 'alta',
      titulo: 'Equipamentos de casa/condomínio não detalhados',
      motivo: 'Aluno treina em casa ou condomínio sem equipamentos marcados nem observações detalhadas.',
    });
    perguntas.push({
      id: 'chk-equipamentos-casa-cond',
      texto: 'Para ajustar melhor seus exercícios em casa/condomínio, quais pesos, máquinas ou acessórios você tem disponíveis no local?',
      tipo: 'texto_longo',
      obrigatoria: true,
      origemPendencia: 'equipamentos_local_incompleto',
    });
  }

  if (summary.equipamentos.maquinasNaoSabe.length > 0) {
    const lista = summary.equipamentos.maquinasNaoSabe.map((m) => m.nome).slice(0, 6).join(', ');
    pendencias.push({
      id: 'pend-maquinas-nao-sei',
      codigo: 'equipamento_confirmar',
      categoria: 'equipamento',
      severidade: 'media',
      titulo: `${summary.equipamentos.maquinasNaoSabe.length} máquina(s) marcada(s) como "Não sei"`,
      motivo: `Confirmar disponibilidade real na academia: ${lista}.`,
    });
    perguntas.push({
      id: 'chk-maquinas-nao-sei',
      texto: `Você conseguiu confirmar se a academia tem estas máquinas (${lista}) ou precisou adaptar algum exercício?`,
      tipo: 'texto_longo',
      obrigatoria: false,
      origemPendencia: 'equipamento_confirmar',
    });
  }

  if (summary.saudeERecuperacao.dorOuLesao.status === 'sim') {
    const regs = summary.saudeERecuperacao.dorOuLesao.regioes.join(', ') || 'região informada';
    pendencias.push({
      id: 'pend-revisao-dor',
      codigo: 'dor_revisao',
      categoria: 'saude',
      severidade: 'alta',
      titulo: `Revisar tolerância clínica (${regs})`,
      motivo: `Movimentos relatados: ${summary.saudeERecuperacao.dorOuLesao.movimentosQueIncomodam}`,
    });
    perguntas.push({
      id: 'chk-dor-tolerancia',
      texto: `Sobre o desconforto em ${regs}, algum exercício desta primeira semana causou dor acima de 2/10 ou incômodo articular? Qual?`,
      tipo: 'texto_longo',
      obrigatoria: true,
      origemPendencia: 'dor_revisao',
    });
  }

  if (summary.saudeERecuperacao.documentosMedicos.length > 0) {
    pendencias.push({
      id: 'pend-doc-medico',
      codigo: 'documento_medico_revisao',
      categoria: 'saude',
      severidade: 'alta',
      titulo: `${summary.saudeERecuperacao.documentosMedicos.length} documento(s) médico(s) aguardando revisão do treinador`,
      motivo: 'Abrir anexos privados LGPD na ficha antes de liberar exercícios potencialmente restritos.',
    });
  }

  if (summary.saudeERecuperacao.fatoresStatus === 'sim') {
    pendencias.push({
      id: 'pend-recuperacao',
      codigo: 'recuperacao_externa',
      categoria: 'saude',
      severidade: 'media',
      titulo: 'Fatores externos impactando recuperação/sono',
      motivo: summary.saudeERecuperacao.fatoresDisplay,
    });
    perguntas.push({
      id: 'chk-recuperacao-trabalho-sono',
      texto: 'Nos dias afetados por trabalho/sono esta semana, como sentiu sua energia e rendimento no treino?',
      tipo: 'escala_1_5',
      obrigatoria: false,
      origemPendencia: 'recuperacao_externa',
    });
  }

  if (
    summary.historico.cargasRecentesStatus === 'nao_informado' &&
    summary.historico.nivel.toLowerCase() !== 'iniciante'
  ) {
    pendencias.push({
      id: 'pend-cargas-iniciais',
      codigo: 'cargas_base_ausentes',
      categoria: 'cargas',
      severidade: 'baixa',
      titulo: 'Cargas recentes não informadas na anamnese',
      motivo: 'Usar primeira semana para registrar pesos reais nos exercícios principais no Fitcoach.',
    });
    perguntas.push({
      id: 'chk-calibracao-carga',
      texto: 'Ficou alguma dúvida sobre qual peso usar nos exercícios novos ou algum ficou leve/pesado demais na primeira semana?',
      tipo: 'texto_curto',
      obrigatoria: false,
      origemPendencia: 'cargas_base_ausentes',
    });
  }

  if (summary.isLegacy && !rawContent?.height && !rawContent?.weight) {
    pendencias.push({
      id: 'pend-biometria-legado',
      codigo: 'biometria_ausente',
      categoria: 'ficha',
      severidade: 'media',
      titulo: 'Anamnese legada com dados antropométricos incompletos',
      motivo: 'Confirmar peso e altura atuais no primeiro check-in.',
    });
  }

  summary.pendencias = pendencias;
  summary.perguntasSugeridasPrimeiroCheckin = perguntas.slice(0, 6);
}

/**
 * Formata o bloco estruturado completo da anamnese normalizada para o Dossiê Markdown do Fitcoach.
 */
export function formatAnamneseDossierLines(summary) {
  if (!summary) return ['- Anamnese não localizada.'];

  const lines = [];
  lines.push(`- **Schema da Anamnese**: v${summary.schemaVersion}${summary.isLegacy ? ' (compatibilidade legada)' : ''}`);
  lines.push(
    `- **Identificação e Biometria**: ${summary.identificacao.nome} | Idade: ${summary.identificacao.idade} | Altura: ${summary.identificacao.alturaDisplay} | Peso: ${summary.identificacao.pesoDisplay}${
      summary.identificacao.gorduraCorporal && summary.identificacao.gorduraCorporal !== 'Não informado'
        ? ` | % Gordura: ${summary.identificacao.gorduraCorporal}`
        : ''
    } | Profissão: ${summary.identificacao.profissao}`,
  );
  lines.push(`- **Objetivo do 1º Ciclo**: ${summary.objetivos.objetivoPrincipal}`);
  lines.push(`- **Grupos Musculares Prioritários (máx. 3)**: ${summary.objetivos.prioridadesDisplay}`);
  lines.push(`- **Detalhes / Prazo**: ${summary.objetivos.detalhes} | Marco/evento: ${summary.objetivos.prazoOuEvento}`);

  lines.push(`- **Agenda Real — Status**: ${summary.agenda.statusLabel}`);
  if (summary.agenda.observacaoRotina) {
    lines.push(`  - *Observação de rotina*: ${summary.agenda.observacaoRotina}`);
  }
  lines.push(`- **Musculação na Semana**: ${summary.agenda.musculacaoResumo}`);
  if (summary.agenda.alternancias.length > 0) {
    lines.push(`- **Alternância Semanal Prevista**: ${summary.agenda.alternancias.map((a) => a.label).join('; ')}`);
  }
  lines.push(`- **Outras Atividades / Esportes**: ${summary.agenda.outrasAtividadesResumo}`);
  lines.push(`- **Sessão Mais Pesada da Semana**: ${summary.agenda.sessaoMaisPesadaSemana}`);
  lines.push(`- **Cardio & Aeróbios**: ${summary.cardio ? summary.cardio.resumoCompleto : 'Não informado'}`);
  if (summary.cardio?.observacoes) {
    lines.push(`  - *Obs. Cardio*: ${summary.cardio.observacoes}`);
  }

  if (!summary.isLegacy) {
    lines.push('- **Grade Combinada (Seg–Dom)**:');
    for (const dia of summary.agenda.gradeCombinada) {
      lines.push(`  - **${dia.shortLabel}**: ${dia.resumoDia}`);
    }
  }

  lines.push(
    `- **Histórico e Ficha Atual**: Nível ${summary.historico.nivel} | Situação: ${summary.historico.situacaoAtual} | Tempo na ficha atual: ${summary.historico.tempoFichaAtual}`,
  );
  lines.push(`- **Onde Travou**: ${summary.historico.ondeTravouDisplay}`);
  if (summary.historico.fichaAtualTexto) {
    lines.push(`- **Ficha Anterior Colada**: ${summary.historico.fichaAtualTexto.replace(/\s+/g, ' ').slice(0, 2500)}`);
  }
  if (summary.historico.printsTreino.length > 0) {
    lines.push(`- **Prints da Ficha Anexados**: ${summary.historico.printsTreino.length} arquivo(s) privado(s) no painel Questionários`);
  }
  if (summary.historico.cargasRecentes.length > 0) {
    const cargasTxt = summary.historico.cargasRecentes
      .map((c) => `${c.exercicio}: ${c.cargaKg || '?'} x ${c.repeticoes || '?'}`)
      .join('; ');
    lines.push(`- **Cargas Recentes Declaradas**: ${cargasTxt}`);
  } else {
    lines.push(`- **Cargas Recentes Declaradas**: ${summary.historico.cargasRecentesStatus === 'nenhum' ? 'Nenhum exercício informado' : 'Não informado'}`);
  }

  lines.push(
    `- **Preferências & Logística**: Gosta: ${summary.preferenciasELogistica.gosta} | Evitar: ${summary.preferenciasELogistica.evitar} | Não consegue: ${summary.preferenciasELogistica.naoConsegue} | Spotter: ${summary.preferenciasELogistica.treinaComParceiro} | Saltos de carga: ${summary.preferenciasELogistica.incrementoMinimoPeso}`,
  );

  lines.push(`- **Ambiente e Equipamentos**: ${summary.equipamentos.ambienteResumo}`);
  if (
    summary.equipamentos.horarioLotacaoAcademia &&
    summary.equipamentos.horarioLotacaoAcademia !== 'Não se aplica' &&
    summary.equipamentos.horarioLotacaoAcademia !== 'Não informado'
  ) {
    lines.push(`  - *Lotação da academia*: ${summary.equipamentos.horarioLotacaoAcademia}`);
  }
  if (summary.equipamentos.maquinasConfirmadas.length > 0) {
    lines.push(`  - *Máquinas disponíveis*: ${summary.equipamentos.maquinasConfirmadas.map((m) => m.nome).join(', ')}`);
  }
  if (summary.equipamentos.maquinasAusentes.length > 0) {
    lines.push(`  - *Máquinas indisponíveis*: ${summary.equipamentos.maquinasAusentes.map((m) => m.nome).join(', ')}`);
  }
  if (summary.equipamentos.maquinasNaoSabe.length > 0) {
    lines.push(`  - *Máquinas a confirmar ("Não sei")*: ${summary.equipamentos.maquinasNaoSabe.map((m) => m.nome).join(', ')}`);
  }
  if (summary.equipamentos.outrosEquipamentos.length > 0) {
    lines.push(`  - *Outros itens/pesos livres*: ${summary.equipamentos.outrosEquipamentos.join(', ')}`);
  }
  if (summary.equipamentos.cargaMaximaDisponivelKg !== 'Não informado') {
    lines.push(`  - *Carga máxima disponível*: ${summary.equipamentos.cargaMaximaDisponivelKg}`);
  }
  if (summary.equipamentos.observacoes !== 'Nenhuma' && summary.equipamentos.observacoes !== 'Não informado') {
    lines.push(`  - *Observações do ambiente*: ${summary.equipamentos.observacoes}`);
  }

  lines.push(
    `- **Recuperação & Sono**: Sono ${summary.saudeERecuperacao.qualidadeSono} (${summary.saudeERecuperacao.horasSonoMedia}) | Estresse: ${summary.saudeERecuperacao.nivelEstresse} | Fatores que afetam treino: ${summary.saudeERecuperacao.fatoresDisplay}${
      summary.saudeERecuperacao.detalhesRotinaRecuperacao !== 'Não informado'
        ? ` | Detalhes: ${summary.saudeERecuperacao.detalhesRotinaRecuperacao}`
        : ''
    }`,
  );
  lines.push(
    `- **Dor / Lesão**: ${
      summary.saudeERecuperacao.dorOuLesao.status === 'sim'
        ? `SIM (${summary.saudeERecuperacao.dorOuLesao.regioes.join(', ') || 'região informada'}) — Movimentos: ${summary.saudeERecuperacao.dorOuLesao.movimentosQueIncomodam} — Orientação: ${summary.saudeERecuperacao.dorOuLesao.orientacaoProfissional}`
        : summary.saudeERecuperacao.dorOuLesao.status === 'nenhum'
          ? 'Nenhuma'
          : 'Não informado'
    }`,
  );
  lines.push(
    `- **Condições Médicas / Medicamentos**: ${
      summary.saudeERecuperacao.condicaoMedica.status === 'sim'
        ? `SIM — ${summary.saudeERecuperacao.condicaoMedica.descricao} | Meds: ${summary.saudeERecuperacao.condicaoMedica.medicamentos}${
            summary.saudeERecuperacao.condicaoMedica.orientacaoMedica !== 'Nenhuma' &&
            summary.saudeERecuperacao.condicaoMedica.orientacaoMedica !== 'Não informada'
              ? ` | Orientação médica: ${summary.saudeERecuperacao.condicaoMedica.orientacaoMedica}`
              : ''
          } | Docs médicos privados (LGPD): ${summary.saudeERecuperacao.documentosMedicos.length}`
        : summary.saudeERecuperacao.condicaoMedica.status === 'nenhum'
          ? 'Nenhum'
          : 'Não informado'
    }`,
  );

  if (
    summary.observacoesAdicionais &&
    (summary.observacoesAdicionais.restricoesAlimentares !== 'Não informado' ||
      summary.observacoesAdicionais.expectativas !== 'Não informado')
  ) {
    const obsPartes = [];
    if (summary.observacoesAdicionais.restricoesAlimentares !== 'Não informado') {
      obsPartes.push(`Restrições alimentares: ${summary.observacoesAdicionais.restricoesAlimentares}`);
    }
    if (summary.observacoesAdicionais.expectativas !== 'Não informado') {
      obsPartes.push(`Expectativas: ${summary.observacoesAdicionais.expectativas}`);
    }
    lines.push(`- **Observações Adicionais**: ${obsPartes.join(' | ')}`);
  }

  if (summary.saudeERecuperacao.alertasRevisaoTreinador.length > 0) {
    lines.push('- **Alertas para Revisão Obrigatória do Treinador**:');
    for (const alerta of summary.saudeERecuperacao.alertasRevisaoTreinador) {
      lines.push(`  - ⚠️ ${alerta}`);
    }
  }

  if (summary.pendencias.length > 0) {
    lines.push('- **Pendências para o 1º Check-in / Prescrição**:');
    for (const p of summary.pendencias) {
      lines.push(`  - [${p.severidade.toUpperCase()}] ${p.titulo} — ${p.motivo}`);
    }
  } else {
    lines.push('- **Pendências para o 1º Check-in**: Nenhuma pendência aberta na triagem.');
  }

  return lines;
}
