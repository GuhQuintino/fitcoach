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
});

