import React from 'react';

interface DescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    description: string;
    title: string;
}

const DescriptionModal: React.FC<DescriptionModalProps> = ({ isOpen, onClose, description, title }) => {
    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-up border border-slate-100 dark:border-slate-700">
                <div className="p-6 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xl font-display">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[70vh] text-slate-600 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap">
                    {description.replace(/\\n/g, '\n').split('\n').map((line: string, i: number) => {
                        if (line.trim().startsWith('##')) {
                            return <h4 key={i} className="font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2">{line.replace(/^##\s*/, '')}</h4>;
                        }
                        if (!line.trim()) return <div key={i} className="h-3" />;

                        const parts = line.split('**');
                        return (
                            <p key={i} className="mb-2">
                                {parts.map((part, index) =>
                                    index % 2 === 1 ? <strong key={index} className="font-bold text-slate-700 dark:text-slate-200">{part}</strong> : part
                                )}
                            </p>
                        );
                    })}
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        onClick={onClose}
                        className="w-full bg-primary text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
                    >
                        Entendi
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DescriptionModal;
