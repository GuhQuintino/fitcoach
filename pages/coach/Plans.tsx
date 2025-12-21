import React from 'react';
import BottomNav from '../../components/BottomNav';
import { Link } from 'react-router-dom';

const Plans: React.FC = () => {
    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-200 antialiased pb-24 min-h-screen">
            <header className="sticky top-0 z-50 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/coach/dashboard" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                        <span className="material-icons-outlined">arrow_back_ios_new</span>
                    </Link>
                    <h1 className="text-lg font-bold text-center flex-1">Planos de Assinatura</h1>
                    <div className="w-10"></div> 
                </div>
            </header>
            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                <div className="text-center space-y-2 mb-4">
                    <h2 className="text-2xl font-bold text-text-light dark:text-text-dark">Escolha seu plano</h2>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-xs mx-auto">
                        Desbloqueie todos os recursos para gerenciar seus alunos e treinos com eficiência.
                    </p>
                </div>
                <div className="space-y-4">
                    <Link to="/coach/subscription" className="block bg-surface-light dark:bg-surface-dark rounded-xl p-6 shadow-lg border-2 border-primary transition-all relative overflow-hidden transform scale-[1.02]">
                        <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">MAIS POPULAR</div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-text-light dark:text-text-dark">Plano Semestral</h3>
                                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Cobrado a cada 6 meses</p>
                            </div>
                        </div>
                        <div className="mb-6">
                            <span className="text-3xl font-bold text-primary">R$ 79,90</span>
                            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">/mês</span>
                        </div>
                        <ul className="space-y-3 mb-6">
                            <li className="flex items-center text-sm text-text-light dark:text-text-dark font-medium">
                                <span className="material-icons-round text-success text-lg mr-2">check_circle</span>
                                Até 50 alunos ativos
                            </li>
                            <li className="flex items-center text-sm text-text-light dark:text-text-dark font-medium">
                                <span className="material-icons-round text-success text-lg mr-2">check_circle</span>
                                Relatórios de progresso
                            </li>
                        </ul>
                        <button className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark shadow-md shadow-primary/20 transition-all duration-200">
                            Assinar Semestral
                        </button>
                    </Link>
                    {/* Other plans... */}
                </div>
            </main>
            <BottomNav role="coach" />
        </div>
    );
};

export default Plans;