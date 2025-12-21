import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import MainLayout from '../../layouts/MainLayout';
import { Link } from 'react-router-dom';

const InviteStudent: React.FC = () => {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    // Gerar link de cadastro com o ID do coach
    // Se estiver rodando localmente, usa localhost, senão usa window.location.origin
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
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
                {/* Header */}
                <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10 px-4 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-slate-700">
                    <Link to="/coach/dashboard" className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
                        <span className="material-symbols-rounded">arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white">Convidar Aluno</h1>
                </header>

                <main className="p-6 max-w-lg mx-auto space-y-8">
                    {/* Intro Text */}
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-display font-bold text-primary dark:text-primary-light">Expanda seu Time</h2>
                        <p className="text-slate-500 dark:text-slate-400">
                            Envie este link para seus alunos criarem a conta e serem vinculados automaticamente a você.
                        </p>
                    </div>

                    {/* QR Code Card */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 flex flex-col items-center gap-6">
                        <div className="bg-white p-4 rounded-xl shadow-inner border border-slate-100">
                            <QRCodeSVG
                                value={inviteLink}
                                size={200}
                                level="H"
                                includeMargin={true}
                                className="rounded-lg"
                            />
                        </div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Escaneie para cadastrar</p>
                    </div>

                    {/* Link Actions */}
                    <div className="space-y-4">
                        {/* Copy Link Input */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="material-symbols-rounded text-slate-400">link</span>
                            </div>
                            <input
                                type="text"
                                readOnly
                                value={inviteLink}
                                className="block w-full pl-10 pr-12 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none shadow-sm"
                            />
                            <button
                                onClick={handleCopy}
                                className="absolute inset-y-0 right-0 px-3 flex items-center bg-slate-100 dark:bg-slate-700 rounded-r-xl border-l border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                <span className="material-symbols-rounded text-slate-600 dark:text-slate-300 text-lg">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                            </button>
                        </div>

                        {/* WhatsApp Button */}
                        <button
                            onClick={handleWhatsApp}
                            className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-xl font-bold shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-rounded">chat</span>
                            Enviar no WhatsApp
                        </button>
                    </div>
                </main>
            </div>
        </MainLayout>
    );
};

export default InviteStudent;
