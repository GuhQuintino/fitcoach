import React from 'react';

interface RPEGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RPEGuideModal: React.FC<RPEGuideModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const rpeScale = [
        { val: 10, label: 'Esforço Máximo', desc: 'Falha total. Nenhuma repetição extra possível.', color: 'text-red-600' },
        { val: 9, label: 'Muito Intenso', desc: '1 repetição de reserva (RIR 1).', color: 'text-red-500' },
        { val: 8, label: 'Intenso', desc: '2 repetições de reserva (RIR 2).', color: 'text-orange-500' },
        { val: 7, label: 'Vigoroso', desc: '3 repetições de reserva. Ritmo desafiador.', color: 'text-yellow-500' },
        { val: 56, label: 'Moderado', desc: '4 a 6 repetições de reserva. Aquecimento.', color: 'text-green-500' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary">fitness_center</span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Guia de PSE</h3>
                    </div>

                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <p className="text-sm text-slate-500 mb-4">
                    PSE (Percepção Subjetiva de Esforço) ajuda a medir a intensidade da série baseada em quantas repetições você ainda conseguiria fazer.
                </p>

                <div className="space-y-3">
                    {rpeScale.map((item) => (
                        <div key={item.val} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                            <div className={`font-black text-xl w-8 text-center ${item.color}`}>
                                {item.val === 56 ? '5-6' : item.val}
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-bold text-sm ${item.color}`}>{item.label}</h4>
                                <p className="text-xs text-slate-500">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RPEGuideModal;
