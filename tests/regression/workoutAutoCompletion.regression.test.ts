import { describe, expect, it } from 'vitest';
import { createCompletionTransition, isWorkoutComplete } from '../../utils/workoutCompletion';

describe('conclusão automática com intensificações', () => {
    it('não conclui treino vazio ou exercício sem séries', () => {
        expect(isWorkoutComplete([])).toBe(false);
        expect(isWorkoutComplete([{ sets: [] }])).toBe(false);
    });
    it('aguarda todas as séries de todos exercícios, inclusive tempo e HIIT', () => {
        const workout = [{ sets: [{ completed: true }] }, { sets: [{ completed: false }] }];
        expect(isWorkoutComplete(workout)).toBe(false);
        workout[1].sets[0].completed = true;
        expect(isWorkoutComplete(workout)).toBe(true);
    });
    it('não confunde série mãe com drops completos', () => {
        const set = { completed: true, set_method: 'dropset', drop_count: 2, drops: [{ completed: true }, { completed: false }] };
        expect(isWorkoutComplete([{ sets: [set] }])).toBe(false);
        set.drops[1].completed = true;
        expect(isWorkoutComplete([{ sets: [set] }])).toBe(true);
        expect(isWorkoutComplete([{ sets: [{ ...set, completed: false }] }])).toBe(false);
        expect(isWorkoutComplete([{ sets: [{ ...set, drops: [] }] }])).toBe(false);
    });
    for (const [method, count] of [['rest_pause', 2], ['cluster', 3], ['myo_reps', 3], ['muscle_round', 6], ['method_3_7', 5]] as const) {
        it(`aguarda todas as sub-séries de ${method}`, () => {
            const set = { completed: true, set_method: method, sub_sets_records: Array.from({ length: count }, () => ({ completed: true })) };
            expect(isWorkoutComplete([{ sets: [set] }])).toBe(true);
            set.sub_sets_records[count - 1].completed = false;
            expect(isWorkoutComplete([{ sets: [set] }])).toBe(false);
            expect(isWorkoutComplete([{ sets: [{ ...set, sub_sets_records: undefined }] }])).toBe(false);
        });
    }
    it('abre uma vez por transição, sem reabrir ao cancelar, e permite refazer série', () => {
        const update = createCompletionTransition();
        expect(update('a', false, false)).toBe(false);
        expect(update('a', false, true)).toBe(false);
        expect(update('a', true, true)).toBe(true);
        expect(update('a', true, true)).toBe(false);
        expect(update('a', true, true)).toBe(false);
        expect(update('a', false, true)).toBe(false);
        expect(update('a', true, true)).toBe(true);
    });
    it('restauração completa abre só depois de carregar e reseta ao trocar treino', () => {
        const update = createCompletionTransition();
        expect(update('a', true, false)).toBe(false);
        expect(update('a', true, true)).toBe(true);
        expect(update('a', true, true)).toBe(false);
        expect(update('b', true, true)).toBe(true);
    });
});
