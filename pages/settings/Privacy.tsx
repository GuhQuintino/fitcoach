import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import ToggleSwitch from '../../components/shared/ToggleSwitch';

interface PrivacyPreferences {
    showBio: boolean;
    showAvatar: boolean;
    performanceAnalysis: boolean;
    privateWorkoutHistory: boolean;
}

const PrivacySettings: React.FC = () => {
    const navigate = useNavigate();
    const { preferences, updatePreferences } = useAuth();

    // Preferências normalizadas a partir de preferences.privacy no Supabase
    const privacyPrefs: PrivacyPreferences = useMemo(() => {
        const raw = (preferences as any)?.privacy || {};
        return {
            showBio: raw.showBio ?? true,
            showAvatar: raw.showAvatar ?? true,
            performanceAnalysis: raw.performanceAnalysis ?? true,
            privateWorkoutHistory: raw.privateWorkoutHistory ?? true
        };
    }, [preferences]);

    const sections = [
        {
            title: 'Perfil Público',
            desc: 'Gerencie como os outros veem seu perfil.',
            items: [
                { key: 'showBio' as const, label: 'Mostrar Bio' },
                { key: 'showAvatar' as const, label: 'Mostrar Foto de Perfil' }
            ]
        },
        {
            title: 'Dados e Privacidade',
            desc: 'Controle o tratamento dos seus dados.',
            items: [
                {
                    key: 'performanceAnalysis' as const,
                    label: 'Análise de Performance',
                    desc: 'Permitir que o sistema analise seus dados para gerar insights de treino.'
                },
                {
                    key: 'privateWorkoutHistory' as const,
                    label: 'Histórico de Treino Privado',
                    desc: 'Apenas você e seu treinador podem ver seu histórico.'
                }
            ]
        }
    ];

    const handleToggle = async (key: keyof PrivacyPreferences, label: string) => {
        const updated = {
            ...privacyPrefs,
            [key]: !privacyPrefs[key]
        };

        try {
            await updatePreferences({
                privacy: updated
            } as any);
            toast.success(`Preferência de "${label}" atualizada.`);
        } catch (err) {
            console.error('[Privacy] Erro ao atualizar privacidade:', err);
            toast.error('Erro ao salvar preferência de privacidade.');
        }
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
                    <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">Privacidade</h1>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">Dados e Segurança</p>
                </div>
            </header>

            <div className="p-6 space-y-8 max-w-2xl mx-auto">
                {/* Hero Banner Adaptativo com Alto Contraste (WCAG AAA >= 7:1) */}
                <section className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 dark:from-slate-800 dark:via-slate-800/95 dark:to-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-primary/10 dark:border dark:border-primary/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <span className="material-symbols-rounded text-8xl" aria-hidden="true">verified_user</span>
                    </div>
                    <div className="relative z-10">
                        <h2 className="font-black text-lg mb-2 text-white">Sua segurança é prioridade</h2>
                        <p className="text-xs text-sky-100 dark:text-slate-300 leading-relaxed font-medium">
                            Seus dados de treino e saúde são protegidos com criptografia e acessíveis apenas por você e seu treinador autorizado.
                        </p>
                    </div>
                </section>

                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="ml-2">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{section.title}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{section.desc}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700/50 shadow-soft">
                            {section.items.map((item) => {
                                const isChecked = privacyPrefs[item.key];
                                return (
                                    <div key={item.key} className="p-5 flex items-center justify-between gap-4">
                                        <div className="flex-1 pr-4">
                                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{item.label}</h4>
                                            {item.desc && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.desc}</p>}
                                        </div>
                                        <ToggleSwitch
                                            id={`privacy-${item.key}`}
                                            checked={isChecked}
                                            onChange={() => handleToggle(item.key, item.label)}
                                            label={`Alternar ${item.label}`}
                                            size="sm"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => toast.success('Solicitação de exclusão de dados registrada junto ao suporte.')}
                    className="w-full min-h-[44px] p-4 text-xs font-bold text-slate-500 hover:text-danger hover:bg-danger/5 rounded-2xl transition-all border border-transparent hover:border-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                >
                    Solicitar Exclusão de Todos os Dados
                </button>
            </div>
        </div>
    );
};

export default PrivacySettings;
