import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { Link } from 'react-router-dom';

const History: React.FC = () => {
    return (
        <MainLayout className="font-display pb-28">
            <header className="sticky top-0 z-50 bg-surface-light/95 dark:bg-surface-dark/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Histórico</h1>
                        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium mt-0.5">Acompanhe sua consistência</p>
                    </div>
                    <button className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden hover:bg-primary/20 transition-colors">
                        <span>GS</span>
                    </button>
                </div>
            </header>
            <main className="max-w-md mx-auto px-6 py-6 space-y-6">
                <section className="bg-surface-light dark:bg-surface-dark rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-lg text-text-light dark:text-text-dark capitalize">Outubro 2023</h2>
                        <div className="flex gap-1">
                            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-text-secondary-light dark:text-text-secondary-dark transition-colors">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 mb-3">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                            <div key={i} className="text-center text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase">{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-3 gap-x-1 justify-items-center">
                        <span></span><span></span>
                        {/* Static days for demo */}
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">1</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white shadow-md shadow-primary/30 hover:scale-105 transition-transform">2</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">3</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white shadow-md shadow-primary/30 hover:scale-105 transition-transform">4</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">5</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white shadow-md shadow-primary/30 hover:scale-105 transition-transform">6</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">7</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">8</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white shadow-md shadow-primary/30 hover:scale-105 transition-transform">9</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-text-light dark:text-text-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">10</button>
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-primary text-white shadow-md shadow-primary/30 hover:scale-105 transition-transform">11</button>
                        {/* More days... */}
                        <button className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 border-primary text-primary hover:bg-primary/5 transition-colors">19</button>
                    </div>
                </section>
            </main>
        </MainLayout>
    );
};

export default History;