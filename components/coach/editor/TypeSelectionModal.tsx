import React from 'react';

interface TypeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'warmup' | 'working' | 'failure' | 'dropset' | 'preparation') => void;
    currentType: string;
}

const TypeSelectionModal: React.FC<TypeSelectionModalProps> = ({ isOpen, onClose, onSelect, currentType }) => {
    if (!isOpen) return null;

    const types = [
        {
            id: 'warmup',
            label: 'Aquecimento',
            icon: 'local_fire_department',
            color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
            desc: 'Série com carga reduzida para preparar a articulação e o músculo.'
        },
        {
            id: 'preparation',
            label: 'Preparação / Feeder',
            icon: 'publish', // Icon for ramping up
            color: 'text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30',
            desc: 'Série com poucas repetições para aclimatar com a carga, sem gerar fadiga.'
        },
        {
            id: 'working',
            label: 'Trabalho (Normal)',
            icon: 'fitness_center', // Or shows Number in UI
            color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
            desc: 'Série principal do treino. Focar na execução e carga alvo.'
        },
        {
            id: 'failure',
            label: 'Falha',
            icon: 'bolt',
            color: 'text-red-500 bg-red-100 dark:bg-red-900/30',
            desc: 'Executar o máximo de repetições possíveis até a falha concêntrica.'
        },
        {
            id: 'dropset',
            label: 'Dropset',
            icon: 'layers',
            color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
            desc: 'Realizar série até a falha, reduzir a carga e continuar sem descanso.'
        }
    ];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar tipo de série"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div className="bg-white dark:bg-slate-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up sm:animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tipo de Série</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar seleção de tipo de série"
                        className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-xl"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                <div className="space-y-3">
                    {types.map((type) => (
                        <button
                            key={type.id}
                            type="button"
                            onClick={() => {
                                onSelect(type.id as any);
                                onClose();
                            }}
                            className={`w-full min-h-[44px] flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group
                                ${currentType === type.id
                                    ? 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10'
                                    : 'border-slate-100 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 bg-slate-50 dark:bg-slate-700/50'
                                }
                            `}
                        >
                            <div className={`p-3 rounded-full ${type.color} transition-transform group-hover:scale-110 flex items-center justify-center`}>
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">{type.icon}</span>
                            </div>
                            <div>
                                <h4 className={`font-bold transition-colors ${currentType === type.id ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                    {type.label}
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                                    {type.desc}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TypeSelectionModal;
