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
    const [formData, setFormData] = useState({
        name: '',
        muscle_group: 'chest',
        video_url: '',
        description: ''
    });

    // Reset or Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    muscle_group: initialData.muscle_group || 'chest',
                    video_url: initialData.video_url || '',
                    description: (initialData.description || '').replace(/\\n/g, '\n')
                });
            } else {
                setFormData({
                    name: '',
                    muscle_group: 'chest',
                    video_url: '',
                    description: ''
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
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {initialData ? 'Editar Exercício' : 'Novo Exercício'}
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

                    {/* Video URL */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Vídeo (YouTube ou GIF)</label>
                        <input
                            type={isAdmin ? "text" : "url"}
                            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                            placeholder={isAdmin ? "https://... ou caminho/local.gif" : "https://youtube.com/... ou .gif"}
                            value={formData.video_url}
                            onChange={e => setFormData({ ...formData, video_url: e.target.value })}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            {isAdmin
                                ? "Admins podem usar qualquer formato (URL ou caminho local)."
                                : "Cole o link do YouTube ou um link direto de GIF."}
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

                    <div className="pt-4 flex gap-3">
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
                            className="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
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
