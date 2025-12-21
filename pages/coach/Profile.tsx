import React from 'react';
import BottomNav from '../../components/BottomNav';
import ThemeToggle from '../../components/ThemeToggle';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CoachProfile: React.FC = () => {
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
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-24">
            {/* Clean Header */}
            <header className="bg-white dark:bg-slate-800 pt-12 pb-8 px-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">Meu Perfil</h1>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <button className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300 text-xl">settings</span>
                        </button>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="flex flex-col items-center">
                    <div className="relative group mb-4">
                        <div className="w-24 h-24 rounded-2xl border-2 border-slate-200 dark:border-slate-600 overflow-hidden shadow-soft">
                            <img
                                alt="Profile"
                                className="w-full h-full object-cover"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB5tan3LoYLjTjUsidUlzGvTd0cscQhSXtVphyWSYdJNQrFv-U4bFopYEKNBTh6qIkM-c_v5Er63yK0fPV0eO1HUl1I0EIutj6PfJQ3Bm_gXP28hxRACJi9eFsoXpbw-iyIVUwAucpye_TypQGrmD2RCPC1wkJWlCLJTVlD9mKz6_tdGFGsHi4MqWSM61maFxF-IZ3_z1MctxHn238yrUhkQirxb2STSCk5RLKviseNmRyfeocc9uJeyAq-An1uN_Bx4tTFZE-DPgw"
                            />
                        </div>
                        <button className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-xl shadow-soft hover:bg-primary-dark transition-colors">
                            <span className="material-symbols-rounded text-lg">photo_camera</span>
                        </button>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Gustavo Coach</h2>
                    <p className="text-primary font-medium text-sm mt-1">Personal Trainer</p>
                </div>
            </header>

            <main className="flex-1 px-5 pt-6 space-y-5">
                {/* Personal Info Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 p-6 animate-slide-up">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">Informações Pessoais</h3>
                        <button className="text-primary text-sm font-semibold hover:text-primary-dark transition-colors">Salvar</button>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nome Completo</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                                    <span className="material-symbols-rounded text-lg">person</span>
                                </span>
                                <input
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-slate-400 transition-all"
                                    type="text"
                                    defaultValue="Gustavo Coach"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">E-mail</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                                    <span className="material-symbols-rounded text-lg">mail</span>
                                </span>
                                <input
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-slate-400 transition-all"
                                    type="email"
                                    defaultValue="gustavo@coach.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Telefone</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                                    <span className="material-symbols-rounded text-lg">phone</span>
                                </span>
                                <input
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-slate-400 transition-all"
                                    type="tel"
                                    defaultValue="(11) 99999-9999"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleSignOut}
                    className="w-full p-4 rounded-2xl border-2 border-danger/20 bg-danger/5 text-danger font-bold flex items-center justify-center gap-2 hover:bg-danger/10 transition-all active:scale-[0.98]"
                >
                    <span className="material-symbols-rounded">logout</span>
                    Sair da Conta
                </button>
            </main>

            <BottomNav />
        </div>
    );
};

export default CoachProfile;