import React, { useEffect, useState } from 'react';

interface ExerciseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
    loading?: boolean;
    isAdmin?: boolean;
}

const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({ isOpen, onClose, onSave, initialData, loading, isAdmin }) => {
    const [formData, setFormData] = useState<any>({
        name: '',
        muscle_group: 'chest',
        video_url: '',
        description: '',
        exercise_type: 'reps',
        muscle_weights: {}
    });

    // Reset or Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    muscle_group: initialData.muscle_group || 'chest',
                    video_url: initialData.video_url || '',
                    description: (initialData.description || '').replace(/\\n/g, '\n'),
                    exercise_type: initialData.exercise_type || 'reps',
                    muscle_weights: initialData.muscle_weights || {}
                });
            } else {
                setFormData({
                    name: '',
                    muscle_group: 'chest',
                    video_url: '',
                    description: '',
                    exercise_type: 'reps',
                    muscle_weights: {}
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const muscleGroups = [
        { value: 'chest', label: 'Peito' },
        { value: 'back', label: 'Costas' },
        { value: 'legs', label: 'Pernas' },
        { value: 'shoulders', label: 'Ombros' },
        { value: 'arms', label: 'Braços' },
        { value: 'abs', label: 'Abdômen' },
        { value: 'cardio', label: 'Cardio' },
        { value: 'full_body', label: 'Outros' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-140px)] animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {initialData ? 'Editar Exercício' : 'Novo Exercício'}
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {/* ID Display (Admin Only) */}
                        {isAdmin && initialData?.id && (
                            <div className="bg-slate-100 dark:bg-slate-800/50 p-2 rounded text-[10px] text-slate-400 font-mono">
                                ID: {initialData.id}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Exercício</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                placeholder="Ex: Supino Reto"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Muscle Group */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Grupo Muscular</label>
                            <select
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white appearance-none"
                                value={formData.muscle_group}
                                onChange={e => setFormData({ ...formData, muscle_group: e.target.value })}
                            >
                                {muscleGroups.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tipo de Exercício */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Exercício</label>
                            <select
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white appearance-none"
                                value={formData.exercise_type}
                                onChange={e => setFormData({ ...formData, exercise_type: e.target.value })}
                            >
                                <option value="reps">Repetições (Musculação Padrão)</option>
                                <option value="time">Tempo (Prancha, Isometria, etc.)</option>
                                <option value="cardio">Cardio (Corrida, HIIT, Bike)</option>
                            </select>
                        </div>

                        {/* Ativação Muscular (Pesos) */}
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Ativação Muscular (Subgrupos)</label>
                                <span className="text-[10px] text-slate-400 font-medium">Valores de 0% a 100%</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                                {[
                                    { key: 'peitoral', label: 'Peitoral' },
                                    { key: 'triceps', label: 'Tríceps' },
                                    { key: 'biceps', label: 'Bíceps' },
                                    { key: 'ombro_anterior', label: 'Ombro Anterior' },
                                    { key: 'ombro_lateral', label: 'Ombro Lateral' },
                                    { key: 'ombro_posterior', label: 'Ombro Posterior' },
                                    { key: 'upperback', label: 'Costas Superior / Trapézio' },
                                    { key: 'latissimo', label: 'Dorsal (Latíssimo)' },
                                    { key: 'quadriceps', label: 'Quadríceps' },
                                    { key: 'gluteos', label: 'Glúteos' },
                                    { key: 'isquiotibiais', label: 'Posterior de Coxa' },
                                    { key: 'adutores', label: 'Adutores' },
                                    { key: 'panturrilha', label: 'Panturrilha' },
                                    { key: 'abs', label: 'Abdômen' },
                                    { key: 'cardio', label: 'Cardio / Aeróbico' },
                                    { key: 'antebraco', label: 'Antebraço' },
                                    { key: 'lombar', label: 'Lombar' }
                                ].map(sub => {
                                    const currentVal = formData.muscle_weights?.[sub.key] ?? 0;
                                    return (
                                        <div key={sub.key} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm gap-2">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">{sub.label}</span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {[0, 0.25, 0.5, 0.75, 1].map(val => {
                                                    const isActive = currentVal === val;
                                                    return (
                                                        <button
                                                            key={val}
                                                            type="button"
                                                            onClick={() => {
                                                                const currentWeights = { ...(formData.muscle_weights || {}) };
                                                                if (val === 0) {
                                                                    delete currentWeights[sub.key];
                                                                } else {
                                                                    currentWeights[sub.key] = val;
                                                                }
                                                                setFormData({ ...formData, muscle_weights: currentWeights });
                                                            }}
                                                            className={`w-10 h-7 flex items-center justify-center text-[10px] font-mono font-bold rounded-lg border transition-all active:scale-95 select-none ${
                                                                isActive
                                                                    ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                            }`}
                                                        >
                                                            {val === 0 ? '0' : val === 1 ? '1' : val.toString()}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Video URL */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Vídeo (YouTube, GIF ou Arquivo MP4 Local)</label>
                            <input
                                type="text"
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                placeholder="https://... ou /exercises/nome.mp4"
                                value={formData.video_url}
                                onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                            />
                            <p className="text-[10px] text-slate-400 mt-1">
                                Aceita URLs do YouTube, links diretos de GIF ou o caminho relativo de vídeo salvo no repositório.
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Observações</label>
                            <textarea
                                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white resize-none h-24"
                                placeholder="Detalhes sobre a execução..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl font-bold !text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExerciseFormModal;
