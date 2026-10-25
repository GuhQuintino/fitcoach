/**
 * Helper resiliente e escopado por usuário para armazenamento de treinos ativos (em andamento).
 * Previne que dados de treino de um usuário vazem para outro no mesmo navegador/dispositivo.
 */

export interface ActiveWorkoutSession {
    userId?: string;
    workoutId: string;
    exercises: any[];
    exerciseGroups?: any[];
    startTime: string;
    workoutSeconds: number;
    isWorkoutPaused?: boolean;
    restEndTime?: number | null;
    initialTime?: number;
    restTimerLabel?: string;
    timerActive?: boolean;
    lastUpdate?: string;
    [key: string]: any;
}

const GLOBAL_KEY = 'active_workout';

export function getUserActiveWorkoutKey(userId: string): string {
    return `active_workout_${userId}`;
}

/**
 * Obtém o treino em andamento do usuário logado.
 * Se o dado armazenado não pertencer ao usuário fornecido, retorna null
 * e limpa chaves órfãs para evitar exibição de treinos de terceiros.
 */
export function getActiveWorkout(userId: string | undefined | null): ActiveWorkoutSession | null {
    if (!userId) return null;

    try {
        // 1. Tenta chave escopada específica do usuário
        const scopedRaw = localStorage.getItem(getUserActiveWorkoutKey(userId));
        if (scopedRaw) {
            const parsed = JSON.parse(scopedRaw);
            if (parsed && (!parsed.userId || parsed.userId === userId)) {
                parsed.userId = userId;
                return parsed;
            }
        }

        // 2. Fallback: chave legada global 'active_workout'
        const globalRaw = localStorage.getItem(GLOBAL_KEY);
        if (globalRaw) {
            const parsed = JSON.parse(globalRaw);
            if (parsed) {
                // Se pertence a este usuário, migra para a chave escopada
                if (parsed.userId === userId) {
                    localStorage.setItem(getUserActiveWorkoutKey(userId), JSON.stringify(parsed));
                    return parsed;
                }
                // Se tem userId de outro usuário, NUNCA exibe para o usuário atual!
                if (parsed.userId && parsed.userId !== userId) {
                    return null;
                }
                // Se não tem userId (legado anônimo/antigo), para não vazar entre contas no mesmo browser, descarta
                localStorage.removeItem(GLOBAL_KEY);
                return null;
            }
        }
    } catch (err) {
        console.error('[activeWorkoutStorage] Erro ao carregar active_workout:', err);
    }

    return null;
}

/**
 * Salva o treino em andamento associado obrigatoriamente ao userId.
 */
export function setActiveWorkout(userId: string | undefined | null, data: any): void {
    if (!userId || !data) return;

    try {
        const payload: ActiveWorkoutSession = {
            ...data,
            userId,
            lastUpdate: new Date().toISOString()
        };
        const serialized = JSON.stringify(payload);

        localStorage.setItem(getUserActiveWorkoutKey(userId), serialized);
        // Mantém a chave legada atualizada com o userId explícito
        localStorage.setItem(GLOBAL_KEY, serialized);
    } catch (err) {
        console.error('[activeWorkoutStorage] Erro ao salvar active_workout:', err);
    }
}

/**
 * Remove o treino em andamento do usuário.
 */
export function removeActiveWorkout(userId: string | undefined | null): void {
    try {
        if (userId) {
            localStorage.removeItem(getUserActiveWorkoutKey(userId));
        }

        // Se a chave global pertencer a este usuário (ou se userId não foi informado), remove
        const globalRaw = localStorage.getItem(GLOBAL_KEY);
        if (globalRaw) {
            try {
                const parsed = JSON.parse(globalRaw);
                if (!userId || !parsed.userId || parsed.userId === userId) {
                    localStorage.removeItem(GLOBAL_KEY);
                }
            } catch {
                localStorage.removeItem(GLOBAL_KEY);
            }
        }
    } catch (err) {
        console.error('[activeWorkoutStorage] Erro ao remover active_workout:', err);
    }
}
