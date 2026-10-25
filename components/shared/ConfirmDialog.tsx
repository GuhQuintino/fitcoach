import React, { useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    description,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = false,
    isLoading = false,
    onConfirm,
    onClose
}) => {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        // Foco inicial no botão de ação principal
        const timer = setTimeout(() => {
            confirmButtonRef.current?.focus();
        }, 50);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(timer);
        };
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose();
        }
    };

    return (
        <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl animate-scale-up border border-slate-200/80 dark:border-slate-700/80 p-6">
                <div className="flex items-center gap-3.5 mb-3">
                    <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            isDestructive
                                ? 'bg-red-500/10 text-red-500 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-400'
                        }`}
                        aria-hidden="true"
                    >
                        <span className="material-symbols-rounded text-2xl">
                            {isDestructive ? 'warning' : 'help'}
                        </span>
                    </div>
                    <h3 id="confirm-dialog-title" className="font-bold text-slate-900 dark:text-white text-lg font-display">
                        {title}
                    </h3>
                </div>

                <p id="confirm-dialog-desc" className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 pl-0.5">
                    {description}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="min-h-[44px] py-2.5 px-4 rounded-xl text-slate-600 dark:text-slate-300 font-bold text-sm bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 transition-colors border border-transparent dark:border-white/5 flex items-center justify-center disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`min-h-[44px] py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50 ${
                            isDestructive
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                                : 'bg-primary hover:bg-sky-600 shadow-primary/20'
                        }`}
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
