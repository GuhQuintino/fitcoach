import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    scheduleServiceWorkerRestNotification,
    cancelServiceWorkerRestNotification,
    triggerImmediateRestNotification,
    stopBackgroundTimerAudio
} from '../utils/restTimerAudioAndNotification';
import {
    probeInternetConnection,
    notifyNetworkError,
    notifyNetworkSuccess
} from '../utils/useOnlineStatus';

describe('REGRESSION TEST: Background Lifecycle, Rest Timer & Offline Stability', () => {

    describe('1. Matemática do +15s após Expiração em Segundo Plano (addTime Logic)', () => {
        /**
         * Simula a lógica de cálculo do addTime em WorkoutExecution.tsx
         */
        const calculateNewEndTime = (
            now: number,
            currentRestEndTime: number | null,
            addedSeconds: number
        ): { newEnd: number; timeLeft: number } => {
            if (!currentRestEndTime) {
                const newEnd = now + (addedSeconds * 1000);
                return { newEnd, timeLeft: addedSeconds };
            }

            const baseTime = addedSeconds > 0 ? Math.max(now, currentRestEndTime) : currentRestEndTime;
            const newEnd = Math.max(now, baseTime + (addedSeconds * 1000));
            const timeLeft = Math.max(0, Math.ceil((newEnd - now) / 1000));
            return { newEnd, timeLeft };
        };

        it('REGRESSÃO CORRIGIDA: deve adicionar 15s a partir de Date.now() se o cronômetro já tiver expirado no passado', () => {
            const now = 1700000000000;
            // Cronômetro terminou 25 segundos atrás enquanto a tela estava bloqueada
            const expiredRestEndTime = now - 25000;

            // BUG ANTERIOR:
            // const buggyEnd = expiredRestEndTime + (15 * 1000); // now - 10000
            // const buggyTimeLeft = Math.max(0, Math.ceil((buggyEnd - now) / 1000)); // 0s (zerado!)

            // LÓGICA CORRIGIDA:
            const { newEnd, timeLeft } = calculateNewEndTime(now, expiredRestEndTime, 15);

            expect(newEnd).toBe(now + 15000);
            expect(timeLeft).toBe(15);
        });

        it('deve somar 15s adicionais normalmente se o cronômetro ainda estiver em andamento', () => {
            const now = 1700000000000;
            // Restavam 20 segundos
            const activeRestEndTime = now + 20000;

            const { newEnd, timeLeft } = calculateNewEndTime(now, activeRestEndTime, 15);

            expect(newEnd).toBe(now + 35000);
            expect(timeLeft).toBe(35);
        });

        it('não deve permitir tempo negativo ao subtrair segundos além do tempo restante', () => {
            const now = 1700000000000;
            // Restavam 5 segundos e o aluno remove 15s
            const activeRestEndTime = now + 5000;

            const { newEnd, timeLeft } = calculateNewEndTime(now, activeRestEndTime, -15);

            expect(newEnd).toBe(now);
            expect(timeLeft).toBe(0);
        });
    });

    describe('2. Notificações Nativas via Service Worker (Compatibilidade Android & Background)', () => {
        let mockPostMessage: any;
        let mockShowNotification: any;
        let mockGetNotifications: any;
        let mockNotificationClose: any;

        beforeEach(() => {
            mockPostMessage = vi.fn();
            mockShowNotification = vi.fn().mockResolvedValue(undefined);
            mockNotificationClose = vi.fn();
            mockGetNotifications = vi.fn().mockResolvedValue([
                { tag: 'fitcoach-rest-timer', close: mockNotificationClose }
            ]);

            // Mock do ServiceWorkerRegistration e navigator
            const mockServiceWorker = {
                ready: Promise.resolve({
                    active: { postMessage: mockPostMessage },
                    showNotification: mockShowNotification,
                    getNotifications: mockGetNotifications
                })
            };

            Object.defineProperty(globalThis, 'navigator', {
                value: {
                    serviceWorker: mockServiceWorker,
                    onLine: true,
                    vibrate: vi.fn()
                },
                configurable: true,
                writable: true
            });

            // Mock de Notification API sem suporte a construtor (como no Android Chrome)
            (globalThis as any).Notification = {
                permission: 'granted',
                requestPermission: vi.fn().mockResolvedValue('granted')
            };

            // Mock de window
            (globalThis as any).window = {
                Notification: (globalThis as any).Notification,
                location: { pathname: '/student/workout/test-id' }
            };
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('deve agendar notificação enviando SCHEDULE_REST_TIMER para o Service Worker com timestamp correto', async () => {
            const endTime = Date.now() + 45000;
            await scheduleServiceWorkerRestNotification(endTime, 'Série 2 - Supino');

            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'SCHEDULE_REST_TIMER',
                    endTime,
                    title: 'FitCoach Pro — Descanso Finalizado! 💪',
                    body: 'Série 2 - Supino concluído! Hora de iniciar a próxima série.',
                    url: '/student/workout/test-id'
                })
            );
        });

        it('deve cancelar agendamento e fechar notificações existentes ao chamar cancelServiceWorkerRestNotification', async () => {
            await cancelServiceWorkerRestNotification();

            expect(mockPostMessage).toHaveBeenCalledWith({ type: 'CANCEL_REST_TIMER' });
            expect(mockGetNotifications).toHaveBeenCalledWith({ tag: 'fitcoach-rest-timer' });
            expect(mockNotificationClose).toHaveBeenCalled();
        });

        it('deve disparar notificação imediata via ServiceWorkerRegistration.showNotification no Android sem erro de Illegal constructor', async () => {
            await triggerImmediateRestNotification('Descanso');

            expect(mockShowNotification).toHaveBeenCalledWith(
                'FitCoach Pro — Descanso Finalizado! 💪',
                expect.objectContaining({
                    body: 'Descanso concluído! Hora da próxima série.',
                    tag: 'fitcoach-rest-timer',
                    renotify: true,
                    vibrate: [300, 120, 300, 120, 450]
                })
            );
        });
    });

    describe('3. Resiliência de Conectividade e Singleton In-Flight (probeInternetConnection)', () => {
        let originalFetch: any;

        beforeEach(() => {
            originalFetch = globalThis.fetch;
        });

        afterEach(() => {
            globalThis.fetch = originalFetch;
            vi.restoreAllMocks();
        });

        it('deve deduplicar chamadas concorrentes usando o mesmo inFlightProbe singleton', async () => {
            let fetchCount = 0;
            globalThis.fetch = vi.fn().mockImplementation(() => {
                fetchCount++;
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(new Response(null, { status: 200 }));
                    }, 50);
                });
            });

            // Dispara 3 probes simultâneos
            const [p1, p2, p3] = await Promise.all([
                probeInternetConnection(),
                probeInternetConnection(),
                probeInternetConnection()
            ]);

            expect(p1).toBe(true);
            expect(p2).toBe(true);
            expect(p3).toBe(true);
            // Deve ter disparado apenas uma requisição de rede real!
            expect(fetchCount).toBe(1);
        });

        it('deve realizar retentativa com grace period antes de declarar offline quando navigator.onLine for true', async () => {
            let attempt = 0;
            globalThis.fetch = vi.fn().mockImplementation(() => {
                attempt++;
                if (attempt === 1) {
                    // Primeira tentativa falha simulando socket TLS acordando após desbloqueio
                    return Promise.reject(new Error('Network socket disconnected'));
                }
                // Segunda tentativa tem sucesso após reconexão
                return Promise.resolve(new Response(null, { status: 200 }));
            });

            const isOnline = await probeInternetConnection();

            expect(attempt).toBe(2);
            expect(isOnline).toBe(true);
        });
    });

    describe('4. Estabilidade de Referência do Usuário (Anti-Reload pós-Desbloqueio)', () => {
        it('deve preservar rigorosamente a mesma referência de memória quando o id do usuário não se altera', () => {
            const initialUser = { id: 'usr_123', email: 'aluno@fitcoach.com', role: 'student' };
            // Simula um novo objeto gerado pelo Supabase onAuthStateChange (TOKEN_REFRESHED)
            const refreshedUser = { id: 'usr_123', email: 'aluno@fitcoach.com', role: 'student' };

            // Verificação: são objetos com ponteiros diferentes na memória
            expect(initialUser).not.toBe(refreshedUser);

            // Função estabilizadora implementada no AuthContext:
            const stabilizeUser = (prev: any, next: any) => {
                return (prev && next && prev.id === next.id) ? prev : next;
            };

            const result = stabilizeUser(initialUser, refreshedUser);

            // A referência retornada deve ser EXATAMENTE a mesma da instância anterior
            expect(result).toBe(initialUser);
        });

        it('deve atualizar a referência se o usuário realmente mudou (troca de conta)', () => {
            const userA = { id: 'usr_123', email: 'alunoA@fitcoach.com' };
            const userB = { id: 'usr_456', email: 'alunoB@fitcoach.com' };

            const stabilizeUser = (prev: any, next: any) => {
                return (prev && next && prev.id === next.id) ? prev : next;
            };

            const result = stabilizeUser(userA, userB);
            expect(result).toBe(userB);
        });
    });
});
