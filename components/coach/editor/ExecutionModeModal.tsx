import React, { useState, useEffect } from 'react';
import MethodGuideModal from '../../shared/MethodGuideModal';
import { EXECUTION_MODE_TOKENS } from '../../../utils/specialSetTokens';

export interface ExecutionConfig {
    execution_mode: 'standard' | 'tempo' | 'pause_reps' | 'deadstop' | 'ponto_zero' | 'lengthened_partial' | 'twenty_ones' | 'one_and_half' | 'negative' | 'forced_reps';
    tempo?: string | null;
}

interface ExecutionModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentExecutionMode?: string;
    currentTempo?: string | null;
    onSave: (config: ExecutionConfig) => void;
}

const ExecutionModeModal: React.FC<ExecutionModeModalProps> = ({
    isOpen,
    onClose,
    currentExecutionMode = 'standard',
    currentTempo = '',
    onSave
}) => {
    const [selectedMode, setSelectedMode] = useState<ExecutionConfig['execution_mode']>(
        (currentExecutionMode as ExecutionConfig['execution_mode']) || 'standard'
    );
    const [tempoDigits, setTempoDigits] = useState({
        eccentric: '3',
        bottomPause: '0',
        concentric: '1',
        topPause: '0'
    });
    const [guideModalItem, setGuideModalItem] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedMode((currentExecutionMode as ExecutionConfig['execution_mode']) || 'standard');

            if (currentTempo && currentTempo.includes('-')) {
                const parts = currentTempo.split('-');
                if (parts.length >= 4) {
                    setTempoDigits({
                        eccentric: parts[0] || '3',
                        bottomPause: parts[1] || '0',
                        concentric: parts[2] || '1',
                        topPause: parts[3] || '0'
                    });
                }
            } else {
                setTempoDigits({
                    eccentric: '3',
                    bottomPause: '0',
                    concentric: '1',
                    topPause: '0'
                });
            }
        }
    }, [isOpen, currentExecutionMode, currentTempo]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modeIds: Array<ExecutionConfig['execution_mode']> = [
        'standard',
        'tempo',
        'pause_reps',
        'deadstop',
        'ponto_zero',
        'lengthened_partial',
        'twenty_ones',
        'one_and_half',
        'negative',
        'forced_reps'
    ];

    const modesList = modeIds.map(id => {
        const token = EXECUTION_MODE_TOKENS[id] || EXECUTION_MODE_TOKENS.standard;
        return {
            id,
            label: token.label,
            desc: token.description || '',
            icon: token.icon,
            badgeColor: token.badge
        };
    });

    const formattedTempoString = `${tempoDigits.eccentric}-${tempoDigits.bottomPause}-${tempoDigits.concentric}-${tempoDigits.topPause}`;

    const handleConfirm = () => {
        const config: ExecutionConfig = {
            execution_mode: selectedMode,
            tempo: selectedMode === 'tempo' ? formattedTempoString : null
        };
        onSave(config);
        onClose();
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar Modo de Execução do Rep"
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
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                            <span className="material-symbols-rounded text-xl" aria-hidden="true">speed</span>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                Modo de Execução do Rep
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Camada 3: Biomecânica, cadência e tempo sob tensão
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar seleção de execução"
                        className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-xl"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                {/* Modes List */}
                <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                    {modesList.map((m) => {
                        const isSelected = selectedMode === m.id;

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
                                        onClick={() => setSelectedMode(m.id)}
                                        className="flex items-center gap-3 text-left flex-1 min-w-0 min-h-[44px]"
                                    >
                                        <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-primary text-white shadow-sm' : m.badgeColor} flex items-center justify-center shrink-0`}>
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

                                {/* Tempo 4-digits Input when 'tempo' is selected */}
                                {isSelected && m.id === 'tempo' && (
                                    <div className="mt-3 pt-3 border-t border-primary/20 space-y-2 animate-fade-in text-xs">
                                        <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                                            <span>Cadência Notação (Segundos):</span>
                                            <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-md font-black text-sm">
                                                {formattedTempoString}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                                    Descida (E)
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    value={tempoDigits.eccentric}
                                                    onChange={(e) => setTempoDigits(prev => ({ ...prev, eccentric: e.target.value.replace(/\D/g, '') || '0' }))}
                                                    className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                                    Pausa Inf.
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    value={tempoDigits.bottomPause}
                                                    onChange={(e) => setTempoDigits(prev => ({ ...prev, bottomPause: e.target.value.replace(/\D/g, '') || '0' }))}
                                                    className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                                    Subida (C)
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    value={tempoDigits.concentric}
                                                    onChange={(e) => setTempoDigits(prev => ({ ...prev, concentric: e.target.value.replace(/[^0-9xX]/g, '') || '1' }))}
                                                    className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                                                    Pausa Sup.
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    value={tempoDigits.topPause}
                                                    onChange={(e) => setTempoDigits(prev => ({ ...prev, topPause: e.target.value.replace(/\D/g, '') || '0' }))}
                                                    className="w-full h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-primary"
                                                />
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                            Exemplo: <strong>{formattedTempoString}</strong> = {tempoDigits.eccentric}s descendo, {tempoDigits.bottomPause}s segurando no estiramento, {tempoDigits.concentric}s subindo, {tempoDigits.topPause}s em contração no topo.
                                        </p>
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
                        Salvar Execução
                    </button>
                </div>
            </div>

            {/* Guide Modal Helper */}
            {guideModalItem && (
                <MethodGuideModal
                    isOpen={!!guideModalItem}
                    onClose={() => setGuideModalItem(null)}
                    initialItemId={guideModalItem}
                    initialLayer="execution_mode"
                />
            )}
        </div>
    );
};

export default ExecutionModeModal;
