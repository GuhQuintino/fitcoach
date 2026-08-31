/**
 * Serviço de Cache Local de Leitura (Read Cache) para o FitCoach Pro.
 * Permite que o aluno abra e navegue pelo Dashboard, Seleção e Execução de Treino
 * mesmo sem qualquer conexão com a internet.
 *
 * Expiração configurada: 8 dias (conforme especificação).
 */

export const CACHE_TTL_MS = 8 * 24 * 60 * 60 * 1000; // 8 dias em milissegundos

const PREFIX_DASHBOARD = 'fc_cache_dashboard_';
const PREFIX_SELECTION = 'fc_cache_selection_';
const PREFIX_WORKOUT = 'fc_cache_workout_';

interface CacheWrapper<T> {
    data: T;
    cachedAt: number; // timestamp ms
}

function setCacheItem<T>(key: string, data: T): void {
    try {
        const wrapper: CacheWrapper<T> = {
            data,
            cachedAt: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(wrapper));
    } catch (e) {
        console.warn(`[OfflineCache] Falha ao gravar cache para ${key}:`, e);
    }
}

function getCacheItem<T>(key: string): { data: T; cachedAt: number; isExpired: boolean } | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const wrapper: CacheWrapper<T> = JSON.parse(raw);
        if (!wrapper || !wrapper.data) return null;

        const age = Date.now() - (wrapper.cachedAt || 0);
        const isExpired = age > CACHE_TTL_MS;

        return {
            data: wrapper.data,
            cachedAt: wrapper.cachedAt,
            isExpired
        };
    } catch (e) {
        console.error(`[OfflineCache] Erro ao decodificar cache ${key}:`, e);
        return null;
    }
}

// ─── 1. Dashboard Cache ──────────────────────────────────────────────

export interface CachedDashboardData {
    profile: any;
    coach: any;
    studentData: any;
    routine: any;
    workoutCount: number;
    gamification: {
        streak: number;
        level: number;
        current_xp: number;
        next_level_xp: number;
    };
}

export function cacheStudentDashboard(userId: string, data: CachedDashboardData): void {
    if (!userId) return;
    setCacheItem(PREFIX_DASHBOARD + userId, data);
}

export function getCachedStudentDashboard(userId: string) {
    if (!userId) return null;
    return getCacheItem<CachedDashboardData>(PREFIX_DASHBOARD + userId);
}

// ─── 2. Selection Cache ──────────────────────────────────────────────

export interface CachedSelectionData {
    routine: any;
    workouts: any[];
    suggestedIndex: number;
}

export function cacheSelectionWorkouts(studentId: string, data: CachedSelectionData): void {
    if (!studentId) return;
    setCacheItem(PREFIX_SELECTION + studentId, data);
}

export function getCachedSelectionWorkouts(studentId: string) {
    if (!studentId) return null;
    return getCacheItem<CachedSelectionData>(PREFIX_SELECTION + studentId);
}

// ─── 3. Workout Execution Cache ──────────────────────────────────────

export interface CachedWorkoutData {
    workout: any;
    exercises: any[];
}

export function cacheWorkoutExecution(workoutId: string, data: CachedWorkoutData): void {
    if (!workoutId) return;
    setCacheItem(PREFIX_WORKOUT + workoutId, data);
}

export function getCachedWorkoutExecution(workoutId: string) {
    if (!workoutId) return null;
    return getCacheItem<CachedWorkoutData>(PREFIX_WORKOUT + workoutId);
}

// ─── Limpeza de Cache ────────────────────────────────────────────────

export function clearStudentCache(userId?: string): void {
    try {
        if (userId) {
            localStorage.removeItem(PREFIX_DASHBOARD + userId);
            localStorage.removeItem(PREFIX_SELECTION + userId);
        } else {
            Object.keys(localStorage).forEach(k => {
                if (
                    k.startsWith(PREFIX_DASHBOARD) ||
                    k.startsWith(PREFIX_SELECTION) ||
                    k.startsWith(PREFIX_WORKOUT)
                ) {
                    localStorage.removeItem(k);
                }
            });
        }
    } catch (e) {
        console.error('[OfflineCache] Erro ao limpar cache:', e);
    }
}
