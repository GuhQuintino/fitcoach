import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Link } from 'react-router-dom';

const Selection: React.FC = () => {
    return (
        <MainLayout className="pb-24">
            <header className="sticky top-0 z-50 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/student/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                        <span className="material-icons-outlined">arrow_back_ios_new</span>
                    </Link>
                    <div className="flex-1 px-4 text-center">
                        <h1 className="text-base font-bold text-text-light dark:text-text-dark truncate">Upper Lower 4x na Semana</h1>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Rotina atual</p>
                    </div>
                    <button className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                        <span className="material-icons-outlined">info</span>
                    </button>
                </div>
            </header>
            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <span className="material-icons-round text-9xl transform translate-x-4 -translate-y-4">fitness_center</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="font-bold text-xl mb-1">Pronto para treinar?</h2>
                        <p className="text-blue-100 text-sm mb-4">Escolha seu treino de hoje e mantenha o foco.</p>
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg p-2 w-fit">
                            <span className="material-icons-round text-sm">local_fire_department</span>
                            <span className="text-xs font-medium">3 dias de sequência</span>
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-end px-1">
                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark">Seus Treinos</h3>
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">4 disponíveis</span>
                </div>
                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute -top-3 left-4 bg-success text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10 flex items-center gap-1">
                            <span className="material-icons-round text-[12px]">recommend</span>
                            RECOMENDADO
                        </div>
                        <Link to="/student/workout/1" className="w-full text-left bg-surface-light dark:bg-surface-dark rounded-2xl p-4 shadow-md border-2 border-success/30 dark:border-success/30 transition-all hover:shadow-lg hover:border-success active:scale-[0.99] flex flex-row items-center gap-4 group ring-2 ring-success/10 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark">
                            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-primary font-bold text-lg border border-blue-100 dark:border-blue-800">
                                A
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-text-light dark:text-text-dark group-hover:text-primary transition-colors">Upper I</h4>
                                <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-1">Peito, Costas e Ombros</p>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                        <span className="material-icons-outlined text-[14px] mr-1 text-gray-400">timer</span>
                                        50-70 min
                                    </span>
                                    <span className="inline-flex items-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                                        <span className="material-icons-outlined text-[14px] mr-1 text-gray-400">fitness_center</span>
                                        8 exercícios
                                    </span>
                                </div>
                            </div>
                            <div className="text-success transition-colors">
                                <span className="material-icons-round">arrow_forward_ios</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </main>
        </MainLayout>
    );
};

export default Selection;