/**
 * whatsapp_utils.mjs
 *
 * Utilitários puros e testáveis para a integração do WhatsApp Web + Gemini Audio
 * na skill weekly-workout-adjuster (Regras W1 a W5 do PRODUCT.md).
 *
 * Responsabilidades:
 * - Normalização de telefones brasileiros (com/sem DDI 55, com/sem 9º dígito, últimos 8 dígitos)
 * - Geração de variantes de busca por nome para o WhatsApp Web
 * - Parser de metadados de mensagens (`data-pre-plain-text` e timestamps)
 * - Classificação clínica e biomecânica de mensagens e transcrições de áudio
 * - Geração determinística de IDs de mensagem (`computeMessageId`)
 * - Cálculo de janela temporal Cold Start (60-90d) vs. Incremental (7-14d) (`resolveSyncWindowDays`)
 * - Merge idempotente de cache preservando transcrições de áudio (`mergeWhatsAppCache`)
 * - Cliente REST Gemini (`gemini-2.5-flash`) para transcrição de áudio Base64 (`transcribeAudioWithGemini`)
 * - Formatação Markdown da Seção 6 dos dossiês de alunos (`formatWhatsAppSectionMarkdown`)
 */

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * Converte o nome completo do aluno em slug padronizado para arquivos de dossiê e cache.
 * @param {string} name
 * @returns {string}
 */
export function slugifyStudentName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Normaliza um telefone brasileiro e gera variantes de pesquisa para o WhatsApp Web
 * (com/sem DDI 55, DDD + número com 9º dígito, DDD + número sem 9º dígito,
 * formato `(DD) 9XXXX-XXXX` e últimos 8 dígitos).
 *
 * @param {string | null | undefined} rawPhone
 * @returns {string[]} Lista ordenada e deduplicada de variantes de busca
 */
export function normalizePhoneVariants(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return [];

  const trimmed = rawPhone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8) return [];

  // Preservar números internacionais (ex: +31 6 11782243) sem tratá-los como DDD brasileiro
  if (trimmed.startsWith('+') && !digits.startsWith('55')) {
    const noPlus = trimmed.slice(1).trim();
    const last8 = digits.slice(-8);
    const intlVariants = [];
    const addIntl = (val) => {
      if (val && !intlVariants.includes(val)) {
        intlVariants.push(val);
      }
    };
    addIntl(trimmed);
    addIntl(noPlus);
    addIntl(`+${digits}`);
    addIntl(digits);
    addIntl(last8);
    return intlVariants;
  }

  // Remover prefixo 55 se for número nacional com DDI (12 ou 13 dígitos começando com 55)
  let national = digits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    national = digits.slice(2);
  } else if (digits.length > 13 && digits.startsWith('0055')) {
    national = digits.slice(4);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    national = digits.slice(1);
  }

  const last8 = national.slice(-8);
  const first4 = last8.slice(0, 4);
  const last4 = last8.slice(4, 8);

  let ddd = '';
  if (national.length === 10 || national.length === 11) {
    ddd = national.slice(0, 2);
  } else if (digits.length >= 10 && !digits.startsWith('55')) {
    ddd = digits.slice(0, 2);
  }

  const variants = [];
  const addVariant = (val) => {
    if (val && !variants.includes(val)) {
      variants.push(val);
    }
  };

  if (ddd) {
    const withNine = `${ddd}9${last8}`;
    const withoutNine = `${ddd}${last8}`;

    // Variantes diretas com DDD (com e sem 9º dígito)
    addVariant(withNine);
    addVariant(withoutNine);

    // Variantes formatadas padrão brasileiro
    addVariant(`(${ddd}) 9${first4}-${last4}`);
    addVariant(`(${ddd}) ${first4}-${last4}`);
    addVariant(`${ddd} 9${first4}-${last4}`);
    addVariant(`${ddd} ${first4}-${last4}`);

    // Variantes com DDI 55
    addVariant(`55${withNine}`);
    addVariant(`55${withoutNine}`);
    addVariant(`+55 ${ddd} 9${first4}-${last4}`);
    addVariant(`+55 ${ddd} ${first4}-${last4}`);
  } else {
    addVariant(`9${last8}`);
  }

  // Variantes finais de 8 dígitos (imunes à presença ou ausência do 9º dígito e DDD)
  addVariant(last8);
  addVariant(`${first4}-${last4}`);

  return variants;
}

/**
 * Mapa de apelidos/aliases conhecidos de alunos no WhatsApp do treinador (indexado pelo slug).
 */
export const KNOWN_STUDENT_ALIASES = {
  'maria-aparecida-rosa-dias': ['Nina'],
  'gabriel-pontes': ['Biel Pontes'],
  'gabriel-pontes-da-costa': ['Biel Pontes'],
  'antonia-cemira-carneiro': ['A. Cemira', 'Cemira'],
  'ivanilde-caldeira-de-sousa': ['Ivanilde - Consultoria', 'Ivanilde', 'Evanilde'],
  'leonardo-janelli': ['Léo Janelli'],
  'leandro': ['Leandro Aluno Smart'],
  'sandro-rodrigues': ['Sandro Rodrigues ALUNO', 'Sandrão'],
};

/**
 * Gera variantes de busca pelo nome do aluno (apelidos conhecidos, nome completo, Primeiro + Último, etc.).
 * @param {string} fullName
 * @returns {string[]}
 */
export function buildStudentNameSearchVariants(fullName) {
  if (!fullName || typeof fullName !== 'string') return [];
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return [];

  const variants = [];
  const addVariant = (v) => {
    if (v && !variants.includes(v)) {
      variants.push(v);
    }
  };

  // Incluir apelidos/aliases conhecidos com prioridade
  const slug = slugifyStudentName(cleaned);
  if (slug && Array.isArray(KNOWN_STUDENT_ALIASES[slug])) {
    for (const alias of KNOWN_STUDENT_ALIASES[slug]) {
      addVariant(alias);
    }
  }

  addVariant(cleaned);

  const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const tokens = cleaned.split(' ').filter((t) => t.length > 0);
  const meaningfulTokens = tokens.filter((t) => !stopWords.has(t.toLowerCase()));

  if (meaningfulTokens.length >= 2) {
    const first = meaningfulTokens[0];
    const second = meaningfulTokens[1];
    const last = meaningfulTokens[meaningfulTokens.length - 1];

    addVariant(`${first} ${last}`);
    addVariant(`${first} ${second}`);

    // Apelidos comuns em português (ex: Gabriel -> Biel)
    if (first.toLowerCase() === 'gabriel') {
      addVariant(`Biel ${second}`);
      addVariant(`Biel ${last}`);
    }
  }

  // Adicionar tokens individuais distintivos (>= 4 caracteres)
  // Priorizando sobrenomes/nomes compostos específicos antes de primeiros nomes muito comuns
  const commonFirstNames = new Set(['maria', 'gabriel', 'joao', 'jose', 'ana', 'paulo', 'lucas', 'pedro', 'aluno']);
  for (let i = 1; i < meaningfulTokens.length; i++) {
    if (meaningfulTokens[i].length >= 4 && !commonFirstNames.has(meaningfulTokens[i].toLowerCase())) {
      addVariant(meaningfulTokens[i]);
    }
  }

  if (meaningfulTokens.length >= 1 && meaningfulTokens[0].length >= 4 && !commonFirstNames.has(meaningfulTokens[0].toLowerCase())) {
    addVariant(meaningfulTokens[0]);
  }

  return variants;
}

/**
 * Normaliza um nome para comparação determinística insensível a acentos (NFD), caixa e espaços múltiplos.
 * Ex: "VICTOR MIRANDA MAGALHAES" -> "victor miranda magalhaes"
 *     "Victor Miranda Magalhães" -> "victor miranda magalhaes"
 *
 * @param {string | null | undefined} name
 * @returns {string}
 */
export function normalizeNameForComparison(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Extrai tokens significativos (sem preposições de ligação e com > 2 caracteres) já sem acentos.
 * @param {string} normalizedName
 * @returns {string[]}
 */
function extractMeaningfulNameTokens(normalizedName) {
  if (!normalizedName) return [];
  const stopWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  return normalizedName
    .split(' ')
    .filter((t) => t.length > 2 && !stopWords.has(t));
}

/**
 * Correlaciona deterministicamente um aluno do Fitcoach/CRM contra a lista de registros
 * da tabela `aluno` e `anamneses` do Questionários, sendo 100% insensível a diacríticos (NFD),
 * caixa alta/baixa, variações de nome do meio, telefone (últimos 8 dígitos) e e-mail (`fitcoachEmail`).
 *
 * @param {{ fitcoachId?: string | null, crmId?: string | null, name: string, email?: string | null, phone?: string | null }} studentInput
 * @param {Array<{ id: string, nome?: string | null, telefone?: string | null, fitcoach_student_id?: string | null }>} [crmAlunos]
 * @param {Array<{ id: string, aluno_id?: string | null, content?: Record<string, any> | null, status?: string | null, created_at?: string | Date | null }>} [anamneses]
 * @returns {{ crmAluno: any | null, anamnese: any | null, phone: string | null }}
 */
export function matchStudentAnamneseAndCrm(studentInput, crmAlunos = [], anamneses = []) {
  const fitcoachId = studentInput?.fitcoachId || null;
  const explicitCrmId = studentInput?.crmId || null;
  const rawName = studentInput?.name || '';
  const normName = normalizeNameForComparison(rawName);
  const slug = slugifyStudentName(rawName);
  const normEmail = (studentInput?.email || '').trim().toLowerCase();
  const cleanInputPhone = (studentInput?.phone || '').replace(/\D/g, '');
  const targetTokens = extractMeaningfulNameTokens(normName);

  const aliasNorms = (slug && Array.isArray(KNOWN_STUDENT_ALIASES[slug]))
    ? KNOWN_STUDENT_ALIASES[slug].map((a) => normalizeNameForComparison(a)).filter(Boolean)
    : [];

  const namesMatch = (candidateRawName) => {
    const candNorm = normalizeNameForComparison(candidateRawName);
    if (!candNorm || !normName) return false;
    if (candNorm === normName) return true;
    if (aliasNorms.includes(candNorm)) return true;
    if (candNorm.length >= 4 && normName.includes(candNorm)) return true;
    if (normName.length >= 4 && candNorm.includes(normName)) return true;

    const candTokens = extractMeaningfulNameTokens(candNorm);
    if (targetTokens.length >= 2 && candTokens.length >= 2) {
      if (
        targetTokens[0] === candTokens[0] &&
        targetTokens[targetTokens.length - 1] === candTokens[candTokens.length - 1]
      ) {
        return true;
      }
    }
    return false;
  };

  const extractLast8 = (rawPhone) => {
    const clean = String(rawPhone || '').replace(/\D/g, '');
    return clean.length >= 8 ? clean.slice(-8) : '';
  };

  const phonesConflict = (phoneA, phoneB) => {
    const a = extractLast8(phoneA);
    const b = extractLast8(phoneB);
    return Boolean(a && b && a !== b);
  };

  // 1. Localizar registro na tabela `aluno` do Questionários
  let crmAluno = null;
  if (Array.isArray(crmAlunos) && crmAlunos.length > 0) {
    const hasConflictingFitcoachId = (a) =>
      Boolean(fitcoachId && a?.fitcoach_student_id && a.fitcoach_student_id !== fitcoachId);

    // Prioridade 1: ID explícito do CRM ou fitcoach_student_id
    if (explicitCrmId) {
      crmAluno = crmAlunos.find((a) => a && a.id === explicitCrmId) || null;
    }
    if (!crmAluno && fitcoachId) {
      crmAluno = crmAlunos.find((a) => a && a.fitcoach_student_id === fitcoachId) || null;
    }
    // Prioridade 2: Telefone (últimos 8 dígitos) — evita colisão entre homônimos com WhatsApp distinto
    if (!crmAluno && cleanInputPhone.length >= 8) {
      const last8 = cleanInputPhone.slice(-8);
      crmAluno =
        crmAlunos.find((a) => {
          if (!a || hasConflictingFitcoachId(a)) return false;
          const aPhone = (a?.telefone || '').replace(/\D/g, '');
          return aPhone.length >= 8 && aPhone.endsWith(last8);
        }) || null;
    }
    // Prioridade 3: Nome exato normalizado sem acento (bloqueando conflito de telefone/fitcoach_student_id)
    if (!crmAluno && normName) {
      crmAluno =
        crmAlunos.find(
          (a) =>
            a &&
            !hasConflictingFitcoachId(a) &&
            !phonesConflict(cleanInputPhone, a.telefone) &&
            normalizeNameForComparison(a.nome) === normName,
        ) || null;
    }
    // Prioridade 4: Substring / Primeiro + Último nome sem acento / Aliases (bloqueando conflito de telefone/fitcoach_student_id)
    if (!crmAluno && normName) {
      crmAluno =
        crmAlunos.find(
          (a) =>
            a &&
            !hasConflictingFitcoachId(a) &&
            !phonesConflict(cleanInputPhone, a.telefone) &&
            namesMatch(a.nome),
        ) || null;
    }
  }

  const resolvedCrmId = crmAluno?.id || explicitCrmId || null;
  const cleanTargetPhone = ((crmAluno?.telefone || studentInput?.phone || '')).replace(/\D/g, '');

  // 2. Localizar registro na tabela `anamneses` do Questionários
  let anamnese = null;
  if (Array.isArray(anamneses) && anamneses.length > 0) {
    const isOwnedByOtherAluno = (an) =>
      Boolean(resolvedCrmId && an?.aluno_id && an.aluno_id !== resolvedCrmId);
    const hasPhoneConflict = (an) => {
      const c = an?.content || {};
      return phonesConflict(cleanTargetPhone, c.whatsapp || c.telefone);
    };

    // Prioridade 1: Mesmo ID do CRM aluno ou coluna aluno_id vinculada
    if (resolvedCrmId) {
      anamnese =
        anamneses.find((an) => an && (an.aluno_id === resolvedCrmId || an.id === resolvedCrmId)) ||
        null;
    }
    // Prioridade 2: Match por telefone (últimos 8 dígitos), ignorando registros de outro aluno_id
    if (!anamnese && cleanTargetPhone.length >= 8) {
      const last8 = cleanTargetPhone.slice(-8);
      anamnese =
        anamneses.find((an) => {
          if (!an || isOwnedByOtherAluno(an)) return false;
          const c = an?.content || {};
          const anPhone = (c.whatsapp || c.telefone || '').replace(/\D/g, '');
          return anPhone.length >= 8 && anPhone.endsWith(last8);
        }) || null;
    }
    // Prioridade 3: Match por e-mail (fitcoachEmail ou email dentro do JSON content), protegido contra conflito de telefone/aluno_id
    if (!anamnese && normEmail) {
      anamnese =
        anamneses.find((an) => {
          if (!an || isOwnedByOtherAluno(an) || hasPhoneConflict(an)) return false;
          const c = an?.content || {};
          const anEmail = (c.fitcoachEmail || c.email || '').trim().toLowerCase();
          return anEmail && anEmail === normEmail;
        }) || null;
    }
    // Prioridade 4: Match por nome normalizado sem diacríticos, protegido contra conflito de telefone/aluno_id
    if (!anamnese && normName) {
      anamnese =
        anamneses.find((an) => {
          if (!an || isOwnedByOtherAluno(an) || hasPhoneConflict(an)) return false;
          const c = an?.content || {};
          return namesMatch(c.fullName || c.nome || '');
        }) || null;
    }
  }

  const effectivePhone =
    crmAluno?.telefone ||
    anamnese?.content?.whatsapp ||
    anamnese?.content?.telefone ||
    studentInput?.phone ||
    null;

  return {
    crmAluno,
    anamnese,
    phone: effectivePhone,
  };
}


/**
 * Extrai metadados de data, hora e remetente a partir do atributo `data-pre-plain-text`
 * do WhatsApp Web (ex: `[19:42, 12/10/2026] Diandra Teo: ` ou `[12/10/2026 19:42] Nome: `).
 *
 * @param {string | null | undefined} prePlainText
 * @param {string | null | undefined} [fallbackDateStr] Data fallback no formato DD/MM/YYYY ou YYYY-MM-DD
 * @returns {{ timestampISO: string | null, dateBR: string | null, timeBR: string | null, senderName: string | null }}
 */
export function parseWhatsAppPrePlainText(prePlainText, fallbackDateStr = null) {
  const emptyResult = {
    timestampISO: null,
    dateBR: null,
    timeBR: null,
    senderName: null,
  };

  if (!prePlainText || typeof prePlainText !== 'string') {
    return emptyResult;
  }

  const raw = prePlainText.trim();

  // extrair parte entre colchetes [ ... ] e nome do remetente após ]
  const bracketMatch = raw.match(/^\[([^\]]+)\]\s*(.*?)(?::\s*)?$/);
  const insideBrackets = bracketMatch ? bracketMatch[1].trim() : raw;
  const extractedSender = bracketMatch && bracketMatch[2] ? bracketMatch[2].trim().replace(/:\s*$/, '') : null;

  let day = null;
  let month = null;
  let year = null;
  let hour = null;
  let minute = null;
  let second = 0;

  // Padrão 1: HH:MM(:SS), DD/MM/YYYY (padrão clássico WhatsApp Web PT-BR)
  const patternTimeFirst = insideBrackets.match(
    /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*[,|-]?\s*(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/
  );

  // Padrão 2: DD/MM/YYYY(, ) HH:MM(:SS)
  const patternDateFirst = insideBrackets.match(
    /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s*[,|-]?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/
  );

  if (patternTimeFirst) {
    hour = parseInt(patternTimeFirst[1], 10);
    minute = parseInt(patternTimeFirst[2], 10);
    second = patternTimeFirst[3] ? parseInt(patternTimeFirst[3], 10) : 0;
    day = parseInt(patternTimeFirst[4], 10);
    month = parseInt(patternTimeFirst[5], 10);
    year = parseInt(patternTimeFirst[6], 10);
  } else if (patternDateFirst) {
    day = parseInt(patternDateFirst[1], 10);
    month = parseInt(patternDateFirst[2], 10);
    year = parseInt(patternDateFirst[3], 10);
    hour = parseInt(patternDateFirst[4], 10);
    minute = parseInt(patternDateFirst[5], 10);
    second = patternDateFirst[6] ? parseInt(patternDateFirst[6], 10) : 0;
  } else {
    // Padrão 3: Apenas horário (ex: "19:42") combinado com fallbackDateStr
    const timeOnly = insideBrackets.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeOnly && fallbackDateStr) {
      hour = parseInt(timeOnly[1], 10);
      minute = parseInt(timeOnly[2], 10);
      second = timeOnly[3] ? parseInt(timeOnly[3], 10) : 0;

      const brFallback = String(fallbackDateStr).match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
      const isoFallback = String(fallbackDateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (brFallback) {
        day = parseInt(brFallback[1], 10);
        month = parseInt(brFallback[2], 10);
        year = parseInt(brFallback[3], 10);
      } else if (isoFallback) {
        year = parseInt(isoFallback[1], 10);
        month = parseInt(isoFallback[2], 10);
        day = parseInt(isoFallback[3], 10);
      }
    }
  }

  if (year !== null && year < 100) {
    year += 2000;
  }

  if (
    day === null ||
    month === null ||
    year === null ||
    hour === null ||
    minute === null ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return {
      timestampISO: null,
      dateBR: null,
      timeBR: null,
      senderName: extractedSender || null,
    };
  }

  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year);
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');
  const ss = String(second).padStart(2, '0');

  const dateObj = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.000Z`);
  const timestampISO = isNaN(dateObj.getTime()) ? null : dateObj.toISOString();

  return {
    timestampISO,
    dateBR: `${dd}/${mm}/${yyyy} ${hh}:${min}`,
    timeBR: `${hh}:${min}`,
    senderName: extractedSender || null,
  };
}

/**
 * Dicionário de palavras-chave clínicas e de treinamento para triagem automática.
 */
const CLINICAL_TAG_PATTERNS = [
  {
    tag: 'dor_lesao',
    regex:
      /\b(dor|dores|doendo|doeu|incomodo|incomodou|incomodando|fisgada|pontada|lesao|lesionado|inflamacao|inflamado|tendinite|bursite|lombar|joelho|ombro|cotovelo|punho|quadril|tornozelo|cervical|hernia|travou|estalou|estalando|desconforto|articular)\b/i,
  },
  {
    tag: 'equipamento_academia',
    regex:
      /\b(maquina|halter|halteres|barra|polia|cabo|banco|anilha|anilhas|academia|aparelho|equipamento|ocupado|quebrado|manutencao|smith|leg press|extensora|flexora|puxador|crossover|condominio|placa|placas)\b/i,
  },
  {
    tag: 'carga_pr',
    regex:
      /\b(carga|peso|pesos|quilo|quilos|\d+\s*kg|subi|aumentei|progredi|pesada|pesado|leve|pr|recorde|falha|falhei|rpe|repeticoes|reps|serie|series)\b/i,
  },
  {
    tag: 'rotina_viagem',
    regex:
      /\b(viagem|viajar|viajando|viajei|trabalho|plantao|correria|corrido|imprevisto|faltar|faltei|mudar|horario|semana|feriado|compromisso|agenda|consegui ir|nao consegui treinar)\b/i,
  },
  {
    tag: 'sono_recuperacao',
    regex:
      /\b(sono|dormi|dormir|insonia|cansaco|cansado|cansada|fadiga|fadigado|exausto|exausta|recuperacao|dmit|doms|dolorido|dolorida|estresse|estressado|ansiedade|gripe|gripado|doente|febre)\b/i,
  },
  {
    tag: 'duvida_execucao',
    regex:
      /\b(duvida|duvidas|execucao|postura|pegada|amplitude|cadencia|angulo|filmar|filmei|inclinado|sentado|em pe|ajuste|como faz|como faco|biomecanica|tecnica)\b/i,
  },
  {
    tag: 'nutricao_dieta',
    regex:
      /\b(dieta|calorias|proteina|creatina|suplemento|whey|fome|refeicao|nutricionista|balanca|emagrecer|cutting|bulking|alimentacao)\b/i,
  },
];

/**
 * Classifica mensagens de texto ou transcrições de áudio em tags clínicas/treino.
 *
 * @param {string | null | undefined} textOrTranscript
 * @returns {{ tags: string[], isRelevant: boolean, isClinicallyRelevant: boolean }}
 */
export function classifyClinicalTags(textOrTranscript) {
  if (!textOrTranscript || typeof textOrTranscript !== 'string' || !textOrTranscript.trim()) {
    return {
      tags: ['geral'],
      isRelevant: false,
      isClinicallyRelevant: false,
    };
  }

  const normalized = textOrTranscript
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const matchedTags = [];
  for (const rule of CLINICAL_TAG_PATTERNS) {
    if (rule.regex.test(normalized)) {
      matchedTags.push(rule.tag);
    }
  }

  const isRelevant = matchedTags.length > 0;
  if (!isRelevant) {
    matchedTags.push('geral');
  }

  return {
    tags: matchedTags,
    isRelevant,
    isClinicallyRelevant: isRelevant,
  };
}

/**
 * Gera um ID único determinístico para cada mensagem do WhatsApp Web.
 * Se `rawDataId` (atributo `data-id` do DOM do WhatsApp) estiver presente, utiliza-o;
 * caso contrário, calcula um hash SHA-256 curto e determinístico.
 *
 * @param {{ rawDataId?: string | null, timestampISO?: string | null, sender?: string | null, type?: string | null, content?: string | null }} params
 * @returns {string}
 */
export function computeMessageId({ rawDataId = null, timestampISO = '', sender = '', type = 'text', content = '' } = {}) {
  if (rawDataId && typeof rawDataId === 'string' && rawDataId.trim().length > 0) {
    return rawDataId.trim();
  }
  const normalizedContent = String(content || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 160);
  const seed = `${timestampISO || 'no-ts'}|${sender || 'unknown'}|${type || 'text'}|${normalizedContent}`;
  const hash = createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 20);
  return `wa_${hash}`;
}

/**
 * Implementa a Regra W3 (Janela Temporal Incremental):
 * - 1ª Sincronização (Cold Start, quando não há cache prévio ou `messages` está vazio):
 *   retorna `coldStartDays` (padrão 75 dias, contido na faixa 60–90 dias).
 * - Revisões Semanais Subsequentes (Incremental, quando já existe cache com mensagens):
 *   retorna `incrementalDays` (padrão 10 dias, contido na faixa 7–14 dias).
 * - Caso `overrideDays` seja informado explicitamente via CLI (`--days=N`), respeita `overrideDays`.
 *
 * @param {object | null | undefined} existingCache
 * @param {{ coldStartDays?: number, incrementalDays?: number, overrideDays?: number | null }} [options]
 * @returns {{ days: number, mode: 'cold_start' | 'incremental' | 'override' }}
 */
export function resolveSyncWindowDays(
  existingCache,
  { coldStartDays = 75, incrementalDays = 10, overrideDays = null } = {}
) {
  if (overrideDays !== null && overrideDays !== undefined && Number(overrideDays) > 0) {
    return {
      days: Number(overrideDays),
      mode: 'override',
    };
  }

  const hasPreviousMessages =
    existingCache &&
    typeof existingCache === 'object' &&
    Array.isArray(existingCache.messages) &&
    existingCache.messages.length > 0 &&
    Boolean(existingCache.lastSyncAt || existingCache.firstSyncAt);

  if (!hasPreviousMessages) {
    const clampedCold = Math.min(90, Math.max(60, Number(coldStartDays) || 75));
    return {
      days: clampedCold,
      mode: 'cold_start',
    };
  }

  const clampedInc = Math.min(14, Math.max(7, Number(incrementalDays) || 10));
  return {
    days: clampedInc,
    mode: 'incremental',
  };
}

/**
 * Mescla novas mensagens extraídas do WhatsApp Web ao cache existente do aluno.
 * - Deduplica por `id` ou por chave composta (`timestamp + sender + type + texto`).
 * - Preserva transcrições de áudio (`transcription`, `clinicalSummary`, `clinicalTags`)
 *   já existentes para NUNCA re-transcrever o mesmo áudio (Regra W4).
 * - Ordena todas as mensagens cronologicamente (`timestamp` ascendente).
 *
 * @param {object | null | undefined} existingCache
 * @param {Array<object>} newMessages
 * @param {object} [metadata]
 * @returns {object} Cache consolidado pronto para ser salvo em `.whatsapp_cache/{slug}.json`
 */
export function mergeWhatsAppCache(existingCache, newMessages = [], metadata = {}) {
  const nowISO = metadata.nowISO || new Date().toISOString();
  const base = existingCache && typeof existingCache === 'object' ? existingCache : {};
  const previousMessages = Array.isArray(base.messages) ? base.messages : [];

  const byId = new Map();
  const compositeKeyToId = new Map();

  const buildCompositeKey = (msg) => {
    const ts = msg.timestamp || msg.dateBR || '';
    const sender = msg.sender || 'student';
    const type = msg.type || 'text';
    const body = String(msg.text || msg.audioDuration || '').trim().toLowerCase();
    return `${ts}|${sender}|${type}|${body}`;
  };

  const normalizeMessage = (rawMsg, prevMsg = null) => {
    const type = rawMsg.type || prevMsg?.type || 'text';
    const text = rawMsg.text !== undefined && rawMsg.text !== null ? rawMsg.text : (prevMsg?.text ?? null);

    // Preservar transcrição existente se a nova não trouxe transcrição válida
    const prevTranscription = prevMsg?.transcription || null;
    const rawTranscription = rawMsg.transcription || null;
    const isPendingPlaceholder =
      typeof rawTranscription === 'string' && rawTranscription.includes('transcrição pendente');

    const transcription =
      prevTranscription && (!rawTranscription || isPendingPlaceholder)
        ? prevTranscription
        : rawTranscription;

    const clinicalSummary =
      prevMsg?.clinicalSummary && (!rawMsg.clinicalSummary || isPendingPlaceholder)
        ? prevMsg.clinicalSummary
        : (rawMsg.clinicalSummary ?? null);

    const contentForClassification = [text, transcription, clinicalSummary].filter(Boolean).join(' ');
    const classification = classifyClinicalTags(contentForClassification);

    const existingTags = Array.isArray(rawMsg.clinicalTags) && rawMsg.clinicalTags.length > 0
      ? rawMsg.clinicalTags
      : (Array.isArray(prevMsg?.clinicalTags) && prevMsg.clinicalTags.length > 0
          ? prevMsg.clinicalTags
          : classification.tags);

    const timestamp = rawMsg.timestamp || prevMsg?.timestamp || null;
    const sender = rawMsg.sender || prevMsg?.sender || 'student';
    const id =
      rawMsg.id ||
      prevMsg?.id ||
      computeMessageId({
        timestampISO: timestamp,
        sender,
        type,
        content: text || transcription || rawMsg.audioDuration || '',
      });

    return {
      id,
      timestamp,
      dateBR: rawMsg.dateBR || prevMsg?.dateBR || null,
      sender,
      type,
      text,
      audioDuration: rawMsg.audioDuration ?? prevMsg?.audioDuration ?? null,
      transcription,
      clinicalSummary,
      clinicalTags: existingTags,
    };
  };

  for (const oldMsg of previousMessages) {
    if (!oldMsg) continue;
    const normalized = normalizeMessage(oldMsg);
    byId.set(normalized.id, normalized);
    compositeKeyToId.set(buildCompositeKey(normalized), normalized.id);
  }

  for (const incoming of newMessages) {
    if (!incoming) continue;
    const tempId =
      incoming.id ||
      computeMessageId({
        timestampISO: incoming.timestamp,
        sender: incoming.sender,
        type: incoming.type,
        content: incoming.text || incoming.transcription || incoming.audioDuration || '',
      });

    const compKey = buildCompositeKey(incoming);
    const matchedId = byId.has(tempId) ? tempId : (compositeKeyToId.get(compKey) || tempId);
    const existingMsg = byId.get(matchedId) || null;

    const mergedMsg = normalizeMessage({ ...incoming, id: matchedId }, existingMsg);
    byId.set(matchedId, mergedMsg);
    compositeKeyToId.set(buildCompositeKey(mergedMsg), matchedId);
  }

  const sortedMessages = Array.from(byId.values()).sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tA - tB;
  });

  return {
    studentId: metadata.studentId ?? base.studentId ?? null,
    slug: metadata.slug ?? base.slug ?? slugifyStudentName(metadata.studentName || base.studentName || ''),
    studentName: metadata.studentName ?? base.studentName ?? null,
    phone: metadata.phone ?? base.phone ?? null,
    matchedChatTitle: metadata.matchedChatTitle ?? base.matchedChatTitle ?? null,
    matchedVia: metadata.matchedVia ?? base.matchedVia ?? null,
    firstSyncAt: base.firstSyncAt || nowISO,
    lastSyncAt: nowISO,
    messages: sortedMessages,
  };
}

/**
 * Transcreve um áudio do WhatsApp (em Base64) utilizando a API REST do Gemini (`gemini-2.5-flash`).
 * Retorna `{ transcription, clinicalSummary, clinicalTags }`.
 * Em caso de ausência de chave ou falha de rede, retorna fallback gracioso sem quebrar o pipeline.
 *
 * @param {string} base64Audio String Base64 pura (sem prefixo data:audio/...)
 * @param {string} [mimeType] Ex: 'audio/ogg'
 * @param {string} [apiKey] Chave da API Gemini
 * @param {{ fetchImpl?: typeof fetch, durationLabel?: string }} [options]
 * @returns {Promise<{ transcription: string, clinicalSummary: string | null, clinicalTags: string[], fromFallback: boolean }>}
 */
export async function transcribeAudioWithGemini(
  base64Audio,
  mimeType = 'audio/ogg',
  apiKey = '',
  { fetchImpl = globalThis.fetch, durationLabel = 'PTT' } = {}
) {
  const fallbackText = `[Áudio (${durationLabel}) - transcrição pendente]`;

  if (!base64Audio || typeof base64Audio !== 'string' || !apiKey || typeof apiKey !== 'string') {
    return {
      transcription: fallbackText,
      clinicalSummary: null,
      clinicalTags: ['geral'],
      fromFallback: true,
    };
  }

  const cleanBase64 = base64Audio.includes(',') ? base64Audio.split(',')[1].trim() : base64Audio.trim();
  const cleanMimeType = (mimeType || 'audio/ogg').split(';')[0].trim() || 'audio/ogg';

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    apiKey.trim()
  )}`;

  const prompt = [
    'Você é um assistente especialista em Educação Física e Fisiologia do Exercício apoiando o treinador Gustavo.',
    'Transcreva fielmente este áudio enviado no WhatsApp entre aluno e treinador.',
    'Retorne EXCLUSIVAMENTE um objeto JSON válido (sem blocos markdown) no formato:',
    '{"transcription": "transcrição literal completa em português", "clinicalSummary": "resumo objetivo de 1 linha focando em dores, cargas, equipamentos, rotina, sono ou dúvidas técnicas"}',
  ].join(' ');

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: cleanMimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      return {
        transcription: fallbackText,
        clinicalSummary: null,
        clinicalTags: ['geral'],
        fromFallback: true,
      };
    }

    const payload = await response.json();
    const rawText =
      payload?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || '')
        .join(' ')
        .trim() || '';

    if (!rawText) {
      return {
        transcription: fallbackText,
        clinicalSummary: null,
        clinicalTags: ['geral'],
        fromFallback: true,
      };
    }

    let parsed = null;
    try {
      const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(cleanedJson);
    } catch {
      parsed = {
        transcription: rawText,
        clinicalSummary: rawText.slice(0, 140),
      };
    }

    const transcription = String(parsed.transcription || rawText).trim();
    const clinicalSummary = parsed.clinicalSummary ? String(parsed.clinicalSummary).trim() : null;
    const { tags } = classifyClinicalTags(`${transcription} ${clinicalSummary || ''}`);

    return {
      transcription,
      clinicalSummary,
      clinicalTags: tags,
      fromFallback: false,
    };
  } catch {
    return {
      transcription: fallbackText,
      clinicalSummary: null,
      clinicalTags: ['geral'],
      fromFallback: true,
    };
  }
}

/**
 * Rótulos amigáveis para exibição das tags clínicas no dossiê `.md`.
 */
const TAG_LABELS_PT = {
  dor_lesao: 'Dor / Desconforto Articular',
  equipamento_academia: 'Equipamento / Academia',
  carga_pr: 'Carga / Progressão / PR',
  rotina_viagem: 'Rotina / Viagem / Frequência',
  sono_recuperacao: 'Sono / Fadiga / Recuperação',
  duvida_execucao: 'Dúvida Técnica / Execução',
  nutricao_dieta: 'Nutrição / Peso Corporal',
  geral: 'Geral',
};

/**
 * Formata a Seção 6 ("## 6. Histórico de Conversas & Áudios (WhatsApp)") para os dossiês `docs/students/{slug}.md`.
 *
 * @param {object | null | undefined} cacheData Conteúdo do arquivo `.whatsapp_cache/{slug}.json`
 * @param {{ maxMessages?: number }} [options]
 * @returns {string} Bloco Markdown completo da Seção 6
 */
export function formatWhatsAppSectionMarkdown(cacheData, { maxMessages = 30 } = {}) {
  let md = `## 6. Histórico de Conversas & Áudios (WhatsApp)\n`;

  if (!cacheData || typeof cacheData !== 'object' || !Array.isArray(cacheData.messages)) {
    md += `- **Status da Sincronização:** Nenhuma conversa sincronizada no cache local (\`.whatsapp_cache/\`).\n`;
    md += `- *Execute \`sync_whatsapp_history.mjs\` com o WhatsApp Web aberto para extrair mensagens de texto e transcrever áudios via Gemini.*\n`;
    return md;
  }

  const messages = cacheData.messages;
  const lastSyncFormatted = cacheData.lastSyncAt
    ? new Date(cacheData.lastSyncAt).toLocaleDateString('pt-BR')
    : 'Não registrado';
  const matchedViaLabel = cacheData.matchedVia || 'Não identificado';
  const chatTitle = cacheData.matchedChatTitle || cacheData.studentName || 'Não vinculado';

  const audioMessages = messages.filter((m) => m.type === 'audio');
  const relevantMessages = messages.filter(
    (m) => Array.isArray(m.clinicalTags) && m.clinicalTags.some((t) => t !== 'geral')
  );

  md += `- **Última Sincronização WhatsApp:** ${lastSyncFormatted} | **Chat Vinculado:** \`${chatTitle}\` (Origem: \`${matchedViaLabel}\`)\n`;
  md += `- **Volume Capturado:** ${messages.length} mensagens no histórico (${audioMessages.length} áudios transcritos | ${relevantMessages.length} relatos com relevância clínica/treino)\n`;

  if (messages.length === 0) {
    md += `- *Nenhuma mensagem encontrada na janela sincronizada para este aluno.*\n`;
    return md;
  }

  // Resumo de alertas clínicos/rotina detectados
  if (relevantMessages.length > 0) {
    md += `\n### Destaques Clínicos, Biomecânicos e de Rotina (WhatsApp)\n`;
    const recentHighlights = relevantMessages.slice(-8);
    for (const msg of recentHighlights) {
      const dateStr = msg.dateBR || (msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('pt-BR') : 'Data N/D');
      const author = msg.sender === 'coach' ? 'Treinador' : 'Aluno';
      const tagsFormatted = (msg.clinicalTags || [])
        .filter((t) => t !== 'geral')
        .map((t) => TAG_LABELS_PT[t] || t)
        .join(', ');
      const summaryText =
        msg.clinicalSummary ||
        (msg.type === 'audio' ? `🎤 ${msg.transcription || '[Áudio]'}` : msg.text || '');
      const cleanSummary = String(summaryText).replace(/\r?\n+/g, ' ').trim();
      md += `- **[${dateStr}] (${author} - ${tagsFormatted || 'Treino'}):** ${cleanSummary}\n`;
    }
  }

  // Tabela cronológica das mensagens mais recentes
  const slicedMessages = messages.slice(-maxMessages);
  md += `\n### Log Cronológico Recente (Texto & Áudios Transcritos)\n`;
  md += `| Data / Hora | Autor | Tipo | Tags | Conteúdo / Transcrição Gemini |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (const msg of slicedMessages) {
    const dateCol = msg.dateBR || (msg.timestamp ? new Date(msg.timestamp).toLocaleString('pt-BR') : 'N/D');
    const senderCol = msg.sender === 'coach' ? 'Treinador' : 'Aluno';
    const isAudio = msg.type === 'audio';
    const typeCol = isAudio ? `🎤 Áudio (${msg.audioDuration || 'PTT'})` : '💬 Texto';
    const tagsCol =
      Array.isArray(msg.clinicalTags) && msg.clinicalTags.length > 0
        ? msg.clinicalTags.join(', ')
        : 'geral';

    let rawBody = isAudio
      ? `🎤 [Áudio transcrito]: "${msg.transcription || '[Transcrição pendente]'}"${
          msg.clinicalSummary ? ` (Resumo: ${msg.clinicalSummary})` : ''
        }`
      : String(msg.text || '');

    const safeBody = rawBody
      .replace(/\r?\n+/g, ' ')
      .replace(/\|/g, '/')
      .trim();

    md += `| ${dateCol} | ${senderCol} | ${typeCol} | \`${tagsCol}\` | ${safeBody} |\n`;
  }

  return md;
}

/**
 * Carrega o arquivo `.whatsapp_cache/{slug}.json` do disco se existir.
 * @param {string} cacheFilePath
 * @returns {object | null}
 */
export function loadWhatsAppCacheFile(cacheFilePath) {
  if (!cacheFilePath || !existsSync(cacheFilePath)) return null;
  try {
    const raw = readFileSync(cacheFilePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Salva o objeto de cache formatado em `.whatsapp_cache/{slug}.json`.
 * @param {string} cacheFilePath
 * @param {object} cacheData
 */
export function saveWhatsAppCacheFile(cacheFilePath, cacheData) {
  const dir = dirname(cacheFilePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2) + '\n', 'utf8');
}
