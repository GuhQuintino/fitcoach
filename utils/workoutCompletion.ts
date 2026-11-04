interface CompletionSet {
    completed: boolean;
    set_method?: string | null;
    drop_count?: number | null;
    sub_sets?: number | null;
    drops?: ReadonlyArray<{ completed: boolean }>;
    sub_sets_records?: ReadonlyArray<{ completed: boolean }>;
}

export function isWorkoutComplete(exercises: ReadonlyArray<{ sets: ReadonlyArray<CompletionSet> }>): boolean {
    if (!exercises.length || exercises.some(exercise => !exercise.sets.length)) return false;
    return exercises.every(exercise => exercise.sets.every(set => {
        if (!set.completed) return false;
        if (set.set_method === 'dropset' && (!set.drops || set.drops.length < (set.drop_count || 2))) return false;
        const subMethods = ['rest_pause', 'cluster', 'myo_reps', 'muscle_round', 'method_3_7'];
        if (subMethods.includes(set.set_method || '')) {
            const expected = set.set_method === 'muscle_round' ? 6 : set.set_method === 'method_3_7' ? 5 : (set.sub_sets || (set.set_method === 'rest_pause' ? 2 : 3));
            if (!set.sub_sets_records || set.sub_sets_records.length < expected) return false;
        }
        return (set.drops || []).every(drop => drop.completed) && (set.sub_sets_records || []).every(sub => sub.completed);
    }));
}

/** One opening per completion transition, including a restored completed session. */
export function createCompletionTransition() {
    let previousWorkout: string | undefined;
    let wasComplete = false;
    return (workoutId: string | undefined, complete: boolean, ready: boolean): boolean => {
        if (workoutId !== previousWorkout) {
            previousWorkout = workoutId;
            wasComplete = false;
        }
        if (!ready) return false;
        const shouldOpen = complete && !wasComplete;
        wasComplete = complete;
        return shouldOpen;
    };
}
