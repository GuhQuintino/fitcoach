import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';

const SubscriptionExpired: React.FC = () => {
    const { role, expiresAt, coachExpiresAt, signOut, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isCoachBlock = (location.state as any)?.coachExpired;

    const [coachPhone, setCoachPhone] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const ADMIN_WHATSAPP = '5511992616777';

    useEffect(() => {
        const fetchCoachPhone = async () => {
            if (role === 'student' && user) {
                try {
                    // Buscar o coach_id do aluno
                    const { data: studentData } = await supabase
                        .from('students_data')
                        .select('coach_id')
                        .eq('id', user.id)
                        .single();

                    if (studentData?.coach_id) {
                        // Buscar o telefone do coach
                        const { data: coachData } = await supabase
                            .from('coaches_data')
                            .select('phone')
                            .eq('id', studentData.coach_id)
                            .single();

                        setCoachPhone(coachData?.phone ? coachData.phone.replace(/\D/g, '') : null);
                    }
                } catch (error) {
                    console.error('Erro ao buscar telefone do coach:', error);
                }
            }
            setLoading(false);
        };

        fetchCoachPhone();
    }, [role, user]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const whatsappNumber = role === 'coach' ? ADMIN_WHATSAPP : coachPhone;
    const contactName = role === 'coach' ? 'Administrador' : 'seu Treinador';

    const whatsappLink = whatsappNumber
        ? `https://wa.me/${whatsappNumber}?text=Olá! Meu acesso ao Fitcoach expirou e gostaria de renovar.`
        : null;

    const formattedDate = (() => {
        const dateToFormat = isCoachBlock ? coachExpiresAt : expiresAt;
        if (!dateToFormat) return 'Data Indisponível';
        try {
            const date = new Date(dateToFormat);
            if (isNaN(date.getTime())) return 'Data Inválida';
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) {
            return 'Erro na Data';
        }
    })();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-center">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-700 animate-slide-up">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500">
                    <span className="material-symbols-rounded text-5xl">event_busy</span>
                </div>

                <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">
                    {isCoachBlock ? 'Acesso do Coach Suspenso' : 'Seu Acesso Expirou'}
                </h1>

                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                    {isCoachBlock
                        ? 'O período de acesso do seu treinador terminou em:'
                        : 'Seu período de acesso terminou em:'} <br />
                    <strong className="text-slate-900 dark:text-slate-200">{formattedDate}</strong>.
                </p>

                <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 mb-8">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        {isCoachBlock
                            ? `Para continuar seus treinos, entre em contato com ${contactName} para que ele possa regularizar a assinatura da plataforma.`
                            : `Para continuar utilizando todas as funcionalidades do Fitcoach, entre em contato com ${contactName} para renovar sua assinatura.`}
                    </p>

                    {whatsappLink ? (
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-rounded">chat</span>
                            Renovar via WhatsApp
                        </a>
                    ) : (
                        <p className="text-xs text-amber-500 font-bold">
                            {loading ? 'Carregando contato...' : 'Telefone de contato não disponível.'}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={handleSignOut}
                        className="py-4 text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                        Sair da Conta
                    </button>

                    <p className="text-[10px] text-slate-300 dark:text-slate-600 uppercase font-bold tracking-tighter">
                        ID: {user?.id}
                    </p>
                </div>
            </div>

            <p className="mt-8 text-xs text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                Fitcoach Pro © 2025
            </p>
        </div>
    );
};

export default SubscriptionExpired;
