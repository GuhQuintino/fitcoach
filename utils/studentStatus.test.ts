import { describe, it, expect } from 'vitest';
import {
    classifyStudent,
    calculateDashboardStats,
    formatLastWorkout,
    formatPlanExpiration
} from './studentStatus';

describe('studentStatus - classifyStudent (Regra S1)', () => {
    const fixedNow = new Date('2026-10-10T12:00:00Z');

    it('classifica como pending quando o cadastro está pendente de aprovação', () => {
        expect(classifyStudent({ status: 'pending', consultancy_expires_at: null }, fixedNow)).toBe('pending');
        expect(classifyStudent({ profiles: { status: 'pending' }, consultancy_expires_at: null }, fixedNow)).toBe('pending');
        // Mesmo que tenha data futura, status pending tem prioridade
        expect(classifyStudent({
            status: 'pending',
            consultancy_expires_at: '2026-11-01T00:00:00Z'
        }, fixedNow)).toBe('pending');
    });

    it('classifica como inactive quando status é rejected ou banned', () => {
        expect(classifyStudent({ status: 'rejected', consultancy_expires_at: '2026-11-01T00:00:00Z' }, fixedNow)).toBe('inactive');
        expect(classifyStudent({ status: 'banned', consultancy_expires_at: '2026-11-01T00:00:00Z' }, fixedNow)).toBe('inactive');
        expect(classifyStudent({ profiles: { status: 'rejected' } }, fixedNow)).toBe('inactive');
    });

    it('classifica como inactive quando o aluno não possui consultancy_expires_at', () => {
        expect(classifyStudent({ status: 'active', consultancy_expires_at: null }, fixedNow)).toBe('inactive');
        expect(classifyStudent({ status: 'active', consultancy_expires_at: undefined }, fixedNow)).toBe('inactive');
    });

    it('classifica como active quando o plano está vigente (data futura ou igual)', () => {
        // Vence daqui a 20 dias
        expect(classifyStudent({
            status: 'active',
            consultancy_expires_at: '2026-10-30T12:00:00Z'
        }, fixedNow)).toBe('active');

        // Vence exatamente agora
        expect(classifyStudent({
            status: 'active',
            consultancy_expires_at: '2026-10-10T12:00:00Z'
        }, fixedNow)).toBe('active');
    });

    it('classifica como pending quando o plano venceu há <= 7 dias (tolerância de renovação)', () => {
        // Venceu há 2 dias (2026-10-08)
        expect(classifyStudent({
            status: 'active',
            consultancy_expires_at: '2026-10-08T12:00:00Z'
        }, fixedNow)).toBe('pending');

        // Venceu há exatamente 7 dias (2026-10-03)
        expect(classifyStudent({
            status: 'active',
            consultancy_expires_at: '2026-10-03T12:00:00Z'
        }, fixedNow)).toBe('pending');
    });

    it('classifica como inactive quando o plano venceu há > 7 dias', () => {
        // Venceu há 8 dias (2026-10-02)
        expect(classifyStudent({
            status: 'active',
            consultancy_expires_at: '2026-10-02T12:00:00Z'
        }, fixedNow)).toBe('inactive');

        // Venceu há 30 dias (2026-09-10)
        expect(classifyStudent({
            status: 'active',
            consultancy_expires_at: '2026-09-10T12:00:00Z'
        }, fixedNow)).toBe('inactive');
    });

    it('retorna inactive para inputs nulos ou inválidos', () => {
        expect(classifyStudent(null, fixedNow)).toBe('inactive');
        expect(classifyStudent(undefined, fixedNow)).toBe('inactive');
        expect(classifyStudent({ status: 'active', consultancy_expires_at: 'data-invalida' }, fixedNow)).toBe('inactive');
    });
});

describe('studentStatus - calculateDashboardStats', () => {
    const fixedNow = new Date('2026-10-10T12:00:00Z');

    it('retorna contadores zerados para lista vazia', () => {
        const stats = calculateDashboardStats([], fixedNow);
        expect(stats).toEqual({
            totalStudents: 0,
            activeStudents: 0,
            pendingStudents: 0,
            inactiveStudents: 0,
            activePercentage: 0
        });
    });

    it('calcula estatísticas consolidadas com exatidão', () => {
        const students = [
            // 2 Ativos
            { status: 'active', consultancy_expires_at: '2026-10-25T00:00:00Z' },
            { profiles: { status: 'active' }, consultancy_expires_at: '2026-11-10T00:00:00Z' },
            // 2 Pendentes (1 por status pending, 1 por carência de 3 dias vencido)
            { status: 'pending', consultancy_expires_at: null },
            { status: 'active', consultancy_expires_at: '2026-10-07T12:00:00Z' },
            // 2 Inativos (1 sem plano, 1 vencido há 20 dias)
            { status: 'active', consultancy_expires_at: null },
            { status: 'active', consultancy_expires_at: '2026-09-20T00:00:00Z' }
        ];

        const stats = calculateDashboardStats(students, fixedNow);
        expect(stats.totalStudents).toBe(6);
        expect(stats.activeStudents).toBe(2);
        expect(stats.pendingStudents).toBe(2);
        expect(stats.inactiveStudents).toBe(2);
        expect(stats.activePercentage).toBe(33); // 2/6 = 33.33% -> 33
    });
});

describe('studentStatus - formatLastWorkout', () => {
    const fixedNow = new Date('2026-10-10T15:00:00Z');

    it('lida com ausência de registro de treino', () => {
        const res = formatLastWorkout(null, fixedNow);
        expect(res.label).toBe('Sem treinos registrados');
        expect(res.isStale).toBe(false);
        expect(res.daysAgo).toBeNull();
        expect(res.badgeVariant).toBe('muted');
    });

    it('formata treino realizado hoje', () => {
        const res = formatLastWorkout('2026-10-10T08:00:00Z', fixedNow);
        expect(res.label).toBe('Treinou hoje');
        expect(res.isStale).toBe(false);
        expect(res.daysAgo).toBe(0);
        expect(res.badgeVariant).toBe('emerald');
    });

    it('formata treino realizado ontem', () => {
        const res = formatLastWorkout('2026-10-09T18:00:00Z', fixedNow);
        expect(res.label).toBe('Treinou ontem');
        expect(res.isStale).toBe(false);
        expect(res.daysAgo).toBe(1);
        expect(res.badgeVariant).toBe('emerald');
    });

    it('formata treino recente entre 2 e 7 dias', () => {
        const res = formatLastWorkout('2026-10-06T10:00:00Z', fixedNow);
        expect(res.label).toBe('Treinou há 4 dias');
        expect(res.isStale).toBe(false);
        expect(res.daysAgo).toBe(4);
        expect(res.badgeVariant).toBe('slate');
    });

    it('ativa flag isStale quando mais de 7 dias sem treinar', () => {
        const res = formatLastWorkout('2026-09-30T10:00:00Z', fixedNow);
        expect(res.label).toBe('Sem treinar há 10 dias');
        expect(res.isStale).toBe(true);
        expect(res.daysAgo).toBe(10);
        expect(res.badgeVariant).toBe('amber');
    });
});

describe('studentStatus - formatPlanExpiration', () => {
    const fixedNow = new Date('2026-10-10T12:00:00Z');

    it('lida com ausência de plano ativo', () => {
        const res = formatPlanExpiration(null, fixedNow);
        expect(res.text).toBe('Sem plano ativo');
        expect(res.diffDays).toBeNull();
        expect(res.isUrgent).toBe(false);
        expect(res.isExpiredLong).toBe(true);
        expect(res.urgency).toBe('expired');
    });

    it('formata plano normal com mais de 7 dias para vencer', () => {
        const res = formatPlanExpiration('2026-10-25T12:00:00Z', fixedNow);
        expect(res.text).toBe('Vence em 15 dias');
        expect(res.isUrgent).toBe(false);
        expect(res.urgency).toBe('normal');
    });

    it('destaca plano que vence nos próximos 7 dias com urgência', () => {
        const res = formatPlanExpiration('2026-10-13T12:00:00Z', fixedNow);
        expect(res.text).toBe('Vence em 3 dias');
        expect(res.isUrgent).toBe(true);
        expect(res.urgency).toBe('warning');
    });

    it('destaca plano que vence hoje', () => {
        const res = formatPlanExpiration('2026-10-10T23:59:59Z', fixedNow);
        expect(res.text).toBe('Vence hoje');
        expect(res.isUrgent).toBe(true);
        expect(res.urgency).toBe('urgent');
    });

    it('destaca plano vencido na janela de tolerância de renovação (<= 7 dias)', () => {
        const res = formatPlanExpiration('2026-10-08T12:00:00Z', fixedNow);
        expect(res.text).toBe('Venceu há 2 dias (renovação)');
        expect(res.isUrgent).toBe(true);
        expect(res.isExpiredRecent).toBe(true);
        expect(res.urgency).toBe('grace');
    });

    it('formata plano vencido há mais de 7 dias', () => {
        const res = formatPlanExpiration('2026-09-25T12:00:00Z', fixedNow);
        expect(res.text).toBe('Vencido há 15 dias');
        expect(res.isUrgent).toBe(false);
        expect(res.isExpiredLong).toBe(true);
        expect(res.urgency).toBe('expired');
    });
});
