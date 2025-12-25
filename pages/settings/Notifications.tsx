import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NotificationsSettings: React.FC = () => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const [settings, setSettings] = useState({
        push: true,
        email: false,
        reminders: true,
        updates: role === 'coach'
    });

    const studentTopics = [
        { id: 'reminders', label: 'Lembretes de Treino', desc: 'Alertas para não esquecer o treino do dia.' },
        { id: 'updates', label: 'Fotos de Evolução', desc: 'Lembrete semanal para registrar seu progresso.' },
        { id: 'expiration', label: 'Vencimento de Plano', desc: 'Aviso 3 dias antes da sua consultoria expirar.' }
    ];

    const coachTopics = [
        { id: 'feedbacks', label: 'Novos Feedbacks', desc: 'Notificar quando um aluno enviar feedback de treino.' },
        { id: 'expired_students', label: 'Alunos Expirados', desc: 'Aviso quando um aluno ficar sem plano ativo.' },
        { id: 'system', label: 'Atualizações do Sistema', desc: 'Novas funcionalidades e melhorias na plataforma.' }
    ];

    const topics = role === 'coach' ? coachTopics : studentTopics;

    return (
        <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20">
            <header className="bg-white dark:bg-slate-800 p-6 pt-12 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 active:scale-95 transition-all"
                >
                    <span className="material-symbols-rounded">arrow_back_ios_new</span>
                </button>
                <div className="flex flex-col">
                    <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">Notificações</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gerenciar Alertas</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-2xl mx-auto">
                {/* Global Toggle */}
                <section className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                                <span className="material-symbols-rounded text-2xl">notifications_active</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Push Notifications</h3>
                                <p className="text-xs text-slate-500">Receber alertas no celular</p>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={settings.push}
                                onChange={() => setSettings(s => ({ ...s, push: !s.push }))}
                                className="sr-only peer"
                                id="push-main"
                            />
                            <label htmlFor="push-main" className="block w-12 h-7 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer peer-checked:bg-primary transition-colors">
                                <span className="absolute left-1 top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform peer-checked:translate-x-5"></span>
                            </label>
                        </div>
                    </div>
                </section>

                {/* Topics */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Tópicos Disponíveis</h3>
                    <div className="space-y-3">
                        {topics.map((topic) => (
                            <div
                                key={topic.id}
                                className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center justify-between"
                            >
                                <div className="flex-1 pr-4">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{topic.label}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{topic.desc}</p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        defaultChecked
                                        className="sr-only peer"
                                        id={topic.id}
                                    />
                                    <label htmlFor={topic.id} className="block w-10 h-6 bg-slate-100 dark:bg-slate-600 rounded-full cursor-pointer peer-checked:bg-primary transition-colors">
                                        <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></span>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-[11px] text-slate-500 text-center leading-relaxed italic">
                        "As notificações ajudam a manter a constância e o engajamento tanto do aluno quanto do coach."
                    </p>
                </div>
            </main>
        </div>
    );
};

export default NotificationsSettings;
