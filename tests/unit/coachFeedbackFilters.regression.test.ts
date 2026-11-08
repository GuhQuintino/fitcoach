import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
    normalizeStudentsList,
    filterStudentsBySearch,
    buildWorkoutLogsFilterScope,
    formatMarkAllAsReadPrompt,
    formatMarkAllSuccessToast,
    getStudentFilterOption,
    StudentFilterOption,
} from '../../utils/coachFeedbackFilters';
import { StudentFilterCombobox } from '../../components/coach/StudentFilterCombobox';

describe('coachFeedbackFilters: Funções Puras e Regras de Negócio', () => {
    describe('normalizeStudentsList', () => {
        it('deve normalizar lista bruta do Supabase com profiles em formato de objeto', () => {
            const rawData = [
                {
                    id: 'student-2',
                    profiles: {
                        id: 'student-2',
                        full_name: 'Bruno Souza',
                        avatar_url: 'https://example.com/bruno.jpg',
                    },
                },
                {
                    id: 'student-1',
                    profiles: {
                        id: 'student-1',
                        full_name: 'Ana Carolina',
                        avatar_url: null,
                    },
                },
            ];

            const result = normalizeStudentsList(rawData);

            expect(result).toHaveLength(2);
            expect(result[0].full_name).toBe('Ana Carolina');
            expect(result[0].id).toBe('student-1');
            expect(result[1].full_name).toBe('Bruno Souza');
            expect(result[1].id).toBe('student-2');
        });

        it('deve lidar com profiles retornados em formato array (join 1:1)', () => {
            const rawData = [
                {
                    id: 'student-1',
                    profiles: [
                        {
                            id: 'student-1',
                            full_name: 'Carlos Alberto',
                            avatar_url: 'https://example.com/carlos.jpg',
                        },
                    ],
                },
            ];

            const result = normalizeStudentsList(rawData);
            expect(result).toHaveLength(1);
            expect(result[0].full_name).toBe('Carlos Alberto');
            expect(result[0].avatar_url).toBe('https://example.com/carlos.jpg');
        });

        it('deve ordenar alfabeticamente respeitando acentos e pontuação em português do Brasil', () => {
            const rawData = [
                { id: '1', profiles: { full_name: 'Ícaro Santos' } },
                { id: '2', profiles: { full_name: 'Ágatha Lima' } },
                { id: '3', profiles: { full_name: 'Beatriz Silva' } },
                { id: '4', profiles: { full_name: 'Érica Rocha' } },
                { id: '5', profiles: { full_name: 'Amanda Souza' } },
            ];

            const result = normalizeStudentsList(rawData);
            const names = result.map((r) => r.full_name);

            // Em pt-BR base sensitivity: Ágatha vem com A, Amanda, Beatriz, Érica com E, Ícaro com I
            expect(names[0]).toBe('Ágatha Lima');
            expect(names[1]).toBe('Amanda Souza');
            expect(names[2]).toBe('Beatriz Silva');
            expect(names[3]).toBe('Érica Rocha');
            expect(names[4]).toBe('Ícaro Santos');
        });

        it('deve usar fallback gracioso para alunos sem nome ou com perfil nulo', () => {
            const rawData = [
                { id: '1', profiles: null },
                { id: '2', profiles: { full_name: '   ' } },
                { id: null, profiles: null }, // deve ser ignorado
            ];

            const result = normalizeStudentsList(rawData);
            expect(result).toHaveLength(2);
            expect(result[0].full_name).toBe('Aluno sem nome');
            expect(result[1].full_name).toBe('Aluno sem nome');
        });

        it('deve retornar array vazio se a entrada for inválida ou vazia', () => {
            expect(normalizeStudentsList([])).toEqual([]);
            expect(normalizeStudentsList(null as any)).toEqual([]);
            expect(normalizeStudentsList(undefined as any)).toEqual([]);
        });
    });

    describe('filterStudentsBySearch', () => {
        const mockStudents: StudentFilterOption[] = [
            { id: '1', full_name: 'Gustavo Santos', avatar_url: null },
            { id: '2', full_name: 'Ágatha Cristine', avatar_url: null },
            { id: '3', full_name: 'João Pedro', avatar_url: null },
            { id: '4', full_name: 'Érica Silva', avatar_url: null },
        ];

        it('deve retornar todos os alunos se o termo de busca for vazio ou espaços', () => {
            expect(filterStudentsBySearch(mockStudents, '')).toHaveLength(4);
            expect(filterStudentsBySearch(mockStudents, '   ')).toHaveLength(4);
        });

        it('deve encontrar correspondências ignorando maiúsculas e minúsculas', () => {
            const result = filterStudentsBySearch(mockStudents, 'gustavo');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('1');
        });

        it('deve encontrar correspondências ignorando acentos (ex: "agatha" acha "Ágatha", "joao" acha "João")', () => {
            const resultAgatha = filterStudentsBySearch(mockStudents, 'agatha');
            expect(resultAgatha).toHaveLength(1);
            expect(resultAgatha[0].full_name).toBe('Ágatha Cristine');

            const resultJoao = filterStudentsBySearch(mockStudents, 'joao');
            expect(resultJoao).toHaveLength(1);
            expect(resultJoao[0].full_name).toBe('João Pedro');

            const resultErica = filterStudentsBySearch(mockStudents, 'erica');
            expect(resultErica).toHaveLength(1);
            expect(resultErica[0].full_name).toBe('Érica Silva');
        });

        it('deve retornar vazio se não houver correspondências', () => {
            const result = filterStudentsBySearch(mockStudents, 'Rodrigo');
            expect(result).toHaveLength(0);
        });
    });

    describe('buildWorkoutLogsFilterScope', () => {
        const sampleIds = ['uuid-1', 'uuid-2', 'uuid-3'];

        it('deve retornar escopo individual quando um UUID de aluno específico for passado', () => {
            const scope = buildWorkoutLogsFilterScope('uuid-2', sampleIds);
            expect(scope).toEqual({ mode: 'single', studentId: 'uuid-2' });
        });

        it('deve retornar escopo múltiplo com todos os IDs quando selectedStudentId for "all"', () => {
            const scope = buildWorkoutLogsFilterScope('all', sampleIds);
            expect(scope).toEqual({ mode: 'multiple', studentIds: sampleIds });
        });

        it('deve retornar escopo empty quando a lista de alunos estiver vazia e o filtro for "all"', () => {
            const scope = buildWorkoutLogsFilterScope('all', []);
            expect(scope).toEqual({ mode: 'empty' });
        });
    });

    describe('formatMarkAllAsReadPrompt', () => {
        it('deve formatar texto singular e plural para toda a carteira', () => {
            expect(formatMarkAllAsReadPrompt(1)).toBe('Marcar 1 como lido?');
            expect(formatMarkAllAsReadPrompt(5)).toBe('Marcar 5 como lidos?');
        });

        it('deve formatar texto singular e plural no escopo de um aluno específico', () => {
            expect(formatMarkAllAsReadPrompt(1, 'Maria Silva')).toBe('Marcar 1 treino de Maria Silva como lido?');
            expect(formatMarkAllAsReadPrompt(3, 'Maria Silva')).toBe('Marcar 3 treinos de Maria Silva como lidos?');
        });
    });

    describe('formatMarkAllSuccessToast', () => {
        it('deve exibir mensagem geral quando nenhum aluno específico estiver selecionado', () => {
            expect(formatMarkAllSuccessToast()).toBe('Todos os feedbacks foram marcados como lidos.');
            expect(formatMarkAllSuccessToast(null)).toBe('Todos os feedbacks foram marcados como lidos.');
        });

        it('deve exibir mensagem personalizada com o nome do aluno quando selecionado', () => {
            expect(formatMarkAllSuccessToast('Carlos Eduardo')).toBe('Feedbacks de Carlos Eduardo marcados como lidos.');
        });
    });

    describe('getStudentFilterOption', () => {
        const mockStudents: StudentFilterOption[] = [
            { id: 'uuid-1', full_name: 'Aluno Um', avatar_url: null },
            { id: 'uuid-2', full_name: 'Aluno Dois', avatar_url: null },
        ];

        it('deve retornar null para "all" ou ID inexistente', () => {
            expect(getStudentFilterOption('all', mockStudents)).toBeNull();
            expect(getStudentFilterOption('uuid-999', mockStudents)).toBeNull();
        });

        it('deve retornar o objeto correspondente quando o ID existir', () => {
            const found = getStudentFilterOption('uuid-2', mockStudents);
            expect(found).not.toBeNull();
            expect(found?.full_name).toBe('Aluno Dois');
        });
    });

    describe('StudentFilterCombobox Component Markup & WAI-ARIA (Operate Surface)', () => {
        const mockStudents: StudentFilterOption[] = [
            { id: 'student-1', full_name: 'Ana Carolina', avatar_url: 'https://example.com/ana.jpg' },
            { id: 'student-2', full_name: 'Bruno Souza', avatar_url: null },
        ];

        it('deve renderizar estado inicial "all" com atributos WAI-ARIA de combobox e touch target >= 44px', () => {
            const onSelect = vi.fn();
            const html = renderToString(
                React.createElement(StudentFilterCombobox, {
                    students: mockStudents,
                    selectedStudentId: 'all',
                    onSelectStudent: onSelect,
                })
            );

            expect(html).toContain('role="combobox"');
            expect(html).toContain('aria-expanded="false"');
            expect(html).toContain('aria-haspopup="listbox"');
            expect(html).toContain('aria-controls="student-filter-listbox"');
            expect(html).toContain('min-h-[44px]');
            expect(html).toContain('Todos os alunos');
            expect(html).toContain('>2<'); // badge com contagem
        });

        it('deve renderizar o aluno selecionado com avatar, nome e botão X de limpeza rápida', () => {
            const onSelect = vi.fn();
            const html = renderToString(
                React.createElement(StudentFilterCombobox, {
                    students: mockStudents,
                    selectedStudentId: 'student-1',
                    onSelectStudent: onSelect,
                })
            );

            expect(html).toContain('Ana Carolina');
            expect(html).toContain('src="https://example.com/ana.jpg"');
            expect(html).toContain('aria-label="Limpar filtro e ver todos os alunos"');
            expect(html).toContain('close');
        });

        it('deve desabilitar interação quando disabled=true', () => {
            const html = renderToString(
                React.createElement(StudentFilterCombobox, {
                    students: mockStudents,
                    selectedStudentId: 'all',
                    onSelectStudent: vi.fn(),
                    disabled: true,
                })
            );

            expect(html).toContain('disabled=""');
            expect(html).toContain('cursor-not-allowed');
        });
    });
});

