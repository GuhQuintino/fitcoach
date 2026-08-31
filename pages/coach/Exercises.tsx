import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ExerciseFormModal from '../../components/coach/exercises/ExerciseFormModal';
import VideoPlayerModal from '../../components/shared/VideoPlayerModal';
import VideoThumbnail from '../../components/shared/VideoThumbnail';
import toast from 'react-hot-toast';

interface ExercisesProps {
    isModal?: boolean;
    onSelect?: (exercises: any[]) => void;
}

const Exercises: React.FC<ExercisesProps> = ({ isModal, onSelect }) => {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    // Pagination & Data
    const PAGE_SIZE = 20;
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterMuscle, setFilterMuscle] = useState('all');

    // Selection State (for Modal Mode)
    const [selectedExercises, setSelectedExercises] = useState<any[]>([]);

    // Create/Edit Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);

    // Video Player Modal
    const [videoModal, setVideoModal] = useState<{ open: boolean, url: string, title: string }>({
        open: false, url: '', title: ''
    });

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

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0); // Reset page on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(0);
    }, [filterMuscle]);

    useEffect(() => {
        if (user) {
            // When page is 0, we treat it as a fresh load or reset
            fetchExercises(page === 0);
        }
    }, [user, page, debouncedSearch, filterMuscle]);

    const fetchExercises = async (isReset = false) => {
        try {
            if (isReset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // Use RPC for popularity sorting
            const { data, error } = await supabase.rpc('get_popular_exercises', {
                search_term: debouncedSearch,
                filter_muscle: filterMuscle,
                page_index: page,
                page_size: PAGE_SIZE
            });

            if (error) throw error;

            const newExercises = data || [];
            if (isReset) {
                setExercises(newExercises);
            } else {
                setExercises(prev => {
                    const existingIds = new Set(prev.map(e => e.id));
                    const uniqueNew = newExercises.filter(e => !existingIds.has(e.id));
                    return [...prev, ...uniqueNew];
                });
            }

            setHasMore(newExercises.length === PAGE_SIZE);

        } catch (error) {
            console.error('Error fetching exercises:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Observer for infinite scroll
    const observerTarget = React.useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.5 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [hasMore, loading, loadingMore]);

    const handleSave = async (data: any) => {
        try {
            setSaveLoading(true);
            const payload = {
                name: data.name,
                muscle_group: data.muscle_group,
                video_url: data.video_url,
                description: data.description,
                owner_id: role === 'admin' ? null : user?.id,
                // Admin exercises are always public, coach exercises default to private
                is_public: role === 'admin' ? true : (editingExercise ? editingExercise.is_public : false),
                exercise_type: data.exercise_type || 'reps',
                muscle_weights: data.muscle_weights || {}
            };

            if (editingExercise) {
                const { error } = await supabase
                    .from('exercises')
                    .update(payload)
                    .eq('id', editingExercise.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('exercises')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingExercise(null);
            setEditingExercise(null);
            // Refresh list (reset)
            setPage(0);
            fetchExercises(true);
            toast.success('Exercício salvo com sucesso!');

        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar exercício.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Excluir exercício?')) return;
        try {
            const { error } = await supabase.from('exercises').delete().eq('id', id);
            if (error) throw error;
            // Update local state without fetching for smoothness
            setExercises(prev => prev.filter(e => e.id !== id));
            toast.success('Exercício excluído.');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao excluir. Pode estar em uso.');
        }
    };

    // Toggle selection for Bulk Mode
    const toggleSelection = (exercise: any) => {
        if (!isModal) return;

        const isSelected = selectedExercises.some(e => e.id === exercise.id);
        if (isSelected) {
            setSelectedExercises(prev => prev.filter(e => e.id !== exercise.id));
        } else {
            setSelectedExercises(prev => [...prev, exercise]);
        }
    };

    const confirmSelection = () => {
        if (onSelect) {
            onSelect(selectedExercises);
            setSelectedExercises([]); // Clear after selection
        }
    };

    // Removed client-side filtering logic as we now do it server-side
    // Function kept if needed for other helpers, otherwise unused.
    const filteredExercises = exercises; // Direct usage since we filter on fetch

    const getYoutubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const Content = (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 relative">
            {/* Search & Filters - Fixed at top of content area */}
            <div className={`flex-none p-5 pb-2 ${isModal ? 'bg-white dark:bg-slate-900' : ''}`}>
                <div className="relative mb-3">
                    <span className="absolute left-4 top-3.5 material-symbols-rounded text-slate-400" aria-hidden="true">search</span>
                    <input
                        type="text"
                        placeholder="Buscar exercício..."
                        aria-label="Buscar exercício..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label="Filtro de grupos musculares">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={filterMuscle === 'all'}
                        onClick={() => setFilterMuscle('all')}
                        className={`whitespace-nowrap min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center ${filterMuscle === 'all' ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                        Todos
                    </button>
                    {muscleGroups.map(m => (
                        <button
                            key={m.value}
                            type="button"
                            role="tab"
                            aria-selected={filterMuscle === m.value}
                            onClick={() => setFilterMuscle(m.value)}
                            className={`whitespace-nowrap min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center ${filterMuscle === m.value ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900 shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List - Scrollable */}
            <div className={`flex-1 overflow-y-auto p-5 pt-2 ${isModal ? 'pb-32' : 'pb-24'}`}>
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-10" role="status" aria-live="polite">
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto"></div>
                            <span className="sr-only">Carregando exercícios...</span>
                        </div>
                    ) : (
                        <>
                            {filteredExercises.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mx-5">
                                    <p className="text-slate-500">Nenhum exercício encontrado.</p>
                                </div>
                            ) : (
                                filteredExercises.map(ex => {
                                    const isSelected = selectedExercises.some(s => s.id === ex.id);
                                    return (
                                        <div
                                            key={ex.id}
                                            role={isModal ? "button" : undefined}
                                            tabIndex={isModal ? 0 : undefined}
                                            aria-label={isModal ? `Selecionar exercício ${ex.name}` : undefined}
                                            aria-pressed={isModal ? isSelected : undefined}
                                            onClick={() => {
                                                if (isModal) toggleSelection(ex);
                                            }}
                                            onKeyDown={isModal ? (e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    toggleSelection(ex);
                                                }
                                            } : undefined}
                                            className={`
                                                bg-white dark:bg-slate-800 p-3 rounded-xl border flex items-center gap-4 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none
                                                ${isModal
                                                    ? `cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-100 dark:border-slate-700 hover:border-primary/50'}`
                                                    : 'border-slate-100 dark:border-slate-700'}
                                            `}
                                        >
                                            {/* Thumb - Clicável para abrir vídeo com WAI-ARIA */}
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                aria-label={`Ver vídeo de demonstração de ${ex.name}`}
                                                className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden relative cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (ex.video_url) {
                                                        setVideoModal({ open: true, url: ex.video_url, title: ex.name });
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (ex.video_url) {
                                                            setVideoModal({ open: true, url: ex.video_url, title: ex.name });
                                                        }
                                                    }
                                                }}
                                            >
                                                {getYoutubeId(ex.video_url) ? (
                                                    <>
                                                        <img
                                                            src={`https://img.youtube.com/vi/${getYoutubeId(ex.video_url)}/0.jpg`}
                                                            className="w-full h-full object-cover"
                                                            alt={`Demonstração em vídeo de ${ex.name}`}
                                                            loading="lazy"
                                                        />
                                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="material-symbols-rounded text-white text-2xl" aria-hidden="true">play_circle</span>
                                                        </div>
                                                    </>
                                                ) : ex.video_url && ex.video_url.match(/\.(gif)$/i) ? (
                                                    <img
                                                        src={ex.video_url}
                                                        className="w-full h-full object-cover"
                                                        alt={`Animação de demonstração de ${ex.name}`}
                                                        loading="lazy"
                                                    />
                                                ) : ex.video_url && ex.video_url.match(/\.(jpeg|jpg|png)$/i) ? (
                                                    <img
                                                        src={ex.video_url}
                                                        className="w-full h-full object-cover"
                                                        alt={`Imagem de demonstração de ${ex.name}`}
                                                        loading="lazy"
                                                    />
                                                ) : ex.video_url && ex.video_url.match(/\.mp4($|\?)/i) ? (
                                                    <VideoThumbnail src={ex.video_url} alt={`Vídeo de ${ex.name}`} className="w-full h-full rounded-lg" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <span className="material-symbols-rounded" aria-hidden="true">fitness_center</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-bold truncate ${isSelected ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>{ex.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <p className="text-xs text-slate-500">{muscleGroups.find(m => m.value === ex.muscle_group)?.label || ex.muscle_group}</p>
                                                    {ex.usage_count > 0 && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 flex items-center gap-0.5">
                                                            <span className="material-symbols-rounded text-[10px]">trending_up</span>
                                                            {ex.usage_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions (Only if NOT modal) */}
                                            {!isModal && (role === 'admin' || ex.owner_id === user?.id) && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingExercise(ex);
                                                            setIsModalOpen(true);
                                                        }}
                                                        aria-label={`Editar exercício ${ex.name}`}
                                                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-primary bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <span className="material-symbols-rounded" aria-hidden="true">edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDelete(ex.id, e)}
                                                        aria-label={`Excluir exercício ${ex.name}`}
                                                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <span className="material-symbols-rounded" aria-hidden="true">delete</span>
                                                    </button>
                                                </div>
                                            )}
                                            {/* Selection Indicator */}
                                            {isModal && (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-300'}`}>
                                                    <span className="material-symbols-rounded">{isSelected ? 'check' : 'add'}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {loadingMore && (
                                <div className="text-center py-4" role="status" aria-live="polite">
                                    <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto"></div>
                                    <span className="sr-only">Carregando mais exercícios...</span>
                                </div>
                            )}

                            {/* Observer Target */}
                            <div ref={observerTarget} className="h-4"></div>

                            {/* Create Button - Relative at bottom of List */}
                            {!isModal && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingExercise(null);
                                        setIsModalOpen(true);
                                    }}
                                    className="w-full mt-6 min-h-[44px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold hover:opacity-90 transition-all active:scale-[0.98]"
                                >
                                    <span className="material-symbols-rounded">add</span>
                                    Criar Exercício
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {isModal && selectedExercises.length > 0 && (
                <div className="fixed bottom-24 left-0 right-0 p-4 z-50 animate-slide-up pointer-events-none">
                    <div className="max-w-md mx-auto pointer-events-auto">
                        <button
                            onClick={confirmSelection}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-rounded">check_circle</span>
                            Adicionar ({selectedExercises.length})
                        </button>
                    </div>
                </div>
            )}

            <ExerciseFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingExercise}
                loading={saveLoading}
                isAdmin={role === 'admin'}
            />

            <VideoPlayerModal
                isOpen={videoModal.open}
                onClose={() => setVideoModal({ ...videoModal, open: false })}
                videoUrl={videoModal.url}
                title={videoModal.title}
            />
        </div>
    );

    if (isModal) return <div className="h-full">{Content}</div>;

    return (
        <MainLayout>
            <header className="flex-none px-5 py-6 flex items-center justify-between bg-white dark:bg-slate-900 z-30 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <Link
                        to="/coach/dashboard"
                        aria-label="Voltar para a dashboard"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded text-slate-500" aria-hidden="true">arrow_back</span>
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Exercícios</h1>
                </div>

                {/* Header Action Button */}
                {!isModal && (
                    <button
                        type="button"
                        onClick={() => {
                            setEditingExercise(null);
                            setIsModalOpen(true);
                        }}
                        aria-label="Criar novo exercício"
                        className="min-h-[44px] p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 px-3"
                    >
                        <span className="material-symbols-rounded text-xl">add</span>
                        <span className="text-sm font-bold hidden xs:inline">Novo</span>
                    </button>
                )}
            </header>
            <div className="flex-1 overflow-hidden relative">
                {Content}
            </div>
        </MainLayout>
    );
};

export default Exercises;
