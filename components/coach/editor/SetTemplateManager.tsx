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

export const serializeSetForTemplate = (s: any) => ({
    // Basic
    type: s.type || 'working',
    weight_target: s.weight_target ?? '',
    reps_target: s.reps_target ?? '',
    rest_seconds: s.rest_seconds ?? '60',
    rpe_target: s.rpe_target ?? '8',
    notes: s.notes ?? null,
    // Layers 2, 3, 4 (Advanced Methods, Execution Modes, Tempo & Timer)
    set_method: s.set_method ?? 'normal',
    drop_count: s.drop_count ?? null,
    sub_sets: Array.isArray(s.sub_sets) ? s.sub_sets : null,
    micro_rest_seconds: s.micro_rest_seconds ?? null,
    activation_reps: s.activation_reps ?? null,
    execution_mode: s.execution_mode ?? 'normal',
    tempo: s.tempo ?? null,
    timer_mode: s.timer_mode ?? 'normal',
    // Cardio & HIIT
    time_target: s.time_target ?? null,
    distance_target: s.distance_target ?? null,
    speed_target: s.speed_target ?? null,
    incline_target: s.incline_target ?? null,
    is_hiit: s.is_hiit ?? false,
    hiit_work_seconds: s.hiit_work_seconds ?? null,
    hiit_rest_seconds: s.hiit_rest_seconds ?? null,
    hiit_rounds: s.hiit_rounds ?? null,
    hiit_cycles: s.hiit_cycles ?? null,
    hiit_work_speed: s.hiit_work_speed ?? null,
    hiit_rest_speed: s.hiit_rest_speed ?? null
});

export const serializeSetsForTemplate = (sets: any[]): any[] => {
    if (!Array.isArray(sets)) return [];
    return sets.map(serializeSetForTemplate);
};

export const deserializeTemplateSet = (s: any, index: number, timestamp: number = Date.now()) => ({
    ...s,
    id: `loaded-${timestamp}-${index}`,
    set_order: index + 1,
    // Basic defaults
    type: s.type || 'working',
    weight_target: s.weight_target ?? '',
    reps_target: s.reps_target ?? '',
    rest_seconds: s.rest_seconds ?? '60',
    rpe_target: s.rpe_target ?? '8',
    notes: s.notes ?? null,
    // Layers 2, 3, 4 defaults
    set_method: s.set_method ?? 'normal',
    drop_count: s.drop_count ?? null,
    sub_sets: Array.isArray(s.sub_sets) ? s.sub_sets : null,
    micro_rest_seconds: s.micro_rest_seconds ?? null,
    activation_reps: s.activation_reps ?? null,
    execution_mode: s.execution_mode ?? 'normal',
    tempo: s.tempo ?? null,
    timer_mode: s.timer_mode ?? 'normal',
    // Cardio & HIIT defaults
    time_target: s.time_target ?? null,
    distance_target: s.distance_target ?? null,
    speed_target: s.speed_target ?? null,
    incline_target: s.incline_target ?? null,
    is_hiit: s.is_hiit ?? false,
    hiit_work_seconds: s.hiit_work_seconds ?? null,
    hiit_rest_seconds: s.hiit_rest_seconds ?? null,
    hiit_rounds: s.hiit_rounds ?? null,
    hiit_cycles: s.hiit_cycles ?? null,
    hiit_work_speed: s.hiit_work_speed ?? null,
    hiit_rest_speed: s.hiit_rest_speed ?? null
});

export const deserializeTemplateSets = (sets: any[], timestamp: number = Date.now()): any[] => {
    if (!Array.isArray(sets)) return [];
    return sets.map((s, idx) => deserializeTemplateSet(s, idx, timestamp));
};

const getTemplateHighlights = (sets: any[]): string[] => {
    if (!Array.isArray(sets) || sets.length === 0) return [];
    const badges = new Set<string>();

    for (const s of sets) {
        if (s.set_method && s.set_method !== 'normal') {
            const methodLabels: Record<string, string> = {
                dropset: 'Dropset',
                rest_pause: 'Rest-Pause',
                cluster: 'Cluster',
                myo_reps: 'Myo-Reps'
            };
            badges.add(methodLabels[s.set_method] || s.set_method);
        }
        if (s.execution_mode && s.execution_mode !== 'normal') {
            const execLabels: Record<string, string> = {
                unilateral: 'Unilateral',
                alternating: 'Alternado',
                isometric_peak: 'Pico Isométrico',
                paused: 'Pausado',
                slow_eccentric: 'Excêntrica Lenta'
            };
            badges.add(execLabels[s.execution_mode] || s.execution_mode);
        }
        if (s.tempo) {
            badges.add(`Cadência ${s.tempo}`);
        }
        if (s.is_hiit) {
            badges.add('HIIT');
        }
    }

    return Array.from(badges);
};

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
            const setsData = serializeSetsForTemplate(currentSets);

            const { error } = await supabase.from('set_templates').insert({
                coach_id: user!.id,
                name: templateName.trim(),
                sets: setsData
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
            const formattedSets = deserializeTemplateSets(template.sets);
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
        <div
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'save' ? 'Salvar Template de Séries' : 'Carregar Template de Séries'}
            className="fixed inset-0 z-[70] flex items-center justify-center p-5 bg-black/70 animate-fade-in"
        >
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl flex flex-col max-h-[85vh] shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                        {mode === 'save' ? 'Salvar Template' : 'Carregar Template'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar janela de templates"
                        className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
                    </button>
                </div>

                <div className="p-4 overflow-y-auto">
                    {mode === 'save' ? (
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="template-name-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Template</label>
                                <input
                                    id="template-name-input"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white min-h-[44px]"
                                    placeholder="Ex: Hipertrofia Padrão (4x10)"
                                    value={templateName}
                                    onChange={e => setTemplateName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                aria-label="Confirmar e salvar template"
                                className="w-full min-h-[44px] py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                {loading ? 'Salvando...' : 'Salvar Template'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {loading ? (
                                <div className="text-center py-4 flex justify-center" role="status" aria-live="polite">
                                    <span className="animate-spin material-symbols-rounded text-primary" aria-hidden="true">progress_activity</span>
                                </div>
                            ) : templates.length === 0 ? (
                                <p className="text-center text-slate-600 dark:text-slate-300 text-sm py-4">Nenhum template salvo.</p>
                            ) : (
                                templates.map(t => {
                                    const highlights = getTemplateHighlights(t.sets || []);
                                    return (
                                        <div
                                            key={t.id}
                                            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 group"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => handleLoad(t)}
                                                aria-label={`Carregar template ${t.name}`}
                                                className="flex-1 text-left min-h-[44px] flex flex-col justify-center pr-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            >
                                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</h4>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 tabular-nums">{(t.sets || []).length} séries</span>
                                                    {highlights.map(badge => (
                                                        <span
                                                            key={badge}
                                                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 tabular-nums"
                                                        >
                                                            {badge}
                                                        </span>
                                                    ))}
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDelete(e, t.id)}
                                                aria-label={`Excluir template ${t.name}`}
                                                className="min-w-[44px] min-h-[44px] p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                            >
                                                <span className="material-symbols-rounded text-lg" aria-hidden="true">delete</span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SetTemplateManager;
