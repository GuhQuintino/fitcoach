import React from 'react';
import MainLayout from '../../components/Layout/MainLayout';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Plans: React.FC = () => {
    const { expiresAt } = useAuth();

    const formatExpirationDate = () => {
        if (!expiresAt) return null;
        const exp = new Date(expiresAt);
        const now = new Date();
        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            date: exp.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
            days: diffDays,
            isExpired: diffDays <= 0,
            isUrgent: diffDays > 0 && diffDays <= 7
        };
    };

    const expInfo = formatExpirationDate();

    return (
        <MainLayout>
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-10 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-40 left-10 w-56 h-56 bg-amber-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative font-display">
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-white/5 shadow-sm">
                    <div className="px-5 py-4 flex items-center justify-between">
                        <Link
                            to="/coach/dashboard"
                            className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-300 dark:hover:border-sky-600 transition-all shadow-sm hover:shadow-md active:scale-95"
                        >
                            <span className="material-symbols-rounded text-xl">arrow_back</span>
                        </Link>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white text-center flex-1">Minha Assinatura</h1>
                        <div className="w-10"></div>
                    </div>
                </header>

                <main className="px-5 py-8 max-w-lg mx-auto space-y-6 pb-32">
                    {/* Current Subscription Card */}
                    {expInfo && (
                        <div className={`relative overflow-hidden rounded-3xl p-6 border ${expInfo.isExpired
                                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'
                                : expInfo.isUrgent
                                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                                    : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30'
                            }`}>
                            {expInfo.isUrgent && !expInfo.isExpired && (
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-red-400 animate-pulse"></div>
                            )}

                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Status da Assinatura</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${expInfo.isExpired ? 'bg-red-500' : expInfo.isUrgent ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                                            }`}></span>
                                        <span className={`font-bold ${expInfo.isExpired ? 'text-red-600 dark:text-red-400' : expInfo.isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                            }`}>
                                            {expInfo.isExpired ? 'Expirada' : 'Ativa'}
                                        </span>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-2xl ${expInfo.isExpired ? 'bg-red-100 dark:bg-red-800/30' : expInfo.isUrgent ? 'bg-amber-100 dark:bg-amber-800/30' : 'bg-emerald-100 dark:bg-emerald-800/30'
                                    }`}>
                                    <span className={`material-symbols-rounded text-2xl ${expInfo.isExpired ? 'text-red-500' : expInfo.isUrgent ? 'text-amber-500' : 'text-emerald-500'
                                        }`}>
                                        {expInfo.isExpired ? 'error' : expInfo.isUrgent ? 'schedule' : 'verified'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Válida até</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{expInfo.date}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Dias restantes</span>
                                    <span className={`font-black text-lg ${expInfo.isExpired ? 'text-red-500' : expInfo.isUrgent ? 'text-amber-500' : 'text-emerald-500'
                                        }`}>
                                        {expInfo.isExpired ? 'Expirado' : `${expInfo.days} dias`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Coming Soon Card */}
                    <div className="text-center py-8">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-sky-500/20 to-indigo-500/20 text-sky-500 rounded-3xl flex items-center justify-center mb-6">
                            <span className="material-symbols-rounded text-4xl">auto_awesome</span>
                        </div>

                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-amber-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Em Desenvolvimento
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Autogestão de Planos</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                            Em breve você poderá renovar e gerenciar sua assinatura diretamente pelo app.
                        </p>
                    </div>

                    {/* Contact Card */}
                    <div className="bg-white dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-lg transition-all">
                        <div className="flex items-start gap-4">
                            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
                                <span className="material-symbols-rounded text-2xl text-emerald-500">support_agent</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-white mb-1">Precisa renovar?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                    Entre em contato com nosso suporte para ativar ou renovar sua assinatura.
                                </p>

                                <a
                                    href="https://wa.me/5511999999999"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.029c0 2.119.554 4.188 1.604 6.04L0 24l6.097-1.6c1.789.976 3.805 1.491 5.948 1.493h.005c6.634 0 12.032-5.396 12.036-12.033a11.83 11.83 0 00-3.479-8.502z" />
                                    </svg>
                                    Falar com Suporte
                                </a>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default Plans;