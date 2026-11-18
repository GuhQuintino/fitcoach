import { describe, it, expect } from 'vitest';
import {
  APP_TIMEZONE,
  addDaysDateKeySP,
  formatDateBR,
  formatDateOnlyBR,
  formatDateTimeBR,
  formatMonthShortSP,
  formatMonthYearSP,
  formatTimeBR,
  formatWorkoutStartAndDuration,
  getDatePartsSP,
  getDayOfMonthSP,
  parseDateSafe,
  toLocalDateKeySP,
} from './dateTime';

describe('dateTime (America/Sao_Paulo) - Regression Tests', () => {
  it('usa America/Sao_Paulo como fuso horário padrão da aplicação', () => {
    expect(APP_TIMEZONE).toBe('America/Sao_Paulo');
  });

  it('converte timestamp UTC após 21:00 BRT para o dia anterior em America/Sao_Paulo', () => {
    // 2026-11-18 01:30:00 UTC === 2026-11-17 22:30:00 America/Sao_Paulo (UTC-3)
    const utcTimestamp = '2026-11-18T01:30:00.000Z';

    expect(toLocalDateKeySP(utcTimestamp)).toBe('2026-11-17');
    expect(getDayOfMonthSP(utcTimestamp)).toBe(17);
    expect(formatDateBR(utcTimestamp)).toBe('17/11/2026');
    expect(formatTimeBR(utcTimestamp)).toBe('22:30');
    expect(formatDateTimeBR(utcTimestamp)).toContain('17/11/2026');
    expect(formatDateTimeBR(utcTimestamp)).toContain('22:30');
    expect(formatMonthShortSP(utcTimestamp)).toBe('nov');
  });

  it('respeita a fronteira exata da meia-noite em America/Sao_Paulo (02:59:59Z vs 03:00:00Z)', () => {
    const beforeMidnightSP = '2026-11-18T02:59:59.000Z';
    const atMidnightSP = '2026-11-18T03:00:00.000Z';

    expect(toLocalDateKeySP(beforeMidnightSP)).toBe('2026-11-17');
    expect(formatTimeBR(beforeMidnightSP)).toBe('23:59');
    expect(getDayOfMonthSP(beforeMidnightSP)).toBe(17);

    expect(toLocalDateKeySP(atMidnightSP)).toBe('2026-11-18');
    expect(formatTimeBR(atMidnightSP)).toBe('00:00');
    expect(getDayOfMonthSP(atMidnightSP)).toBe(18);
  });

  it('trata corretamente virada de ano/mês após 21:00 BRT (ex: 31/12 22:15 BRT)', () => {
    const newYearUtc = '2027-01-01T01:15:00.000Z';

    expect(toLocalDateKeySP(newYearUtc)).toBe('2026-12-31');
    expect(getDayOfMonthSP(newYearUtc)).toBe(31);
    expect(formatDateBR(newYearUtc)).toBe('31/12/2026');
    expect(formatTimeBR(newYearUtc)).toBe('22:15');
    expect(formatMonthShortSP(newYearUtc)).toBe('dez');

    const parts = getDatePartsSP(newYearUtc);
    expect(parts).toEqual({
      year: 2026,
      month: 12,
      day: 31,
      hour: 22,
      minute: 15,
      second: 0,
    });
  });

  it('formata cabeçalho de sessão estilo ExerciseHistoryModal em America/Sao_Paulo', () => {
    // 2026-11-18T01:30:00.000Z -> terça-feira, 17 de nov., 22:30 em São Paulo
    const finishedAt = '2026-11-18T01:30:00.000Z';
    const dayBadge = getDayOfMonthSP(finishedAt);
    const formattedHeaderDate = formatDateBR(finishedAt, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    const formattedHeaderTime = formatTimeBR(finishedAt);

    expect(dayBadge).toBe(17);
    expect(formattedHeaderDate).toContain('17');
    expect(formattedHeaderDate.toLowerCase()).toContain('nov');
    expect(formattedHeaderTime).toBe('22:30');
  });

  it('não recua 1 dia ao formatar datas puras YYYY-MM-DD', () => {
    const dateOnly = '2026-11-18';

    expect(formatDateOnlyBR(dateOnly)).toBe('18/11/2026');
    expect(formatDateBR(dateOnly)).toBe('18/11/2026');
    expect(toLocalDateKeySP(dateOnly)).toBe('2026-11-18');
    expect(getDayOfMonthSP(dateOnly)).toBe(18);
    expect(formatDateOnlyBR(dateOnly, { day: '2-digit', month: 'long', year: 'numeric' })).toContain('18');
  });

  it('soma dias mantendo referência de calendário em America/Sao_Paulo', () => {
    // Base: 2026-11-18T01:30:00.000Z -> em SP ainda é 2026-11-17
    const base = '2026-11-18T01:30:00.000Z';
    expect(addDaysDateKeySP(30, base)).toBe('2026-12-17');
    expect(formatMonthYearSP(base)).toContain('novembro');
    expect(formatMonthYearSP(base)).toContain('2026');
  });

  it('lida com entradas nulas, vazias ou inválidas sem lançar erro', () => {
    expect(toLocalDateKeySP(null)).toBe('');
    expect(toLocalDateKeySP(undefined)).toBe('');
    expect(toLocalDateKeySP('invalid-date')).toBe('');
    expect(getDayOfMonthSP(null)).toBeNull();
    expect(formatDateBR(undefined)).toBe('');
    expect(formatTimeBR('')).toBe('');
    expect(formatDateOnlyBR(null)).toBe('');
    expect(formatDateTimeBR('invalid')).toBe('');
  });

  it('formata horário de início em America/Sao_Paulo junto à duração do treino', () => {
    // 2026-11-18T21:30:00Z = 18:30 BRT; 2026-11-18T22:15:00Z = 19:15 BRT (45 min)
    expect(
      formatWorkoutStartAndDuration('2026-11-18T21:30:00.000Z', '2026-11-18T22:15:00.000Z')
    ).toBe('18:30 • 45 min');

    // Após 21:00 BRT (01:10 UTC = 22:10 BRT)
    expect(
      formatWorkoutStartAndDuration('2026-11-18T01:10:00.000Z', '2026-11-18T02:00:00.000Z')
    ).toBe('22:10 • 50 min');

    // Sem finished_at válido, exibe apenas horário de início
    expect(formatWorkoutStartAndDuration('2026-11-18T21:30:00.000Z', null)).toBe('18:30');

    // Sem datas válidas, exibe "-"
    expect(formatWorkoutStartAndDuration(null, null)).toBe('-');
  });

  it('preserva getDatePartsSP e formatMonthYearSP para datas ancoradas em meio-dia UTC (navegação de calendário)', () => {
    const cases = [
      { year: 2026, month: 0, expectedYear: 2026, expectedMonth: 1, expectedMonthName: 'janeiro' },
      { year: 2026, month: 10, expectedYear: 2026, expectedMonth: 11, expectedMonthName: 'novembro' },
      { year: 2026, month: 11, expectedYear: 2026, expectedMonth: 12, expectedMonthName: 'dezembro' },
      // Navegação para mês anterior de janeiro (month = -1 -> dez/2025) e próximo mês de dezembro (month = 12 -> jan/2027)
      { year: 2026, month: -1, expectedYear: 2025, expectedMonth: 12, expectedMonthName: 'dezembro' },
      { year: 2026, month: 12, expectedYear: 2027, expectedMonth: 1, expectedMonthName: 'janeiro' },
    ];

    for (const { year, month, expectedYear, expectedMonth, expectedMonthName } of cases) {
      const anchored = new Date(Date.UTC(year, month, 1, 12, 0, 0));
      const parts = getDatePartsSP(anchored);

      expect(parts).not.toBeNull();
      expect(parts?.year).toBe(expectedYear);
      expect(parts?.month).toBe(expectedMonth);
      expect(parts?.day).toBe(1);

      const monthYearLabel = formatMonthYearSP(anchored).toLowerCase();
      expect(monthYearLabel).toContain(expectedMonthName);
      expect(monthYearLabel).toContain(String(expectedYear));
    }
  });

  it('formata data YYYY-MM-DD por extenso via formatDateBR sem recuar 1 dia (ex: SubscriptionExpired)', () => {
    const formatted = formatDateBR('2026-11-18', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    expect(formatted).toContain('18');
    expect(formatted).not.toContain('17');
    expect(formatted.toLowerCase()).toContain('novembro');
    expect(formatted).toContain('2026');
    expect(formatDateBR('data-invalida', { day: '2-digit', month: 'long', year: 'numeric' })).toBe('');
  });

  it('ancora toLocalDateKeySP + parseDateSafe em 12:00:00Z preservando ano e dia da semana UTC em SP', () => {
    // 2026-11-18T01:30:00.000Z === 2026-11-17 22:30:00 BRT (terça-feira, UTC day 2)
    const anchored = parseDateSafe(toLocalDateKeySP('2026-11-18T01:30:00.000Z'));

    expect(anchored).not.toBeNull();
    expect(anchored?.toISOString()).toBe('2026-11-17T12:00:00.000Z');
    expect(anchored?.getUTCFullYear()).toBe(2026);
    expect(anchored?.getUTCDay()).toBe(2);
    expect(parseDateSafe(toLocalDateKeySP('invalid-date'))).toBeNull();
  });
});
