import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    errorType: 'chunk' | 'runtime' | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        errorType: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Check if it's a dynamic import failure (common after new deploys)
        const isChunkLoadFailed = error.name === 'ChunkLoadError' ||
            error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('loading chunk');

        return {
            hasError: true,
            errorType: isChunkLoadFailed ? 'chunk' : 'runtime'
        };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        // Clear potentially broken caches and reload
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl text-center border border-slate-100 dark:border-slate-700">
                        <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-rounded text-4xl">
                                {this.state.errorType === 'chunk' ? 'system_update' : 'error'}
                            </span>
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                            {this.state.errorType === 'chunk' ? 'Atualização Necessária' : 'Algo deu errado'}
                        </h2>

                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                            {this.state.errorType === 'chunk'
                                ? 'Uma nova versão do FitCoach está disponível. Precisamos recarregar para aplicar as mudanças.'
                                : 'Ocorreu um erro inesperado. Tente recarregar a página para resolver.'}
                        </p>

                        <button
                            onClick={this.handleReload}
                            className="w-full py-4 px-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                        >
                            <span className="material-symbols-rounded">refresh</span>
                            Recarregar App
                        </button>

                        <p className="mt-6 text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em]">
                            FitCoach Pro
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
