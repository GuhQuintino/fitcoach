import { describe, it, expect } from 'vitest';
import { getMethodTheme, METHOD_THEMES, sanitizeSetType } from './specialSetTokens';

describe('specialSetTokens - getMethodTheme', () => {
    it('deve retornar o tema ROSE para rest_pause', () => {
        const theme = getMethodTheme('rest_pause');
        expect(theme.rowBg).toContain('rose');
        expect(theme.borderColor).toContain('rose');
        expect(theme.containerBg).toContain('rose');
        expect(theme.headerText).toContain('rose');
        expect(theme.checkActive).toContain('rose');
    });

    it('deve retornar o tema PURPLE para dropset', () => {
        const theme = getMethodTheme('dropset');
        expect(theme.rowBg).toContain('purple');
        expect(theme.borderColor).toContain('purple');
        expect(theme.containerBg).toContain('purple');
        expect(theme.headerText).toContain('purple');
        expect(theme.checkActive).toContain('purple');
    });

    it('deve retornar o tema BLUE para cluster', () => {
        const theme = getMethodTheme('cluster');
        expect(theme.rowBg).toContain('blue');
        expect(theme.borderColor).toContain('blue');
        expect(theme.containerBg).toContain('blue');
        expect(theme.headerText).toContain('blue');
        expect(theme.checkActive).toContain('blue');
    });

    it('deve retornar o tema AMBER para myo_reps', () => {
        const theme = getMethodTheme('myo_reps');
        expect(theme.rowBg).toContain('amber');
        expect(theme.borderColor).toContain('amber');
        expect(theme.containerBg).toContain('amber');
        expect(theme.headerText).toContain('amber');
        expect(theme.checkActive).toContain('amber');
    });

    it('deve retornar o tema EMERALD para muscle_round', () => {
        const theme = getMethodTheme('muscle_round');
        expect(theme.rowBg).toContain('emerald');
        expect(theme.borderColor).toContain('emerald');
        expect(theme.containerBg).toContain('emerald');
        expect(theme.headerText).toContain('emerald');
        expect(theme.checkActive).toContain('emerald');
    });

    it('deve retornar o tema CYAN para method_3_7', () => {
        const theme = getMethodTheme('method_3_7');
        expect(theme.rowBg).toContain('cyan');
        expect(theme.borderColor).toContain('cyan');
        expect(theme.containerBg).toContain('cyan');
        expect(theme.headerText).toContain('cyan');
        expect(theme.checkActive).toContain('cyan');
    });

    it('deve retornar o tema FUCHSIA para fst7', () => {
        const theme = getMethodTheme('fst7');
        expect(theme.rowBg).toContain('fuchsia');
        expect(theme.borderColor).toContain('fuchsia');
        expect(theme.containerBg).toContain('fuchsia');
        expect(theme.headerText).toContain('fuchsia');
        expect(theme.checkActive).toContain('fuchsia');
    });

    it('deve retornar o tema TEAL para bfr', () => {
        const theme = getMethodTheme('bfr');
        expect(theme.rowBg).toContain('teal');
        expect(theme.borderColor).toContain('teal');
        expect(theme.containerBg).toContain('teal');
        expect(theme.headerText).toContain('teal');
        expect(theme.checkActive).toContain('teal');
    });

    it('deve retornar o tema padrão neutro (standard) para métodos desconhecidos ou vazios', () => {
        expect(getMethodTheme(undefined)).toEqual(METHOD_THEMES.standard);
        expect(getMethodTheme(null)).toEqual(METHOD_THEMES.standard);
        expect(getMethodTheme('metodo_desconhecido')).toEqual(METHOD_THEMES.standard);
        expect(getMethodTheme('standard')).toEqual(METHOD_THEMES.standard);
    });

    it('deve garantir ausência de borda grossa (border-l-4) e cores suaves de fundo', () => {
        Object.values(METHOD_THEMES).forEach(theme => {
            expect(theme.rowBorderLeft || '').not.toContain('border-l-4');
        });
        expect(METHOD_THEMES.rest_pause.rowBg).toBe('bg-rose-50/60 dark:bg-rose-950/20');
        expect(METHOD_THEMES.dropset.rowBg).toBe('bg-purple-50/60 dark:bg-purple-950/20');
        expect(METHOD_THEMES.cluster.rowBg).toBe('bg-blue-50/60 dark:bg-blue-950/20');
        expect(METHOD_THEMES.myo_reps.rowBg).toBe('bg-amber-50/60 dark:bg-amber-950/20');
        expect(METHOD_THEMES.muscle_round.rowBg).toBe('bg-emerald-50/60 dark:bg-emerald-950/20');
        expect(METHOD_THEMES.method_3_7.rowBg).toBe('bg-cyan-50/60 dark:bg-cyan-950/20');
    });
});

describe('specialSetTokens - sanitizeSetType', () => {
    it('deve retornar "working" para valores nulos, vazios ou indefinidos', () => {
        expect(sanitizeSetType(undefined)).toBe('working');
        expect(sanitizeSetType(null)).toBe('working');
        expect(sanitizeSetType('')).toBe('working');
        expect(sanitizeSetType('   ')).toBe('working');
    });

    it('deve normalizar "dropset" para "drop"', () => {
        expect(sanitizeSetType('dropset')).toBe('drop');
        expect(sanitizeSetType('DropSet')).toBe('drop');
        expect(sanitizeSetType('DROPSET')).toBe('drop');
    });

    it('deve preservar tipos de série canônicos suportados pelo enum do Postgres', () => {
        const validTypes = ['warmup', 'working', 'failure', 'drop', 'preparation', 'backoff', 'deload'];
        validTypes.forEach(t => {
            expect(sanitizeSetType(t)).toBe(t);
            expect(sanitizeSetType(t.toUpperCase())).toBe(t);
        });
    });

    it('deve retornar "working" para qualquer string desconhecida', () => {
        expect(sanitizeSetType('invalido')).toBe('working');
        expect(sanitizeSetType('super_set')).toBe('working');
    });
});


