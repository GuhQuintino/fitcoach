import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SetTemplateManagerProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'save' | 'load';
    currentSets?: any[]; // For saving
    onLoad?: (sets: any[]) => void;
}

const SetTemplateManager: React.FC<SetTemplateManagerProps> = ({ isOpen, onClose, mode, currentSets, onLoad }) => {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Save Mode State
    const [templateName, setTemplateName] = useState('');

    useEffect(() => {
        if (isOpen && mode === 'load') {
            fetchTemplates();
        }
        setTemplateName('');
    }, [isOpen, mode]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('set_templates')
                .select('*')
                .eq('coach_id', user!.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            toast.error('Erro ao carregar templates.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!templateName.trim()) return toast.error('Nome do template é obrigatório.');
        if (!currentSets || currentSets.length === 0) return toast.error('Nenhuma série para salvar.');

        setLoading(true);
        try {
            // Clean sets for JSON storage (remove IDs, etc)
            const setsData = currentSets.map(s => ({
                type: s.type,
                weight_target: s.weight_target,
                reps_target: s.reps_target,
                rest_seconds: s.rest_seconds,
                rpe_target: s.rpe_target
            }));

            const { error } = await supabase.from('set_templates').insert({
                coach_id: user!.id,
                name: templateName,
                sets: setsData // Renamed from 'sets_data' to 'sets' to match SQL
            });

            if (error) throw error;

            toast.success('Template salvo!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar template.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = (template: any) => {
        if (onLoad && template.sets) {
            // Map back to editor structure if needed (though structure should match)
            const formattedSets = template.sets.map((s: any, i: number) => ({
                ...s,
                id: `loaded-${Date.now()}-${i}`,
                set_order: i + 1,
                // Ensure defaults for older templates if schema changes
                type: s.type || 'working',
                weight_target: s.weight_target || '',
                reps_target: s.reps_target || '',
                rest_seconds: s.rest_seconds || '60',
                rpe_target: s.rpe_target || '8'
            }));
            onLoad(formattedSets);
            onClose();
            toast.success('Template aplicado!');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Excluir este template?')) return;

        try {
            const { error } = await supabase.from('set_templates').delete().eq('id', id);
            if (error) throw error;
            setTemplates(prev => prev.filter(t => t.id !== id));
            toast.success('Template removido.');
        } catch (error) {
            toast.error('Erro ao excluir.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5 bg-black/70 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl flex flex-col max-h-[85vh] shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                        {mode === 'save' ? 'Salvar Template' : 'Carregar Template'}
                    </h3>
                    <button onClick={onClose}><span className="material-symbols-rounded text-slate-400">close</span></button>
                </div>

                <div className="p-4 overflow-y-auto">
                    {mode === 'save' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Template</label>
                                <input
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Ex: Hipertrofia Padrão (4x10)"
                                    value={templateName}
                                    onChange={e => setTemplateName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                {loading ? 'Salvando...' : 'Salvar Template'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {loading ? (
                                <div className="text-center py-4"><span className="animate-spin material-symbols-rounded">progress_activity</span></div>
                            ) : templates.length === 0 ? (
                                <p className="text-center text-slate-500 text-sm py-4">Nenhum template salvo.</p>
                            ) : (
                                templates.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => handleLoad(t)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer group"
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</h4>
                                            <p className="text-xs text-slate-500">{(t.sets || []).length} séries</p>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, t.id)}
                                            className="p-1 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <span className="material-symbols-rounded text-lg">delete</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SetTemplateManager;
