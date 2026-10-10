export interface SetLogItem {
    id?: string;
    exercise_id: string;
    weight_kg?: number | null;
    reps_completed?: number | null;
    rpe_actual?: number | null;
    set_type?: string | null;
    time_completed?: number | null;
    distance_completed?: number | null;
    speed_actual?: number | null;
    hiit_cycles_completed?: number | null;
    exercise?: {
        id?: string;
        name?: string;
        exercise_type?: string | null;
    } | null;
}

export type ExerciseType = 'weight' | 'cardio' | 'time';

export interface ExerciseDelta {
    exerciseId: string;
    exerciseName: string;
    exerciseType: ExerciseType;
    isNewExercise: boolean;
    currentBest: SetLogItem;
    previousBest?: SetLogItem | null;
    deltaWeight?: number | null;
    deltaReps?: number | null;
    deltaDistance?: number | null;
    deltaSpeed?: number | null;
    deltaTime?: number | null;
    deltaCycles?: number | null;
    label: string;
    status: 'increase' | 'decrease' | 'equal' | 'new';
}

export interface SessionComparisonResult {
    isFirstTime: boolean;
    currentVolume: number;
    previousVolume: number;
    volumeDeltaPct: number | null;
    exerciseDeltas: Record<string, ExerciseDelta>;
}

/**
 * Calcula o volume de treino da sessão (soma de carga x repetições).
 * Ignora séries de aquecimento ('warmup') e preparatórias ('preparation').
 */
export function calculateSessionVolume(sets: SetLogItem[]): number {
    if (!Array.isArray(sets) || sets.length === 0) return 0;

    let totalVolume = 0;

    for (const set of sets) {
        if (!set) continue;
        const type = (set.set_type || 'working').toLowerCase();
        if (type === 'warmup' || type === 'preparation') {
            continue;
        }

        const weight = typeof set.weight_kg === 'number' ? set.weight_kg : parseFloat(String(set.weight_kg || 0));
        const reps = typeof set.reps_completed === 'number' ? set.reps_completed : parseInt(String(set.reps_completed || 0), 10);

        if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
            totalVolume += weight * reps;
        }
    }

    return Math.round(totalVolume * 100) / 100;
}

/**
 * Retorna a melhor série de um conjunto de séries para determinado exercício.
 */
export function getBestSet(sets: SetLogItem[], type: ExerciseType): SetLogItem | null {
    if (!Array.isArray(sets) || sets.length === 0) return null;

    // Preferir séries válidas (não warmup/preparation), a menos que todas sejam
    const workingSets = sets.filter((s) => {
        const st = (s.set_type || 'working').toLowerCase();
        return st !== 'warmup' && st !== 'preparation';
    });

    const candidates = workingSets.length > 0 ? workingSets : sets;

    if (type === 'cardio') {
        return candidates.reduce((best, curr) => {
            if (!best) return curr;

            // Se for HIIT
            if (curr.hiit_cycles_completed != null || best.hiit_cycles_completed != null) {
                const cCycles = curr.hiit_cycles_completed || 0;
                const bCycles = best.hiit_cycles_completed || 0;
                if (cCycles !== bCycles) return cCycles > bCycles ? curr : best;
                return (curr.time_completed || 0) > (best.time_completed || 0) ? curr : best;
            }

            // Distância
            const cDist = curr.distance_completed || 0;
            const bDist = best.distance_completed || 0;
            if (cDist !== bDist) return cDist > bDist ? curr : best;

            // Velocidade
            const cSpeed = curr.speed_actual || 0;
            const bSpeed = best.speed_actual || 0;
            if (cSpeed !== bSpeed) return cSpeed > bSpeed ? curr : best;

            return (curr.time_completed || 0) > (best.time_completed || 0) ? curr : best;
        }, candidates[0]);
    }

    if (type === 'time') {
        return candidates.reduce((best, curr) => {
            if (!best) return curr;
            const cTime = curr.time_completed || 0;
            const bTime = best.time_completed || 0;
            if (cTime !== bTime) return cTime > bTime ? curr : best;
            return (curr.weight_kg || 0) > (best.weight_kg || 0) ? curr : best;
        }, candidates[0]);
    }

    // Musculação padrão ('weight')
    return candidates.reduce((best, curr) => {
        if (!best) return curr;
        const cWeight = curr.weight_kg || 0;
        const bWeight = best.weight_kg || 0;

        if (cWeight !== bWeight) {
            return cWeight > bWeight ? curr : best;
        }

        const cReps = curr.reps_completed || 0;
        const bReps = best.reps_completed || 0;
        return cReps > bReps ? curr : best;
    }, candidates[0]);
}

/**
 * Compara a sessão atual com a sessão anterior do mesmo treino.
 * Retorna delta de volume total e a evolução da melhor série por exercício.
 */
export function compareSessions(
    currentSets: SetLogItem[],
    previousSets?: SetLogItem[] | null
): SessionComparisonResult {
    const currentVolume = calculateSessionVolume(currentSets);

    if (!previousSets || !Array.isArray(previousSets) || previousSets.length === 0) {
        return {
            isFirstTime: true,
            currentVolume,
            previousVolume: 0,
            volumeDeltaPct: null,
            exerciseDeltas: {},
        };
    }

    const previousVolume = calculateSessionVolume(previousSets);
    let volumeDeltaPct: number | null = null;

    if (previousVolume > 0) {
        volumeDeltaPct = Math.round(((currentVolume - previousVolume) / previousVolume) * 1000) / 10;
    } else if (currentVolume > 0) {
        volumeDeltaPct = 100;
    } else {
        volumeDeltaPct = 0;
    }

    // Agrupar sets por exercício
    const currentByExercise: Record<string, SetLogItem[]> = {};
    for (const s of currentSets) {
        if (!s || !s.exercise_id) continue;
        if (!currentByExercise[s.exercise_id]) currentByExercise[s.exercise_id] = [];
        currentByExercise[s.exercise_id].push(s);
    }

    const previousByExercise: Record<string, SetLogItem[]> = {};
    for (const s of previousSets) {
        if (!s || !s.exercise_id) continue;
        if (!previousByExercise[s.exercise_id]) previousByExercise[s.exercise_id] = [];
        previousByExercise[s.exercise_id].push(s);
    }

    const exerciseDeltas: Record<string, ExerciseDelta> = {};

    for (const [exId, curList] of Object.entries(currentByExercise)) {
        const first = curList[0];
        const rawType = first.exercise?.exercise_type?.toLowerCase();
        const exType: ExerciseType =
            rawType === 'cardio' ? 'cardio' : rawType === 'time' ? 'time' : 'weight';
        const exName = first.exercise?.name || 'Exercício';

        const curBest = getBestSet(curList, exType);
        if (!curBest) continue;

        const prevList = previousByExercise[exId];
        const prevBest = prevList ? getBestSet(prevList, exType) : null;

        if (!prevBest) {
            exerciseDeltas[exId] = {
                exerciseId: exId,
                exerciseName: exName,
                exerciseType: exType,
                isNewExercise: true,
                currentBest: curBest,
                label: 'Novo',
                status: 'new',
            };
            continue;
        }

        // Comparação de acordo com o tipo do exercício
        if (exType === 'cardio') {
            if (curBest.hiit_cycles_completed != null || prevBest.hiit_cycles_completed != null) {
                const deltaCycles = (curBest.hiit_cycles_completed || 0) - (prevBest.hiit_cycles_completed || 0);
                const deltaTime = (curBest.time_completed || 0) - (prevBest.time_completed || 0);

                let label = '= igual';
                let status: ExerciseDelta['status'] = 'equal';
                if (deltaCycles > 0) {
                    label = `+${deltaCycles} ciclos`;
                    status = 'increase';
                } else if (deltaCycles < 0) {
                    label = `${deltaCycles} ciclos`;
                    status = 'decrease';
                } else if (deltaTime !== 0) {
                    label = deltaTime > 0 ? `+${deltaTime}s` : `${deltaTime}s`;
                    status = deltaTime > 0 ? 'increase' : 'decrease';
                }

                exerciseDeltas[exId] = {
                    exerciseId: exId,
                    exerciseName: exName,
                    exerciseType: exType,
                    isNewExercise: false,
                    currentBest: curBest,
                    previousBest: prevBest,
                    deltaCycles,
                    deltaTime,
                    label,
                    status,
                };
            } else {
                const deltaDist = Math.round(((curBest.distance_completed || 0) - (prevBest.distance_completed || 0)) * 100) / 100;
                const deltaSpeed = Math.round(((curBest.speed_actual || 0) - (prevBest.speed_actual || 0)) * 10) / 10;
                const deltaTime = (curBest.time_completed || 0) - (prevBest.time_completed || 0);

                let label = '= igual';
                let status: ExerciseDelta['status'] = 'equal';

                if (deltaDist !== 0) {
                    label = deltaDist > 0 ? `+${deltaDist}km` : `${deltaDist}km`;
                    status = deltaDist > 0 ? 'increase' : 'decrease';
                } else if (deltaSpeed !== 0) {
                    label = deltaSpeed > 0 ? `+${deltaSpeed}km/h` : `${deltaSpeed}km/h`;
                    status = deltaSpeed > 0 ? 'increase' : 'decrease';
                } else if (deltaTime !== 0) {
                    label = deltaTime > 0 ? `+${deltaTime}s` : `${deltaTime}s`;
                    status = deltaTime > 0 ? 'increase' : 'decrease';
                }

                exerciseDeltas[exId] = {
                    exerciseId: exId,
                    exerciseName: exName,
                    exerciseType: exType,
                    isNewExercise: false,
                    currentBest: curBest,
                    previousBest: prevBest,
                    deltaDistance: deltaDist,
                    deltaSpeed,
                    deltaTime,
                    label,
                    status,
                };
            }
        } else if (exType === 'time') {
            const deltaTime = (curBest.time_completed || 0) - (prevBest.time_completed || 0);
            const deltaWeight = (curBest.weight_kg || 0) - (prevBest.weight_kg || 0);

            let label = '= igual';
            let status: ExerciseDelta['status'] = 'equal';

            if (deltaTime !== 0) {
                label = deltaTime > 0 ? `+${deltaTime}s` : `${deltaTime}s`;
                status = deltaTime > 0 ? 'increase' : 'decrease';
            } else if (deltaWeight !== 0) {
                label = deltaWeight > 0 ? `+${deltaWeight}kg` : `${deltaWeight}kg`;
                status = deltaWeight > 0 ? 'increase' : 'decrease';
            }

            exerciseDeltas[exId] = {
                exerciseId: exId,
                exerciseName: exName,
                exerciseType: exType,
                isNewExercise: false,
                currentBest: curBest,
                previousBest: prevBest,
                deltaTime,
                deltaWeight,
                label,
                status,
            };
        } else {
            // Musculação convencional
            const curWeight = curBest.weight_kg || 0;
            const prevWeight = prevBest.weight_kg || 0;
            const curReps = curBest.reps_completed || 0;
            const prevReps = prevBest.reps_completed || 0;

            const deltaWeight = Math.round((curWeight - prevWeight) * 10) / 10;
            const deltaReps = curReps - prevReps;

            let label = '= igual';
            let status: ExerciseDelta['status'] = 'equal';

            if (deltaWeight > 0) {
                label = `+${deltaWeight.toString().replace('.', ',')}kg`;
                if (deltaReps !== 0) {
                    label += ` (${deltaReps > 0 ? `+${deltaReps}` : deltaReps} reps)`;
                }
                status = 'increase';
            } else if (deltaWeight < 0) {
                label = `${deltaWeight.toString().replace('.', ',')}kg`;
                if (deltaReps !== 0) {
                    label += ` (${deltaReps > 0 ? `+${deltaReps}` : deltaReps} reps)`;
                }
                status = 'decrease';
            } else {
                // Peso igual, compara reps
                if (deltaReps > 0) {
                    label = `+${deltaReps} ${deltaReps === 1 ? 'rep' : 'reps'}`;
                    status = 'increase';
                } else if (deltaReps < 0) {
                    label = `${deltaReps} reps`;
                    status = 'decrease';
                } else {
                    label = '= igual';
                    status = 'equal';
                }
            }

            exerciseDeltas[exId] = {
                exerciseId: exId,
                exerciseName: exName,
                exerciseType: exType,
                isNewExercise: false,
                currentBest: curBest,
                previousBest: prevBest,
                deltaWeight,
                deltaReps,
                label,
                status,
            };
        }
    }

    return {
        isFirstTime: false,
        currentVolume,
        previousVolume,
        volumeDeltaPct,
        exerciseDeltas,
    };
}
