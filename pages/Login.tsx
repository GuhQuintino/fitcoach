import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sanitizeEmail, sanitizePassword } from '../utils/authSanitizer';

const COACH_WHATSAPP = '5511992616777';

const Login: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
    const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        if (!isForgotModalOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsForgotModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isForgotModalOpen]);

    const handleOpenForgotModal = () => {
        setRecoveryIdentifier(email.trim());
        setIsForgotModalOpen(true);
    };

    const handleRequestPasswordWhatsApp = (e: React.FormEvent) => {
        e.preventDefault();
        const identifier = recoveryIdentifier.trim() || email.trim();
        if (!identifier) {
            toast.error('Informe seu Nome ou Login (@fitcoach.com) para identificar sua conta.');
            return;
        }

        const message = `Olá Gustavo! Esqueci minha senha de acesso ao Fitcoach. Meu nome/login é: ${identifier}. Poderia gerar uma nova senha para mim?`;
        const whatsappUrl = `https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        setIsForgotModalOpen(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const cleanEmail = sanitizeEmail(email);
        const cleanPassword = sanitizePassword(password);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: cleanPassword,
            });

            if (error) throw error;
            navigate('/');
        } catch (error: any) {
            console.error('Erro de login detalhado:', error);
            
            if (error.message === 'Failed to fetch' || error.message?.includes('fetch')) {
                setError('Falha de conexão. Diagnosticando rede...');
                
                try {
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.unregister();
                        }
                    }
                    
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith('sb-')) localStorage.removeItem(key);
                    });
                    
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                    if (supabaseUrl) {
                        try {
                            await fetch(`${supabaseUrl}/auth/v1/health`, { method: 'GET' });
                            setError('A conexão primária funcionou. O Safari ou Android pode estar com "Bloquear cookies" ativado. Desative nas configurações do navegador e tente de novo.');
                        } catch (e) {
                            setError('Acesso bloqueado. Desative seu AdBlocker, VPN ou extensões anti-rastreamento (Brave/Safari Private Relay) e reinicie a página.');
                        }
                    } else {
                        setTimeout(() => window.location.reload(), 2500);
                    }
                } catch (clearError) {
                    console.error('Erro ao limpar workers/cache local:', clearError);
                    setTimeout(() => window.location.reload(), 1500);
                }
                
                setLoading(false);
                return;
            }

            setError(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos' : error.message || 'Erro ao fazer login');
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
                    <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">A plataforma definitiva para sua evolução</p>
                </div>

                {error && (
                    <div
                        role="alert"
                        aria-live="assertive"
                        className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs font-semibold rounded-2xl text-center border border-red-200 dark:border-red-900/30 animate-shake"
                    >
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <label htmlFor="login-email" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest px-1">Email</label>
                        <div className="relative group">
                            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" aria-hidden="true">mail</span>
                            <input
                                id="login-email"
                                type="email"
                                required
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium min-h-[44px]"
                                placeholder="seuusuario@fitcoach.com"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="login-password" className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest px-1">Senha</label>
                        <div className="relative group">
                            <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" aria-hidden="true">lock</span>
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                required
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl pl-12 pr-12 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium min-h-[44px]"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                                className="min-w-[44px] min-h-[44px] absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="material-symbols-rounded text-xl" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-1">
                        <button
                            type="button"
                            onClick={handleOpenForgotModal}
                            className="text-xs font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-wider min-h-[44px] px-2 rounded-xl flex items-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        aria-label="Entrar na conta"
                        className="w-full min-h-[44px] bg-primary hover:bg-sky-600 text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2 text-base font-bold">
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" role="status"></div>
                                    <span>Entrando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Entrar na conta</span>
                                    <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform" aria-hidden="true">arrow_forward</span>
                                </>
                            )}
                        </span>
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                        Novo por aqui?{' '}
                        <Link to="/register" className="text-primary font-bold hover:text-primary-dark transition-all hover:underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1">
                            Crie sua conta
                        </Link>
                    </p>
                </div>
            </div>

            {isForgotModalOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="forgot-password-title"
                    className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-900/70 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsForgotModalOpen(false)}
                >
                    <div
                        className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[2rem] p-6 shadow-2xl border border-slate-100 dark:border-slate-700 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <span className="material-symbols-rounded" aria-hidden="true">lock_reset</span>
                                </div>
                                <h2 id="forgot-password-title" className="font-display font-bold text-lg text-slate-900 dark:text-white">
                                    Recuperar Senha
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsForgotModalOpen(false)}
                                aria-label="Fechar modal de recuperação de senha"
                                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <span className="material-symbols-rounded" aria-hidden="true">close</span>
                            </button>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                            Como seu acesso utiliza login exclusivo <strong className="text-slate-900 dark:text-white">@fitcoach.com</strong>, informe seu nome completo ou login abaixo para solicitar uma nova senha diretamente ao treinador Gustavo no WhatsApp.
                        </p>

                        <form onSubmit={handleRequestPasswordWhatsApp} className="space-y-4">
                            <div>
                                <label htmlFor="recovery-identifier" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                    Seu Nome ou Login (@fitcoach.com)
                                </label>
                                <input
                                    id="recovery-identifier"
                                    type="text"
                                    required
                                    autoFocus
                                    value={recoveryIdentifier}
                                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                                    placeholder="Ex: João Silva ou joaosilva@fitcoach.com"
                                    className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                                />
                            </div>

                            <div className="flex flex-col gap-2 pt-1">
                                <button
                                    type="submit"
                                    className="w-full min-h-[48px] bg-whatsapp hover:bg-whatsapp-dark text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg shadow-whatsapp/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp"
                                >
                                    <span className="material-symbols-rounded text-lg" aria-hidden="true">chat</span>
                                    <span>Solicitar Nova Senha pelo WhatsApp</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotModalOpen(false)}
                                    className="w-full min-h-[44px] py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <p className="mt-8 text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest tabular-nums">
                Fitcoach Pro © {new Date().getFullYear()}
            </p>
        </div>
    );
};

export default Login;
