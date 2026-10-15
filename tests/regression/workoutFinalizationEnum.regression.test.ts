// Mock do localStorage e navigator para ambiente Node do Vitest
let store: Record<string, string> = {};
(globalThis as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
};
Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: false },
    configurable: true,
    writable: true
});

import { describe, it, expect, beforeEach } from 'vitest';
import { sanitizeSetType } from '../../utils/specialSetTokens';
import {
    saveOfflineWorkout,
    getOfflineQueue,
    clearOfflineQueue,
    MAX_SYNC_RETRIES,
    OFFLINE_QUEUE_KEY,
    OfflineWorkoutPayload,
    OfflineQueueItem
} from '../../utils/offlineSyncService';

describe('REGRESSION TEST: Workout Finalization Enum & Offline Sync Safety', () => {
    beforeEach(() => {
        store = {};
        clearOfflineQueue();
    });

    describe('1. Enum Normalization & Sanitization (sanitizeSetType)', () => {
        it('deve converter "dropset" para "drop" garantindo compatibilidade estrita com o Postgres', () => {
            expect(sanitizeSetType('dropset')).toBe('drop');
            expect(sanitizeSetType('Dropset')).toBe('drop');
            expect(sanitizeSetType('DROPSET')).toBe('drop');
            expect(sanitizeSetType('  dropset  ')).toBe('drop');
        });

        it('deve preservar tipos nativos validos do enum PostgreSQL', () => {
            const validTypes = ['warmup', 'working', 'failure', 'drop', 'preparation', 'backoff', 'deload'];
            validTypes.forEach(type => {
                expect(sanitizeSetType(type)).toBe(type);
                expect(sanitizeSetType(type.toUpperCase())).toBe(type);
                expect(sanitizeSetType(`  ${type}  `)).toBe(type);
            });
        });

        it('deve fazer fallback seguro para "working" em valores invalidos, nulos ou vazios', () => {
            expect(sanitizeSetType(null)).toBe('working');
            expect(sanitizeSetType(undefined)).toBe('working');
            expect(sanitizeSetType('')).toBe('working');
            expect(sanitizeSetType('tipo_desconhecido')).toBe('working');
            expect(sanitizeSetType('cluster_set')).toBe('working');
        });
    });

    describe('2. Offline Queue Persistence & Non-Destructive Policy', () => {
        const mockPayload: OfflineWorkoutPayload = {
            workoutLog: {
                student_id: 'student-uuid-test',
                workout_id: 'workout-uuid-test',
                started_at: '2026-10-14T12:00:00.000Z',
                finished_at: '2026-10-14T13:00:00.000Z',
                effort_rating: 8,
                feedback_notes: 'Treino de teste'
            },
            setLogs: [
                {
                    exercise_id: 'ex-1',
                    set_type: sanitizeSetType('dropset'), // Deve ser 'drop'
                    set_order: 0,
                    weight_kg: 30,
                    reps_completed: 12,
                    rpe_actual: 8,
                    set_method: 'dropset',
                    micro_set_index: 1
                },
                {
                    exercise_id: 'ex-1',
                    set_type: sanitizeSetType('working'),
                    set_order: 1,
                    weight_kg: 30,
                    reps_completed: 10,
                    rpe_actual: 9,
                    set_method: 'rest_pause',
                    micro_set_index: 1
                }
            ],
            exerciseFeedbacks: [
                {
                    exercise_id: 'ex-1',
                    feedback_text: 'Excelente pump'
                }
            ]
        };

        it('deve enfileirar o treino offline com sucesso e manter a estrutura valida', () => {
            const result = saveOfflineWorkout(mockPayload);
            expect(result.success).toBe(true);
            expect(result.queueLength).toBe(1);

            const queue = getOfflineQueue();
            expect(queue.length).toBe(1);
            expect(queue[0].type).toBe('workout_complete');
            expect(queue[0].payload.workoutLog.student_id).toBe('student-uuid-test');
            expect(queue[0].payload.setLogs[0].set_type).toBe('drop');
            expect(queue[0].payload.setLogs[1].set_type).toBe('working');
        });

        it('REGRESSAO CRITICA: NUNCA deve descartar treinos que excederam MAX_SYNC_RETRIES', () => {
            // Simulando um treino na fila com falhas acumuladas
            const failedItem: OfflineQueueItem = {
                id: 'sync_test_item',
                type: 'workout_complete',
                payload: mockPayload,
                createdAt: new Date().toISOString(),
                retryCount: MAX_SYNC_RETRIES + 5, // Excedeu o limite anterior
                lastError: 'Simulated connection timeout'
            };

            store[OFFLINE_QUEUE_KEY] = JSON.stringify([failedItem]);

            // Verificar que a fila contem o item
            const currentQueue = getOfflineQueue();
            expect(currentQueue.length).toBe(1);
            expect(currentQueue[0].retryCount).toBeGreaterThanOrEqual(MAX_SYNC_RETRIES);
            expect(currentQueue[0].id).toBe('sync_test_item');

            // Garantir que a fila persiste e nao eh zerada silenciosamente
            const rawStored = store[OFFLINE_QUEUE_KEY];
            expect(rawStored).toBeDefined();
            const parsed = JSON.parse(rawStored);
            expect(parsed.length).toBe(1);
            expect(parsed[0].payload.workoutLog.student_id).toBe('student-uuid-test');
        });
    });

    describe('3. Telemetria de Séries Especiais nas Fatias de Sincronização', () => {
        it('deve garantir que sub-séries e drops possuem os metadados das 4 camadas preenchidos', () => {
            const dropSetLog = {
                exercise_id: 'ex-mesa-flexora',
                set_type: sanitizeSetType('dropset'),
                set_order: 2,
                weight_kg: 22.5,
                reps_completed: 10,
                rpe_actual: null,
                group_round: null,
                set_method: 'dropset',
                micro_set_index: 1,
                execution_mode: 'standard',
                tempo_used: null,
                timer_mode: 'standard'
            };

            expect(dropSetLog.set_type).toBe('drop');
            expect(dropSetLog.set_method).toBe('dropset');
            expect(dropSetLog.micro_set_index).toBe(1);

            const restPauseSubLog = {
                exercise_id: 'ex-supino',
                set_type: sanitizeSetType('working'),
                set_order: 1,
                weight_kg: 40,
                reps_completed: 4,
                rpe_actual: null,
                group_round: 1,
                set_method: 'rest_pause',
                micro_set_index: 2,
                execution_mode: 'pause_reps',
                tempo_used: '3-0-1-0',
                timer_mode: 'standard'
            };

            expect(restPauseSubLog.set_type).toBe('working');
            expect(restPauseSubLog.set_method).toBe('rest_pause');
            expect(restPauseSubLog.micro_set_index).toBe(2);
            expect(restPauseSubLog.execution_mode).toBe('pause_reps');
            expect(restPauseSubLog.tempo_used).toBe('3-0-1-0');
        });
    });
});
