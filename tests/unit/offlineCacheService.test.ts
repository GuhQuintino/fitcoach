// Mock do localStorage para Node/Vitest
let store: Record<string, string> = {};
(globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
};

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    CACHE_TTL_MS,
    cacheStudentDashboard,
    getCachedStudentDashboard,
    cacheSelectionWorkouts,
    getCachedSelectionWorkouts,
    cacheWorkoutExecution,
    getCachedWorkoutExecution,
    clearStudentCache,
    CachedDashboardData,
    CachedSelectionData,
    CachedWorkoutData
} from '../../utils/offlineCacheService';

describe('UNIT TEST: offlineCacheService (Read Cache & TTL)', () => {
    beforeEach(() => {
        store = {};
        vi.restoreAllMocks();
    });

    describe('Dashboard Cache', () => {
        const mockDashboard: CachedDashboardData = {
            profile: { id: 'student-1', full_name: 'Maria Silva' },
            coach: { id: 'coach-1', name: 'Coach Gustavo' },
            studentData: { id: 's-data-1' },
            routine: { id: 'rotina-1', name: 'Hipertrofia 4 Dias' },
            workoutCount: 12,
            gamification: {
                streak: 5,
                level: 2,
                current_xp: 850,
                next_level_xp: 1000
            }
        };

        it('deve armazenar e recuperar o cache do Dashboard do aluno com sucesso', () => {
            cacheStudentDashboard('student-1', mockDashboard);
            const cached = getCachedStudentDashboard('student-1');

            expect(cached).not.toBeNull();
            expect(cached?.isExpired).toBe(false);
            expect(cached?.data.profile.full_name).toBe('Maria Silva');
            expect(cached?.data.gamification.streak).toBe(5);
        });

        it('deve identificar cache expirado quando ultrapassar o TTL de 8 dias', () => {
            cacheStudentDashboard('student-1', mockDashboard);

            // Simula passagem de 9 dias no tempo
            const nineDaysLater = Date.now() + (9 * 24 * 60 * 60 * 1000);
            vi.spyOn(Date, 'now').mockReturnValue(nineDaysLater);

            const cached = getCachedStudentDashboard('student-1');
            expect(cached).not.toBeNull();
            expect(cached?.isExpired).toBe(true);
        });
    });

    describe('Selection & Workout Execution Cache', () => {
        const mockSelection: CachedSelectionData = {
            routine: { id: 'rotina-1' },
            workouts: [{ id: 'w-1', name: 'Treino A' }, { id: 'w-2', name: 'Treino B' }],
            suggestedIndex: 0
        };

        const mockWorkout: CachedWorkoutData = {
            workout: { id: 'w-1', name: 'Treino A - Inferiores' },
            exercises: [{ id: 'ex-1', name: 'Agachamento' }],
            exerciseGroups: []
        };

        it('deve armazenar e recuperar o cache de seleção de treinos', () => {
            cacheSelectionWorkouts('student-1', mockSelection);
            const cached = getCachedSelectionWorkouts('student-1');

            expect(cached).not.toBeNull();
            expect(cached?.data.workouts.length).toBe(2);
            expect(cached?.data.suggestedIndex).toBe(0);
        });

        it('deve armazenar e recuperar o cache de execução de treino', () => {
            cacheWorkoutExecution('w-1', mockWorkout);
            const cached = getCachedWorkoutExecution('w-1');

            expect(cached).not.toBeNull();
            expect(cached?.data.workout.name).toBe('Treino A - Inferiores');
            expect(cached?.data.exercises[0].name).toBe('Agachamento');
        });

        it('clearStudentCache deve limpar caches associados sem deletar chaves não relacionadas', () => {
            cacheStudentDashboard('student-1', { profile: { id: 'student-1' } } as any);
            cacheSelectionWorkouts('student-1', mockSelection);
            store['unrelated_key'] = 'keep_me';

            clearStudentCache('student-1');

            expect(getCachedStudentDashboard('student-1')).toBeNull();
            expect(getCachedSelectionWorkouts('student-1')).toBeNull();
            expect(store['unrelated_key']).toBe('keep_me');
        });
    });
});
