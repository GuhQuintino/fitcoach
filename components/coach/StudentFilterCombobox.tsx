import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    StudentFilterOption,
    filterStudentsBySearch,
    getStudentFilterOption,
} from '../../utils/coachFeedbackFilters';

export interface StudentFilterComboboxProps {
    students: StudentFilterOption[];
    selectedStudentId: string | 'all';
    onSelectStudent: (studentId: string | 'all') => void;
    disabled?: boolean;
    className?: string;
}

export const StudentFilterCombobox: React.FC<StudentFilterComboboxProps> = ({
    students,
    selectedStudentId,
    onSelectStudent,
    disabled = false,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerButtonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = useMemo(
        () => getStudentFilterOption(selectedStudentId, students),
        [selectedStudentId, students]
    );

    const filteredStudents = useMemo(
        () => filterStudentsBySearch(students, searchQuery),
        [students, searchQuery]
    );

    // Foco automático no campo de busca ao abrir o dropdown
    useEffect(() => {
        if (isOpen) {
            const frame = requestAnimationFrame(() => {
                searchInputRef.current?.focus();
            });
            return () => cancelAnimationFrame(frame);
        } else {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Fechar ao clicar fora do componente (pointerdown para máxima responsividade mobile e desktop)
    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDownOutside = (event: PointerEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDownOutside);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDownOutside);
        };
    }, [isOpen]);

    // Fechar ao pressionar Escape e retornar foco ao botão trigger
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
                triggerButtonRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleToggle = () => {
        if (disabled) return;
        setIsOpen((prev) => !prev);
    };

    const handleSelect = (id: string | 'all') => {
        onSelectStudent(id);
        setIsOpen(false);
        triggerButtonRef.current?.focus();
    };

    const handleClearFilter = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectStudent('all');
        triggerButtonRef.current?.focus();
    };

    const isAllSelected = selectedStudentId === 'all';

    return (
        <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
            {/* Trigger Button com WAI-ARIA Combobox */}
            <div className="flex items-center">
                <button
                    ref={triggerButtonRef}
                    type="button"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-controls="student-filter-listbox"
                    aria-label="Filtrar feedbacks por aluno"
                    disabled={disabled}
                    onClick={handleToggle}
                    className={`min-h-[44px] px-3.5 py-2 rounded-2xl border transition-all flex items-center gap-2.5 shadow-xs select-none active:scale-[0.98] ${
                        disabled
                            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            : !isAllSelected
                            ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-400 dark:border-sky-500/60 text-sky-950 dark:text-sky-100 hover:border-sky-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-500 hover:text-sky-500'
                    }`}
                >
                    {isAllSelected ? (
                        <>
                            <span
                                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0"
                                aria-hidden="true"
                            >
                                <span className="material-symbols-rounded text-base">groups</span>
                            </span>
                            <span className="text-xs font-bold whitespace-nowrap">
                                Todos os alunos
                            </span>
                            {students.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {students.length}
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <img
                                src={
                                    selectedOption?.avatar_url ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        selectedOption?.full_name || 'Aluno'
                                    )}&background=random`
                                }
                                alt={selectedOption?.full_name || 'Avatar'}
                                className="w-7 h-7 rounded-xl object-cover border border-sky-200 dark:border-sky-800/60 shrink-0"
                            />
                            <div className="text-left flex flex-col min-w-0 pr-1">
                                <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider leading-none">
                                    Aluno
                                </span>
                                <span className="text-xs font-bold truncate max-w-[130px] sm:max-w-[170px] text-slate-900 dark:text-white leading-tight">
                                    {selectedOption?.full_name || 'Aluno selecionado'}
                                </span>
                            </div>

                            {/* Botão X para limpeza rápida de 1 clique (sem abrir o menu) */}
                            <span
                                role="button"
                                tabIndex={0}
                                onClick={handleClearFilter}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onSelectStudent('all');
                                    }
                                }}
                                aria-label="Limpar filtro e ver todos os alunos"
                                title="Limpar filtro de aluno"
                                className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors active:scale-95 cursor-pointer ml-0.5"
                            >
                                <span className="material-symbols-rounded text-sm" aria-hidden="true">
                                    close
                                </span>
                            </span>
                        </>
                    )}

                    {/* Chevron com rotação fluida */}
                    <span
                        className={`material-symbols-rounded text-lg text-slate-400 dark:text-slate-500 transition-transform duration-200 shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                    >
                        expand_more
                    </span>
                </button>
            </div>

            {/* Dropdown Panel com WAI-ARIA Listbox */}
            {isOpen && (
                <div
                    className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 sm:w-80 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden flex flex-col animate-fade-in"
                >
                    {/* Campo de Busca em Tempo Real */}
                    <div className="p-2.5 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-900/40">
                        <div className="relative flex items-center">
                            <span
                                className="material-symbols-rounded text-slate-400 text-lg absolute left-3 pointer-events-none"
                                aria-hidden="true"
                            >
                                search
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar aluno por nome..."
                                aria-label="Buscar aluno por nome"
                                className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent min-h-[38px]"
                            />
                            {searchQuery.trim().length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Limpar busca"
                                    className="absolute right-2.5 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                >
                                    <span className="material-symbols-rounded text-sm" aria-hidden="true">
                                        close
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lista Rolável de Opções */}
                    <div
                        role="listbox"
                        id="student-filter-listbox"
                        aria-label="Lista de alunos para filtro"
                        className="max-h-64 overflow-y-auto overscroll-contain py-1 focus:outline-none divide-y divide-slate-100/60 dark:divide-slate-700/40"
                    >
                        {/* Opção 1: Todos os Alunos (sempre no topo se pesquisa não a excluir) */}
                        {(!searchQuery.trim() ||
                            'todos os alunos'.includes(searchQuery.trim().toLowerCase())) && (
                            <button
                                type="button"
                                role="option"
                                aria-selected={isAllSelected}
                                onClick={() => handleSelect('all')}
                                className={`w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                                    isAllSelected
                                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                            isAllSelected
                                                ? 'bg-sky-500 text-white shadow-xs'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        <span className="material-symbols-rounded text-base">
                                            groups
                                        </span>
                                    </span>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold truncate">
                                            Todos os alunos
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                            Visão geral da carteira ({students.length})
                                        </span>
                                    </div>
                                </div>
                                {isAllSelected && (
                                    <span
                                        className="material-symbols-rounded text-sky-500 text-lg shrink-0 ml-2"
                                        aria-hidden="true"
                                    >
                                        check
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Opções de Alunos Filtrados */}
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => {
                                const isSelected = selectedStudentId === student.id;
                                return (
                                    <button
                                        key={student.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(student.id)}
                                        className={`w-full min-h-[44px] px-3.5 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                                            isSelected
                                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <img
                                                src={
                                                    student.avatar_url ||
                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                        student.full_name
                                                    )}&background=random`
                                                }
                                                alt={student.full_name}
                                                className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                                loading="lazy"
                                            />
                                            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                {student.full_name}
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <span
                                                className="material-symbols-rounded text-sky-500 text-lg shrink-0 ml-2"
                                                aria-hidden="true"
                                            >
                                                check
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="py-7 px-4 text-center">
                                <span
                                    className="material-symbols-rounded text-3xl text-slate-300 dark:text-slate-600 mb-1 block"
                                    aria-hidden="true"
                                >
                                    person_search
                                </span>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                                    Nenhum aluno encontrado
                                </p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    Não há resultados para "{searchQuery}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFilterCombobox;
