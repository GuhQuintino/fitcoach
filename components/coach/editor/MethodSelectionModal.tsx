import React, { useState, useEffect } from 'react';
import { METHOD_GUIDE_ITEMS } from '../../shared/methodGuideContent';
import MethodGuideModal from '../../shared/MethodGuideModal';
import { METHOD_TOKENS } from '../../../utils/specialSetTokens';

export interface MethodConfig {
    set_method: 'standard' | 'dropset' | 'rest_pause' | 'cluster' | 'myo_reps' | 'muscle_round' | 'method_3_7' | 'fst7' | 'bfr';
    drop_count?: number | null;
    sub_sets?: number | null;
    micro_rest_seconds?: number | null;
    activation_reps?: number | null;
}

interface MethodSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMethod?: string;
    currentDropCount?: number | null;
    currentSubSets?: number | null;
    currentMicroRest?: number | null;
    currentActivationReps?: number | null;
    onSave: (config: MethodConfig) => void;
}

const MethodSelectionModal: React.FC<MethodSelectionModalProps> = ({
    isOpen,
    onClose,
    currentMethod = 'standard',
    currentDropCount = 2,
    currentSubSets = 3,
    currentMicroRest = 15,
    currentActivationReps = 15,
    onSave
}) => {
    const [selectedMethod, setSelectedMethod] = useState<MethodConfig['set_method']>(
        (currentMethod as MethodConfig['set_method']) || 'standard'
    );
    const [dropCount, setDropCount] = useState<number>(currentDropCount || 2);
    const [subSets, setSubSets] = useState<number>(currentSubSets || 3);
    const [microRest, setMicroRest] = useState<number>(currentMicroRest || 15);
    const [activationReps, setActivationReps] = useState<number>(currentActivationReps || 15);
    const [guideModalItem, setGuideModalItem] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedMethod((currentMethod as MethodConfig['set_method']) || 'standard');
            setDropCount(currentDropCount || 2);
            setSubSets(currentSubSets || 3);
            setMicroRest(currentMicroRest || 15);
            setActivationReps(currentActivationReps || 15);
        }
    }, [isOpen, currentMethod, currentDropCount, currentSubSets, currentMicroRest, currentActivationReps]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const methodIds: Array<MethodConfig['set_method']> = [
        'standard',
        'dropset',
        'rest_pause',
        'cluster',
        'myo_reps',
        'muscle_round',
        'method_3_7',
        'fst7',
        'bfr'
    ];

    const methodsList = methodIds.map(id => {
        const token = METHOD_TOKENS[id] || METHOD_TOKENS.standard;
        return {
            id,
            label: token.label,
            desc: token.description || '',
            icon: token.icon,
            badgeColor: token.badge
        };
    });

    const handleConfirm = () => {
        let config: MethodConfig = { set_method: selectedMethod };

        if (selectedMethod === 'dropset') {
            config.drop_count = Math.max(1, Math.min(5, dropCount));
        } else if (selectedMethod === 'rest_pause') {
            config.sub_sets = Math.max(2, Math.min(6, subSets));
            config.micro_rest_seconds = Math.max(5, Math.min(30, microRest));
        } else if (selectedMethod === 'cluster') {
            config.sub_sets = Math.max(2, Math.min(6, subSets));
            config.micro_rest_seconds = Math.max(10, Math.min(45, microRest));
        } else if (selectedMethod === 'myo_reps') {
            config.activation_reps = Math.max(8, Math.min(30, activationReps));
            config.sub_sets = Math.max(2, Math.min(6, subSets));
            config.micro_rest_seconds = 10;
        } else if (selectedMethod === 'muscle_round') {
            config.sub_sets = 6;
            config.micro_rest_seconds = 10;
        } else if (selectedMethod === 'method_3_7') {
            config.sub_sets = 5;
            config.micro_rest_seconds = 15;
        } else if (selectedMethod === 'fst7') {
            config.sub_sets = 7;
            config.micro_rest_seconds = 30;
        } else if (selectedMethod === 'bfr') {
            config.sub_sets = 4;
            config.micro_rest_seconds = 30;
        }

        onSave(config);
        onClose();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar Método de Intensificação"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl animate-scale-up max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                            <span className="material-symbols-rounded text-xl" aria-hidden="true">bolt</span>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                Método de Intensificação
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Camada 2: Estratégia de fadiga e sub-séries
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar seleção de método"
                        className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-xl"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                {/* Methods List */}
                <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                    {methodsList.map((m) => {
                        const isSelected = selectedMethod === m.id;

                        return (
                            <div
                                key={m.id}
                                className={`rounded-2xl border-2 transition-all p-3 sm:p-3.5 ${
                                    isSelected
                                        ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10'
                                        : 'border-slate-100 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 dark:hover:bg-slate-700'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMethod(m.id)}
                                        className="flex items-center gap-3 text-left flex-1 min-w-0 min-h-[44px]"
                                    >
                                        <div className={`p-2.5 rounded-xl ${m.badgeColor} flex items-center justify-center shrink-0`}>
                                            <span className="material-symbols-rounded text-lg" aria-hidden="true">{m.icon}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-bold text-sm ${isSelected ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                                    {m.label}
                                                </h4>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-1 mt-0.5">
                                                {m.desc}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Action "?" to open Pedagogical Guide */}
                                    {m.id !== 'standard' && (
                                        <button
                                            type="button"
                                            onClick={() => setGuideModalItem(m.id)}
                                            aria-label={`Ver explicação pedagógica de ${m.label}`}
                                            className="min-w-[40px] min-h-[40px] w-9 h-9 flex items-center justify-center text-slate-400 hover:text-primary rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                                            title="Ver explicação completa"
                                        >
                                            <span className="material-symbols-rounded text-base" aria-hidden="true">help</span>
                                        </button>
                                    )}
                                </div>

                                {/* Dynamic Sub-Parameters when selected */}
                                {isSelected && m.id === 'dropset' && (
                                    <div className="mt-3 pt-3 border-t border-primary/20 flex items-center gap-4 animate-fade-in text-xs">
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            Quantidade de Drops (reduções):
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {[1, 2, 3, 4].map((count) => (
                                                <button
                                                    key={count}
                                                    type="button"
                                                    onClick={() => setDropCount(count)}
                                                    className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors flex items-center justify-center ${
                                                        dropCount === count
                                                            ? 'bg-primary text-white shadow-sm'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {count}x
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {isSelected && (m.id === 'rest_pause' || m.id === 'cluster') && (
                                    <div className="mt-3 pt-3 border-t border-primary/20 grid grid-cols-2 gap-3 animate-fade-in text-xs">
                                        <div>
                                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Sub-séries (mini-blocos):
                                            </label>
                                            <input
                                                type="number"
                                                min={2}
                                                max={6}
                                                value={subSets}
                                                onChange={(e) => setSubSets(parseInt(e.target.value) || 3)}
                                                className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Micro-Pausa (segundos):
                                            </label>
                                            <input
                                                type="number"
                                                min={5}
                                                max={60}
                                                step={5}
                                                value={microRest}
                                                onChange={(e) => setMicroRest(parseInt(e.target.value) || 15)}
                                                className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                )}

                                {isSelected && m.id === 'myo_reps' && (
                                    <div className="mt-3 pt-3 border-t border-primary/20 grid grid-cols-2 gap-3 animate-fade-in text-xs">
                                        <div>
                                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Reps na Ativação:
                                            </label>
                                            <input
                                                type="number"
                                                min={8}
                                                max={25}
                                                value={activationReps}
                                                onChange={(e) => setActivationReps(parseInt(e.target.value) || 15)}
                                                className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Mini-Séries (3 a 5 reps):
                                            </label>
                                            <input
                                                type="number"
                                                min={2}
                                                max={6}
                                                value={subSets}
                                                onChange={(e) => setSubSets(parseInt(e.target.value) || 4)}
                                                className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="min-h-[44px] px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm transition-all"
                    >
                        Salvar Método
                    </button>
                </div>
            </div>

            {/* Guide Modal Helper */}
            {guideModalItem && (
                <MethodGuideModal
                    isOpen={!!guideModalItem}
                    onClose={() => setGuideModalItem(null)}
                    initialItemId={guideModalItem}
                    initialLayer="set_method"
                />
            )}
        </div>
    );
};

export default MethodSelectionModal;
