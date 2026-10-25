import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
    getActiveWorkout,
    setActiveWorkout,
    removeActiveWorkout,
    getUserActiveWorkoutKey
} from '../../utils/activeWorkoutStorage';
import {
    sanitizeEmail,
    sanitizePassword
} from '../../utils/authSanitizer';

describe('REGRESSION TEST: activeWorkoutAndAuthSafety', () => {
    // Mock do localStorage para ambiente Node/Vitest
    let store: Record<string, string> = {};

    beforeEach(() => {
        store = {};
        global.localStorage = {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, value: string) => {
                store[key] = String(value);
            },
            removeItem: (key: string) => {
                delete store[key];
            },
            clear: () => {
                store = {};
            },
            key: (index: number) => Object.keys(store)[index] ?? null,
            length: Object.keys(store).length
        } as Storage;
    });

    afterEach(() => {
        store = {};
    });

    describe('1. Isolamento de Treino em Andamento entre Usuários (activeWorkoutStorage)', () => {
        const userA = 'user-antigo-111';
        const userB = 'user-ana-paula-222';

        it('REGRESSÃO: Treino do User A nunca deve ser retornado para o User B', () => {
            const workoutDataA = {
                workoutId: 'w-treino-a',
                workoutSeconds: 1200,
                startTime: new Date().toISOString(),
                exercises: [{ id: 'ex-1', name: 'Agachamento Búlgaro' }]
            };

            // User A salva treino
            setActiveWorkout(userA, workoutDataA);

            // User B acessa a aplicação
            const workoutForB = getActiveWorkout(userB);
            expect(workoutForB).toBeNull();

            // User A continua tendo acesso ao seu treino
            const workoutForA = getActiveWorkout(userA);
            expect(workoutForA).not.toBeNull();
            expect(workoutForA?.workoutId).toBe('w-treino-a');
            expect(workoutForA?.userId).toBe(userA);
        });

        it('REGRESSÃO: Dados órfãos ou legados sem userId devem ser descartados e não vazar', () => {
            // Simula active_workout legado sem userId gravado por versão antiga
            const legacyData = {
                workoutId: 'w-legacy-orphan',
                workoutSeconds: 600,
                exercises: []
            };
            localStorage.setItem('active_workout', JSON.stringify(legacyData));

            // Qualquer usuário que logar não deve receber o treino órfão
            const result = getActiveWorkout(userB);
            expect(result).toBeNull();
            // E a chave legada órfã deve ter sido purgada
            expect(localStorage.getItem('active_workout')).toBeNull();
        });

        it('REGRESSÃO: removeActiveWorkout no logout do User A limpa suas chaves e protege novo login', () => {
            const workoutDataA = {
                workoutId: 'w-treino-a',
                workoutSeconds: 300,
                exercises: []
            };
            setActiveWorkout(userA, workoutDataA);

            // Confirma que existia
            expect(localStorage.getItem(getUserActiveWorkoutKey(userA))).not.toBeNull();

            // Executa logout do User A
            removeActiveWorkout(userA);

            // Chave do User A e global devem ter sido limpas
            expect(localStorage.getItem(getUserActiveWorkoutKey(userA))).toBeNull();
            expect(getActiveWorkout(userA)).toBeNull();
            expect(getActiveWorkout(userB)).toBeNull();
        });

        it('deve retornar null se userId for nulo ou indefinido', () => {
            expect(getActiveWorkout(null)).toBeNull();
            expect(getActiveWorkout(undefined)).toBeNull();
        });
    });

    describe('2. Sanitização de Credenciais no Login (authSanitizer)', () => {
        it('REGRESSÃO: Deve remover espaços e normalizar e-mail com letras maiúsculas de celulares', () => {
            const rawEmail = '   AnaPaulaSoaresDaSilva@Gmail.COM  \n';
            const clean = sanitizeEmail(rawEmail);
            expect(clean).toBe('anapaulasoaresdasilva@gmail.com');
        });

        it('REGRESSÃO: Deve remover espaços acidentais no início e fim da senha sem quebrar caracteres especiais', () => {
            const rawPassword = '   fit50872   ';
            const clean = sanitizePassword(rawPassword);
            expect(clean).toBe('fit50872');
        });

        it('deve tratar entradas nulas ou vazias graciosamente', () => {
            expect(sanitizeEmail('')).toBe('');
            expect(sanitizeEmail(undefined as unknown as string)).toBe('');
            expect(sanitizePassword('')).toBe('');
            expect(sanitizePassword(undefined as unknown as string)).toBe('');
        });
    });
});
