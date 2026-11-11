import { describe, expect, it } from 'vitest';
import { clearWorkoutReviewField, DROP_FIELDS, getWorkoutReviewFields, STRENGTH_FIELDS, SUB_SET_FIELDS } from '../../utils/workoutFieldReview';

describe('revisão dos campos deixados como sugestão', () => {
    it('mantém o destaque depois de preencher o valor sugerido automaticamente e restaurar a série', () => {
        const reviewFields = getWorkoutReviewFields({ weight: '', reps: '10', rpe: '' }, STRENGTH_FIELDS);
        const restored = JSON.parse(JSON.stringify({ weight: '20', reps: '10', rpe: '', reviewFields }));
        expect(getWorkoutReviewFields(restored, STRENGTH_FIELDS)).toEqual(['weight', 'rpe']);
    });

    it('confirma somente o campo editado, inclusive quando o valor informado é igual à sugestão', () => {
        const set = { weight: '20', reps: '8', rpe: '8', reviewFields: getWorkoutReviewFields({}, STRENGTH_FIELDS) };
        expect(getWorkoutReviewFields({
            ...set, weight: '20', reviewFields: clearWorkoutReviewField(set, 'weight')
        }, STRENGTH_FIELDS)).toEqual(['reps', 'rpe']);
    });

    it('detecta campos vazios em treinos antigos, aceita zero explícito e considera apenas campos aplicáveis', () => {
        expect(getWorkoutReviewFields({ weight: '0', reps: ' - ', rpe: '0' }, STRENGTH_FIELDS)).toEqual(['reps']);
        expect(getWorkoutReviewFields({ weight: '20', reps: '' }, DROP_FIELDS)).toEqual(['reps']);
        expect(getWorkoutReviewFields({ reps: '4' }, SUB_SET_FIELDS)).toEqual([]);
    });
});
