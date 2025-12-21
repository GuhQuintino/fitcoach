import React from 'react';
import BottomNav from '../../components/BottomNav';
import { Link } from 'react-router-dom';

const SubscriptionDetails: React.FC = () => {
    return (
        <div className="font-display bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark transition-colors duration-200 antialiased pb-24 min-h-screen">
            <header className="sticky top-0 z-50 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/coach/plans" className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                        <span className="material-icons-outlined">arrow_back_ios_new</span>
                    </Link>
                    <h1 className="text-lg font-bold text-center flex-1">Detalhes da Assinatura</h1>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                        <span className="material-symbols-outlined text-8xl">verified</span>
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide border border-white/30">ATIVO</span>
                        </div>
                        <h2 className="text-3xl font-bold mb-1">Plano Semestral</h2>
                        <p className="text-blue-100 text-sm">Próxima renovação em 15 de Outubro</p>
                    </div>
                </div>
                {/* Payment info block */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                        <h3 className="font-bold text-text-light dark:text-text-dark flex items-center gap-2">
                            <span className="material-icons-outlined text-primary">receipt_long</span>
                            Informações de Pagamento
                        </h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Valor Pago</span>
                            <span className="font-semibold text-text-light dark:text-text-dark">R$ 79,90<span className="text-xs font-normal text-text-secondary-light dark:text-text-secondary-dark">/mês</span></span>
                        </div>
                        {/* ... */}
                    </div>
                </div>
                <div className="pt-2 space-y-3">
                    <button className="w-full bg-white dark:bg-surface-darker border border-gray-300 dark:border-gray-600 text-text-light dark:text-text-dark py-3.5 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm">
                        Alterar Plano
                    </button>
                    <button className="w-full text-danger hover:text-red-700 dark:hover:text-red-400 text-sm font-medium py-2 transition-colors">
                        Cancelar Assinatura
                    </button>
                </div>
            </main>
            <BottomNav role="coach" />
        </div>
    );
};

export default SubscriptionDetails;