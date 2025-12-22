import React, { useEffect, useState } from 'react';
import MainLayout from '../../layouts/MainLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ExerciseFormModal from '../../components/coach/exercises/ExerciseFormModal';

interface ExercisesProps {
    isModal?: boolean;
    onSelect?: (exercise: any) => void;
}

const Exercises: React.FC<ExercisesProps> = ({ isModal, onSelect }) => {
    const { user, role } = useAuth();
    const navigate = useNavigate();
    const [exercises, setExercises] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMuscle, setFilterMuscle] = useState('all');

    // Create/Edit Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExercise, setEditingExercise] = useState<any | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);

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

    useEffect(() => {
        if (user) fetchExercises();
    }, [user]);

    const fetchExercises = async () => {
        try {
            setLoading(true);
            // Fetch public excercises OR exercises created by this coach
            const { data, error } = await supabase
                .from('exercises')
                .select('*')
                .or(`is_public.eq.true,owner_id.eq.${user?.id}`)
                .order('name');

            if (error) throw error;
            setExercises(data || []);
        } catch (error) {
            console.error('Error fetching exercises:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: any) => {
        try {
            setSaveLoading(true);
            const payload = {
                name: data.name,
                muscle_group: data.muscle_group,
                video_url: data.video_url,
                description: data.description,
                owner_id: user?.id,
                // Preserve public status if editing, otherwise default to private (false)
                is_public: editingExercise ? editingExercise.is_public : false
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
            fetchExercises();

        } catch (error) {
            console.error(error);
            alert('Erro ao salvar exercício.');
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
            fetchExercises();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir. Pode estar em uso.');
        }
    };

    const filteredExercises = exercises.filter(ex => {
        const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMuscle = filterMuscle === 'all' || ex.muscle_group === filterMuscle;
        return matchesSearch && matchesMuscle;
    });

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
                                        {/* Thumb */}
                                        <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden relative">
                                            {getYoutubeId(ex.video_url) ? (
                                                <img src={`https://img.youtube.com/vi/${getYoutubeId(ex.video_url)}/0.jpg`} className="w-full h-full object-cover" alt="" />
                                            ) : ex.video_url && ex.video_url.match(/\.(jpeg|jpg|gif|png)$/) ? (
                                                <img src={ex.video_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                    <span className="material-symbols-rounded">fitness_center</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white truncate">{ex.name}</h4>
                                            <p className="text-xs text-slate-500">{muscleGroups.find(m => m.value === ex.muscle_group)?.label || ex.muscle_group}</p>
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
        </div>
    );

    if (isModal) return <div className="h-full">{Content}</div>;

    return (
        <MainLayout className="h-screen flex flex-col overflow-hidden">
            <header className="flex-none px-5 py-6 flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-30 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <Link to="/coach/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded text-slate-500">arrow_back</span>
                    </Link>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Exercícios</h1>
                </div>
            </header>
            <main className="flex-1 overflow-hidden relative">
                {Content}
            </main>
        </MainLayout>
    );
};

export default Exercises;
