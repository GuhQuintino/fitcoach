import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const WaitingApproval: React.FC = () => {
    const { signOut, role, user } = useAuth();
    const navigate = useNavigate();
    const [contactPhone, setContactPhone] = useState<string | null>(null);
    const [contactName, setContactName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const ADMIN_WHATSAPP = '5511992616777';

    useEffect(() => {
        const fetchContactInfo = async () => {
            if (!user) return;

            if (role === 'coach') {
                setContactPhone(ADMIN_WHATSAPP);
                setContactName('Administrador');
            } else if (role === 'student') {
                try {
                    // Buscar o coach_id do aluno nos metadados ou na tabela
                    const { data: studentData } = await supabase
                        .from('students_data')
                        .select('coach_id')
                        .eq('id', user.id)
                        .single();

                    if (studentData?.coach_id) {
                        const { data: coachData } = await supabase
                            .from('profiles')
                            .select('full_name, phone')
                            .eq('id', studentData.coach_id)
                            .single();

                        if (coachData) {
                            setContactName(coachData.full_name);
                            setContactPhone(coachData.phone?.replace(/\D/g, '') || null);
                        }
                    }
                } catch (error) {
                    console.error('Erro ao buscar contato do coach:', error);
                }
            }
            setLoading(false);
        };

        fetchContactInfo();
    }, [role, user]);

    // Listener para atualização automática quando aprovado
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('approval_status')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload: any) => {
                    if (payload.new.status === 'active') {
                        // Forçar reload completo para atualizar AuthContext
                        window.location.href = role === 'coach' ? '/#/coach/dashboard' : '/#/student/dashboard';
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, role, navigate]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const userName = user?.user_metadata?.full_name || 'Novo Usuário';

    const whatsappMessage = encodeURIComponent(
        `Olá ${contactName || ''}! Meu nome é ${userName} e acabei de criar minha conta no Fitcoach. Poderia liberar meu acesso?`
    );

    const whatsappLink = contactPhone
        ? `https://wa.me/${contactPhone}?text=${whatsappMessage}`
        : null;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-center">
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-700">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-500">
                    <span className="material-symbols-rounded text-5xl">hourglass_empty</span>
                </div>

                <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-4">
                    Conta em Análise
                </h1>

                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                    Olá <strong>{userName.split(' ')[0]}</strong>! Sua conta está sendo revisada. <br />
                    {role === 'coach'
                        ? 'Um administrador liberará seu acesso em breve.'
                        : `O treinador ${contactName || ''} liberará seu acesso em breve.`
                    }
                </p>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-sm font-bold text-amber-500 flex items-center justify-center gap-2">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                            Aguardando Aprovação
                        </p>
                    </div>

                    {whatsappLink && (
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                        >
                            <span className="material-symbols-rounded">chat</span>
                            Avisar no WhatsApp
                        </a>
                    )}

                    <button
                        onClick={handleSignOut}
                        className="w-full py-4 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                    >
                        Sair da Conta
                    </button>
                </div>
            </div>

            <p className="mt-8 text-xs text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                Fitcoach Pro © 2025
            </p>
        </div>
    );
};

export default WaitingApproval;
