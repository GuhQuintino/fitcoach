import { describe, it, expect } from 'vitest';
import {
    groupExerciseSessions,
    RawWorkoutLogWithSets,
} from './workoutHistoryGrouper';

describe('workoutHistoryGrouper utils', () => {
    it('deve retornar array vazio se os logs forem vazios ou indefinidos', () => {
        expect(groupExerciseSessions([], 'ex1')).toEqual([]);
        expect(groupExerciseSessions(null as any, 'ex1')).toEqual([]);
    });

    it('deve agrupar por sessão única (workout_logs.id) e NÃO mesclar treinos do mesmo dia', () => {
        // Cenário crítico: 2 treinos realizados no mesmo dia (ex: manhã e tarde)
        const mockLogs: RawWorkoutLogWithSets[] = [
            {
                id: 'log-sessao-tarde',
                finished_at: '2026-10-10T18:00:00Z',
                workout: { name: 'Treino B - Pernas' },
                set_logs: [
                    {
                        id: 'set-3',
                        exercise_id: 'leg-press',
                        weight_kg: 200,
                        reps_completed: 10,
                        set_type: 'working',
                        completed_at: '2026-10-10T18:15:00Z',
                    },
                ],
            },
            {
                id: 'log-sessao-manha',
                finished_at: '2026-10-10T08:00:00Z',
                workout: { name: 'Treino A - Peito' },
                set_logs: [
                    {
                        id: 'set-1',
                        exercise_id: 'leg-press',
                        weight_kg: 180,
                        reps_completed: 12,
                        set_type: 'working',
                        completed_at: '2026-10-10T08:10:00Z',
                    },
                    {
                        id: 'set-2',
                        exercise_id: 'leg-press',
                        weight_kg: 190,
                        reps_completed: 10,
                        set_type: 'working',
                        completed_at: '2026-10-10T08:14:00Z',
                    },
                ],
            },
        ];

        const result = groupExerciseSessions(mockLogs, 'leg-press');

        // Duas sessões distintas devem ser retornadas, e não uma mesclada
        expect(result).toHaveLength(2);

        expect(result[0].sessionId).toBe('log-sessao-tarde');
        expect(result[0].workoutName).toBe('Treino B - Pernas');
        expect(result[0].sets).toHaveLength(1);
        expect(result[0].sets[0].weight_kg).toBe(200);

        expect(result[1].sessionId).toBe('log-sessao-manha');
        expect(result[1].workoutName).toBe('Treino A - Peito');
        expect(result[1].sets).toHaveLength(2);
        expect(result[1].sets[0].weight_kg).toBe(180);
        expect(result[1].sets[1].weight_kg).toBe(190);
    });

    it('deve associar o feedback técnico específico do exercício na respectiva sessão', () => {
        const mockLogs: RawWorkoutLogWithSets[] = [
            {
                id: 'log-1',
                finished_at: '2026-10-10T10:00:00Z',
                workout: { name: 'Treino Superior' },
                set_logs: [
                    {
                        id: 's1',
                        exercise_id: 'supino',
                        weight_kg: 80,
                        reps_completed: 10,
                        set_type: 'working',
                    },
                ],
                exercise_feedback_logs: [
                    {
                        exercise_id: 'supino',
                        feedback_text: 'Senti desconforto leve no ombro esquerdo na última repetição.',
                    },
                    {
                        exercise_id: 'outro-exercicio',
                        feedback_text: 'Outro feedback que não deve aparecer aqui.',
                    },
                ],
            },
        ];

        const result = groupExerciseSessions(mockLogs, 'supino');
        expect(result).toHaveLength(1);
        expect(result[0].exerciseFeedback).toBe(
            'Senti desconforto leve no ombro esquerdo na última repetição.'
        );
    });

    it('deve ignorar logs que não contenham o exercício consultado', () => {
        const mockLogs: RawWorkoutLogWithSets[] = [
            {
                id: 'log-1',
                finished_at: '2026-10-10T10:00:00Z',
                workout: { name: 'Treino Costas' },
                set_logs: [
                    {
                        id: 's1',
                        exercise_id: 'puxada',
                        weight_kg: 60,
                        reps_completed: 10,
                    },
                ],
            },
        ];

        const result = groupExerciseSessions(mockLogs, 'supino');
        expect(result).toHaveLength(0);
    });

    it('deve preservar os metadados de séries especiais e métodos avançados nos sets agrupados', () => {
        const mockLogs: RawWorkoutLogWithSets[] = [
            {
                id: 'log-special-sets',
                finished_at: '2026-10-12T14:00:00Z',
                workout: { name: 'Treino Hipertrofia Avançado' },
                set_logs: [
                    {
                        id: 's-drop-1',
                        exercise_id: 'elevacao-lateral',
                        weight_kg: 14,
                        reps_completed: 10,
                        set_type: 'drop_set',
                        set_method: 'drop_set',
                        group_round: 1,
                        micro_set_index: 0,
                        execution_mode: 'bi_set',
                        tempo_used: '3-0-1-0',
                        timer_mode: 'stopwatch',
                        exercise: { exercise_type: 'weight' }
                    },
                    {
                        id: 's-drop-2',
                        exercise_id: 'elevacao-lateral',
                        weight_kg: 10,
                        reps_completed: 12,
                        set_type: 'drop_set',
                        set_method: 'drop_set',
                        group_round: 1,
                        micro_set_index: 1,
                        execution_mode: 'bi_set',
                        tempo_used: '3-0-1-0',
                        timer_mode: 'stopwatch',
                        exercise: { exercise_type: 'weight' }
                    }
                ]
            }
        ];

        const result = groupExerciseSessions(mockLogs, 'elevacao-lateral');
        expect(result).toHaveLength(1);
        expect(result[0].sets).toHaveLength(2);

        const set1 = result[0].sets[0];
        expect(set1.set_method).toBe('drop_set');
        expect(set1.group_round).toBe(1);
        expect(set1.micro_set_index).toBe(0);
        expect(set1.execution_mode).toBe('bi_set');
        expect(set1.tempo_used).toBe('3-0-1-0');
        expect(set1.timer_mode).toBe('stopwatch');

        const set2 = result[0].sets[1];
        expect(set2.set_method).toBe('drop_set');
        expect(set2.group_round).toBe(1);
        expect(set2.micro_set_index).toBe(1);
    });

    it('deve ordenar set_logs por set_order e micro_set_index mesmo quando completed_at é idêntico (caso legado do banco)', () => {
        const batchInsertedAt = '2026-10-15T20:45:00.000Z';
        const mockLogs: RawWorkoutLogWithSets[] = [
            {
                id: 'log-legado-ordem',
                started_at: '2026-10-15T20:00:00.000Z',
                finished_at: '2026-10-15T20:44:00.000Z',
                workout: { name: 'Treino A - Peito' },
                set_logs: [
                    {
                        id: 'set-order-2',
                        exercise_id: 'supino-reto',
                        set_order: 2,
                        weight_kg: 90,
                        reps_completed: 6,
                        completed_at: batchInsertedAt,
                    },
                    {
                        id: 'set-order-1-drop-2',
                        exercise_id: 'supino-reto',
                        set_order: 1,
                        micro_set_index: 2,
                        set_method: 'dropset',
                        set_type: 'drop',
                        weight_kg: 50,
                        reps_completed: 10,
                        completed_at: batchInsertedAt,
                    },
                    {
                        id: 'set-order-1-main',
                        exercise_id: 'supino-reto',
                        set_order: 1,
                        micro_set_index: null,
                        set_method: 'dropset',
                        set_type: 'working',
                        weight_kg: 80,
                        reps_completed: 8,
                        completed_at: batchInsertedAt,
                    },
                    {
                        id: 'set-order-1-drop-1',
                        exercise_id: 'supino-reto',
                        set_order: 1,
                        micro_set_index: 1,
                        set_method: 'dropset',
                        set_type: 'drop',
                        weight_kg: 65,
                        reps_completed: 8,
                        completed_at: batchInsertedAt,
                    },
                    {
                        id: 'set-order-0',
                        exercise_id: 'supino-reto',
                        set_order: 0,
                        weight_kg: 70,
                        reps_completed: 12,
                        completed_at: batchInsertedAt,
                    },
                ],
            },
        ];

        const result = groupExerciseSessions(mockLogs, 'supino-reto');
        expect(result).toHaveLength(1);
        expect(result[0].sets.map((s) => s.id)).toEqual([
            'set-order-0',
            'set-order-1-main',
            'set-order-1-drop-1',
            'set-order-1-drop-2',
            'set-order-2',
        ]);
        expect(result[0].sets.map((s) => s.set_order)).toEqual([0, 1, 1, 1, 2]);
    });

    it('deve preservar completed_at específico do exercício (hasPerExerciseTime = true) quando gravado durante o treino', () => {
        const mockLogs: RawWorkoutLogWithSets[] = [
            {
                id: 'log-real-per-set',
                started_at: '2026-10-16T18:00:00.000Z',
                finished_at: '2026-10-16T18:50:00.000Z',
                workout: { name: 'Treino B - Costas' },
                set_logs: [
                    {
                        id: 's-1',
                        exercise_id: 'remada-curvada',
                        set_order: 0,
                        weight_kg: 70,
                        reps_completed: 10,
                        completed_at: '2026-10-16T18:12:00.000Z',
                    },
                    {
                        id: 's-2',
                        exercise_id: 'remada-curvada',
                        set_order: 1,
                        weight_kg: 75,
                        reps_completed: 8,
                        completed_at: '2026-10-16T18:15:30.000Z',
                    },
                ],
            },
        ];

        const result = groupExerciseSessions(mockLogs, 'remada-curvada');
        expect(result).toHaveLength(1);
        expect(result[0].hasPerExerciseTime).toBe(true);
        expect(result[0].startedAt).toBe('2026-10-16T18:00:00.000Z');
        expect(result[0].finishedAt).toBe('2026-10-16T18:12:00.000Z');
    });

    it('deve fazer fallback para startedAt/finishedAt do workout_log (hasPerExerciseTime = false) em logs legados com DEFAULT now()', () => {
        const mockLogs: RawWorkoutLogWithSets[] = [
            {
                id: 'log-legado-default-now',
                started_at: '2026-10-16T18:00:00.000Z',
                finished_at: '2026-10-16T18:50:00.000Z',
                workout: { name: 'Treino C - Pernas' },
                set_logs: [
                    {
                        id: 's-legado-1',
                        exercise_id: 'agachamento',
                        set_order: 0,
                        weight_kg: 100,
                        reps_completed: 8,
                        // Simula DEFAULT now() no insert em lote > finished_at + 1000ms
                        completed_at: '2026-10-16T18:50:02.000Z',
                    },
                ],
            },
            {
                id: 'log-sem-completed-at',
                started_at: '2026-10-14T18:00:00.000Z',
                finished_at: '2026-10-14T18:45:00.000Z',
                workout: { name: 'Treino C - Pernas' },
                set_logs: [
                    {
                        id: 's-legado-2',
                        exercise_id: 'agachamento',
                        set_order: 0,
                        weight_kg: 95,
                        reps_completed: 8,
                        completed_at: null,
                    },
                ],
            },
        ];

        const result = groupExerciseSessions(mockLogs, 'agachamento');
        expect(result).toHaveLength(2);

        expect(result[0].sessionId).toBe('log-legado-default-now');
        expect(result[0].hasPerExerciseTime).toBe(false);
        expect(result[0].startedAt).toBe('2026-10-16T18:00:00.000Z');
        expect(result[0].finishedAt).toBe('2026-10-16T18:50:00.000Z');

        expect(result[1].sessionId).toBe('log-sem-completed-at');
        expect(result[1].hasPerExerciseTime).toBe(false);
        expect(result[1].startedAt).toBe('2026-10-14T18:00:00.000Z');
        expect(result[1].finishedAt).toBe('2026-10-14T18:45:00.000Z');
    });
});

