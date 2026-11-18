export const APP_TIMEZONE = 'America/Sao_Paulo';
export const APP_LOCALE = 'pt-BR';

export interface DatePartsSP {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
}

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Converte uma entrada de data em Date válido, retornando null se inválida.
 * Strings puras YYYY-MM-DD são ancoradas em meio-dia UTC (12:00:00Z) para
 * evitar recuo de 1 dia ao converter para America/Sao_Paulo (UTC-3).
 */
export function parseDateSafe(
  dateInput: string | Date | number | null | undefined
): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return null;
  }

  if (dateInput instanceof Date) {
    return Number.isNaN(dateInput.getTime()) ? null : dateInput;
  }

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) return null;
    const dateOnlyMatch = DATE_ONLY_REGEX.exec(trimmed);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]);
      const day = Number(dateOnlyMatch[3]);
      const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
      return Number.isNaN(utcNoon.getTime()) ? null : utcNoon;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(dateInput);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Extrai ano, mês, dia, hora, minuto e segundo no fuso America/Sao_Paulo.
 */
export function getDatePartsSP(
  dateInput: string | Date | number | null | undefined
): DatePartsSP | null {
  const date = parseDateSafe(dateInput);
  if (!date) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const rawHour = Number(map.hour);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Extrai a chave de data local YYYY-MM-DD no fuso America/Sao_Paulo.
 * Evita bugs de .split('T')[0] em timestamps UTC após 21:00 BRT.
 */
export function toLocalDateKeySP(
  dateInput: string | Date | number | null | undefined
): string {
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (DATE_ONLY_REGEX.test(trimmed)) {
      return trimmed;
    }
  }

  const parts = getDatePartsSP(dateInput);
  if (!parts) return '';

  const year = String(parts.year).padStart(4, '0');
  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna o dia do mês (1-31) no fuso America/Sao_Paulo.
 */
export function getDayOfMonthSP(
  dateInput: string | Date | number | null | undefined
): number | null {
  const parts = getDatePartsSP(dateInput);
  return parts ? parts.day : null;
}

/**
 * Formata apenas a data em pt-BR no fuso America/Sao_Paulo.
 */
export function formatDateBR(
  dateInput: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (typeof dateInput === 'string' && DATE_ONLY_REGEX.test(dateInput.trim()) && !options) {
    return formatDateOnlyBR(dateInput);
  }

  const date = parseDateSafe(dateInput);
  if (!date) return '';

  return date.toLocaleDateString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}

/**
 * Formata apenas o horário (HH:MM por padrão) em pt-BR no fuso America/Sao_Paulo.
 */
export function formatTimeBR(
  dateInput: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return '';

  return date.toLocaleTimeString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Formata data e hora em pt-BR no fuso America/Sao_Paulo.
 */
export function formatDateTimeBR(
  dateInput: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return '';

  return date.toLocaleString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Formata datas puras YYYY-MM-DD sem deslocamento de fuso horário UTC.
 */
export function formatDateOnlyBR(
  dateStr: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (!match) {
    return formatDateBR(trimmed, options);
  }

  const [, yyyy, mm, dd] = match;
  if (!options) {
    return `${dd}/${mm}/${yyyy}`;
  }

  const utcNoon = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0));
  return utcNoon.toLocaleDateString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    ...options,
  });
}

/**
 * Formata a abreviação do mês (ex: "nov") no fuso America/Sao_Paulo.
 */
export function formatMonthShortSP(
  dateInput: string | Date | number | null | undefined
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return '';

  return date
    .toLocaleString(APP_LOCALE, {
      timeZone: APP_TIMEZONE,
      month: 'short',
    })
    .replace('.', '');
}

/**
 * Formata mês por extenso e ano (ex: "novembro de 2026") no fuso America/Sao_Paulo.
 */
export function formatMonthYearSP(
  dateInput: string | Date | number | null | undefined
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return '';

  return date.toLocaleString(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Soma dias a uma data base e retorna a chave YYYY-MM-DD no fuso America/Sao_Paulo.
 */
export function addDaysDateKeySP(
  days: number,
  baseDate: string | Date | number = new Date()
): string {
  const parts = getDatePartsSP(baseDate);
  if (!parts) return '';

  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return toLocalDateKeySP(target);
}

/**
 * Formata horário de início em America/Sao_Paulo e duração do treino em minutos.
 * Ex.: "18:30 • 45 min"
 */
export function formatWorkoutStartAndDuration(
  startedAt: string | Date | number | null | undefined,
  finishedAt: string | Date | number | null | undefined
): string {
  const startDate = parseDateSafe(startedAt);
  const endDate = parseDateSafe(finishedAt);
  const startTime = startDate ? formatTimeBR(startDate) : '';
  const durationMin =
    startDate && endDate
      ? Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 60000))
      : null;

  if (startTime && durationMin !== null) {
    return `${startTime} • ${durationMin} min`;
  }
  if (startTime) {
    return startTime;
  }
  if (durationMin !== null) {
    return `${durationMin} min`;
  }
  return '-';
}
