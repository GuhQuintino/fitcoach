import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from '../../components/Layout/MainLayout';
import { Link } from 'react-router-dom';

const InviteStudent: React.FC = () => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    const inviteLink = `${window.location.origin}/#/register?coach=${user?.id}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWhatsApp = () => {
        const message = `Olá! Clique no link abaixo para criar sua conta no FitCoach e iniciar seus treinos comigo: ${inviteLink}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <MainLayout>
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 right-10 w-64 h-64 bg-sky-400/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-40 left-10 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl"></div>
            </div>

            {/* Header */}
            <header className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl sticky top-0 z-20 px-5 py-4 flex items-center gap-4 border-b border-slate-100/50 dark:border-slate-700/50">
                <Link
                    to="/coach/dashboard"
                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:text-sky-500 hover:border-sky-300 dark:hover:border-sky-600 transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    <span className="material-symbols-rounded text-xl">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Convidar Aluno</h1>
                    <p className="text-xs text-slate-400">Gere um link exclusivo</p>
                </div>
            </header>

            <main className="relative p-6 max-w-lg mx-auto space-y-8 pb-32">
                {/* Intro Card */}
                <div className="text-center space-y-3 p-6 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 rounded-3xl border border-sky-100 dark:border-sky-800/30">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 mb-4">
                        <span className="material-symbols-rounded text-3xl text-white">person_add</span>
                    </div>
                    <h2 className="text-2xl font-display font-black text-slate-900 dark:text-white">Expanda seu Time</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                        Envie este link para seus alunos criarem a conta e serem vinculados automaticamente a você.
                    </p>
                </div>

                {/* QR Code Card */}
                <div className="group bg-white dark:bg-slate-800/80 backdrop-blur-sm p-8 rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700/50 flex flex-col items-center gap-6 transition-all duration-300">
                    <div className="bg-white p-5 rounded-2xl shadow-inner border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                        <QRCodeSVG
                            value={inviteLink}
                            size={180}
                            level="H"
                            includeMargin={true}
                            className="rounded-xl"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-rounded text-lg">qr_code_scanner</span>
                        <p className="text-xs font-bold uppercase tracking-widest">Escaneie para cadastrar</p>
                    </div>
                </div>

                {/* Link Actions */}
                <div className="space-y-4">
                    {/* Copy Link Input */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <span className="material-symbols-rounded text-slate-400 group-focus-within:text-sky-500 transition-colors">link</span>
                        </div>
                        <input
                            type="text"
                            readOnly
                            value={inviteLink}
                            className="block w-full pl-12 pr-14 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 text-sm focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none shadow-sm transition-all"
                        />
                        <button
                            onClick={handleCopy}
                            className={`absolute inset-y-0 right-0 px-4 flex items-center ${copied
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30'
                                } rounded-r-2xl border-l border-slate-200 dark:border-slate-600 transition-all`}
                        >
                            <span className="material-symbols-rounded text-lg">
                                {copied ? 'check' : 'content_copy'}
                            </span>
                        </button>
                    </div>

                    {/* WhatsApp Button */}
                    <button
                        onClick={handleWhatsApp}
                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.029c0 2.119.554 4.188 1.604 6.04L0 24l6.097-1.6c1.789.976 3.805 1.491 5.948 1.493h.005c6.634 0 12.032-5.396 12.036-12.033a11.83 11.83 0 00-3.479-8.502z" />
                        </svg>
                        Enviar no WhatsApp
                    </button>
                </div>

                {/* Tip Card */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                    <span className="material-symbols-rounded text-amber-500 text-xl mt-0.5">lightbulb</span>
                    <div>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Dica</p>
                        <p className="text-sm text-amber-700 dark:text-amber-300/80">
                            Após o cadastro, você precisará aprovar o aluno na aba "Pendentes" para que ele tenha acesso ao app.
                        </p>
                    </div>
                </div>
            </main>
        </MainLayout>
    );
};

export default InviteStudent;
