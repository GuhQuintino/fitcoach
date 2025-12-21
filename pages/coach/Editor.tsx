import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Link } from 'react-router-dom';

const Editor: React.FC = () => {
    return (
        <MainLayout className="pb-24">
            {/* Clean Header */}
            <header className="bg-white dark:bg-slate-800 sticky top-0 z-50 border-b border-slate-100 dark:border-slate-700 shadow-soft">
                <div className="px-5 py-3 flex items-center justify-between">
                    <Link to="/coach/routine-details" className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">arrow_back</span>
                    </Link>
                    <div className="flex-1 text-center truncate px-2">
                        <h2 className="text-xs text-slate-500 dark:text-slate-400 truncate">Upper Lower 4x na Semana</h2>
                        <h1 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">Treino A - Upper I</h1>
                    </div>
                    <button className="px-3 py-1.5 rounded-xl text-primary font-semibold text-sm hover:bg-primary/10 transition-colors">
                        Salvar
                    </button>
                </div>
            </header>

            <main className="px-5 py-6 space-y-6">
                <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400 px-1">
                    <span>2 exercícios</span>
                    <button className="flex items-center gap-1 hover:text-primary transition-colors text-primary font-medium">
                        <span className="material-symbols-rounded text-base">sort</span>
                        Ordenar
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Exercise Card 1 */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-start gap-3">
                            <div className="cursor-move text-slate-300 dark:text-slate-600 pt-1">
                                <span className="material-symbols-rounded">drag_indicator</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center flex-shrink-0 text-primary">
                                <span className="material-symbols-rounded">smart_display</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-display font-bold text-slate-900 dark:text-white leading-tight">Supino Reto com Halteres</h3>
                                <a className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline truncate max-w-full" href="#">
                                    <span className="material-symbols-rounded text-[10px]">link</span>
                                    youtu.be/shortlink_exemplo
                                </a>
                            </div>
                            <button className="p-2 -mr-2 text-slate-400 hover:text-danger transition-colors">
                                <span className="material-symbols-rounded">delete</span>
                            </button>
                        </div>
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30">
                            <div className="grid grid-cols-12 gap-1 mb-3 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-3 pl-1">Tipo</div>
                                <div className="col-span-3 text-center">Reps</div>
                                <div className="col-span-2 text-center">Desc</div>
                                <div className="col-span-2 text-center text-primary" title="Percepção Subjetiva de Esforço (6-10)">PSE</div>
                                <div className="col-span-1"></div>
                            </div>
                            <div className="space-y-2">
                                {/* Set 1 */}
                                <div className="grid grid-cols-12 gap-1 items-center">
                                    <div className="col-span-1 flex justify-center">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-warning" title="Aquecimento">
                                            <span className="material-symbols-rounded text-[14px]">local_fire_department</span>
                                        </div>
                                    </div>
                                    <div className="col-span-3 relative">
                                        <select className="w-full text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 pl-2 pr-2 focus:ring-1 focus:ring-primary focus:border-primary appearance-none truncate font-medium text-warning" defaultValue="warmup">
                                            <option value="warmup">Aquec.</option>
                                            <option value="work">Trabalho</option>
                                            <option value="failure">Falha</option>
                                            <option value="deload">Deload</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3 relative">
                                        <input className="w-full text-center text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-1 focus:ring-1 focus:ring-primary focus:border-primary font-medium text-slate-900 dark:text-white" type="text" defaultValue="15" />
                                    </div>
                                    <div className="col-span-2">
                                        <input className="w-full text-center text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-0 focus:ring-1 focus:ring-primary focus:border-primary text-slate-500 dark:text-slate-400" placeholder="0s" type="text" defaultValue="60s" />
                                    </div>
                                    <div className="col-span-2">
                                        <select className="w-full text-center text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-0 focus:ring-1 focus:ring-primary focus:border-primary text-success font-bold appearance-none" defaultValue="6">
                                            <option value="6">6</option>
                                            <option value="7">7</option>
                                            <option value="8">8</option>
                                            <option value="9">9</option>
                                            <option value="10">10</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button className="text-slate-400 hover:text-danger p-1">
                                            <span className="material-symbols-rounded text-sm">close</span>
                                        </button>
                                    </div>
                                </div>
                                {/* Set 2 */}
                                <div className="grid grid-cols-12 gap-1 items-center">
                                    <div className="col-span-1 flex justify-center">
                                        <div className="w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center text-primary" title="Trabalho">
                                            <span className="material-symbols-rounded text-[14px]">fitness_center</span>
                                        </div>
                                    </div>
                                    <div className="col-span-3 relative">
                                        <select className="w-full text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 pl-2 pr-2 focus:ring-1 focus:ring-primary focus:border-primary appearance-none truncate font-medium text-primary" defaultValue="work">
                                            <option value="warmup">Aquec.</option>
                                            <option value="work">Trab.</option>
                                        </select>
                                    </div>
                                    <div className="col-span-3 relative">
                                        <input className="w-full text-center text-xs bg-white dark:bg-slate-700 border border-primary/30 ring-1 ring-primary/20 rounded-lg py-1.5 px-1 focus:ring-1 focus:ring-primary focus:border-primary font-medium text-primary" type="text" defaultValue="8 à 12" />
                                    </div>
                                    <div className="col-span-2">
                                        <input className="w-full text-center text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-0 focus:ring-1 focus:ring-primary focus:border-primary text-slate-500 dark:text-slate-400" placeholder="0s" type="text" defaultValue="90s" />
                                    </div>
                                    <div className="col-span-2">
                                        <select className="w-full text-center text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 px-0 focus:ring-1 focus:ring-primary focus:border-primary text-primary font-bold appearance-none" defaultValue="8">
                                            <option value="6">6</option>
                                            <option value="7">7</option>
                                            <option value="8">8</option>
                                            <option value="9">9</option>
                                            <option value="10">10</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button className="text-slate-400 hover:text-danger p-1">
                                            <span className="material-symbols-rounded text-sm">close</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 mb-4">
                                <button className="text-xs font-semibold text-primary flex items-center gap-1 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors border border-dashed border-primary/30 w-full justify-center">
                                    <span className="material-symbols-rounded text-sm">add</span> Adicionar Série
                                </button>
                            </div>
                            <div className="relative">
                                <label className="absolute -top-2 left-2 px-1 bg-slate-50 dark:bg-slate-900 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                    Notas do treinador
                                </label>
                                <textarea className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs p-3 pt-3 resize-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white placeholder-slate-400" placeholder="Ex: Controlar a excêntrica, pausa de 1s embaixo..." rows={2}></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-2 pb-6">
                    <button className="w-full bg-primary text-white py-4 rounded-2xl shadow-elevated flex items-center justify-center gap-2 font-bold text-lg hover:bg-primary-dark transition-all transform active:scale-[0.98]">
                        <span className="material-symbols-rounded">add_circle</span>
                        Adicionar Exercício
                    </button>
                </div>
            </main>
        </MainLayout>
    );
};

export default Editor;