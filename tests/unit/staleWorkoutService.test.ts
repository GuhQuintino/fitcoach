import { describe, it, expect } from 'vitest';
import {
    AUTO_FINALIZE_THRESHOLD,
    STALE_TIMEOUT_HOURS,
    MIN_SETS_ABSOLUTE,
    isWorkoutStale,
    getCompletionStats,
    SavedWorkout
} from '../../utils/staleWorkoutService';

describe('UNIT TEST: staleWorkoutService (Detecção de Treinos Abandonados & Métricas)', () => {
    describe('Constantes de Negócio', () => {
        it('deve manter as regras canônicas de auto-finalização', () => {
            expect(AUTO_FINALIZE_THRESHOLD).toBe(0.6); // 60% mínimo
            expect(STALE_TIMEOUT_HOURS).toBe(4);        // 4 horas sem interação
            expect(MIN_SETS_ABSOLUTE).toBe(3);          // 3 séries mínimas
        });
    });

    describe('getCompletionStats', () => {
        it('deve calcular corretamente a taxa de conclusão e total de séries', () => {
            const mockWorkout: SavedWorkout = {
                workoutId: 'w-1',
                startTime: new Date().toISOString(),
                workoutSeconds: 1800,
                isWorkoutPaused: false,
                lastUpdate: new Date().toISOString(),
                exercises: [
                    {
                        id: 'ex-1',
                        workout_item_id: 'wi-1',
                        name: 'Supino',
                        sets: [
                            { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                            { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                            { type: 'working', weight: '80', reps: '8', rpe: '9', completed: false }
                        ]
                    },
                    {
                        id: 'ex-2',
                        workout_item_id: 'wi-2',
                        name: 'Crucifixo',
                        sets: [
                            { type: 'working', weight: '20', reps: '12', rpe: '8', completed: true },
                            { type: 'working', weight: '20', reps: '12', rpe: '8', completed: false }
                        ]
                    }
                ]
            };

            const stats = getCompletionStats(mockWorkout);
            expect(stats.totalSets).toBe(5);
            expect(stats.completedSets).toBe(3);
            expect(stats.completionPercentage).toBe(3 / 5); // 0.60 (60%)
        });

        it('deve retornar completionPercentage 0 quando não houver séries', () => {
            const emptyWorkout: SavedWorkout = {
                workoutId: 'w-2',
                startTime: new Date().toISOString(),
                workoutSeconds: 0,
                isWorkoutPaused: false,
                lastUpdate: new Date().toISOString(),
                exercises: []
            };

            const stats = getCompletionStats(emptyWorkout);
            expect(stats.totalSets).toBe(0);
            expect(stats.completedSets).toBe(0);
            expect(stats.completionPercentage).toBe(0);
        });
    });

    describe('isWorkoutStale', () => {
        const createWorkout = (hoursAgo: number, completedSetsCount: number, totalSetsCount: number): SavedWorkout => {
            const lastUpdate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
            const sets = [];
            for (let i = 0; i < totalSetsCount; i++) {
                sets.push({
                    type: 'working',
                    weight: '50',
                    reps: '10',
                    rpe: '8',
                    completed: i < completedSetsCount
                });
            }

            return {
                workoutId: 'w-test',
                startTime: new Date(Date.now() - ((hoursAgo + 1) * 60 * 60 * 1000)).toISOString(),
                workoutSeconds: 3600,
                isWorkoutPaused: false,
                lastUpdate,
                exercises: [
                    {
                        id: 'ex-1',
                        workout_item_id: 'wi-1',
                        name: 'Exercício Teste',
                        sets
                    }
                ]
            };
        };

        it('deve retornar false se a última atualização for recente (< 4 horas)', () => {
            const recentWorkout = createWorkout(2, 4, 5); // 2h atrás, 4/5 completas (80%)
            expect(isWorkoutStale(recentWorkout)).toBe(false);
        });

        it('deve retornar true se a última atualização for antiga (>= 4 horas) E atender requisitos (>= 3 séries e >= 60%)', () => {
            const staleWorkout = createWorkout(4.5, 3, 5); // 4.5h atrás, 3/5 completas (60%)
            expect(isWorkoutStale(staleWorkout)).toBe(true);
        });

        it('deve retornar false se for antiga mas NÃO atingir o mínimo de 3 séries', () => {
            const lowSetsWorkout = createWorkout(5, 2, 2); // 5h atrás, 2/2 completas (100% mas só 2 séries)
            expect(isWorkoutStale(lowSetsWorkout)).toBe(false);
        });

        it('deve retornar false se for antiga mas NÃO atingir 60% de completude', () => {
            const lowRatioWorkout = createWorkout(5, 3, 10); // 5h atrás, 3/10 completas (30% < 60%)
            expect(isWorkoutStale(lowRatioWorkout)).toBe(false);
        });

        it('deve retornar false se lastUpdate for inválida', () => {
            const invalidWorkout = createWorkout(5, 5, 5);
            invalidWorkout.lastUpdate = 'invalid-date';
            expect(isWorkoutStale(invalidWorkout)).toBe(false);
        });
    });
});
