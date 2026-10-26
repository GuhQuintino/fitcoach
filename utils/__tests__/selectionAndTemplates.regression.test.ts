import { describe, it, expect } from 'vitest';
import {
    parseRoutineMeta,
    formatRoutineInfoToast,
    resolveWorkoutDurationLabel
} from '../../pages/student/Selection';
import {
    serializeSetForTemplate,
    deserializeTemplateSet,
    serializeSetsForTemplate,
    deserializeTemplateSets
} from '../../components/coach/editor/SetTemplateManager';
import { extractStoragePath } from '../../components/student/EvolutionGallery';

describe('Selection, SetTemplateManager & EvolutionGallery Regression Suite', () => {
    describe('parseRoutineMeta & formatRoutineInfoToast (Selection.tsx)', () => {
        it('formata descrição JSON da rotina de forma amigável sem exibir chaves JSON brutas ao aluno', () => {
            const rawJson = '{"duration":"50-60","level":"Iniciante","frequency":"3"}';
            const parsed = parseRoutineMeta(rawJson);

            expect(parsed.isJson).toBe(true);
            expect(parsed.duration).toBe('50-60');
            expect(parsed.level).toBe('Iniciante');
            expect(parsed.frequency).toBe('3');
            expect(parsed.formattedSummary).toBe('Duração média: 50-60 min • Nível: Iniciante • Frequência: 3x/sem');

            const toastMsg = formatRoutineInfoToast(rawJson, 'Hipertrofia ABC');
            expect(toastMsg).not.toContain('{');
            expect(toastMsg).not.toContain('"duration"');
            expect(toastMsg).toContain('Duração média: 50-60 min');
        });

        it('preserva descrições em texto livre e aplica fallback quando vazio', () => {
            const plain = 'Foco em progressão de cargas nos básicos.';
            expect(parseRoutineMeta(plain).isJson).toBe(false);
            expect(formatRoutineInfoToast(plain, 'Força')).toBe(plain);
            expect(formatRoutineInfoToast('', 'Rotina Upper/Lower')).toBe('Rotina prescrita: Rotina Upper/Lower');
        });

        it('prioriza workout.duration_minutes e depois routineMeta.duration antes do fallback ~60 min', () => {
            const meta = parseRoutineMeta('{"duration":"45-55","level":"Intermediário","frequency":"4"}');
            expect(resolveWorkoutDurationLabel({ duration_minutes: 50 }, meta)).toBe('50 min');
            expect(resolveWorkoutDurationLabel({ duration_minutes: null }, meta)).toBe('45-55 min');
            expect(resolveWorkoutDurationLabel({ duration_minutes: null }, parseRoutineMeta(null))).toBe('~60 min');
        });
    });

    describe('serializeSetForTemplate & deserializeTemplateSet (SetTemplateManager.tsx)', () => {
        it('preserva 100% dos campos avançados (Camadas 2, 3, 4 e Cardio/HIIT) ao salvar e carregar templates', () => {
            const advancedSet = {
                id: 'temp-1',
                set_order: 1,
                type: 'working',
                weight_target: '80',
                reps_target: '10',
                rest_seconds: '90',
                rpe_target: '9',
                notes: 'Controlar fase excêntrica',
                set_method: 'dropset',
                drop_count: 2,
                sub_sets: [
                    { weight: '80', reps: '10' },
                    { weight: '60', reps: '8' }
                ],
                micro_rest_seconds: 15,
                activation_reps: 12,
                execution_mode: 'slow_eccentric',
                tempo: '4-1-1-0',
                timer_mode: 'controlled',
                time_target: '600',
                distance_target: 2.5,
                speed_target: 14.5,
                incline_target: 3.0,
                is_hiit: true,
                hiit_work_seconds: 30,
                hiit_rest_seconds: 30,
                hiit_rounds: 10,
                hiit_cycles: 10,
                hiit_work_speed: 16,
                hiit_rest_speed: 6
            };

            const serialized = serializeSetForTemplate(advancedSet);
            expect(serialized).not.toHaveProperty('id');
            expect(serialized.set_method).toBe('dropset');
            expect(serialized.drop_count).toBe(2);
            expect(serialized.sub_sets).toEqual([
                { weight: '80', reps: '10' },
                { weight: '60', reps: '8' }
            ]);
            expect(serialized.micro_rest_seconds).toBe(15);
            expect(serialized.activation_reps).toBe(12);
            expect(serialized.execution_mode).toBe('slow_eccentric');
            expect(serialized.tempo).toBe('4-1-1-0');
            expect(serialized.timer_mode).toBe('controlled');
            expect(serialized.is_hiit).toBe(true);
            expect(serialized.hiit_work_seconds).toBe(30);
            expect(serialized.hiit_rest_seconds).toBe(30);
            expect(serialized.hiit_rounds).toBe(10);
            expect(serialized.hiit_work_speed).toBe(16);
            expect(serialized.hiit_rest_speed).toBe(6);

            const loadedList = deserializeTemplateSets(serializeSetsForTemplate([advancedSet]), 1700000000000);
            expect(loadedList).toHaveLength(1);
            const loaded = loadedList[0];
            expect(loaded.id).toBe('loaded-1700000000000-0');
            expect(loaded.set_order).toBe(1);
            expect(loaded.set_method).toBe('dropset');
            expect(loaded.execution_mode).toBe('slow_eccentric');
            expect(loaded.tempo).toBe('4-1-1-0');
            expect(loaded.sub_sets).toHaveLength(2);
            expect(loaded.is_hiit).toBe(true);
            expect(loaded.hiit_work_speed).toBe(16);
        });
    });

    describe('extractStoragePath (EvolutionGallery.tsx)', () => {
        it('extrai corretamente o caminho do objeto dentro do bucket evolution-photos a partir da URL pública', () => {
            const publicUrl = 'https://xyzcompany.supabase.co/storage/v1/object/public/evolution-photos/user-uuid-999/17123456789.jpg?t=123';
            expect(extractStoragePath(publicUrl, 'evolution-photos')).toBe('user-uuid-999/17123456789.jpg');
        });

        it('retorna null para URLs externas que não pertencem ao bucket', () => {
            expect(extractStoragePath('https://images.unsplash.com/photo-123.jpg', 'evolution-photos')).toBeNull();
            expect(extractStoragePath('', 'evolution-photos')).toBeNull();
        });
    });
});
