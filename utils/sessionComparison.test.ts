import { describe, it, expect } from 'vitest';
import {
    calculateSessionVolume,
    getBestSet,
    compareSessions,
    SetLogItem,
} from './sessionComparison';

describe('sessionComparison utils', () => {
    describe('calculateSessionVolume', () => {
        it('deve retornar 0 para lista vazia ou nula', () => {
            expect(calculateSessionVolume([])).toBe(0);
            // @ts-expect-error teste com tipo nulo
            expect(calculateSessionVolume(null)).toBe(0);
        });

        it('deve somar o volume de séries normais (weight_kg * reps_completed)', () => {
            const sets: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: 50, reps_completed: 10, set_type: 'working' },
                { exercise_id: 'ex1', weight_kg: 60, reps_completed: 8, set_type: 'working' },
            ];
            // (50 * 10) + (60 * 8) = 500 + 480 = 980
            expect(calculateSessionVolume(sets)).toBe(980);
        });

        it('deve ignorar séries de aquecimento (warmup) e preparatórias (preparation)', () => {
            const sets: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: 20, reps_completed: 15, set_type: 'warmup' },
                { exercise_id: 'ex1', weight_kg: 40, reps_completed: 5, set_type: 'preparation' },
                { exercise_id: 'ex1', weight_kg: 80, reps_completed: 6, set_type: 'working' },
                { exercise_id: 'ex1', weight_kg: 70, reps_completed: 8, set_type: 'failure' },
                { exercise_id: 'ex1', weight_kg: 60, reps_completed: 10, set_type: 'drop' },
            ];
            // Apenas 80*6 (480) + 70*8 (560) + 60*10 (600) = 1640
            expect(calculateSessionVolume(sets)).toBe(1640);
        });

        it('deve ignorar valores nulos, negativos ou inválidos', () => {
            const sets: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: null, reps_completed: 10, set_type: 'working' },
                { exercise_id: 'ex1', weight_kg: 50, reps_completed: null, set_type: 'working' },
                { exercise_id: 'ex1', weight_kg: 0, reps_completed: 10, set_type: 'working' },
                { exercise_id: 'ex1', weight_kg: 50, reps_completed: 10, set_type: 'working' },
            ];
            expect(calculateSessionVolume(sets)).toBe(500);
        });
    });

    describe('getBestSet', () => {
        it('deve selecionar a série com maior carga para musculação, desempatando por repetições', () => {
            const sets: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: 80, reps_completed: 8, set_type: 'working' },
                { exercise_id: 'ex1', weight_kg: 100, reps_completed: 5, set_type: 'working' },
                { exercise_id: 'ex1', weight_kg: 100, reps_completed: 6, set_type: 'working' },
            ];
            const best = getBestSet(sets, 'weight');
            expect(best).toBeDefined();
            expect(best?.weight_kg).toBe(100);
            expect(best?.reps_completed).toBe(6);
        });

        it('deve priorizar working sets sobre warmup quando houver ambos', () => {
            const sets: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: 120, reps_completed: 10, set_type: 'warmup' },
                { exercise_id: 'ex1', weight_kg: 100, reps_completed: 5, set_type: 'working' },
            ];
            const best = getBestSet(sets, 'weight');
            expect(best?.weight_kg).toBe(100);
        });

        it('deve selecionar a série com maior tempo para exercícios isométricos (time)', () => {
            const sets: SetLogItem[] = [
                { exercise_id: 'ex_time', time_completed: 45, weight_kg: 0, set_type: 'working' },
                { exercise_id: 'ex_time', time_completed: 60, weight_kg: 0, set_type: 'working' },
                { exercise_id: 'ex_time', time_completed: 30, weight_kg: 0, set_type: 'working' },
            ];
            const best = getBestSet(sets, 'time');
            expect(best?.time_completed).toBe(60);
        });

        it('deve selecionar a série com maior distância para cardio', () => {
            const sets: SetLogItem[] = [
                { exercise_id: 'cardio1', distance_completed: 2.5, time_completed: 900, set_type: 'working' },
                { exercise_id: 'cardio1', distance_completed: 5.0, time_completed: 1800, set_type: 'working' },
            ];
            const best = getBestSet(sets, 'cardio');
            expect(best?.distance_completed).toBe(5.0);
        });
    });

    describe('compareSessions', () => {
        it('deve retornar isFirstTime: true quando não houver sessão anterior', () => {
            const current: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: 80, reps_completed: 10, set_type: 'working' },
            ];
            const result = compareSessions(current, null);
            expect(result.isFirstTime).toBe(true);
            expect(result.currentVolume).toBe(800);
            expect(result.previousVolume).toBe(0);
            expect(result.volumeDeltaPct).toBeNull();
        });

        it('deve calcular aumento percentual de volume e deltas de melhor série', () => {
            const previous: SetLogItem[] = [
                { exercise_id: 'supino', weight_kg: 80, reps_completed: 10, set_type: 'working', exercise: { name: 'Supino Reto', exercise_type: 'weight' } },
            ];
            const current: SetLogItem[] = [
                { exercise_id: 'supino', weight_kg: 85, reps_completed: 10, set_type: 'working', exercise: { name: 'Supino Reto', exercise_type: 'weight' } },
            ];

            const result = compareSessions(current, previous);
            expect(result.isFirstTime).toBe(false);
            expect(result.currentVolume).toBe(850);
            expect(result.previousVolume).toBe(800);
            // (850 - 800) / 800 = 50 / 800 = 6.25% -> 6.3%
            expect(result.volumeDeltaPct).toBe(6.3);

            const supinoDelta = result.exerciseDeltas['supino'];
            expect(supinoDelta).toBeDefined();
            expect(supinoDelta.status).toBe('increase');
            expect(supinoDelta.deltaWeight).toBe(5);
            expect(supinoDelta.label).toContain('+5kg');
        });

        it('deve calcular aumento de repetições mantendo a mesma carga', () => {
            const previous: SetLogItem[] = [
                { exercise_id: 'agacho', weight_kg: 100, reps_completed: 8, set_type: 'working', exercise: { name: 'Agachamento', exercise_type: 'weight' } },
            ];
            const current: SetLogItem[] = [
                { exercise_id: 'agacho', weight_kg: 100, reps_completed: 10, set_type: 'working', exercise: { name: 'Agachamento', exercise_type: 'weight' } },
            ];

            const result = compareSessions(current, previous);
            const agachoDelta = result.exerciseDeltas['agacho'];
            expect(agachoDelta.status).toBe('increase');
            expect(agachoDelta.deltaWeight).toBe(0);
            expect(agachoDelta.deltaReps).toBe(2);
            expect(agachoDelta.label).toBe('+2 reps');
        });

        it('deve identificar exercício novo não presente na sessão anterior', () => {
            const previous: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: 50, reps_completed: 10, set_type: 'working' },
            ];
            const current: SetLogItem[] = [
                { exercise_id: 'ex1', weight_kg: 50, reps_completed: 10, set_type: 'working' },
                { exercise_id: 'ex_novo', weight_kg: 30, reps_completed: 12, set_type: 'working', exercise: { name: 'Rosca Martelo', exercise_type: 'weight' } },
            ];

            const result = compareSessions(current, previous);
            expect(result.exerciseDeltas['ex_novo']?.isNewExercise).toBe(true);
            expect(result.exerciseDeltas['ex_novo']?.label).toBe('Novo');
        });

        it('deve comparar exercícios de cardio por distância', () => {
            const previous: SetLogItem[] = [
                { exercise_id: 'esteira', distance_completed: 3.0, time_completed: 1200, set_type: 'working', exercise: { name: 'Esteira', exercise_type: 'cardio' } },
            ];
            const current: SetLogItem[] = [
                { exercise_id: 'esteira', distance_completed: 3.5, time_completed: 1200, set_type: 'working', exercise: { name: 'Esteira', exercise_type: 'cardio' } },
            ];

            const result = compareSessions(current, previous);
            const delta = result.exerciseDeltas['esteira'];
            expect(delta.status).toBe('increase');
            expect(delta.deltaDistance).toBe(0.5);
            expect(delta.label).toBe('+0.5km');
        });
    });
});
