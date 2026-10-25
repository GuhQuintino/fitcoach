import { describe, it, expect } from 'vitest';
import {
    parseTimeToMinutes,
    formatTimeMinutes,
    isTimeInQuietHours,
    inferTrainingHabits,
    checkProfileCompleteness,
    evaluateNotificationEligibility
} from '../../utils/workoutHabitAnalyzer';
import { NotificationPreferences } from '../../types/notifications';

describe('workoutHabitAnalyzer - Motor de Inferência e Anti-Spam', () => {
    const basePreferences: NotificationPreferences = {
        push: true,
        email: false,
        reminders: true,
        evolution_photos: true,
        plan_expiration: true,
        quiet_hours_start: '21:30',
        quiet_hours_end: '07:30',
        preferred_training_time: null
    };

    describe('1. Utilitários de Tempo e Quiet Hours', () => {
        it('deve converter "HH:mm" para minutos e vice-versa corretamente', () => {
            expect(parseTimeToMinutes('00:00')).toBe(0);
            expect(parseTimeToMinutes('07:30')).toBe(450);
            expect(parseTimeToMinutes('16:30')).toBe(990);
            expect(parseTimeToMinutes('21:30')).toBe(1290);
            expect(parseTimeToMinutes('23:59')).toBe(1439);

            expect(formatTimeMinutes(0)).toBe('00:00');
            expect(formatTimeMinutes(450)).toBe('07:30');
            expect(formatTimeMinutes(990)).toBe('16:30');
            expect(formatTimeMinutes(1290)).toBe('21:30');
        });

        it('deve identificar corretamente se horário está dentro de Quiet Hours (atravessando meia-noite)', () => {
            // Quiet hours padrão: 21:30 às 07:30
            expect(isTimeInQuietHours('22:00', '21:30', '07:30')).toBe(true);
            expect(isTimeInQuietHours('23:59', '21:30', '07:30')).toBe(true);
            expect(isTimeInQuietHours('00:05', '21:30', '07:30')).toBe(true);
            expect(isTimeInQuietHours('07:15', '21:30', '07:30')).toBe(true);

            // Fora de quiet hours
            expect(isTimeInQuietHours('07:30', '21:30', '07:30')).toBe(false);
            expect(isTimeInQuietHours('10:00', '21:30', '07:30')).toBe(false);
            expect(isTimeInQuietHours('16:30', '21:30', '07:30')).toBe(false);
            expect(isTimeInQuietHours('21:00', '21:30', '07:30')).toBe(false);
        });

        it('deve lidar com Quiet Hours configurado no mesmo dia', () => {
            // Exemplo: 01:00 às 06:00
            expect(isTimeInQuietHours('03:30', '01:00', '06:00')).toBe(true);
            expect(isTimeInQuietHours('07:00', '01:00', '06:00')).toBe(false);
        });
    });

    describe('2. Inferência de Hábito de Treino (inferTrainingHabits)', () => {
        it('deve respeitar override manual fixado pelo usuário nas configurações', () => {
            const logs = [
                { started_at: '2026-10-01T08:00:00Z' },
                { started_at: '2026-10-03T08:00:00Z' },
                { started_at: '2026-10-05T08:00:00Z' }
            ];
            const result = inferTrainingHabits(logs, '19:45');
            expect(result.medianTime).toBe('19:45');
            expect(result.isCustomOverride).toBe(true);
            expect(result.confidence).toBe('high');
        });

        it('deve retornar Cold Start para alunos novos com menos de 3 treinos', () => {
            // Zero treinos
            const zeroResult = inferTrainingHabits([]);
            expect(zeroResult.confidence).toBe('cold_start');
            expect(zeroResult.medianTime).toBe('16:30');
            expect(zeroResult.habitualDays).toEqual([1, 3, 5]);

            // 2 treinos
            const twoLogs = [
                { started_at: '2026-10-10T10:00:00' },
                { started_at: '2026-10-12T10:00:00' }
            ];
            const twoResult = inferTrainingHabits(twoLogs);
            expect(twoResult.confidence).toBe('cold_start');
            expect(twoResult.medianTime).toBe('16:30');
        });

        it('deve calcular horário mediano imune a outliers para alunos com >= 3 treinos', () => {
            // Aluno que treina predominantemente às 18:30, mas teve 1 treino às 07:00 em feriado
            const logs = [
                { started_at: '2026-10-05T18:25:00' }, // Seg
                { started_at: '2026-10-07T18:30:00' }, // Qua
                { started_at: '2026-10-09T18:35:00' }, // Sex
                { started_at: '2026-10-12T07:00:00' }, // Seg feriado (outlier)
                { started_at: '2026-10-14T18:30:00' }  // Qua
            ];

            const result = inferTrainingHabits(logs);
            // Ordenados: 07:00 (420), 18:25 (1105), 18:30 (1110), 18:30 (1110), 18:35 (1115)
            // Elemento central (índice 2) = 1110 min = 18:30
            expect(result.medianTime).toBe('18:30');
            expect(result.confidence).toBe('medium');
            expect(result.isCustomOverride).toBe(false);
            expect(result.totalWorkouts).toBe(5);
        });

        it('deve conferir alta confiança (confidence: "high") para histórico com >= 8 treinos', () => {
            const logs = Array.from({ length: 9 }).map((_, i) => ({
                started_at: `2026-10-${String(10 + i).padStart(2, '0')}T17:00:00`
            }));
            const result = inferTrainingHabits(logs);
            expect(result.confidence).toBe('high');
            expect(result.medianTime).toBe('17:00');
        });
    });

    describe('3. Validação de Completude de Perfil (checkProfileCompleteness)', () => {
        it('deve indicar perfil completo quando todos os 4 campos essenciais estão preenchidos', () => {
            const profile = { avatar_url: 'https://example.com/avatar.jpg' };
            const studentData = {
                weight_kg: 78.5,
                birth_date: '1995-04-12',
                height_cm: 180
            };

            const result = checkProfileCompleteness(profile, studentData);
            expect(result.isComplete).toBe(true);
            expect(result.missingFields).toHaveLength(0);
            expect(result.completionPercentage).toBe(100);
        });

        it('deve listar campos faltantes e calcular percentual quando incompleto', () => {
            const profile = { avatar_url: null };
            const studentData = {
                weight_kg: null,
                birth_date: null,
                height_cm: 175 // apenas altura preenchida (1 de 4 = 25%)
            };

            const result = checkProfileCompleteness(profile, studentData);
            expect(result.isComplete).toBe(false);
            expect(result.missingFields).toEqual(['avatar_url', 'weight_kg', 'birth_date']);
            expect(result.completionPercentage).toBe(25);
        });

        it('deve aceitar age numérico válido como substituto de birth_date', () => {
            const profile = { avatar_url: 'https://img.com/a.png' };
            const studentData = {
                weight_kg: 82,
                age: 29,
                height_cm: 182
            };

            const result = checkProfileCompleteness(profile, studentData);
            expect(result.isComplete).toBe(true);
            expect(result.missingFields).toHaveLength(0);
            expect(result.completionPercentage).toBe(100);
        });
    });

    describe('4. Escudos Anti-Spam e Políticas de Disparo (evaluateNotificationEligibility)', () => {
        const createDate = (hours: number, minutes: number, dayOfWeek?: number) => {
            const d = new Date(2026, 9, 21, hours, minutes); // 21 Out 2026 é Quarta-feira (3)
            if (dayOfWeek !== undefined) {
                const currentDay = d.getDay();
                d.setDate(d.getDate() + (dayOfWeek - currentDay));
            }
            return d;
        };

        it('Escudo 1: Não deve enviar lembrete se o aluno já treinou hoje', () => {
            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: createDate(18, 0),
                preferences: basePreferences,
                hasTrainedToday: true,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 1,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 10
            });

            expect(result.canSend).toBe(false);
            expect(result.reason).toBe('TRAINED_TODAY');
        });

        it('Escudo 2: Não deve ultrapassar o teto diário de 1 notificação por aluno', () => {
            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: createDate(18, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 1, // já recebeu uma hoje
                weeklyRemindersCount: 1,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 10
            });

            expect(result.canSend).toBe(false);
            expect(result.reason).toBe('DAILY_CAP_REACHED');
        });

        it('Escudo 2b: Não deve ultrapassar o teto semanal de 3 lembretes de treino', () => {
            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: createDate(18, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 3, // já atingiu o teto da semana
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 10
            });

            expect(result.canSend).toBe(false);
            expect(result.reason).toBe('WEEKLY_CAP_REACHED');
        });

        it('Escudo 3: Deve acionar backoff de 5 dias após 2 lembretes seguidos ignorados', () => {
            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: createDate(18, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 2,
                consecutiveIgnoredCount: 2,
                daysSinceLastIgnored: 3 // menos de 5 dias
            });

            expect(result.canSend).toBe(false);
            expect(result.reason).toBe('BACKOFF_PAUSED');
        });

        it('Escudo 3: Deve liberar o envio após 5 dias de silêncio do backoff', () => {
            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: createDate(18, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 2,
                consecutiveIgnoredCount: 2,
                daysSinceLastIgnored: 5 // completou 5 dias
            });

            expect(result.canSend).toBe(true);
        });

        it('Escudo 4: Não deve enviar durante Quiet Hours (21:30 às 07:30)', () => {
            const lateNight = createDate(22, 15);
            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: lateNight,
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 1,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 10
            });

            expect(result.canSend).toBe(false);
            expect(result.reason).toBe('QUIET_HOURS');
        });

        it('deve respeitar opt-out do usuário para o tópico específico ou geral', () => {
            const disabledReminders: NotificationPreferences = {
                ...basePreferences,
                reminders: false
            };

            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: createDate(18, 0),
                preferences: disabledReminders,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 1,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 10
            });

            expect(result.canSend).toBe(false);
            expect(result.reason).toBe('TOPIC_DISABLED');
        });

        it('deve aplicar regras anti-spam em lembretes de Onboarding (Perfil Incompleto)', () => {
            // Perfil já completo: não envia
            const completeResult = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'onboarding_profile',
                currentTime: createDate(15, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 0,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 0,
                isProfileComplete: true
            });
            expect(completeResult.canSend).toBe(false);
            expect(completeResult.reason).toBe('ONBOARDING_ALREADY_COMPLETED');

            // 1º envio para perfil incompleto: permite
            const firstResult = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'onboarding_profile',
                currentTime: createDate(15, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 0,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 0,
                isProfileComplete: false,
                previousOnboardingCount: 0
            });
            expect(firstResult.canSend).toBe(true);

            // Reforço antes de 4 dias: bloqueia
            const earlyFollowup = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'onboarding_profile',
                currentTime: createDate(15, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 0,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 0,
                isProfileComplete: false,
                previousOnboardingCount: 1,
                daysSinceLastOnboarding: 2 // menos de 4 dias
            });
            expect(earlyFollowup.canSend).toBe(false);
            expect(earlyFollowup.reason).toBe('ONBOARDING_CAP_REACHED');

            // Reforço após 4 dias: permite
            const validFollowup = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'onboarding_profile',
                currentTime: createDate(15, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 0,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 0,
                isProfileComplete: false,
                previousOnboardingCount: 1,
                daysSinceLastOnboarding: 4
            });
            expect(validFollowup.canSend).toBe(true);

            // Já enviou 2 vezes: cessar permanente
            const maxCap = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'onboarding_profile',
                currentTime: createDate(15, 0),
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 0,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 0,
                isProfileComplete: false,
                previousOnboardingCount: 2,
                daysSinceLastOnboarding: 10
            });
            expect(maxCap.canSend).toBe(false);
            expect(maxCap.reason).toBe('ONBOARDING_CAP_REACHED');
        });

        it('não deve enviar lembrete de treino se hoje não for dia habitual do aluno', () => {
            // Aluno treina Seg(1), Qua(3), Sex(5). Hoje é Terça-feira(2).
            const tuesdayDate = createDate(18, 0, 2);
            const result = evaluateNotificationEligibility({
                userId: 'user-1',
                topic: 'training_reminder',
                currentTime: tuesdayDate,
                preferences: basePreferences,
                hasTrainedToday: false,
                todayNotificationsCount: 0,
                weeklyRemindersCount: 1,
                consecutiveIgnoredCount: 0,
                daysSinceLastIgnored: 10,
                habitualDays: [1, 3, 5]
            });

            expect(result.canSend).toBe(false);
            expect(result.reason).toBe('NOT_A_HABITUAL_DAY');
        });
    });
});
