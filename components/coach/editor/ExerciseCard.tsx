import React, { useState } from 'react';
import TypeSelectionModal from './TypeSelectionModal';
import RPEGuideModal from './RPEGuideModal';
import VideoPlayerModal from '../../shared/VideoPlayerModal';
import ExerciseHistoryModal from '../../shared/ExerciseHistoryModal';
import VideoThumbnail from '../../shared/VideoThumbnail';
import toast from 'react-hot-toast';
import SetTemplateManager from './SetTemplateManager';

export interface Set {
    id: string;
    set_order: number;
    type: 'warmup' | 'working' | 'failure' | 'dropset' | 'preparation';
    weight_target?: string;
    reps_target: string;
    rest_seconds: string;
    rpe_target: string;
    time_target?: string;
    distance_target?: string;
    speed_target?: string;
    hiit_work_seconds?: string;
    hiit_rest_seconds?: string;
    hiit_work_speed?: string;
    hiit_rest_speed?: string;
    hiit_cycles?: string;
    is_hiit?: boolean;
}

export interface ExerciseItemData {
    id?: string;
    workout_id?: string;
    exercise_id: string;
    order_index?: number;
    notes?: string;
    coach_notes?: string;
    sets: Set[];
    exercise?: {
        id: string;
        name: string;
        muscle_group?: string;
        video_url?: string;
        description?: string;
        exercise_type?: 'reps' | 'time' | 'cardio';
        muscle_weights?: Record<string, number>;
    };
}

const generateTimeOptions = (currentTimeTarget?: string) => {
    const options = [];
    for (let sec = 30; sec <= 7200; sec += 30) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        const label = `${m}:${s.toString().padStart(2, '0')}`;
        options.push({ value: sec.toString(), label });
    }
    
    // Garantir que o valor atualmente selecionado esteja na lista (evitando NaN ou valor personalizado ausente)
    if (currentTimeTarget && !options.some(opt => opt.value === currentTimeTarget.toString())) {
        const sec = parseInt(currentTimeTarget);
        if (!isNaN(sec)) {
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            const label = `${m}:${s.toString().padStart(2, '0')}`;
            options.push({ value: currentTimeTarget.toString(), label });
            options.sort((a, b) => parseInt(a.value) - parseInt(b.value));
        }
    }
    return options;
};

interface ExerciseCardProps {
    item: ExerciseItemData;
    index: number;
    totalItems?: number;
    onUpdate: (updatedItem: ExerciseItemData) => void;
    onDelete: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onSwapExercise?: () => void;
    studentId?: string | null;
    dragHandleProps?: Record<string, unknown>;
    onEditExercise?: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ item, index, totalItems, onUpdate, onDelete, onMoveUp, onMoveDown, onSwapExercise, studentId, dragHandleProps, onEditExercise }) => {
    const [sets, setSets] = useState<Set[]>(() => {
        return (item.sets || []).map((s: any) => ({
            ...s,
            weight_target: s.weight_target !== null && s.weight_target !== undefined ? s.weight_target.toString() : '',
            reps_target: s.reps_target !== null && s.reps_target !== undefined ? s.reps_target.toString() : '',
            rest_seconds: s.rest_seconds !== null && s.rest_seconds !== undefined ? s.rest_seconds.toString() : '60',
            rpe_target: s.rpe_target !== null && s.rpe_target !== undefined ? s.rpe_target.toString() : '8',
            time_target: s.time_target !== null && s.time_target !== undefined ? s.time_target.toString() : '',
            distance_target: s.distance_target !== null && s.distance_target !== undefined ? s.distance_target.toString() : '',
            speed_target: s.speed_target !== null && s.speed_target !== undefined ? s.speed_target.toString() : '',
            hiit_work_seconds: s.hiit_work_seconds !== null && s.hiit_work_seconds !== undefined ? s.hiit_work_seconds.toString() : '',
            hiit_rest_seconds: s.hiit_rest_seconds !== null && s.hiit_rest_seconds !== undefined ? s.hiit_rest_seconds.toString() : '',
            hiit_work_speed: s.hiit_work_speed !== null && s.hiit_work_speed !== undefined ? s.hiit_work_speed.toString() : '',
            hiit_rest_speed: s.hiit_rest_speed !== null && s.hiit_rest_speed !== undefined ? s.hiit_rest_speed.toString() : '',
            hiit_cycles: s.hiit_cycles !== null && s.hiit_cycles !== undefined ? s.hiit_cycles.toString() : '',
            is_hiit: s.is_hiit !== undefined ? !!s.is_hiit : !!(s.hiit_work_seconds || s.hiit_cycles)
        }));
    });
    const [notes, setNotes] = useState(item.coach_notes || '');

    // Sync from parent in case workout details are imported or template loaded
    React.useEffect(() => {
        if (item.sets) {
            setSets(item.sets.map((s: any) => ({
                ...s,
                weight_target: s.weight_target !== null && s.weight_target !== undefined ? s.weight_target.toString() : '',
                reps_target: s.reps_target !== null && s.reps_target !== undefined ? s.reps_target.toString() : '',
                rest_seconds: s.rest_seconds !== null && s.rest_seconds !== undefined ? s.rest_seconds.toString() : '60',
                rpe_target: s.rpe_target !== null && s.rpe_target !== undefined ? s.rpe_target.toString() : '8',
                time_target: s.time_target !== null && s.time_target !== undefined ? s.time_target.toString() : '',
                distance_target: s.distance_target !== null && s.distance_target !== undefined ? s.distance_target.toString() : '',
                speed_target: s.speed_target !== null && s.speed_target !== undefined ? s.speed_target.toString() : '',
                hiit_work_seconds: s.hiit_work_seconds !== null && s.hiit_work_seconds !== undefined ? s.hiit_work_seconds.toString() : '',
                hiit_rest_seconds: s.hiit_rest_seconds !== null && s.hiit_rest_seconds !== undefined ? s.hiit_rest_seconds.toString() : '',
                hiit_work_speed: s.hiit_work_speed !== null && s.hiit_work_speed !== undefined ? s.hiit_work_speed.toString() : '',
                hiit_rest_speed: s.hiit_rest_speed !== null && s.hiit_rest_speed !== undefined ? s.hiit_rest_speed.toString() : '',
                hiit_cycles: s.hiit_cycles !== null && s.hiit_cycles !== undefined ? s.hiit_cycles.toString() : '',
                is_hiit: s.is_hiit !== undefined ? !!s.is_hiit : !!(s.hiit_work_seconds || s.hiit_cycles)
            })));
        }
    }, [item.sets]);

    // Modal States
    const [typeModal, setTypeModal] = useState<{ isOpen: boolean; setIndex: number | null }>({ isOpen: false, setIndex: null });
    const [rpeModalOpen, setRpeModalOpen] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [templateModal, setTemplateModal] = useState<{ isOpen: boolean; mode: 'save' | 'load' }>({ isOpen: false, mode: 'save' });
    const [showMenu, setShowMenu] = useState(false);

    // Sync back to parent whenever local state changes (debounced could be better but direct for now)
    const updateParent = (newSets: Set[], newNotes: string) => {
        onUpdate({ ...item, sets: newSets, coach_notes: newNotes });
    };

    const handleAddSet = () => {
        const lastSet = sets[sets.length - 1];
        const newSet: Set = {
            id: `new-${Date.now()}`,
            set_order: sets.length + 1,
            type: lastSet ? lastSet.type : 'working', // Copy last type or default to working
            weight_target: lastSet?.weight_target || '',
            reps_target: lastSet?.reps_target || '',
            rest_seconds: lastSet?.rest_seconds || '60',
            rpe_target: lastSet?.rpe_target || '8',
            time_target: lastSet?.time_target || '',
            distance_target: lastSet?.distance_target || '',
            speed_target: lastSet?.speed_target || '',
            hiit_work_seconds: lastSet?.hiit_work_seconds || '',
            hiit_rest_seconds: lastSet?.hiit_rest_seconds || '',
            hiit_work_speed: lastSet?.hiit_work_speed || '',
            hiit_rest_speed: lastSet?.hiit_rest_speed || '',
            hiit_cycles: lastSet?.hiit_cycles || '',
            is_hiit: lastSet ? !!lastSet.is_hiit : false
        };
        const newSets = [...sets, newSet];
        setSets(newSets);
        updateParent(newSets, notes);
    };

    const handleRemoveSet = (setIndex: number) => {
        const newSets = sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, set_order: i + 1 }));
        setSets(newSets);
        updateParent(newSets, notes);
    };

    const handleSetChange = (index: number, field: keyof Set, value: any) => {
        const newSets = [...sets];
        newSets[index] = { ...newSets[index], [field]: value };
        setSets(newSets);
        updateParent(newSets, notes);
    };

    const handleBulkApplyRest = () => {
        if (sets.length < 2) return;
        const firstRest = sets[0].rest_seconds;
        const newSets = sets.map(s => ({ ...s, rest_seconds: firstRest }));
        setSets(newSets);
        updateParent(newSets, notes);
        toast.success(`Rest de ${firstRest}s aplicado em todas as séries!`, { icon: '⚡' });
    };

    const getSetTypeIcon = (type: string, isFirstWorking: boolean) => {
        switch (type) {
            case 'warmup': return <span className="material-symbols-rounded text-amber-500 text-lg">local_fire_department</span>;
            case 'failure': return <span className="material-symbols-rounded text-red-600 text-lg">bolt</span>;
            case 'dropset': return <span className="material-symbols-rounded text-purple-500 text-lg">layers</span>;
            case 'preparation': return <span className="material-symbols-rounded text-cyan-500 text-lg">publish</span>;
            default: return <span className="text-blue-600 font-bold text-sm">{index + 1}</span>; // Shows Set Number
        }
    };

    // Helper to get youtube ID
    const getYoutubeId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // Check if it's a GIF or generic image URL (ends with extensions)
    const isGifOrImage = (url: string) => {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png)$/) != null;
    };

    const videoUrl = item.exercise?.video_url;
    const isGif = isGifOrImage(videoUrl);
    const ytId = getYoutubeId(videoUrl);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden mb-4">
            {/* Card Header */}
            <div className="p-2 sm:p-4 flex items-center gap-1.5 sm:gap-3 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-0.5 sm:p-1 text-slate-300 hover:text-slate-500 flex-shrink-0">
                    <span className="material-symbols-rounded text-lg sm:text-2xl">drag_indicator</span>
                </div>

                {/* Thumbnail Area - Click to open Modal */}
                <button
                    type="button"
                    aria-label={`Ver vídeo de demonstração do exercício ${item.exercise?.name || 'Exercício'}`}
                    disabled={!videoUrl}
                    className="w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden relative group cursor-pointer border border-slate-100 dark:border-slate-600 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default"
                    onClick={() => {
                        if (videoUrl) setShowVideoModal(true);
                    }}
                >
                    {isGif ? (
                        <img
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            alt="Demonstração do Exercício"
                            loading="lazy"
                            width="48"
                            height="48"
                        />
                    ) : ytId ? (
                        <div className="w-full h-full relative">
                            <img
                                src={`https://img.youtube.com/vi/${ytId}/0.jpg`}
                                className="w-full h-full object-cover opacity-80"
                                alt="Demonstração do Exercício no YouTube"
                                loading="lazy"
                                width="48"
                                height="48"
                            />
                            {/* Static overlay icon for YT */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-rounded text-white drop-shadow-md text-lg" aria-hidden="true">play_circle</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <span className="material-symbols-rounded text-lg sm:text-xl" aria-hidden="true">fitness_center</span>
                        </div>
                    )}
                </button>

                <button
                    type="button"
                    aria-expanded={showDescription}
                    aria-label={showDescription ? `Recolher descrição de ${item.exercise?.name || 'exercício'}` : `Expandir descrição de ${item.exercise?.name || 'exercício'}`}
                    className="flex-1 min-w-0 text-left group/title focus:outline-none"
                    onClick={() => setShowDescription(!showDescription)}
                >
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate select-none">{item.exercise?.name || 'Exercício'}</h3>
                        <span className="material-symbols-rounded text-slate-400 text-sm transition-transform duration-300" style={{ transform: showDescription ? 'rotate(180deg)' : 'rotate(0deg)' }} aria-hidden="true">expand_more</span>
                    </div>
                </button>

                {studentId && (
                    <button
                        type="button"
                        onClick={() => setShowHistoryModal(true)}
                        aria-label="Ver histórico do aluno neste exercício"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-xl transition-colors flex-shrink-0 flex items-center justify-center"
                        title="Ver histórico do aluno"
                    >
                        <span className="material-symbols-rounded text-lg sm:text-2xl" aria-hidden="true">history</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={onDelete}
                    aria-label="Remover exercício da rotina"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 flex items-center justify-center"
                >
                    <span className="material-symbols-rounded text-lg sm:text-2xl" aria-hidden="true">delete</span>
                </button>

                {/* Menu Button (Templates) */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowMenu(!showMenu)}
                        aria-expanded={showMenu}
                        aria-label="Mais opções e modelos deste exercício"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-primary rounded-xl hover:bg-primary/5 transition-colors flex-shrink-0 flex items-center justify-center"
                    >
                        <span className="material-symbols-rounded text-lg sm:text-2xl" aria-hidden="true">more_vert</span>
                    </button>

                    {/* Dropdown */}
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setShowMenu(false)}></div>
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-20 py-1 overflow-hidden animate-fade-in transform origin-top-right">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTemplateModal({ isOpen: true, mode: 'load' });
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2"
                                >
                                    <span className="material-symbols-rounded text-lg text-primary" aria-hidden="true">download</span>
                                    Carregar Template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTemplateModal({ isOpen: true, mode: 'save' });
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700/50"
                                >
                                    <span className="material-symbols-rounded text-lg text-emerald-500" aria-hidden="true">save</span>
                                    Salvar Sets
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onEditExercise) onEditExercise();
                                        setShowMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700/50"
                                >
                                    <span className="material-symbols-rounded text-lg text-blue-500" aria-hidden="true">edit</span>
                                    Editar Cadastro
                                </button>
                                {onSwapExercise && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onSwapExercise();
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700/50"
                                    >
                                        <span className="material-symbols-rounded text-lg text-orange-500" aria-hidden="true">swap_horiz</span>
                                        Alterar Exercício
                                    </button>
                                )}
                                {onMoveUp && index > 0 && (
                                    <button
                                        type="button"
                                        aria-label={`Mover exercício para cima (posição ${index})`}
                                        onClick={() => {
                                            onMoveUp();
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700/50"
                                    >
                                        <span className="material-symbols-rounded text-lg text-sky-500" aria-hidden="true">arrow_upward</span>
                                        Mover para Cima
                                    </button>
                                )}
                                {onMoveDown && totalItems !== undefined && index < totalItems - 1 && (
                                    <button
                                        type="button"
                                        aria-label={`Mover exercício para baixo (posição ${index + 2})`}
                                        onClick={() => {
                                            onMoveDown();
                                            setShowMenu(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2 border-t border-slate-50 dark:border-slate-700/50"
                                    >
                                        <span className="material-symbols-rounded text-lg text-sky-500" aria-hidden="true">arrow_downward</span>
                                        Mover para Baixo
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Description Expandable Area */}
            {showDescription && item.exercise?.description && (
                <div className="px-4 py-3 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 text-sm text-blue-950 dark:text-blue-100 animate-fade-in text-left whitespace-pre-wrap">
                    {item.exercise.description.replace(/\\n/g, '\n').split('\n').map((line: string, i: number) => {
                        // Handle Headings (##)
                        if (line.trim().startsWith('##')) {
                            return <h4 key={i} className="font-bold text-blue-950 dark:text-blue-100 mt-3 mb-1">{line.replace(/^##\s*/, '')}</h4>;
                        }
                        // Handle empty lines
                        if (!line.trim()) return <div key={i} className="h-2" />;

                        // Handle Bold inside paragraph (Simplistic parser)
                        // It splits by ** and alternates bold/normal
                        const parts = line.split('**');
                        return (
                            <p key={i} className="mb-1">
                                {parts.map((part, index) =>
                                    index % 2 === 1 ? <strong key={index} className="font-bold text-blue-900 dark:text-blue-200">{part}</strong> : part
                                )}
                            </p>
                        );
                    })}
                </div>
            )}

            {/* Sets Table - Super Compact Grid (< 400px optimized with minmax) */}
            <div className="p-0.5 sm:p-4">
                <div className="w-full">
                    {/* Header Row - Short Text Headers for consistency */}
                    {item.exercise?.exercise_type === 'time' ? (
                        <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_20px] sm:grid-cols-[2.5rem_1.2fr_1.8fr_1fr_1.2fr_auto] gap-0.5 sm:gap-2 mb-1 sm:mb-2 px-0 text-[8px] sm:text-[10px] items-center font-bold text-slate-400 uppercase tracking-wider text-center">
                            <div className="text-center">#</div>
                            <div className="text-center">KG</div>
                            <div className="text-center">TEMPO (s)</div>
                            <button type="button" aria-label="Replicar tempo de descanso para todas as séries" className="flex items-center justify-center gap-1 group/rest cursor-pointer hover:text-primary transition-colors text-[8px] sm:text-[10px] font-bold uppercase" onClick={handleBulkApplyRest} title="Replicar descanso">
                                <span>DESC</span>
                                <span className="material-symbols-rounded text-[10px] opacity-0 group-hover/rest:opacity-100 transition-opacity hidden sm:inline" aria-hidden="true">sync_alt</span>
                            </button>
                            <button type="button" aria-label="Guia da escala de esforço percebido PSE" className="flex items-center justify-center gap-1 cursor-pointer hover:text-primary transition-colors text-[8px] sm:text-[10px] font-bold uppercase" onClick={() => setRpeModalOpen(true)}>
                                <span>PSE</span>
                                <span className="hidden sm:inline material-symbols-rounded text-[10px]" aria-hidden="true">help</span>
                            </button>
                            <div className="w-5"></div>
                        </div>
                    ) : item.exercise?.exercise_type === 'cardio' ? (
                        <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_20px_20px] sm:grid-cols-[2.5rem_1.2fr_1.2fr_1.5fr_1.2fr_32px_auto] gap-0.5 sm:gap-2 mb-1 sm:mb-2 px-0 text-[8px] sm:text-[10px] items-center font-bold text-slate-400 uppercase tracking-wider text-center">
                            <div className="text-center">#</div>
                            <div className="text-center">DIST (km)</div>
                            <div className="text-center">VEL (km/h)</div>
                            <div className="text-center">TEMPO (min)</div>
                            <button type="button" aria-label="Replicar tempo de descanso para todas as séries" className="flex items-center justify-center gap-1 group/rest cursor-pointer hover:text-primary transition-colors text-[8px] sm:text-[10px] font-bold uppercase" onClick={handleBulkApplyRest} title="Replicar descanso">
                                <span>DESC</span>
                            </button>
                            <div className="text-center">HIIT</div>
                            <div className="w-5"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_20px] sm:grid-cols-[2.5rem_1.2fr_1.2fr_1fr_1.2fr_auto] gap-0.5 sm:gap-2 mb-1 sm:mb-2 px-0 text-[8px] sm:text-[10px] items-center font-bold text-slate-400 uppercase tracking-wider text-center">
                            <div className="text-center">#</div>
                            <div className="text-center">KG</div>
                            <div className="text-center">REPS</div>
                            <button type="button" aria-label="Replicar tempo de descanso para todas as séries" className="flex items-center justify-center gap-1 group/rest cursor-pointer hover:text-primary transition-colors text-[8px] sm:text-[10px] font-bold uppercase" onClick={handleBulkApplyRest} title="Replicar descanso">
                                <span className="hidden sm:inline">DESC</span>
                                <span className="sm:hidden">DESC</span>
                                <span className="material-symbols-rounded text-[10px] opacity-0 group-hover/rest:opacity-100 transition-opacity hidden sm:inline" aria-hidden="true">sync_alt</span>
                            </button>
                            <button type="button" aria-label="Guia da escala de esforço percebido PSE" className="flex items-center justify-center gap-1 cursor-pointer hover:text-primary transition-colors text-[8px] sm:text-[10px] font-bold uppercase" onClick={() => setRpeModalOpen(true)}>
                                <span>PSE</span>
                                <span className="hidden sm:inline material-symbols-rounded text-[10px]" aria-hidden="true">help</span>
                            </button>
                            <div className="w-5"></div>
                        </div>
                    )}

                    <div className="space-y-1 sm:space-y-2">
                        {sets.map((set, i) => {
                            const workingSetIndex = sets.slice(0, i + 1).filter(s => s.type === 'working').length;

                            // Se for Cardio e HIIT ativo, renderiza o painel especial de HIIT
                            if (item.exercise?.exercise_type === 'cardio' && set.is_hiit) {
                                return (
                                    <div key={set.id} className="p-3 bg-sky-50/30 dark:bg-sky-950/10 rounded-xl border border-sky-100/50 dark:border-sky-900/30 space-y-2 mt-1 text-left">
                                        <div className="flex items-center justify-between border-b border-sky-100/50 dark:border-sky-900/20 pb-1.5">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    aria-label={`Alterar tipo da série ${workingSetIndex} HIIT`}
                                                    onClick={() => setTypeModal({ isOpen: true, setIndex: i })}
                                                    className={`min-h-[36px] sm:min-h-[44px] px-2 rounded-md border flex items-center justify-center transition-all duration-300 ${set.type === 'warmup'
                                                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-600'
                                                        : set.type === 'failure'
                                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600'
                                                            : set.type === 'dropset'
                                                                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-600'
                                                                : set.type === 'preparation'
                                                                    ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50 text-cyan-600'
                                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sky-600'
                                                        } hover:scale-105 active:scale-95 shadow-sm`}
                                                >
                                                    {set.type === 'working' ? (
                                                        <span className="font-black text-[9px] sm:text-xs uppercase tracking-tighter">Série {workingSetIndex} (HIIT)</span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 font-bold text-[9px] uppercase">
                                                            {getSetTypeIcon(set.type, false)}
                                                            {set.type} (HIIT)
                                                        </span>
                                                    )}
                                                </button>
                                                <span className="material-symbols-rounded text-sky-500 text-sm" aria-hidden="true">bolt</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    aria-label="Mudar para cardio tradicional"
                                                    onClick={() => handleSetChange(i, 'is_hiit', false)}
                                                    className="text-[9px] font-bold text-slate-500 hover:text-primary flex items-center gap-0.5 bg-white dark:bg-slate-800 px-2 py-1 min-h-[36px] rounded border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                                                >
                                                    <span className="material-symbols-rounded text-xs" aria-hidden="true">directions_run</span>
                                                    Tradicional
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Remover série HIIT ${i + 1}`}
                                                    onClick={() => handleRemoveSet(i)}
                                                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <span className="material-symbols-rounded text-base" aria-hidden="true">close</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                                            <div>
                                                <label htmlFor={`hiit-work-sec-${item.id || index}-${i}`} className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Tiro (s)</label>
                                                <input
                                                    id={`hiit-work-sec-${item.id || index}-${i}`}
                                                    type="number"
                                                    placeholder="Ex: 30"
                                                    className="w-full min-h-[40px] h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs shadow-sm"
                                                    value={set.hiit_work_seconds ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'hiit_work_seconds', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`hiit-work-spd-${item.id || index}-${i}`} className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Vel. Tiro (km/h)</label>
                                                <input
                                                    id={`hiit-work-spd-${item.id || index}-${i}`}
                                                    type="number"
                                                    step="0.1"
                                                    placeholder="Ex: 15"
                                                    className="w-full min-h-[40px] h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs shadow-sm"
                                                    value={set.hiit_work_speed ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'hiit_work_speed', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`hiit-rest-sec-${item.id || index}-${i}`} className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Descanso (s)</label>
                                                <input
                                                    id={`hiit-rest-sec-${item.id || index}-${i}`}
                                                    type="number"
                                                    placeholder="Ex: 30"
                                                    className="w-full min-h-[40px] h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs shadow-sm"
                                                    value={set.hiit_rest_seconds ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'hiit_rest_seconds', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor={`hiit-rest-spd-${item.id || index}-${i}`} className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Vel. Desc. (km/h)</label>
                                                <input
                                                    id={`hiit-rest-spd-${item.id || index}-${i}`}
                                                    type="number"
                                                    step="0.1"
                                                    placeholder="Ex: 6"
                                                    className="w-full min-h-[40px] h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs shadow-sm"
                                                    value={set.hiit_rest_speed ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'hiit_rest_speed', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <label htmlFor={`hiit-cycles-${item.id || index}-${i}`} className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Ciclos</label>
                                                <input
                                                    id={`hiit-cycles-${item.id || index}-${i}`}
                                                    type="number"
                                                    placeholder="Ex: 8"
                                                    className="w-full min-h-[40px] h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs shadow-sm"
                                                    value={set.hiit_cycles ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'hiit_cycles', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-100/30 dark:border-sky-900/10 text-xs items-center">
                                            <div className="flex items-center gap-2">
                                                <label htmlFor={`hiit-set-rest-${item.id || index}-${i}`} className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase cursor-pointer">Descanso Série (s):</label>
                                                <input
                                                    id={`hiit-set-rest-${item.id || index}-${i}`}
                                                    type="number"
                                                    className="w-20 min-h-[40px] h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs shadow-sm"
                                                    value={set.rest_seconds ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'rest_seconds', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center justify-end gap-2">
                                                <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase">PSE (RPE):</span>
                                                <select
                                                    aria-label={`Esforço percebido PSE para série ${i + 1}`}
                                                    className="w-20 min-h-[40px] h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs shadow-sm cursor-pointer"
                                                    value={set.rpe_target ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'rpe_target', e.target.value)}
                                                >
                                                    {Array.from({ length: 11 }, (_, k) => 5 + k * 0.5).map(val => (
                                                        <option key={val} value={val}>{val}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Renderização comum por tipo de exercício
                            return (
                                <div
                                    key={set.id}
                                    className={`
                                        grid gap-0.5 sm:gap-2 items-center
                                        ${item.exercise?.exercise_type === 'time'
                                            ? 'grid-cols-[24px_minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_20px] sm:grid-cols-[2.5rem_1.2fr_1.8fr_1fr_1.2fr_auto]'
                                            : item.exercise?.exercise_type === 'cardio'
                                                ? 'grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_20px_20px] sm:grid-cols-[2.5rem_1.2fr_1.2fr_1.5fr_1.2fr_32px_auto]'
                                                : 'grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_20px] sm:grid-cols-[2.5rem_1.2fr_1.2fr_1fr_1.2fr_auto]'
                                        }
                                    `}
                                >
                                    {/* Type Selector */}
                                    <button
                                        type="button"
                                        onClick={() => setTypeModal({ isOpen: true, setIndex: i })}
                                        aria-label={`Alterar tipo da série ${workingSetIndex}`}
                                        className={`w-full min-h-[44px] h-11 rounded-xl border flex items-center justify-center transition-all duration-300 ${set.type === 'warmup'
                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-600'
                                            : set.type === 'failure'
                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600'
                                                : set.type === 'dropset'
                                                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/50 text-purple-600'
                                                    : set.type === 'preparation'
                                                        ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50 text-cyan-600'
                                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sky-600'
                                            } hover:scale-105 active:scale-95 shadow-sm p-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer`}
                                    >
                                        {set.type === 'working' ? (
                                            <span className="font-black text-xs uppercase tracking-tighter">{workingSetIndex}</span>
                                        ) : (
                                            getSetTypeIcon(set.type, false)
                                        )}
                                    </button>

                                    {/* Inputs baseados no Tipo */}
                                    {item.exercise?.exercise_type === 'cardio' ? (
                                        <>
                                            {/* Distance Target */}
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="-"
                                                aria-label={`Distância alvo em km para série ${i + 1}`}
                                                className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 px-0 text-xs sm:text-base min-w-0"
                                                value={set.distance_target ?? ''}
                                                onChange={(e) => handleSetChange(i, 'distance_target', e.target.value)}
                                            />
                                            {/* Speed Target */}
                                            <input
                                                type="number"
                                                step="0.1"
                                                placeholder="-"
                                                aria-label={`Velocidade alvo em km/h para série ${i + 1}`}
                                                className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 px-0 text-xs sm:text-base min-w-0"
                                                value={set.speed_target ?? ''}
                                                onChange={(e) => handleSetChange(i, 'speed_target', e.target.value)}
                                            />
                                            {/* Time Target Select em Minutos */}
                                            <select
                                                aria-label={`Tempo alvo para série ${i + 1}`}
                                                className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 text-xs sm:text-sm min-w-0 px-1 cursor-pointer"
                                                value={set.time_target ?? ''}
                                                onChange={(e) => handleSetChange(i, 'time_target', e.target.value)}
                                            >
                                                <option value="">-</option>
                                                {generateTimeOptions(set.time_target).map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </>
                                    ) : item.exercise?.exercise_type === 'time' ? (
                                        <>
                                            {/* Weight Target */}
                                            <input
                                                type="number"
                                                placeholder="-"
                                                aria-label={`Carga alvo em kg para série ${i + 1}`}
                                                className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 px-0 text-xs sm:text-base min-w-0"
                                                value={set.weight_target ?? ''}
                                                onChange={(e) => handleSetChange(i, 'weight_target', e.target.value)}
                                            />
                                            {/* Time Target */}
                                            <div className="relative min-w-0">
                                                <input
                                                    type="number"
                                                    placeholder="60"
                                                    aria-label={`Tempo alvo em segundos para série ${i + 1}`}
                                                    className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 px-0 text-xs sm:text-base min-w-0"
                                                    value={set.time_target ?? ''}
                                                    onChange={(e) => handleSetChange(i, 'time_target', e.target.value)}
                                                />
                                                {set.time_target && parseInt(set.time_target) >= 60 && (
                                                    <span className="absolute -bottom-3.5 left-0 right-0 text-[8px] text-slate-400 font-medium text-center truncate">
                                                        {Math.floor(parseInt(set.time_target) / 60)}m {parseInt(set.time_target) % 60}s
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Weight Input (Reps mode) */}
                                            <input
                                                type="number"
                                                placeholder="-"
                                                aria-label={`Carga alvo em kg para série ${i + 1}`}
                                                className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 px-0 text-xs sm:text-base min-w-0"
                                                value={set.weight_target ?? ''}
                                                onChange={(e) => handleSetChange(i, 'weight_target', e.target.value)}
                                            />
                                            {/* Reps Input (Reps mode) */}
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="10"
                                                aria-label={`Repetições alvo para série ${i + 1}`}
                                                className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 px-0 text-xs sm:text-base min-w-0"
                                                value={set.reps_target ?? ''}
                                                onChange={(e) => handleSetChange(i, 'reps_target', e.target.value)}
                                            />
                                        </>
                                    )}

                                    {/* Rest Input */}
                                    <div className="relative min-w-0">
                                        <input
                                            type="number"
                                            placeholder="60"
                                            aria-label={`Descanso em segundos para série ${i + 1}`}
                                            className="w-full min-h-[44px] h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary/40 px-0 text-xs sm:text-base min-w-0"
                                            value={set.rest_seconds ?? ''}
                                            onChange={(e) => handleSetChange(i, 'rest_seconds', e.target.value)}
                                        />
                                    </div>

                                    {/* RPE Selector (Oculto se cardio) */}
                                    {item.exercise?.exercise_type !== 'cardio' ? (
                                        <div className="relative group/rpe min-w-0">
                                            <select
                                                aria-label={`PSE para série ${i + 1}`}
                                                className={`w-full min-h-[44px] h-11 rounded-xl border text-center font-bold outline-none focus:ring-2 focus:ring-primary/20 appearance-none px-0 transition-all duration-300 text-xs sm:text-base min-w-0 cursor-pointer
                                                    ${parseFloat(set.rpe_target) >= 9
                                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600'
                                                        : parseFloat(set.rpe_target) >= 7
                                                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-600'
                                                            : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600'
                                                    }
                                                `}
                                                value={set.rpe_target ?? ''}
                                                onChange={(e) => handleSetChange(i, 'rpe_target', e.target.value)}
                                            >
                                                {Array.from({ length: 11 }, (_, k) => 5 + k * 0.5).map(val => (
                                                    <option key={val} value={val} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{val}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : (
                                        /* Toggle para modo HIIT */
                                        <button
                                            type="button"
                                            onClick={() => handleSetChange(i, 'is_hiit', true)}
                                            aria-label="Configurar Protocolo HIIT"
                                            className="p-1 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-600 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-400 flex items-center justify-center transition-colors min-h-[44px] h-11 w-full"
                                            title="Configurar Protocolo HIIT"
                                        >
                                            <span className="material-symbols-rounded text-sm sm:text-lg" aria-hidden="true">bolt</span>
                                        </button>
                                    )}

                                    {/* Delete Set */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSet(i)}
                                        aria-label={`Excluir série ${i + 1}`}
                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors flex justify-center items-center w-full min-h-[44px] h-11 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <span className="material-symbols-rounded text-base sm:text-lg" aria-hidden="true">close</span>
                                    </button>
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            onClick={handleAddSet}
                            aria-label="Adicionar nova série ao exercício"
                            className="w-full min-h-[44px] py-2 sm:py-2.5 mt-2 border border-dashed border-primary/30 text-primary rounded-xl font-bold text-xs sm:text-sm bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-rounded text-base sm:text-lg" aria-hidden="true">add</span>
                            Adicionar Série
                        </button>
                    </div>
                </div>
            </div>

            {/* Coach Notes */}
            <div className="mt-2 px-3 pb-3 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                <label htmlFor={`coach-notes-${item.id || index}`} className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase ml-1 flex items-center gap-1">
                    <span className="material-symbols-rounded text-sm" aria-hidden="true">edit_note</span>
                    Notas do Treinador
                </label>
                <textarea
                    id={`coach-notes-${item.id || index}`}
                    placeholder="Ex: Controlar a excêntrica..."
                    className="w-full mt-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary/50 outline-none resize-none h-16 sm:h-20"
                    value={notes}
                    onChange={(e) => {
                        setNotes(e.target.value);
                        updateParent(sets, e.target.value);
                    }}
                />
            </div>

            <TypeSelectionModal
                isOpen={typeModal.isOpen}
                onClose={() => setTypeModal({ ...typeModal, isOpen: false })}
                currentType={typeModal.setIndex !== null ? sets[typeModal.setIndex].type : 'working'}
                onSelect={(type) => {
                    if (typeModal.setIndex !== null) {
                        handleSetChange(typeModal.setIndex, 'type', type);
                    }
                }}
            />
            <RPEGuideModal isOpen={rpeModalOpen} onClose={() => setRpeModalOpen(false)} />

            <VideoPlayerModal
                isOpen={showVideoModal}
                onClose={() => setShowVideoModal(false)}
                videoUrl={videoUrl}
                title={item.exercise?.name}
            />

            {studentId && (
                <ExerciseHistoryModal
                    isOpen={showHistoryModal}
                    onClose={() => setShowHistoryModal(false)}
                    exerciseId={item.exercise_id || item.exercise?.id}
                    exerciseName={item.exercise?.name}
                    studentId={studentId}
                />
            )}

            <SetTemplateManager
                isOpen={templateModal.isOpen}
                onClose={() => setTemplateModal({ ...templateModal, isOpen: false })}
                mode={templateModal.mode}
                currentSets={sets}
                onLoad={(newSets) => {
                    setSets(newSets);
                    updateParent(newSets, notes);
                }}
            />
        </div>
    );
};

export default ExerciseCard;
