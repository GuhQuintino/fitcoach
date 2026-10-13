import React, { useState } from 'react';
import ExerciseCard, { ExerciseItemData } from './ExerciseCard';
import MethodGuideModal from '../../shared/MethodGuideModal';
import { getGroupToken } from '../../../utils/specialSetTokens';

export interface ExerciseGroupData {
    id: string;
    workout_id?: string;
    group_type: 'superset' | 'triset' | 'giant_set' | 'paired_antagonist';
    group_order: number;
    rest_seconds: number;
    rounds: number;
    transition_seconds: number;
    coach_notes: string | null;
}

interface ExerciseGroupCardProps {
    group: ExerciseGroupData;
    items: ExerciseItemData[];
    onUpdateGroup: (updatedGroup: ExerciseGroupData) => void;
    onUngroup: () => void;
    onUpdateItem: (itemIndexInGroup: number, updatedItem: ExerciseItemData) => void;
    onDeleteItem: (itemIndexInGroup: number) => void;
    onSwapExercise?: (itemIndexInGroup: number) => void;
    onEditExercise?: (itemIndexInGroup: number) => void;
    studentId?: string | null;
    dragHandleProps?: Record<string, unknown>;
}

const ExerciseGroupCard: React.FC<ExerciseGroupCardProps> = ({
    group,
    items,
    onUpdateGroup,
    onUngroup,
    onUpdateItem,
    onDeleteItem,
    onSwapExercise,
    onEditExercise,
    studentId,
    dragHandleProps
}) => {
    const [showNotes, setShowNotes] = useState(!!group.coach_notes);
    const [guideModalOpen, setGuideModalOpen] = useState(false);

    const groupToken = getGroupToken(group.group_type);

    const handleTypeChange = (newType: ExerciseGroupData['group_type']) => {
        onUpdateGroup({
            ...group,
            group_type: newType,
            transition_seconds: newType === 'paired_antagonist' ? (group.transition_seconds || 60) : 0
        });
    };

    return (
        <div className={`mb-6 rounded-3xl border-2 ${groupToken.border} ${groupToken.bgLight} p-3 sm:p-5 shadow-sm transition-all relative`}>
            {/* Header do Grupo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 flex-shrink-0" title="Arrastar Grupo">
                        <span className="material-symbols-rounded text-2xl">drag_indicator</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Selector do tipo de grupo */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${groupToken.solidBadge} shadow-sm`}>
                            <span className="material-symbols-rounded text-lg" aria-hidden="true">{groupToken.icon}</span>
                            <select
                                aria-label="Tipo de agrupamento"
                                value={group.group_type}
                                onChange={(e) => handleTypeChange(e.target.value as any)}
                                className="bg-transparent text-white font-black text-xs uppercase tracking-wider outline-none cursor-pointer pr-1"
                            >
                                <option value="superset" className="text-slate-900 bg-white">BISET (2 EXERCÍCIOS)</option>
                                <option value="triset" className="text-slate-900 bg-white">TRISET (3 EXERCÍCIOS)</option>
                                <option value="giant_set" className="text-slate-900 bg-white">GIANT SET (CIRCUITO)</option>
                                <option value="paired_antagonist" className="text-slate-900 bg-white">PAREADO ANTAGONISTA</option>
                            </select>
                        </div>

                        {/* Botão "?" com Guia Focado do Tipo de Grupo */}
                        <button
                            type="button"
                            onClick={() => setGuideModalOpen(true)}
                            aria-label={`Como prescrever ${groupToken.label}`}
                            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-xs"
                            title="Guia pedagógico de agrupamento"
                        >
                            <span className="material-symbols-rounded text-base" aria-hidden="true">help</span>
                        </button>
                    </div>
                </div>

                {/* Parâmetros do Grupo: Rounds, Descanso Pós-Round e Desagrupar */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                        <label htmlFor={`group-rounds-${group.id}`} className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Rounds:</label>
                        <input
                            id={`group-rounds-${group.id}`}
                            type="number"
                            min={1}
                            max={10}
                            value={group.rounds || 3}
                            onChange={(e) => onUpdateGroup({ ...group, rounds: parseInt(e.target.value) || 3 })}
                            className="w-12 text-center font-black text-xs text-slate-900 dark:text-white outline-none bg-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                        <label htmlFor={`group-rest-${group.id}`} className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Descanso Round:</label>
                        <input
                            id={`group-rest-${group.id}`}
                            type="number"
                            min={0}
                            max={600}
                            step={15}
                            value={group.rest_seconds ?? 90}
                            onChange={(e) => onUpdateGroup({ ...group, rest_seconds: parseInt(e.target.value) || 0 })}
                            className="w-12 text-center font-black text-xs text-slate-900 dark:text-white outline-none bg-transparent"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">s</span>
                    </div>

                    {group.group_type === 'paired_antagonist' && (
                        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-cyan-200 dark:border-cyan-900/60 shadow-xs">
                            <label htmlFor={`group-transition-${group.id}`} className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Transição:</label>
                            <input
                                id={`group-transition-${group.id}`}
                                type="number"
                                min={0}
                                max={300}
                                step={15}
                                value={group.transition_seconds || 60}
                                onChange={(e) => onUpdateGroup({ ...group, transition_seconds: parseInt(e.target.value) || 0 })}
                                className="w-12 text-center font-black text-xs text-cyan-600 dark:text-cyan-400 outline-none bg-transparent"
                            />
                            <span className="text-[10px] text-slate-400 font-bold">s</span>
                        </div>
                    )}

                    {/* Botão Desagrupar */}
                    <button
                        type="button"
                        onClick={onUngroup}
                        aria-label="Desagrupar exercícios deste bloco"
                        className="min-h-[36px] px-3 py-1.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/50 flex items-center gap-1 active:scale-95 transition-all"
                        title="Separar exercícios deste grupo"
                    >
                        <span className="material-symbols-rounded text-base" aria-hidden="true">link_off</span>
                        Desagrupar
                    </button>
                </div>
            </div>

            {/* Notas do Treinador para o Grupo (Toggle) */}
            <div className="mb-3">
                <button
                    type="button"
                    onClick={() => setShowNotes(!showNotes)}
                    className={`text-xs font-bold ${groupToken.textColor} flex items-center gap-1 hover:underline`}
                >
                    <span className="material-symbols-rounded text-sm" aria-hidden="true">
                        {showNotes ? 'expand_less' : 'note_add'}
                    </span>
                    {showNotes ? 'Ocultar notas do grupo' : 'Adicionar notas para este grupo'}
                </button>
                {showNotes && (
                    <textarea
                        value={group.coach_notes || ''}
                        onChange={(e) => onUpdateGroup({ ...group, coach_notes: e.target.value })}
                        placeholder="Ex: Não soltar a pegada entre o exercício A e B. Focar no controle..."
                        className="w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-primary outline-none resize-none h-14"
                    />
                )}
            </div>

            {/* Lista dos Exercícios do Grupo com Conectores */}
            <div className="space-y-0">
                {items.map((item, itemIdx) => {
                    const isLast = itemIdx === items.length - 1;

                    return (
                        <React.Fragment key={item.id || item.exercise_id || itemIdx}>
                            <div className="relative">
                                {/* Badge de Posição no Grupo (A, B, C...) */}
                                <div className={`absolute -left-1 sm:-left-3 top-2 z-10 w-6 h-6 rounded-full ${groupToken.solidBadge} font-black text-xs flex items-center justify-center shadow-md`}>
                                    {String.fromCharCode(65 + itemIdx)}
                                </div>

                                <div className="pl-3 sm:pl-4">
                                    <ExerciseCard
                                        item={item}
                                        index={itemIdx}
                                        totalItems={items.length}
                                        onUpdate={(upd) => onUpdateItem(itemIdx, upd)}
                                        onDelete={() => onDeleteItem(itemIdx)}
                                        onSwapExercise={onSwapExercise ? () => onSwapExercise(itemIdx) : undefined}
                                        onEditExercise={onEditExercise ? () => onEditExercise(itemIdx) : undefined}
                                        studentId={studentId}
                                    />
                                </div>
                            </div>

                            {/* Conector Visual entre Exercícios do Round */}
                            {!isLast && (
                                <div className="py-2.5 pl-6 sm:pl-8 flex items-center gap-3">
                                    <div className="h-6 w-0.5 bg-slate-300 dark:bg-slate-700"></div>
                                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${groupToken.badge} px-2.5 py-1 rounded-full shadow-xs`}>
                                        <span className="material-symbols-rounded text-sm" aria-hidden="true">arrow_downward</span>
                                        {group.group_type === 'paired_antagonist' ? (
                                            <span>Descanso de transição: {group.transition_seconds || 60}s</span>
                                        ) : (
                                            <span>Execute imediatamente sem descanso</span>
                                        )}
                                    </div>
                                    <div className="h-0.5 flex-1 bg-slate-200/50 dark:bg-slate-800/30"></div>
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Modal de Ajuda de Agrupamento Focado */}
            <MethodGuideModal
                isOpen={guideModalOpen}
                onClose={() => setGuideModalOpen(false)}
                initialItemId={group.group_type}
                initialLayer="group"
            />
        </div>
    );
};

export default ExerciseGroupCard;
