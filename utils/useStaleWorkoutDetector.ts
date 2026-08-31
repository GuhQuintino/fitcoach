import { useState, useEffect, useRef } from 'react';
import {
    SavedWorkout,
    AutoFinalizeResult,
    isWorkoutStale,
    autoFinalizeWorkout,
    getCompletionStats
} from './staleWorkoutService';

interface StaleWorkoutState {
    /** True enquanto o hook está verificando/auto-finalizando */
    loading: boolean;
    /** Resultado da auto-finalização (null se não houve) */
    result: AutoFinalizeResult | null;
}

/**
 * Hook que detecta treinos abandonados no localStorage e auto-finaliza
 * se elegíveis (> 4h stale + >= 60% de séries + >= 3 séries absolutas).
 *
 * Deve ser usado no Dashboard, Selection e WorkoutExecution.
 */
export function useStaleWorkoutDetector(userId: string | undefined): StaleWorkoutState {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AutoFinalizeResult | null>(null);
    const ranRef = useRef(false);

    useEffect(() => {
        if (!userId || ranRef.current) return;

        const saved = localStorage.getItem('active_workout');
        if (!saved) return;

        let parsed: SavedWorkout;
        try {
            parsed = JSON.parse(saved);
        } catch {
            return;
        }

        if (!isWorkoutStale(parsed)) return;

        // Marcar como executado para não rodar 2x no mesmo mount
        ranRef.current = true;
        setLoading(true);

        autoFinalizeWorkout(parsed, userId).then(res => {
            setResult(res);
            setLoading(false);
        });
    }, [userId]);

    return { loading, result };
}
