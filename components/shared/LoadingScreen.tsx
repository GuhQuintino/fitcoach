import React, { useEffect, useState } from 'react';

const quotes = [
    "Construindo sua melhor versão...",
    "Prepare seus músculos para o próximo nível...",
    "A disciplina supera a motivação todos os dias.",
    "O seu único limite é a sua mente.",
    "Cada gota de suor aproxima você do seu objetivo.",
    "Não pare até se orgulhar de você.",
    "A dor é temporária, o resultado é para sempre.",
    "Seja mais forte que sua melhor desculpa.",
    "Foco no progresso, não na perfeição.",
    "Transformando esforço em resultados..."
];

const LoadingScreen: React.FC = () => {
    const [quote, setQuote] = useState("");

    useEffect(() => {
        // Escolha uma frase aleatória
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative flex flex-col items-center max-w-sm px-6 text-center">
                {/* Custom Animated Spinner */}
                <div className="relative w-20 h-20 mb-8">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-4 border-2 border-emerald-400/30 rounded-full animate-pulse" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>

                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-rounded text-primary text-3xl animate-bounce">fitness_center</span>
                    </div>
                </div>

                {/* Motivational Text */}
                <div className="space-y-3 animate-fade-in">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white font-display uppercase tracking-widest">
                        Fitcoach <span className="text-primary">Pro</span>
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed italic">
                        "{quote}"
                    </p>
                </div>

                {/* Progress Bar Loader */}
                <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-8 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-emerald-400 w-1/3 rounded-full animate-loader shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"></div>
                </div>
            </div>

            <style>{`
                @keyframes loader {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(250%); }
                }
                .animate-loader {
                    animation: loader 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
