export const STRENGTH_FIELDS = ['weight', 'reps', 'rpe'] as const;
export const DROP_FIELDS = ['weight', 'reps'] as const;
export const SUB_SET_FIELDS = ['reps'] as const;
export const EFFORT_FIELDS = ['rpe'] as const;

export type WorkoutReviewField = typeof STRENGTH_FIELDS[number];
export type WorkoutReviewValues = Partial<Record<WorkoutReviewField, string>> & {
    reviewFields?: WorkoutReviewField[];
};

export function getWorkoutReviewFields(values: WorkoutReviewValues, fields: readonly WorkoutReviewField[]): WorkoutReviewField[] {
    return fields.filter(field => {
        const value = values[field]?.trim();
        return !value || value === '-' || values.reviewFields?.includes(field);
    });
}

export function clearWorkoutReviewField(values: WorkoutReviewValues, field: string): WorkoutReviewField[] | undefined {
    return values.reviewFields?.filter(pending => pending !== field);
}
