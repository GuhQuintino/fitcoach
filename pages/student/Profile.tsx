import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import ThemeToggle from '../../components/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const StudentProfile: React.FC = () => {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
    };
    return (
        <MainLayout className="pb-24">
            {/* Clean Header */}
            <header className="bg-white dark:bg-slate-800 pt-12 pb-6 px-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button className="px-4 py-2 text-primary font-semibold text-sm hover:bg-primary/10 rounded-xl transition-colors">
                            Salvar
                        </button>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="flex flex-col items-center">
                    <div className="relative group mb-4">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-slate-200 dark:border-slate-600 shadow-soft flex items-center justify-center">
                            <span className="material-symbols-rounded text-4xl text-slate-400">person</span>
                        </div>
                        <button className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-xl shadow-soft hover:bg-primary-dark transition-colors">
                            <span className="material-symbols-rounded text-lg">photo_camera</span>
                        </button>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">João Silva</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aluno desde Jan 2023</p>
                    <button className="mt-4 flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold shadow-soft hover:bg-primary-dark active:scale-95 transition-all">
                        <span className="material-symbols-rounded text-[18px]">edit</span>
                        Editar Perfil
                    </button>
                </div>
            </header>

            <main className="px-5 pt-6 space-y-6">
                {/* Stats Grid */}
                <section className="animate-slide-up">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center relative group focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Idade</label>
                            <div className="flex items-baseline justify-center w-full gap-0.5">
                                <input className="p-0 border-none bg-transparent text-center font-display font-bold text-lg w-10 text-slate-900 dark:text-white focus:ring-0" type="number" defaultValue="26" />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">anos</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center relative group focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Altura</label>
                            <div className="flex items-baseline justify-center w-full gap-0.5">
                                <input className="p-0 border-none bg-transparent text-center font-display font-bold text-lg w-12 text-slate-900 dark:text-white focus:ring-0" type="text" defaultValue="1,78" />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">m</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center relative group focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Peso</label>
                            <div className="flex items-baseline justify-center w-full gap-0.5">
                                <input className="p-0 border-none bg-transparent text-center font-display font-bold text-lg w-14 text-slate-900 dark:text-white focus:ring-0" type="number" defaultValue="75.5" />
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">kg</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Settings Section */}
                <section className="space-y-3 animate-slide-up">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Configurações</h3>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                        <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-primary">
                                    <span className="material-symbols-rounded">notifications</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Notificações</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    id="notifications-toggle"
                                    className="sr-only peer"
                                    defaultChecked
                                />
                                <label
                                    htmlFor="notifications-toggle"
                                    className="block w-10 h-6 bg-slate-200 dark:bg-slate-600 rounded-full cursor-pointer peer-checked:bg-primary transition-colors"
                                >
                                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4"></span>
                                </label>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-success">
                                    <span className="material-symbols-rounded">language</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Idioma</p>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Português</span>
                        </div>
                    </div>
                </section>

                {/* Logout Button */}
                <div className="pt-2 pb-6">
                    <button
                        onClick={handleSignOut}
                        className="w-full p-4 rounded-2xl border-2 border-danger/20 bg-danger/5 text-danger font-bold flex items-center justify-center gap-2 hover:bg-danger/10 transition-all active:scale-[0.98]"
                    >
                        <span className="material-symbols-rounded">logout</span>
                        Sair da Conta
                    </button>
                </div>
            </main>
        </MainLayout>
    );
};

export default StudentProfile;