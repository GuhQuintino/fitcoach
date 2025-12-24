import React from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { Link } from 'react-router-dom';

const SubscriptionDetails: React.FC = () => {
    return (
        <MainLayout>
            <div className="font-display pb-8">
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="px-4 py-4 flex items-center justify-between">
                        <Link to="/coach/plans" className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                            <span className="material-symbols-rounded">arrow_back_ios_new</span>
                        </Link>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white text-center flex-1">Detalhes da Assinatura</h1>
                        <div className="w-10"></div>
                    </div>
                </header>

                <main className="px-4 py-6 space-y-6">
                    {/* Active Plan Card */}
                    <div className="bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-6 shadow-lg shadow-primary/30 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                            <span className="material-symbols-rounded text-9xl">verified</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-wide border border-white/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    ATIVO
                                </span>
                            </div>
                            <h2 className="text-3xl font-bold mb-1">Plano Semestral</h2>
                            <p className="text-blue-100 text-sm font-medium">Próxima renovação em 15 de Outubro</p>
                        </div>
                    </div>

                    {/* Payment info block */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-rounded text-primary">receipt_long</span>
                                Informações de Pagamento
                            </h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Valor Pago</span>
                                <span className="font-semibold text-slate-900 dark:text-white">R$ 79,90 <span className="text-xs font-normal text-slate-400">/mês</span></span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-100 dark:border-slate-700/50 pb-3 last:border-0 last:pb-0">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Método</span>
                                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-rounded text-slate-400">credit_card</span>
                                    •••• 4242
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm text-slate-500 dark:text-slate-400">Status</span>
                                <span className="text-xs font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md dark:bg-emerald-900/30 dark:text-emerald-400">PAGO</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 space-y-3">
                        <button className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-3.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm">
                            Alterar Plano
                        </button>
                        <button className="w-full text-red-500 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium py-2 transition-colors">
                            Cancelar Assinatura
                        </button>
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default SubscriptionDetails;