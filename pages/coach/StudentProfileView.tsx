import React from 'react';
import BottomNav from '../../components/BottomNav';
import { Link } from 'react-router-dom';

const StudentProfileView: React.FC = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-gray-900 dark:text-white overflow-x-hidden selection:bg-primary selection:text-white pb-24 min-h-screen">
            <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-white/5">
                <Link to="/coach/students" className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-gray-900 dark:text-white">arrow_back_ios_new</span>
                </Link>
                <h1 className="text-lg font-bold leading-tight tracking-tight">Perfil do Aluno</h1>
                <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-gray-900 dark:text-white">edit</span>
                </button>
            </header>
            <section className="flex flex-col items-center pt-6 pb-2 px-4">
                <div className="relative group cursor-pointer">
                    <div className="w-32 h-32 rounded-full bg-surface-highlight dark:bg-surface-highlight p-1 shadow-xl shadow-primary/10">
                        <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA4lErFte7aK1yshIXT8DsrHk_EhDDC115yxVGzcyy8pTxwLuHibUwrF-ZGW6elvjLsD1rS9DJxaG_RMPPKR5Lwt4Sz7PcdX1sm8WXPBTw-4TfOK3LHGb6cIWx8_m7newlW1HTl9sDVGlgcoY6lAWMNm9QVLZtfvLIDk4fOYPosoDq2aCTqA8Xi89TE8_teuMAUIcG2MDYhdtdnDPh6E3lgjPmy1M5-rxyCryitDaY7jx6U1u872dngB3u5m6ehC7OVCewhwY6XuQ4')" }}></div>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-background-light dark:bg-background-dark rounded-full p-1">
                        <div className="bg-primary rounded-full p-1.5 border-2 border-background-light dark:border-background-dark">
                            <span className="material-symbols-outlined text-white dark:text-background-dark text-[16px] font-bold block leading-none">check</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">João Silva</h2>
                    <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            Aluno Ativo
                        </span>
                    </div>
                </div>
            </section>
            <section className="px-4 py-4">
                <a className="flex items-center justify-center w-full bg-primary hover:bg-primary/90 text-white font-bold h-14 rounded-full gap-2 transition-transform active:scale-[0.98] shadow-lg shadow-primary/20" href="#">
                    <span className="material-symbols-outlined fill-1">chat</span>
                    <span>Mensagem via WhatsApp</span>
                </a>
            </section>
            <section className="px-4 py-2">
                <h3 className="text-gray-900 dark:text-white text-lg font-bold mb-3 px-1">Informações Pessoais</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-surface-highlight border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-primary text-[20px]">cake</span>
                            <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Idade</p>
                        </div>
                        <p className="text-gray-900 dark:text-white text-2xl font-bold">28 <span className="text-sm font-normal text-gray-400">anos</span></p>
                    </div>
                    <div className="flex flex-col gap-1 rounded-xl p-4 bg-white dark:bg-surface-highlight border border-gray-100 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-primary text-[20px]">height</span>
                            <p className="text-gray-500 dark:text-gray-300 text-sm font-medium">Altura</p>
                        </div>
                        <p className="text-gray-900 dark:text-white text-2xl font-bold">182 <span className="text-sm font-normal text-gray-400">cm</span></p>
                    </div>
                </div>
            </section>
            {/* ... other sections from HTML ... */}
            <BottomNav role="coach" />
        </div>
    );
};

export default StudentProfileView;