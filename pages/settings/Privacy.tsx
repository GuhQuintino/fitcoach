import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

const COACH_WHATSAPP = '5511992616777';

const PrivacySettings: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || newPassword.length < 6) {
            toast.error('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('A confirmação de senha não confere.');
            return;
        }

        try {
            setSavingPassword(true);
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

            setNewPassword('');
            setConfirmPassword('');
            toast.success('Senha atualizada com sucesso!');
        } catch (err: any) {
            console.error('[Privacy] Erro ao alterar senha:', err);
            toast.error(err.message || 'Erro ao alterar senha.');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleRequestDataDeletion = () => {
        const userEmail = user?.email || 'usuário autenticado';
        const userName = (user?.user_metadata as any)?.full_name || userEmail.split('@')[0];
        const message = `Olá Gustavo! Solicito a exclusão de todos os meus dados pessoais e histórico na plataforma Fitcoach (LGPD). Nome: ${userName} | E-mail/Login: ${userEmail}`;
        const whatsappUrl = `https://wa.me/${COACH_WHATSAPP}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 transition-colors">
            <header className="bg-white dark:bg-slate-800 p-6 pt-12 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4 sticky top-0 z-30 shadow-soft">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    aria-label="Voltar à tela anterior"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
                >
                    <span className="material-symbols-rounded" aria-hidden="true">arrow_back_ios_new</span>
                </button>
                <div className="flex flex-col">
                    <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">Privacidade e Segurança</h1>
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest mt-0.5">Proteção de Dados e Senha</p>
                </div>
            </header>

            <div className="p-6 space-y-8 max-w-2xl mx-auto">
                {/* Hero Banner Adaptativo com Alto Contraste */}
                <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-primary/10 dark:border dark:border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <span className="material-symbols-rounded text-8xl" aria-hidden="true">verified_user</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="font-black text-lg mb-2 text-white">Sua segurança é prioridade</h2>
                        <p className="text-xs text-sky-100 dark:text-slate-300 leading-relaxed font-medium">
                            Seus dados de treino, evolução física e histórico são protegidos com criptografia e compartilhados exclusivamente entre você e o treinador Gustavo.
                        </p>
                    </div>
                </section>

                {/* Seção de Alteração de Senha */}
                <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="material-symbols-rounded" aria-hidden="true">lock</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Alterar Senha</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300">Defina uma nova senha de acesso à sua conta.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                            <label htmlFor="privacy-new-password" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                                Nova Senha
                            </label>
                            <input
                                id="privacy-new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Mínimo de 6 caracteres"
                                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                        <div>
                            <label htmlFor="privacy-confirm-password" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                                Confirmar Nova Senha
                            </label>
                            <input
                                id="privacy-confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repita a nova senha"
                                className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={savingPassword || !newPassword}
                            className="w-full min-h-[44px] bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            {savingPassword ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" role="status" />
                                    <span>Atualizando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-rounded text-base" aria-hidden="true">key</span>
                                    <span>Atualizar Senha</span>
                                </>
                            )}
                        </button>
                    </form>
                </section>

                {/* Seção LGPD / Exclusão de Conta */}
                <section className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                            <span className="material-symbols-rounded" aria-hidden="true">delete_forever</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Seus Direitos (LGPD)</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300">Exclusão integral de conta, fotos e histórico de treinos.</p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Você pode solicitar a remoção definitiva de todos os seus dados pessoais e registros de treino a qualquer momento diretamente ao treinador responsável.
                    </p>

                    <button
                        type="button"
                        onClick={handleRequestDataDeletion}
                        className="w-full min-h-[48px] p-4 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-2xl transition-all border border-red-200/70 dark:border-red-800/50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                        <span className="material-symbols-rounded text-base" aria-hidden="true">chat</span>
                        <span>Solicitar Exclusão de Todos os Dados</span>
                    </button>
                </section>
            </div>
        </div>
    );
};

export default PrivacySettings;
