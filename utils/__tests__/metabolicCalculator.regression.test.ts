import { describe, it, expect } from 'vitest';
import {
    sanitizeWeightKg,
    sanitizeHeightCm,
    calculateAgeFromBirthDate,
    resolveActivityMultiplier,
    calculateMetabolicProfile
} from '../metabolicCalculator';

describe('metabolicCalculator Regression Suite', () => {
    describe('sanitizeWeightKg', () => {
        it('normaliza valores de peso digitados sem separador decimal (ex: 750 -> 75.0 kg, 825 -> 82.5 kg)', () => {
            expect(sanitizeWeightKg(750)).toBe(75);
            expect(sanitizeWeightKg('825')).toBe(82.5);
            expect(sanitizeWeightKg(1105)).toBe(110.5);
        });

        it('normaliza valores informados em gramas (ex: 75000 -> 75.0 kg)', () => {
            expect(sanitizeWeightKg(75000)).toBe(75);
            expect(sanitizeWeightKg('68400')).toBe(68.4);
        });

        it('aceita pesos válidos com vírgula ou ponto dentro da faixa humana [25, 250] kg', () => {
            expect(sanitizeWeightKg('78,5')).toBe(78.5);
            expect(sanitizeWeightKg(64.2)).toBe(64.2);
            expect(sanitizeWeightKg(25)).toBe(25);
            expect(sanitizeWeightKg(250)).toBe(250);
        });

        it('rejeita valores absurdos ou negativos retornando null', () => {
            expect(sanitizeWeightKg(0)).toBeNull();
            expect(sanitizeWeightKg(-70)).toBeNull();
            expect(sanitizeWeightKg(5)).toBeNull();
            expect(sanitizeWeightKg(500000)).toBeNull();
            expect(sanitizeWeightKg('')).toBeNull();
            expect(sanitizeWeightKg(null)).toBeNull();
        });
    });

    describe('sanitizeHeightCm', () => {
        it('converte alturas informadas em metros [1.0, 2.5] para centímetros (ex: 1.75 -> 175 cm)', () => {
            expect(sanitizeHeightCm(1.75)).toBe(175);
            expect(sanitizeHeightCm('1,68')).toBe(168);
            expect(sanitizeHeightCm(1.8)).toBe(180);
        });

        it('converte alturas informadas em milímetros [1000, 2500] para centímetros (ex: 1750 -> 175 cm)', () => {
            expect(sanitizeHeightCm(1750)).toBe(175);
            expect(sanitizeHeightCm('1820')).toBe(182);
        });

        it('rejeita alturas fora da faixa humana [100, 250] cm', () => {
            expect(sanitizeHeightCm(50)).toBeNull();
            expect(sanitizeHeightCm(320)).toBeNull();
            expect(sanitizeHeightCm(0)).toBeNull();
            expect(sanitizeHeightCm(null)).toBeNull();
        });
    });

    describe('calculateAgeFromBirthDate', () => {
        const refDate = new Date(Date.UTC(2026, 9, 25)); // 2026-10-25

        it('calcula a idade exata considerando mês e dia do aniversário', () => {
            expect(calculateAgeFromBirthDate('1996-10-20', null, refDate)).toBe(30);
            expect(calculateAgeFromBirthDate('1996-10-28', null, refDate)).toBe(29);
        });

        it('aplica fallback seguro (fallbackAge ou 30 anos) quando birth_date é nulo ou inválido', () => {
            expect(calculateAgeFromBirthDate(null, null, refDate)).toBe(30);
            expect(calculateAgeFromBirthDate('', 26, refDate)).toBe(26);
            expect(calculateAgeFromBirthDate('2025-01-01', null, refDate)).toBe(30); // < 10 anos
            expect(calculateAgeFromBirthDate('1890-01-01', 34, refDate)).toBe(34); // > 100 anos
        });
    });

    describe('resolveActivityMultiplier & calculateMetabolicProfile (Mifflin-St Jeor)', () => {
        it('resolve multiplicadores explícitos e por frequência semanal da rotina', () => {
            expect(resolveActivityMultiplier('sedentary').multiplier).toBe(1.2);
            expect(resolveActivityMultiplier('light').multiplier).toBe(1.375);
            expect(resolveActivityMultiplier('moderate').multiplier).toBe(1.55);
            expect(resolveActivityMultiplier('active').multiplier).toBe(1.725);
            expect(resolveActivityMultiplier('very_active').multiplier).toBe(1.9);

            // Inferência por frequência semanal quando preferência não está definida
            expect(resolveActivityMultiplier(null, 2).multiplier).toBe(1.375);
            expect(resolveActivityMultiplier(null, 4).multiplier).toBe(1.55);
            expect(resolveActivityMultiplier(null, 5).multiplier).toBe(1.725);
        });

        it('calcula TMB e Manutenção corretamente para homens e mulheres sem explodir para > 8000 kcal quando peso está como 750', () => {
            const refDate = new Date(Date.UTC(2026, 9, 25));

            // Homem: 75kg (mesmo digitado 750), 175cm (mesmo digitado 1.75), 30 anos, moderado (1.55)
            // TMB = (10 * 75) + (6.25 * 175) - (5 * 30) + 5 = 750 + 1093.75 - 150 + 5 = 1698.75 -> 1699 kcal
            // Manutenção = Math.round(1699 * 1.55) = 2633 kcal
            const maleResult = calculateMetabolicProfile({
                weightKg: 750,
                heightCm: 1.75,
                birthDate: '1996-05-10',
                gender: 'male',
                activityLevel: 'moderate',
                referenceDate: refDate
            });

            expect(maleResult.isValid).toBe(true);
            expect(maleResult.wasNormalized).toBe(true);
            expect(maleResult.sanitizedWeightKg).toBe(75);
            expect(maleResult.sanitizedHeightCm).toBe(175);
            expect(maleResult.resolvedAge).toBe(30);
            expect(maleResult.tmb).toBe(1699);
            expect(maleResult.maintenance).toBe(2633);
            expect(maleResult.tmb).toBeLessThan(3500);

            // Mulher: 60kg, 165cm, 28 anos, leve (1.375)
            // TMB = (10 * 60) + (6.25 * 165) - (5 * 28) - 161 = 600 + 1031.25 - 140 - 161 = 1330.25 -> 1330 kcal
            // Manutenção = Math.round(1330 * 1.375) = 1829 kcal
            const femaleResult = calculateMetabolicProfile({
                weightKg: 60,
                heightCm: 165,
                birthDate: '1998-04-15',
                gender: 'female',
                activityLevel: 'light',
                referenceDate: refDate
            });

            expect(femaleResult.isValid).toBe(true);
            expect(femaleResult.tmb).toBe(1330);
            expect(femaleResult.maintenance).toBe(1829);
        });
    });
});
