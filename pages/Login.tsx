import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/');
        } catch (error: any) {
            setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="w-full max-w-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-700 animate-slide-up relative">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl transform hover:rotate-12 transition-transform duration-300">
                        <span className="material-symbols-rounded text-white text-3xl font-bold">fitness_center</span>
                    </div>
                    <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">
                        Fitcoach <span className="text-primary">Pro</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">A plataforma definitiva para sua evolução</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-2xl text-center border border-red-100 dark:border-red-900/30 animate-shake">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Email</label>
                        <div className="relative group">
                            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">mail</span>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                placeholder="exemplo@email.com"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Senha</label>
                        <div className="relative group">
                            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl pl-12 pr-12 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                <span className="material-symbols-rounded text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-1">
                        <button type="button" className="text-xs font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider">Esqueceu a senha?</button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-emerald-500 hover:from-primary-dark hover:to-emerald-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>Entrando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Entrar na conta</span>
                                    <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Novo por aqui?{' '}
                        <Link to="/register" className="text-primary font-bold hover:text-primary-dark transition-all hover:underline decoration-2 underline-offset-4">
                            Crie sua conta
                        </Link>
                    </p>
                </div>
            </div>

            <p className="mt-8 text-xs text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                Fitcoach Pro © 2025
            </p>
        </div>
    );
};

export default Login;
