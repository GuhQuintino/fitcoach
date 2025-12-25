import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacySettings: React.FC = () => {
    const navigate = useNavigate();

    const sections = [
        {
            title: 'Perfil Público',
            desc: 'Gerencie como os outros veem seu perfil.',
            items: [
                { label: 'Mostrar Bio', default: true },
                { label: 'Mostrar Foto de Perfil', default: true }
            ]
        },
        {
            title: 'Dados e Privacidade',
            desc: 'Controle o tratamento dos seus dados.',
            items: [
                { label: 'Análise de Performance', desc: 'Permitir que o sistema analise seus dados para gerar insights.', default: true },
                { label: 'Histórico de Treino Privado', desc: 'Apenas você e seu coach podem ver seu histórico.', default: true }
            ]
        }
    ];

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
                    <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">Privacidade</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dados e Segurança</p>
                </div>
            </header>

            <main className="p-6 space-y-8 max-w-2xl mx-auto">
                <section className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <span className="material-symbols-rounded text-8xl">verified_user</span>
                    </div>
                    <div className="relative z-10">
                        <h3 className="font-black text-lg mb-2">Sua segurança é prioridade</h3>
                        <p className="text-xs opacity-80 leading-relaxed">
                            Seus dados de treino e saúde são protegidos com criptografia e acessíveis apenas por você e seu treinador autorizado.
                        </p>
                    </div>
                </section>

                {sections.map((section, idx) => (
                    <div key={idx} className="space-y-4">
                        <div className="ml-2">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{section.title}</h3>
                            <p className="text-xs text-slate-400 mt-1">{section.desc}</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-50 dark:divide-slate-700/50">
                            {section.items.map((item, i) => (
                                <div key={i} className="p-5 flex items-center justify-between">
                                    <div className="flex-1 pr-4">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{item.label}</h4>
                                        {item.desc && <p className="text-[11px] text-slate-500 mt-1">{item.desc}</p>}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            defaultChecked={item.default}
                                            className="sr-only peer"
                                            id={`privacy-${idx}-${i}`}
                                        />
                                        <label htmlFor={`privacy-${idx}-${i}`} className="block w-10 h-6 bg-slate-100 dark:bg-slate-600 rounded-full cursor-pointer peer-checked:bg-primary transition-colors">
                                            <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <button className="w-full p-4 text-xs font-bold text-slate-400 hover:text-danger hover:bg-danger/5 rounded-2xl transition-all border border-transparent hover:border-danger/10">
                    Solicitar Exclusão de Todos os Dados
                </button>
            </main>
        </div>
    );
};

export default PrivacySettings;
