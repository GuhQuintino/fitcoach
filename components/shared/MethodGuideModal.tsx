import React, { useState, useEffect } from 'react';
import { METHOD_GUIDE_ITEMS, METHOD_GUIDE_CATEGORIES, MethodGuideItem } from './methodGuideContent';

interface MethodGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialItemId?: string | null;
    initialLayer?: 'all' | 'group' | 'set_method' | 'execution_mode' | 'timer_mode';
    isStudent?: boolean;
}

const MethodGuideModal: React.FC<MethodGuideModalProps> = ({
    isOpen,
    onClose,
    initialItemId,
    initialLayer = 'all',
    isStudent = false
}) => {
    const [selectedCategory, setSelectedCategory] = useState<string>(initialLayer);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
    const [isFocusedView, setIsFocusedView] = useState<boolean>(false);
    const [focusedItemId, setFocusedItemId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialItemId && METHOD_GUIDE_ITEMS[initialItemId]) {
                setFocusedItemId(initialItemId);
                setIsFocusedView(true);
                setExpandedItemId(initialItemId);
                setSelectedCategory(METHOD_GUIDE_ITEMS[initialItemId].layer);
            } else {
                setFocusedItemId(null);
                setIsFocusedView(false);
                setSelectedCategory(initialLayer || 'all');
                setExpandedItemId(null);
            }
            setSearchTerm('');
        }
    }, [isOpen, initialItemId, initialLayer]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const focusedItem: MethodGuideItem | undefined = focusedItemId
        ? METHOD_GUIDE_ITEMS[focusedItemId]
        : undefined;

    const allItems = Object.values(METHOD_GUIDE_ITEMS);

    const filteredItems = allItems.filter((item) => {
        const matchesCategory = selectedCategory === 'all' || item.layer === selectedCategory;
        const matchesSearch =
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.shortName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getLayerLabel = (layer: MethodGuideItem['layer']) => {
        switch (layer) {
            case 'group': return 'Agrupamento (Camada 1)';
            case 'set_method': return 'Método de Série (Camada 2)';
            case 'execution_mode': return 'Execução Biomecânica (Camada 3)';
            case 'timer_mode': return 'Cronometragem (Camada 4)';
            default: return 'Série Especial';
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Guia Pedagógico de Séries Especiais e Métodos de Intensificação"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 w-full max-w-xl sm:max-w-2xl rounded-3xl p-5 sm:p-6 shadow-2xl animate-scale-up max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700 transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ═══════════════════════════════════════════════════════════════════ */}
                {/* MODO FOCADO (Cirúrgico no item clicado)                             */}
                {/* ═══════════════════════════════════════════════════════════════════ */}
                {isFocusedView && focusedItem ? (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* Header Focado */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${focusedItem.badgeColor}`}>
                                    <span className="material-symbols-rounded text-2xl" aria-hidden="true">
                                        {focusedItem.icon}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-0.5">
                                        {getLayerLabel(focusedItem.layer)}
                                    </span>
                                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                                        {focusedItem.name}
                                    </h3>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Fechar guia"
                                className="min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                            >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">close</span>
                            </button>
                        </div>

                        {/* Conteúdo Focado Exclusivo */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                            {/* O que é / Resumo */}
                            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-1">
                                    Conceito & Fisiologia
                                </span>
                                {focusedItem.summary}
                            </div>

                            {/* Como Executar Passo a Passo */}
                            <div className="space-y-2">
                                <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="material-symbols-rounded text-primary text-base" aria-hidden="true">
                                        format_list_numbered
                                    </span>
                                    Protocolo Passo a Passo:
                                </h4>
                                <ol className="space-y-2">
                                    {focusedItem.howToPerform.map((step, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2.5 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50 leading-relaxed"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <span className="text-slate-700 dark:text-slate-200 text-xs sm:text-sm">
                                                {step}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* Quando Aplicar (apenas para o treinador / modo instrutivo) */}
                            {!isStudent && focusedItem.whenToUse && (
                                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
                                    <h4 className="font-black text-emerald-800 dark:text-emerald-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                        <span className="material-symbols-rounded text-emerald-600 dark:text-emerald-400 text-base" aria-hidden="true">
                                            lightbulb
                                        </span>
                                        Quando Aplicar:
                                    </h4>
                                    <p className="text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed">
                                        {focusedItem.whenToUse}
                                    </p>
                                </div>
                            )}

                            {/* Dica de Intervalo & Técnica */}
                            <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5">
                                <span className="material-symbols-rounded text-amber-600 dark:text-amber-400 text-lg shrink-0 mt-0.5" aria-hidden="true">
                                    schedule
                                </span>
                                <div className="leading-relaxed">
                                    <strong className="block font-black text-amber-800 dark:text-amber-300 text-xs uppercase tracking-wider mb-0.5">
                                        Dica de Intervalo & Técnica:
                                    </strong>
                                    <p className="text-amber-900 dark:text-amber-200 text-xs">
                                        {focusedItem.recoveryOrTips}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Focado com Botão para Ver Todos e Botão Fechar */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsFocusedView(false);
                                    setSearchTerm('');
                                }}
                                className="min-h-[40px] px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                <span className="material-symbols-rounded text-base" aria-hidden="true">menu_book</span>
                                Ver todos os métodos do guia
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                className="min-h-[42px] px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl shadow-sm active:scale-95 transition-all"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ═══════════════════════════════════════════════════════════════ */
                    /* MODO CATÁLOGO GERAL (Todos os métodos com busca e categorias)   */
                    /* ═══════════════════════════════════════════════════════════════ */
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* Header Catálogo */}
                        <div className="flex justify-between items-center mb-3 shrink-0">
                            <div className="flex items-center gap-2.5">
                                {focusedItemId && (
                                    <button
                                        type="button"
                                        onClick={() => setIsFocusedView(true)}
                                        aria-label="Voltar para visualização focada"
                                        className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 transition-colors"
                                    >
                                        <span className="material-symbols-rounded text-base" aria-hidden="true">arrow_back</span>
                                    </button>
                                )}
                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                    <span className="material-symbols-rounded text-xl" aria-hidden="true">school</span>
                                </div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                                        Guia de Séries Especiais & Métodos
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                                        Instruções biomecânicas e fisiológicas para prescrição e execução
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Fechar guia de métodos"
                                className="min-w-[44px] min-h-[44px] p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-xl transition-colors"
                            >
                                <span className="material-symbols-rounded" aria-hidden="true">close</span>
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-3 shrink-0">
                            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none" aria-hidden="true">
                                search
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar método, dropset, pausa, tempo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    aria-label="Limpar busca"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                                >
                                    <span className="material-symbols-rounded text-sm" aria-hidden="true">cancel</span>
                                </button>
                            )}
                        </div>

                        {/* Layer Categories Tabs */}
                        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 shrink-0 scrollbar-thin">
                            {METHOD_GUIDE_CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[36px] flex items-center ${
                                        selectedCategory === cat.id
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Items List */}
                        <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                            {filteredItems.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <span className="material-symbols-rounded text-4xl mb-2 opacity-50" aria-hidden="true">search_off</span>
                                    <p className="text-sm">Nenhum método encontrado para a busca realizada.</p>
                                </div>
                            ) : (
                                filteredItems.map((item: MethodGuideItem) => {
                                    const isExpanded = expandedItemId === item.id;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                                                isExpanded
                                                    ? 'bg-slate-50/80 dark:bg-slate-900/60 border-primary/40 shadow-sm'
                                                    : 'bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/80 hover:border-slate-200 dark:hover:border-slate-600'
                                            }`}
                                        >
                                            {/* Item Clickable Header */}
                                            <button
                                                type="button"
                                                aria-expanded={isExpanded}
                                                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                                className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 min-h-[44px]"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-rounded text-base text-slate-700 dark:text-slate-300" aria-hidden="true">
                                                            {item.icon}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                                                                {item.name}
                                                            </h4>
                                                            <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                                                                {item.shortName}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-snug">
                                                            {item.summary}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`material-symbols-rounded text-slate-400 text-lg transition-transform duration-200 shrink-0 ${
                                                        isExpanded ? 'rotate-180 text-primary' : ''
                                                    }`}
                                                    aria-hidden="true"
                                                >
                                                    expand_more
                                                </span>
                                            </button>

                                            {/* Expanded Detail Body */}
                                            {isExpanded && (
                                                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-700/50 space-y-3 text-xs sm:text-sm animate-fade-in text-slate-700 dark:text-slate-300">
                                                    {/* Full Summary */}
                                                    <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs leading-relaxed">
                                                        {item.summary}
                                                    </div>

                                                    {/* How to perform */}
                                                    <div>
                                                        <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                                            <span className="material-symbols-rounded text-primary text-sm" aria-hidden="true">check_circle</span>
                                                            Como Executar Passo a Passo:
                                                        </h5>
                                                        <ol className="list-decimal pl-4 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                                                            {item.howToPerform.map((step, idx) => (
                                                                <li key={idx} className="leading-snug">{step}</li>
                                                            ))}
                                                        </ol>
                                                    </div>

                                                    {/* When to use (apenas para treinador) */}
                                                    {!isStudent && item.whenToUse && (
                                                        <div>
                                                            <h5 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                                                <span className="material-symbols-rounded text-emerald-500 text-sm" aria-hidden="true">lightbulb</span>
                                                                Quando Aplicar:
                                                            </h5>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                                                                {item.whenToUse}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Recovery or tips */}
                                                    <div className="p-2 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                        <span className="material-symbols-rounded text-primary text-base shrink-0 mt-0.5" aria-hidden="true">info</span>
                                                        <div className="leading-snug">
                                                            <strong className="text-primary font-bold">Dica de Intervalo & Técnica: </strong>
                                                            {item.recoveryOrTips}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MethodGuideModal;
