import React, { useState } from 'react';
import TypeSelectionModal from './TypeSelectionModal';
import RPEGuideModal from './RPEGuideModal';
import VideoPlayerModal from '../../shared/VideoPlayerModal';
import ExerciseHistoryModal from '../../shared/ExerciseHistoryModal';
import VideoThumbnail from '../../shared/VideoThumbnail';

interface Set {
    id: string; // Temporarily just random string if new
    set_order: number;
    type: 'warmup' | 'working' | 'failure' | 'dropset';
    weight_target?: string; // string to handle empty states easily
    reps_target: string;
    rest_seconds: string;
    rpe_target: string;
}

interface ExerciseCardProps {
    item: any; // The workout item (exercise + sets data)
    index: number;
    onUpdate: (updatedItem: any) => void;
    onDelete: () => void;
    studentId?: string | null;
    dragHandleProps?: any; // Props for the drag handle
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ item, index, onUpdate, onDelete, studentId, dragHandleProps }) => {
    const [sets, setSets] = useState<Set[]>(item.sets || []);
    const [notes, setNotes] = useState(item.coach_notes || '');

    // Modal States
    const [typeModal, setTypeModal] = useState<{ isOpen: boolean; setIndex: number | null }>({ isOpen: false, setIndex: null });
    const [rpeModalOpen, setRpeModalOpen] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

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

    const getSetTypeIcon = (type: string, isFirstWorking: boolean) => {
        switch (type) {
            case 'warmup': return <span className="material-symbols-rounded text-amber-500 text-lg">local_fire_department</span>;
            case 'failure': return <span className="material-symbols-rounded text-red-600 text-lg">bolt</span>;
            case 'dropset': return <span className="material-symbols-rounded text-purple-500 text-lg">layers</span>;
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
            <div className="p-4 flex items-center gap-3 border-b border-slate-50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500">
                    <span className="material-symbols-rounded">drag_indicator</span>
                </div>

                {/* Thumbnail Area - Click to open Modal */}
                <div
                    className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 overflow-hidden relative group cursor-pointer border border-slate-100 dark:border-slate-600"
                    onClick={() => {
                        if (videoUrl) setShowVideoModal(true);
                    }}
                >
                    {isGif ? (
                        <img
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            alt="Preview"
                        />
                    ) : ytId ? (
                        <div className="w-full h-full relative">
                            <img
                                src={`https://img.youtube.com/vi/${ytId}/0.jpg`}
                                className="w-full h-full object-cover opacity-80"
                                alt="Video Preview"
                            />
                            {/* Static overlay icon for YT */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-rounded text-white drop-shadow-md text-lg">play_circle</span>
                            </div>
                        </div>
                    ) : videoUrl?.match(/\.mp4($|\?)/i) ? (
                        <VideoThumbnail src={videoUrl} className="w-full h-full rounded-lg" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <span className="material-symbols-rounded text-xl">image</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0" onClick={() => setShowDescription(!showDescription)}>
                    <div className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate select-none">{item.exercise?.name || 'Exercício'}</h3>
                        <span className="material-symbols-rounded text-slate-400 text-sm transition-transform duration-300" style={{ transform: showDescription ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                    </div>
                </div>

                {studentId && (
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="p-2 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors"
                        title="Ver histórico do aluno"
                    >
                        <span className="material-symbols-rounded">history</span>
                    </button>
                )}

                <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <span className="material-symbols-rounded">delete</span>
                </button>
            </div>

            {/* Description Expandable Area */}
            {/* Description Expandable Area */}
            {showDescription && item.exercise?.description && (
                <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30 text-sm text-slate-600 dark:text-slate-300 animate-fade-in text-left whitespace-pre-wrap">
                    {item.exercise.description.replace(/\\n/g, '\n').split('\n').map((line: string, i: number) => {
                        // Handle Headings (##)
                        if (line.trim().startsWith('##')) {
                            return <h4 key={i} className="font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1">{line.replace(/^##\s*/, '')}</h4>;
                        }
                        // Handle empty lines
                        if (!line.trim()) return <div key={i} className="h-2" />;

                        // Handle Bold inside paragraph (Simplistic parser)
                        // It splits by ** and alternates bold/normal
                        const parts = line.split('**');
                        return (
                            <p key={i} className="mb-1">
                                {parts.map((part, index) =>
                                    index % 2 === 1 ? <strong key={index} className="font-bold text-slate-700 dark:text-slate-200">{part}</strong> : part
                                )}
                            </p>
                        );
                    })}
                </div>
            )}

            {/* Sets Table */}
            <div className="p-2 sm:p-4">
                <div className="grid grid-cols-[2.5rem_1.2fr_1.2fr_1fr_1.2fr_auto] gap-2 mb-2 px-1 text-[10px] items-center font-bold text-slate-400 uppercase tracking-wider text-center">
                    <div className="text-center">#</div>
                    <div>kg</div>
                    <div>Reps</div>
                    <div>Desc</div>
                    <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-primary transition-colors" onClick={() => setRpeModalOpen(true)}>
                        PSE
                        <span className="material-symbols-rounded text-[10px]">help</span>
                    </div>
                    <div className="w-6"></div>
                </div>

                <div className="space-y-2">
                    {sets.map((set, i) => {
                        // Calculate working set INDEX (1-based) relative to only working sets
                        const workingSetIndex = sets.slice(0, i + 1).filter(s => s.type === 'working').length;

                        return (
                            <div key={set.id} className="grid grid-cols-[2.5rem_1.2fr_1.2fr_1fr_1.2fr_auto] gap-2 items-center">
                                {/* Type Selector */}
                                <button
                                    onClick={() => setTypeModal({ isOpen: true, setIndex: i })}
                                    className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:border-primary/50 transition-colors"
                                >
                                    {(set.type === 'working') ? (
                                        <span className="text-blue-600 dark:text-blue-400 font-black text-sm">{workingSetIndex}</span>
                                    ) : (
                                        getSetTypeIcon(set.type, false)
                                    )}
                                </button>

                                {/* Weight Input */}
                                <input
                                    type="number"
                                    placeholder="-"
                                    className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary/50 px-0"
                                    value={set.weight_target}
                                    onChange={(e) => handleSetChange(i, 'weight_target', e.target.value)}
                                />

                                {/* Reps Input (Text) */}
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="10"
                                    className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary/50 px-0"
                                    value={set.reps_target}
                                    onChange={(e) => handleSetChange(i, 'reps_target', e.target.value)}
                                />

                                {/* Rest Input */}
                                <div className="relative">
                                    <input
                                        type="number"
                                        placeholder="60"
                                        className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-1 focus:ring-primary/50 px-0"
                                        value={set.rest_seconds}
                                        onChange={(e) => handleSetChange(i, 'rest_seconds', e.target.value)}
                                    />
                                </div>

                                {/* RPE Selector */}
                                <div className="relative">
                                    <select
                                        className={`w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold outline-none focus:ring-1 focus:ring-primary/50 appearance-none px-0
                                ${parseFloat(set.rpe_target) >= 9 ? 'text-red-500' : parseFloat(set.rpe_target) >= 7 ? 'text-amber-500' : 'text-green-500'}
                            `}
                                        value={set.rpe_target}
                                        onChange={(e) => handleSetChange(i, 'rpe_target', e.target.value)}
                                    >
                                        {Array.from({ length: 11 }, (_, k) => 5 + k * 0.5).map(val => (
                                            <option key={val} value={val} className="text-slate-900 dark:text-white bg-white dark:bg-slate-800">{val}</option>
                                        ))}
                                    </select>
                                    {/* Custom Chevron */}
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 material-symbols-rounded text-sm">unfold_more</span>
                                </div>

                                {/* Delete Set */}
                                <button onClick={() => handleRemoveSet(i)} className="p-1 text-slate-300 hover:text-red-500 transition-colors flex justify-center w-6">
                                    <span className="material-symbols-rounded text-lg">close</span>
                                </button>
                            </div>
                        )
                    })}

                    <button onClick={handleAddSet} className="w-full py-2.5 mt-2 border border-dashed border-primary/30 text-primary rounded-xl font-bold text-sm bg-primary/5 hover:bg-primary/10 transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-rounded text-lg">add</span>
                        Adicionar Série
                    </button>
                </div>

                {/* Coach Notes */}
                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Notas do Treinador</label>
                    <textarea
                        placeholder="Ex: Controlar a excêntrica, pausa de 1s embaixo..."
                        className="w-full mt-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary/50 outline-none resize-none h-20"
                        value={notes}
                        onChange={(e) => {
                            setNotes(e.target.value);
                            updateParent(sets, e.target.value);
                        }}
                    />
                </div>
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
        </div>
    );
};

export default ExerciseCard;
