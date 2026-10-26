import { describe, it, expect, vi, beforeEach } from 'vitest';

const selectMockByTable: Record<string, string[]> = {};

vi.mock('../../lib/supabaseClient', () => {
    const createBuilder = (tableName: string) => {
        if (!selectMockByTable[tableName]) {
            selectMockByTable[tableName] = [];
        }

        const builder: any = {
            select: vi.fn((cols: string) => {
                selectMockByTable[tableName].push(cols);
                return builder;
            }),
            eq: vi.fn(() => builder),
            gte: vi.fn(() => builder),
            is: vi.fn(() => builder),
            order: vi.fn(() => {
                if (tableName === 'workout_logs') {
                    return Promise.resolve({
                        data: [
                            {
                                id: 'log-1',
                                started_at: new Date().toISOString(),
                                finished_at: new Date().toISOString()
                            }
                        ],
                        error: null
                    });
                }
                if (tableName === 'notification_logs') {
                    return Promise.resolve({
                        data: [],
                        error: null
                    });
                }
                return builder;
            }),
            single: vi.fn(() => {
                if (tableName === 'profiles') {
                    return Promise.resolve({
                        data: {
                            avatar_url: 'https://example.com/avatar.jpg',
                            preferences: {
                                notifications: {
                                    push: true,
                                    reminders: true,
                                    coach_feedback: true,
                                    system_updates: true
                                }
                            }
                        },
                        error: null
                    });
                }
                if (tableName === 'students_data') {
                    return Promise.resolve({
                        data: {
                            weight_kg: 75,
                            birth_date: '1995-06-15',
                            height_cm: 178
                        },
                        error: null
                    });
                }
                return Promise.resolve({ data: null, error: null });
            })
        };

        return builder;
    };

    return {
        supabase: {
            from: vi.fn((table: string) => createBuilder(table))
        }
    };
});

import { fetchStudentNotificationContext } from '../smartNotificationDispatcher';

describe('smartNotificationDispatcher Regression Suite', () => {
    beforeEach(() => {
        Object.keys(selectMockByTable).forEach(k => delete selectMockByTable[k]);
    });

    it('não seleciona colunas inexistentes (students_data.age nem workout_logs.completed_at) evitando erro HTTP 400 PostgREST', async () => {
        const ctx = await fetchStudentNotificationContext('student-uuid-123');

        expect(ctx).not.toBeNull();
        expect(ctx?.userId).toBe('student-uuid-123');
        expect(ctx?.isProfileComplete).toBe(true);
        expect(ctx?.hasTrainedToday).toBe(true);

        const studentsDataSelects = selectMockByTable['students_data'] || [];
        expect(studentsDataSelects.length).toBeGreaterThan(0);
        for (const queryCols of studentsDataSelects) {
            expect(queryCols).toContain('weight_kg');
            expect(queryCols).toContain('birth_date');
            expect(queryCols).toContain('height_cm');
            expect(queryCols).not.toMatch(/\bage\b/);
        }

        const workoutLogsSelects = selectMockByTable['workout_logs'] || [];
        expect(workoutLogsSelects.length).toBeGreaterThan(0);
        for (const queryCols of workoutLogsSelects) {
            expect(queryCols).toContain('started_at');
            expect(queryCols).toContain('finished_at');
            expect(queryCols).not.toMatch(/\bcompleted_at\b/);
        }
    });

    it('normaliza as chaves coach_feedback e system_updates nas preferências de notificação', async () => {
        const ctx = await fetchStudentNotificationContext('student-uuid-123');
        expect(ctx?.preferences.coach_feedback).toBe(true);
        expect(ctx?.preferences.system_updates).toBe(true);
    });
});
