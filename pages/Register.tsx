import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

const Register: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<'student' | 'coach'>('student');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [inviteCoachName, setInviteCoachName] = useState<string | null>(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const coachId = searchParams.get('coach');

    useEffect(() => {
        if (coachId) {
            setRole('student'); // Force student role if invited
            fetchCoachName(coachId);
        }
    }, [coachId]);

    const fetchCoachName = async (id: string) => {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', id).single();
        if (data) setInviteCoachName(data.full_name);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        phone: phone, // Save phone to metadata (trigger will move to profile)
                        ...(coachId && { coach_id: coachId }), // Add Coach ID if invited
                    },
                },
            });

            if (error) throw error;
            if (data.user) {
                navigate('/');
            }
        } catch (error: any) {
            setError(error.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    // Simple phone mask (can be improved with lib)
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        setPhone(value);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-subtle">
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-card border border-slate-100 dark:border-slate-700 animate-slide-up">
                <div className="text-center mb-6">
                    <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Criar Conta</h1>
                    {inviteCoachName ? (
                        <div className="mt-2 bg-primary-50 dark:bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold inline-block">
                            Convite de {inviteCoachName}
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Comece sua jornada fitness hoje</p>
                    )}
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl text-center">
                        {error}
                    </div>
                )}

                {!coachId && (
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl mb-6">
                        <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'student'
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            Sou Aluno
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('coach')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${role === 'coach'
                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                }`}
                        >
                            Sou Coach
                        </button>
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Seu nome"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp / Telefone</label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={handlePhoneChange}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="(11) 99999-9999"
                            maxLength={15}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="seu@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Criando conta...' : 'Cadastrar'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-primary font-semibold hover:underline">
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
