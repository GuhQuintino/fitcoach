import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Link } from 'react-router-dom';

const Library: React.FC = () => {
    return (
        <MainLayout className="pb-24">
            {/* Clean Header */}
            <header className="bg-white dark:bg-slate-800 sticky top-0 z-50 border-b border-slate-100 dark:border-slate-700 shadow-soft">
                <div className="px-5 py-4 flex items-center justify-between">
                    <Link to="/coach/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">arrow_back</span>
                    </Link>
                    <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white flex-1 text-center">Biblioteca de Treinos</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">
                {/* Search */}
                <div className="relative">
                    <span className="absolute left-4 top-3.5 material-symbols-rounded text-slate-400">search</span>
                    <input
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3.5 pl-12 pr-4 shadow-soft text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-slate-400 text-slate-900 dark:text-white transition-all"
                        placeholder="Buscar rotinas..."
                        type="text"
                    />
                </div>

                {/* Routine Cards */}
                <div className="space-y-4">
                    {/* Routine 1 */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 transition-all card-hover">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <Link to="/coach/routine-details" className="font-display font-bold text-lg text-slate-900 dark:text-white hover:text-primary transition-colors">
                                    Upper Lower 4x na Semana
                                </Link>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 dark:bg-sky-900/20 text-primary">
                                        <span className="material-symbols-rounded text-[14px] mr-1">timer</span>
                                        50-70 min
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-warning">
                                        <span className="material-symbols-rounded text-[14px] mr-1">fitness_center</span>
                                        Avançado
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-success">
                                        <span className="material-symbols-rounded text-[14px] mr-1">calendar_today</span>
                                        4 Treinos
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-primary hover:bg-primary/10 transition-colors text-sm font-medium">
                                <span className="material-symbols-rounded text-lg">person_add</span>
                                Atribuir
                            </button>
                            <div className="flex items-center gap-1">
                                <Link to="/coach/routine-details" className="p-2 text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700" title="Editar">
                                    <span className="material-symbols-rounded text-xl">edit</span>
                                </Link>
                                <button className="p-2 text-slate-400 hover:text-danger transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700" title="Excluir">
                                    <span className="material-symbols-rounded text-xl">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Routine 2 */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-soft border border-slate-100 dark:border-slate-700 transition-all card-hover">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Hipertrofia ABC - Iniciante</h3>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-50 dark:bg-sky-900/20 text-primary">
                                        <span className="material-symbols-rounded text-[14px] mr-1">timer</span>
                                        45-60 min
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-success">
                                        <span className="material-symbols-rounded text-[14px] mr-1">fitness_center</span>
                                        Iniciante
                                    </span>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-success">
                                        <span className="material-symbols-rounded text-[14px] mr-1">calendar_today</span>
                                        3 Treinos
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-primary hover:bg-primary/10 transition-colors text-sm font-medium">
                                <span className="material-symbols-rounded text-lg">person_add</span>
                                Atribuir
                            </button>
                            <div className="flex items-center gap-1">
                                <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700" title="Editar">
                                    <span className="material-symbols-rounded text-xl">edit</span>
                                </button>
                                <button className="p-2 text-slate-400 hover:text-danger transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700" title="Excluir">
                                    <span className="material-symbols-rounded text-xl">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Button */}
                <div className="pt-2 pb-6">
                    <button className="w-full bg-primary text-white py-4 rounded-2xl shadow-elevated flex items-center justify-center gap-2 font-bold text-lg hover:bg-primary-dark transition-all transform active:scale-[0.98]">
                        <span className="material-symbols-rounded">add_circle</span>
                        Adicionar Nova Rotina
                    </button>
                </div>
            </main>
        </MainLayout>
    );
};

export default Library;