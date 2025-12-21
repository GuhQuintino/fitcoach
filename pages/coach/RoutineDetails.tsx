import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Link } from 'react-router-dom';

const RoutineDetails: React.FC = () => {
    return (
        <MainLayout className="pb-24">
            <header className="sticky top-0 z-50 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/coach/library" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                        <span className="material-icons-outlined">arrow_back_ios_new</span>
                    </Link>
                    <h1 className="text-lg font-bold text-center flex-1">Upper Lower 4x na Semana</h1>
                    <Link to="/coach/editor" className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-primary font-semibold text-sm cursor-pointer">
                        Editar
                    </Link>
                </div>
            </header>
            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                <div className="flex justify-between items-center text-sm text-text-secondary-light dark:text-text-secondary-dark px-1">
                    <span>4 treinos cadastrados</span>
                    <button className="flex items-center gap-1 hover:text-primary transition-colors">
                        <span className="material-icons-outlined text-base">sort</span>
                        Ordenar
                    </button>
                </div>
                <div className="space-y-4">
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md flex flex-row items-center gap-4">
                        <div className="flex items-center text-gray-300 dark:text-gray-600 cursor-move">
                            <span className="material-icons-outlined">drag_indicator</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark">Treino A - Upper I</h3>
                                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1 leading-snug">
                                        Foco em exercícios de empurrar para peitoral e ombros, com estímulo de tríceps.
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="inline-flex items-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                            <span className="material-icons-outlined text-[14px] mr-1 text-primary">timer</span>
                                            50-70 min
                                        </span>
                                        <span className="inline-flex items-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                            <span className="material-icons-outlined text-[14px] mr-1 text-primary">fitness_center</span>
                                            8 exercícios
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-700 pl-3">
                            <Link to="/coach/editor" className="p-2 text-gray-400 hover:text-primary dark:hover:text-primary transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-gray-800" title="Editar Treino">
                                <span className="material-icons-outlined text-xl">edit</span>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="pt-2 pb-6">
                    <button className="w-full bg-primary text-white py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 font-bold text-lg hover:bg-primary-dark transition-all transform active:scale-[0.98]">
                        <span className="material-icons-round">add_circle</span>
                        Adicionar Novo Treino
                    </button>
                </div>
            </main>
        </MainLayout>
    );
};

export default RoutineDetails;