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
    onSelect?: (exercise: any) => void;
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
                is_public: role === 'admin' ? true : (editingExercise ? editingExercise.is_public : false)
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
                    <span className="absolute left-4 top-3.5 material-symbols-rounded text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Buscar exercício..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setFilterMuscle('all')}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterMuscle === 'all' ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                    >
                        Todos
                    </button>
                    {muscleGroups.map(m => (
                        <button
                            key={m.value}
                            onClick={() => setFilterMuscle(m.value)}
                            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${filterMuscle === m.value ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 pt-2 pb-24">
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></div>
                    ) : (
                        <>
                            {filteredExercises.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl mx-5">
                                    <p className="text-slate-500">Nenhum exercício encontrado.</p>
                                </div>
                            ) : (
                                filteredExercises.map(ex => (
                                    <div
                                        key={ex.id}
                                        onClick={() => {
                                            if (isModal && onSelect) onSelect(ex);
                                        }}
                                        className={`
                                            bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-4 transition-all
                                            ${isModal ? 'cursor-pointer hover:border-primary active:scale-[0.98]' : ''}
                                        `}
                                    >
                                        {/* Thumb - Clicável para abrir vídeo */}
                                        <div
                                            className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden relative cursor-pointer group"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (ex.video_url) {
                                                    setVideoModal({ open: true, url: ex.video_url, title: ex.name });
                                                }
                                            }}
                                        >
                                            {getYoutubeId(ex.video_url) ? (
                                                <>
                                                    <img src={`https://img.youtube.com/vi/${getYoutubeId(ex.video_url)}/0.jpg`} className="w-full h-full object-cover" alt="" />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="material-symbols-rounded text-white text-2xl">play_circle</span>
                                                    </div>
                                                </>
                                            ) : ex.video_url && ex.video_url.match(/\.(gif)$/i) ? (
                                                <img src={ex.video_url} className="w-full h-full object-cover" alt="" />
                                            ) : ex.video_url && ex.video_url.match(/\.(jpeg|jpg|png)$/i) ? (
                                                <img src={ex.video_url} className="w-full h-full object-cover" alt="" />
                                            ) : ex.video_url && ex.video_url.match(/\.mp4($|\?)/i) ? (
                                                <VideoThumbnail src={ex.video_url} className="w-full h-full rounded-lg" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <span className="material-symbols-rounded">fitness_center</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate">{ex.name}</h4>
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingExercise(ex);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-primary bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <span className="material-symbols-rounded">edit</span>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(ex.id, e)}
                                                    className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-700/50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <span className="material-symbols-rounded">delete</span>
                                                </button>
                                            </div>
                                        )}
                                        {/* Selection Indicator */}
                                        {isModal && (
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="material-symbols-rounded">add</span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}

                            {loadingMore && (
                                <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                                </div>
                            )}

                            {/* Observer Target */}
                            <div ref={observerTarget} className="h-4"></div>

                            {/* Create Button - Relative at bottom of List */}
                            <button
                                onClick={() => {
                                    setEditingExercise(null);
                                    setIsModalOpen(true);
                                }}
                                className="w-full mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 font-bold hover:opacity-90 transition-all active:scale-[0.98]"
                            >
                                <span className="material-symbols-rounded">add</span>
                                Criar Exercício
                            </button>
                        </>
                    )}
                </div>
            </div>

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
                    <Link to="/coach/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded text-slate-500">arrow_back</span>
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Exercícios</h1>
                </div>

                {/* Header Action Button */}
                {!isModal && (
                    <button
                        onClick={() => {
                            setEditingExercise(null);
                            setIsModalOpen(true);
                        }}
                        className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 px-3"
                    >
                        <span className="material-symbols-rounded text-xl">add</span>
                        <span className="text-sm font-bold hidden xs:inline">Novo</span>
                    </button>
                )}
            </header>
            <main className="flex-1 overflow-hidden relative">
                {Content}
            </main>
        </MainLayout>
    );
};

export default Exercises;
