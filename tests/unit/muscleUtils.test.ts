import { describe, it, expect } from 'vitest';
import { normalizeMuscleWeights, SUB_MUSCLE_LABELS } from '../../utils/muscleUtils';

describe('UNIT TEST: muscleUtils (Ativação e Normalização Muscular)', () => {
    describe('SUB_MUSCLE_LABELS', () => {
        it('deve possuir todos os subgrupos musculares canônicos mapeados', () => {
            expect(SUB_MUSCLE_LABELS.peitoral).toBe('Peitoral');
            expect(SUB_MUSCLE_LABELS.quadriceps).toBe('Quadríceps');
            expect(SUB_MUSCLE_LABELS.isquiotibiais).toBe('Posterior de Coxa');
            expect(SUB_MUSCLE_LABELS.gluteos).toBe('Glúteos');
            expect(SUB_MUSCLE_LABELS.latissimo).toBe('Dorsal (Latíssimo)');
            expect(SUB_MUSCLE_LABELS.upperback).toBe('Costas Superior / Trapézio');
            expect(SUB_MUSCLE_LABELS.ombro_lateral).toBe('Ombro Lateral');
            expect(SUB_MUSCLE_LABELS.adutores).toBe('Adutores');
            expect(SUB_MUSCLE_LABELS.abs).toBe('Abdômen');
        });
    });

    describe('normalizeMuscleWeights', () => {
        it('deve retornar objeto vazio quando o input for nulo, indefinido ou vazio', () => {
            expect(normalizeMuscleWeights(null)).toEqual({});
            expect(normalizeMuscleWeights(undefined)).toEqual({});
            expect(normalizeMuscleWeights({})).toEqual({});
        });

        it('deve ignorar valores nulos, indefinidos, menores que zero ou strings não-numéricas', () => {
            const input: any = {
                peitoral: null,
                triceps: undefined,
                quadriceps: -1,
                biceps: 0,
                gluteos: 'invalido',
                latissimo: 1.0
            };
            const result = normalizeMuscleWeights(input);
            expect(result).toEqual({ latissimo: 1.0 });
        });

        it('deve normalizar variações de "abdome" e "abdomen" para "abs"', () => {
            const result = normalizeMuscleWeights({
                'abdômen': 0.5,
                'abdomen': 0.3,
                'abs': 0.2
            });
            expect(result.abs).toBeCloseTo(1.0);
        });

        it('deve normalizar variações de posterior de coxa para "isquiotibiais"', () => {
            const result = normalizeMuscleWeights({
                'posterior': 0.4,
                'posterior_de_coxa': 0.3,
                'posterior de coxa': 0.3
            });
            expect(result.isquiotibiais).toBeCloseTo(1.0);
        });

        it('deve dividir "costas" igualmente entre latíssimo e costas superior (upperback)', () => {
            const result = normalizeMuscleWeights({
                'costas': 1.0
            });
            expect(result.latissimo).toBe(0.5);
            expect(result.upperback).toBe(0.5);
        });

        it('deve dividir "ombro" / "deltoide" harmonicamente entre as 3 porções', () => {
            const result = normalizeMuscleWeights({
                'ombro': 1.0
            });
            expect(result.ombro_anterior).toBeCloseTo(0.33);
            expect(result.ombro_lateral).toBeCloseTo(0.33);
            expect(result.ombro_posterior).toBeCloseTo(0.34);
        });

        it('deve unificar "trapézio" com "upperback"', () => {
            const result = normalizeMuscleWeights({
                'trapézio': 0.6,
                'upperback': 0.4
            });
            expect(result.upperback).toBe(1.0);
        });

        it('deve aceitar strings numéricas válidas', () => {
            const result = normalizeMuscleWeights({
                'peitoral': '0.75' as any,
                'triceps': '0.25' as any
            });
            expect(result.peitoral).toBe(0.75);
            expect(result.triceps).toBe(0.25);
        });
    });
});
