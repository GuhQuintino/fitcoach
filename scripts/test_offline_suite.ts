/**
 * Suíte de Testes Automatizados para Funcionalidades Offline do FitCoach Pro:
 * 1. Cache Local de Leitura (TTL 8 dias, Serialização, Recuperação)
 * 2. Fila de Sincronização Offline (Write Queue, Limite de 10, FIFO)
 * 3. Detecção de Treino Abandonado com Fallback Offline
 */

// Mock do localStorage para ambiente Node
const store: Record<string, string> = {};
(global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: false },
    configurable: true,
    writable: true
});

import {
    CACHE_TTL_MS,
    cacheStudentDashboard,
    getCachedStudentDashboard,
    cacheSelectionWorkouts,
    getCachedSelectionWorkouts,
    cacheWorkoutExecution,
    getCachedWorkoutExecution,
    clearStudentCache
} from '../utils/offlineCacheService';

import {
    MAX_OFFLINE_QUEUE_ITEMS,
    saveOfflineWorkout,
    getOfflineQueue,
    getPendingSyncCount,
    clearOfflineQueue,
    OfflineWorkoutPayload
} from '../utils/offlineSyncService';

import {
    AUTO_FINALIZE_THRESHOLD,
    STALE_TIMEOUT_HOURS,
    MIN_SETS_ABSOLUTE,
    isWorkoutStale,
    getCompletionStats,
    SavedWorkout
} from '../utils/staleWorkoutService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        passed++;
    } else {
        console.error(`  ❌ FAIL: ${testName}`);
        failed++;
    }
}

async function runSuite() {
    console.log('\n🚀 Iniciando Suíte de Testes Offline do FitCoach...\n');

    // ─────────────────────────────────────────────────────────────
    // TESTE 1: Cache Local de Leitura (Read Cache)
    // ─────────────────────────────────────────────────────────────
    console.log('📌 Bloco 1: Cache Local de Leitura (offlineCacheService)');
    clearStudentCache();

    const mockUserId = 'user-123-abc';
    const mockDashboardData = {
        profile: { id: mockUserId, full_name: 'Atleta Teste' },
        coach: { full_name: 'Treinador Silva', phone: '11999999999', avatar_url: 'https://example.com/pic.jpg' },
        studentData: { coach_id: 'coach-1' },
        routine: { routine_id: 'rot-1', routines: { name: 'Hipertrofia ABC', duration_weeks: 8 } },
        workoutCount: 15,
        gamification: { streak: 4, level: 2, current_xp: 1500, next_level_xp: 2000 }
    };

    cacheStudentDashboard(mockUserId, mockDashboardData);
    const cachedDash = getCachedStudentDashboard(mockUserId);

    assert(cachedDash !== null, 'Dashboard recuperado do cache com sucesso');
    assert(cachedDash?.data.profile.full_name === 'Atleta Teste', 'Nome do perfil coincide com o cache');
    assert(cachedDash?.data.coach.phone === '11999999999', 'Dados de contato do coach preservados');
    assert(cachedDash?.data.workoutCount === 15, 'Contagem de treinos preservada');
    assert(cachedDash?.isExpired === false, 'Cache recente NÃO está expirado');
    assert(CACHE_TTL_MS === 8 * 24 * 60 * 60 * 1000, 'TTL do cache é exatamente 8 dias (691.200.000 ms)');

    // Teste de seleção de treinos
    const mockSelectionData = {
        routine: { name: 'Rotina A' },
        workouts: [{ id: 'w-1', name: 'Treino A' }, { id: 'w-2', name: 'Treino B' }],
        suggestedIndex: 1
    };
    cacheSelectionWorkouts(mockUserId, mockSelectionData);
    const cachedSel = getCachedSelectionWorkouts(mockUserId);
    assert(cachedSel?.data.workouts.length === 2, 'Lista de treinos recuperada do cache');
    assert(cachedSel?.data.suggestedIndex === 1, 'Índice de treino sugerido preservado');

    // Teste de execução de treino
    const mockWorkoutData = {
        workout: { id: 'w-1', name: 'Peito e Tríceps' },
        exercises: [{ id: 'ex-1', name: 'Supino Reto', sets: [{ completed: false, weight: '80' }] }]
    };
    cacheWorkoutExecution('w-1', mockWorkoutData);
    const cachedWorkout = getCachedWorkoutExecution('w-1');
    assert(cachedWorkout?.data.workout.name === 'Peito e Tríceps', 'Treino de execução recuperado do cache');
    assert(cachedWorkout?.data.exercises[0].name === 'Supino Reto', 'Exercício do treino recuperado');

    // ─────────────────────────────────────────────────────────────
    // TESTE 2: Fila de Sincronização Offline (Write Queue)
    // ─────────────────────────────────────────────────────────────
    console.log('\n📌 Bloco 2: Fila de Gravação Offline (offlineSyncService)');
    clearOfflineQueue();

    assert(getPendingSyncCount() === 0, 'Fila inicia vazia');

    const samplePayload: OfflineWorkoutPayload = {
        workoutLog: {
            student_id: mockUserId,
            workout_id: 'w-1',
            started_at: new Date(Date.now() - 3600000).toISOString(),
            finished_at: new Date().toISOString(),
            effort_rating: 8,
            feedback_notes: 'Treino excelente mesmo sem sinal'
        },
        setLogs: [
            { exercise_id: 'ex-1', set_type: 'working', set_order: 0, weight_kg: 80, reps_completed: 10, rpe_actual: 8 },
            { exercise_id: 'ex-1', set_type: 'working', set_order: 1, weight_kg: 85, reps_completed: 8, rpe_actual: 9 }
        ],
        exerciseFeedbacks: [
            { exercise_id: 'ex-1', feedback_text: 'Aumentei a carga na 2ª série' }
        ]
    };

    const res1 = saveOfflineWorkout(samplePayload);
    assert(res1.success === true, 'Treino 1 salvo na fila offline');
    assert(getPendingSyncCount() === 1, 'Fila agora tem 1 item pendente');

    // Teste de capacidade máxima da fila (10 treinos)
    for (let i = 2; i <= 12; i++) {
        saveOfflineWorkout({
            ...samplePayload,
            workoutLog: { ...samplePayload.workoutLog, feedback_notes: `Treino #${i}` }
        });
    }

    const queueAfter12 = getOfflineQueue();
    assert(queueAfter12.length === MAX_OFFLINE_QUEUE_ITEMS, `Tamanho da fila é rigidamente limitado a ${MAX_OFFLINE_QUEUE_ITEMS} itens`);
    assert(queueAfter12[queueAfter12.length - 1].payload.workoutLog.feedback_notes === 'Treino #12', 'Último treino inserido está na ponta mais recente da fila');
    assert(queueAfter12[0].payload.workoutLog.feedback_notes === 'Treino #3', 'O treino mais antigo (#1 e #2) foi descartado pelo FIFO quando estourou 10 itens');

    // ─────────────────────────────────────────────────────────────
    // TESTE 3: Regras de Stale Workout e Auto-Finalização
    // ─────────────────────────────────────────────────────────────
    console.log('\n📌 Bloco 3: Regras de Negócio de Stale Workout (staleWorkoutService)');

    assert(AUTO_FINALIZE_THRESHOLD === 0.6, 'Threshold de finalização configurado em 60% (0.6)');
    assert(STALE_TIMEOUT_HOURS === 4, 'Timeout de inatividade configurado em 4 horas');
    assert(MIN_SETS_ABSOLUTE === 3, 'Mínimo absoluto de 3 séries');

    // Caso A: Treino com 70% das séries, mas atualizado há 1 hora (NÃO stale)
    const recentWorkout: SavedWorkout = {
        workoutId: 'w-1',
        startTime: new Date(Date.now() - 3600000).toISOString(),
        lastUpdate: new Date(Date.now() - 1800000).toISOString(), // 30min atrás
        workoutSeconds: 1800,
        isWorkoutPaused: false,
        exercises: [{
            id: 'ex-1', workout_item_id: 'wi-1', name: 'Supino',
            sets: [
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: false }
            ]
        }]
    };
    assert(isWorkoutStale(recentWorkout) === false, 'Treino recente (< 4h) NÃO é considerado abandonado');

    // Caso B: Treino atualizado há 5 horas, mas com apenas 1 série completada (< 60% e < 3 séries)
    const barelyStartedWorkout: SavedWorkout = {
        ...recentWorkout,
        lastUpdate: new Date(Date.now() - 5 * 3600000).toISOString(), // 5h atrás
        exercises: [{
            id: 'ex-1', workout_item_id: 'wi-1', name: 'Supino',
            sets: [
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: false },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: false },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: false }
            ]
        }]
    };
    assert(isWorkoutStale(barelyStartedWorkout) === false, 'Treino com apenas 1 de 4 séries (< 60%) NÃO é auto-finalizado');

    // Caso C: Treino atualizado há 5 horas, com 3 de 4 séries completadas (75% e >= 3 séries)
    const validAbandonedWorkout: SavedWorkout = {
        ...recentWorkout,
        lastUpdate: new Date(Date.now() - 5 * 3600000).toISOString(), // 5h atrás
        exercises: [{
            id: 'ex-1', workout_item_id: 'wi-1', name: 'Supino',
            sets: [
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: true },
                { type: 'working', weight: '80', reps: '10', rpe: '8', completed: false }
            ]
        }]
    };
    assert(isWorkoutStale(validAbandonedWorkout) === true, 'Treino abandonado (5h + 75% completado) É elegível para auto-finalização');

    const stats = getCompletionStats(validAbandonedWorkout);
    assert(stats.completedSets === 3 && stats.totalSets === 4 && stats.completionPercentage === 0.75, 'Cálculo estatístico de completude exato (75%)');

    // ─────────────────────────────────────────────────────────────
    // RESULTADO FINAL
    // ─────────────────────────────────────────────────────────────
    console.log(`\n========================================`);
    console.log(`📊 Resultado da Suíte: ${passed} PASS, ${failed} FAIL`);
    console.log(`========================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runSuite().catch(err => {
    console.error('Erro na execução da suíte:', err);
    process.exit(1);
});
