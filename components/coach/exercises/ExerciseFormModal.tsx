import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import toast from 'react-hot-toast';

interface ExerciseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
    loading?: boolean;
    isAdmin?: boolean;
}

const isVideoMedia = (url?: string | null): boolean => {
    if (!url) return false;
    return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
};

const ExerciseFormModal: React.FC<ExerciseFormModalProps> = ({ isOpen, onClose, onSave, initialData, loading, isAdmin }) => {
    const [formData, setFormData] = useState<any>({
        name: '',
        muscle_group: 'chest',
        video_url: '',
        image_url: '',
        description: '',
        exercise_type: 'reps',
        muscle_weights: {}
    });
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const mediaInputRef = useRef<HTMLInputElement>(null);

    // Reset or Load data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    muscle_group: initialData.muscle_group || 'chest',
                    video_url: initialData.video_url || initialData.image_url || '',
                    image_url: initialData.image_url || '',
                    description: (initialData.description || '').replace(/\\n/g, '\n'),
                    exercise_type: initialData.exercise_type || 'reps',
                    muscle_weights: initialData.muscle_weights || {}
                });
            } else {
                setFormData({
                    name: '',
                    muscle_group: 'chest',
                    video_url: '',
                    image_url: '',
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

    const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = [
            'image/gif',
            'image/webp',
            'image/png',
            'image/jpeg',
            'video/mp4',
            'video/webm'
        ];

        if (!allowedTypes.includes(file.type) && !/\.(gif|webp|png|jpe?g|mp4|webm)$/i.test(file.name)) {
            toast.error('Formato inválido. Use GIF, WebP, PNG, JPG, MP4 ou WebM.');
            return;
        }

        if (file.size > 15 * 1024 * 1024) {
            toast.error('O arquivo deve ter no máximo 15 MB.');
            return;
        }

        setUploadingMedia(true);
        try {
            const ext = (file.name.split('.').pop() || 'gif').toLowerCase();
            const safeSlug = (formData.name || 'exercicio')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'media';
            const filePath = `custom/${Date.now()}-${safeSlug}.${ext}`;

            const candidateBuckets = ['exercises', 'evolution-photos', 'avatars'];
            let uploadedBucket: string | null = null;
            let lastUploadError: any = null;

            for (const bucket of candidateBuckets) {
                const { error } = await supabase.storage
                    .from(bucket)
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true,
                        contentType: file.type || undefined
                    });

                if (!error) {
                    uploadedBucket = bucket;
                    break;
                }
                lastUploadError = error;
            }

            if (!uploadedBucket) {
                throw lastUploadError || new Error('Falha ao fazer upload para o Storage.');
            }

            const { data: { publicUrl } } = supabase.storage
                .from(uploadedBucket)
                .getPublicUrl(filePath);

            const isImageOrGif = file.type.startsWith('image/') || /\.(gif|webp|png|jpe?g)$/i.test(file.name);

            setFormData((prev: any) => ({
                ...prev,
                video_url: publicUrl,
                image_url: isImageOrGif ? publicUrl : prev.image_url
            }));

            toast.success('Mídia enviada com sucesso!');
        } catch (err: any) {
            console.error('[ExerciseFormModal] Erro ao enviar mídia:', err);
            toast.error(err?.message || 'Erro ao fazer upload da mídia.');
        } finally {
            setUploadingMedia(false);
            if (mediaInputRef.current) {
                mediaInputRef.current.value = '';
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    const previewUrl = formData.video_url || formData.image_url;
    const isYoutubePreview = previewUrl && /youtube\.com|youtu\.be/i.test(previewUrl);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={initialData ? 'Editar Exercício' : 'Novo Exercício'}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-140px)] animate-scale-up" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                        {initialData ? 'Editar Exercício' : 'Novo Exercício'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar formulário de exercício"
                        className="min-w-[44px] min-h-[44px] p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <span className="material-symbols-rounded" aria-hidden="true">close</span>
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
                            <label htmlFor="ex-form-name" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Exercício</label>
                            <input
                                id="ex-form-name"
                                type="text"
                                required
                                className="w-full min-h-[44px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                placeholder="Ex: Supino Reto"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Muscle Group */}
                        <div>
                            <label htmlFor="ex-form-group" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Grupo Muscular</label>
                            <select
                                id="ex-form-group"
                                className="w-full min-h-[44px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white appearance-none"
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
                            <label htmlFor="ex-form-type" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Exercício</label>
                            <select
                                id="ex-form-type"
                                className="w-full min-h-[44px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white appearance-none"
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
                                <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">Ativação Muscular (Subgrupos)</span>
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium tabular-nums">Valores de 0% a 100%</span>
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
                                                            aria-label={`Definir ativação de ${sub.label} para ${val * 100}%`}
                                                            onClick={() => {
                                                                const currentWeights = { ...(formData.muscle_weights || {}) };
                                                                if (val === 0) {
                                                                    delete currentWeights[sub.key];
                                                                } else {
                                                                    currentWeights[sub.key] = val;
                                                                }
                                                                setFormData({ ...formData, muscle_weights: currentWeights });
                                                            }}
                                                            className={`min-w-[40px] min-h-[36px] w-10 h-9 flex items-center justify-center text-[10px] font-mono font-bold tabular-nums rounded-lg border transition-all active:scale-95 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                                                isActive
                                                                    ? 'bg-sky-500 border-sky-500 text-white shadow-sm'
                                                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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

                        {/* Video / GIF / Image URL + Direct Upload */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                                <label htmlFor="ex-form-video" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Mídia do Exercício (URL ou Upload de GIF/Vídeo)
                                </label>
                                <input
                                    ref={mediaInputRef}
                                    type="file"
                                    accept="image/gif,image/webp,image/png,image/jpeg,video/mp4,video/webm"
                                    onChange={handleMediaFileUpload}
                                    disabled={uploadingMedia}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => mediaInputRef.current?.click()}
                                    disabled={uploadingMedia}
                                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                                >
                                    {uploadingMedia ? (
                                        <span className="w-3.5 h-3.5 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" aria-hidden="true" />
                                    ) : (
                                        <span className="material-symbols-rounded text-base" aria-hidden="true">upload_file</span>
                                    )}
                                    {uploadingMedia ? 'Enviando...' : 'Enviar GIF / Vídeo'}
                                </button>
                            </div>
                            <input
                                id="ex-form-video"
                                type="text"
                                className="w-full min-h-[44px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none text-slate-900 dark:text-white"
                                placeholder="https://... ou /exercises/nome.gif"
                                value={formData.video_url}
                                onChange={e => setFormData({
                                    ...formData,
                                    video_url: e.target.value,
                                    image_url: /\.(gif|webp|png|jpe?g)(\?.*)?$/i.test(e.target.value) ? e.target.value : formData.image_url
                                })}
                            />
                            <p className="text-[10px] text-slate-600 dark:text-slate-300">
                                Cole uma URL (YouTube, GIF, MP4) ou envie um arquivo GIF, WebP, PNG ou MP4 diretamente do seu dispositivo.
                            </p>

                            {previewUrl && !isYoutubePreview && (
                                <div className="mt-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                                        {isVideoMedia(previewUrl) ? (
                                            <video
                                                src={previewUrl}
                                                className="w-full h-full object-cover"
                                                muted
                                                loop
                                                playsInline
                                                autoPlay
                                            />
                                        ) : (
                                            <img
                                                src={previewUrl}
                                                alt="Pré-visualização da mídia do exercício"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Pré-visualização da mídia</p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{previewUrl}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="ex-form-desc" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição / Observações</label>
                            <textarea
                                id="ex-form-desc"
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
                            aria-label="Cancelar e fechar formulário"
                            className="flex-1 min-h-[44px] py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || uploadingMedia}
                            aria-label="Salvar exercício"
                            className="flex-1 min-h-[44px] py-3 rounded-xl font-bold !text-white bg-sky-500 hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                        >
                            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status" />}
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExerciseFormModal;
