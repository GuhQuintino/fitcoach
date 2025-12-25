import React, { useState, useEffect } from 'react';

const InstallTutorial: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

    useEffect(() => {
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
        }
    }, []);

    const steps = {
        android: [
            {
                icon: 'more_vert',
                text: 'Toque nos três pontos no canto superior direito do Chrome.'
            },
            {
                icon: 'install_mobile',
                text: 'Selecione "Instalar aplicativo" ou "Adicionar à tela inicial".'
            },
            {
                icon: 'add_to_home_screen',
                text: 'Confirme em "Instalar" e o ícone aparecerá na sua tela.'
            }
        ],
        ios: [
            {
                icon: 'ios_share',
                text: 'Toque no ícone de compartilhar na barra inferior do Safari.'
            },
            {
                icon: 'add_box',
                text: 'Role a lista para baixo e toque em "Adicionar à Tela de Início".'
            },
            {
                icon: 'add',
                text: 'Toque em "Adicionar" no canto superior direito para finalizar.'
            }
        ]
    };

    const currentSteps = platform === 'ios' ? steps.ios : steps.android;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all group border border-slate-100 dark:border-slate-700/50"
            >
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                        <span className="material-symbols-rounded">download_for_offline</span>
                    </div>
                    <div className="text-left">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block">Baixar Aplicativo</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tutorial de Instalação</span>
                    </div>
                </div>
                <span className="material-symbols-rounded text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <span className="material-symbols-rounded text-white text-2xl">install_mobile</span>
                                    </div>
                                    <div>
                                        <h3 className="font-display text-xl font-black text-slate-900 dark:text-white leading-tight">Instalar App</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{platform === 'ios' ? 'Passos para iPhone' : 'Passos para Android'}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-400"
                                >
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>

                            <div className="space-y-6">
                                {currentSteps.map((step, index) => (
                                    <div key={index} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-primary font-black border border-slate-100 dark:border-slate-600 group-hover:scale-110 transition-transform">
                                                {index + 1}
                                            </div>
                                            {index < currentSteps.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-slate-100 dark:bg-slate-700 my-2"></div>
                                            )}
                                        </div>
                                        <div className="flex-1 pt-1 pb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="material-symbols-rounded text-slate-400 text-lg">{step.icon}</span>
                                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Passo {index + 1}</span>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-200 font-bold text-sm leading-relaxed">
                                                {step.text}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
                                    Após adicionar, o ícone do **FitCoach Pro** aparecerá junto com seus outros aplicativos.
                                </p>
                            </div>

                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full mt-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallTutorial;
