import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Register: React.FC = () => {
    const { session, loading: authLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const coachId = searchParams.get('coach');

    // Se já estiver logado, redirecionar para home (routing inteligente)
    if (!authLoading && session) {
        return <Navigate to="/" replace />;
    }
    const [role, setRole] = useState<'student' | 'coach'>(coachId ? 'student' : 'coach');
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [inviteCoachName, setInviteCoachName] = useState<string | null>(null);

    // Coach specific fields
    const [cref, setCref] = useState('');
    const [bio, setBio] = useState('');

    // Student specific fields
    const [birthDate, setBirthDate] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [goal, setGoal] = useState('');
    const [gender, setGender] = useState('male');

    const navigate = useNavigate();

    useEffect(() => {
        if (coachId) {
            setRole('student');
            fetchCoachName(coachId);
        }
    }, [coachId]);

    const fetchCoachName = async (id: string) => {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', id).single();
        if (data) setInviteCoachName(data.full_name);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Bloqueio extra para garantir que alunos sem link não passem pelo formulário
        if (!coachId && role === 'student') {
            setError('Cadastro de alunos disponível apenas via link de convite.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Validation
            if (role === 'coach' && !cref) {
                throw new Error('CREF é obrigatório para treinadores');
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        phone: phone,
                        ...(coachId && { coach_id: coachId }),
                        // Additional metadata for trigger
                        ...(role === 'coach' ? {
                            cref,
                            bio
                        } : {
                            birth_date: birthDate,
                            height_cm: height,
                            weight_kg: weight,
                            gender,
                            goal
                        })
                    },
                },
            });

            if (error) throw error;
            if (data.user) {
                toast.success('Conta criada! Aguarde aprovação.');
                navigate('/');
            }
        } catch (error: any) {
            setError(error.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        setPhone(value);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="w-full max-w-md bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-700 animate-slide-up relative">
                <div className="text-center mb-8">
                    <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-tight">Criar Conta</h1>
                    {inviteCoachName ? (
                        <div className="mt-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-2 border border-primary/20">
                            <span className="w-2 h-2 bg-primary rounded-full animate-ping"></span>
                            Convite de {inviteCoachName}
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Cadastre-se para começar sua evolução</p>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-2xl text-center border border-red-100 dark:border-red-900/30 animate-shake">
                        {error}
                    </div>
                )}

                {!coachId && (
                    <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl mb-8 border border-transparent dark:border-slate-700/50 relative z-10">
                        <button
                            type="button"
                            onClick={() => {
                                setRole('coach');
                                setError(null);
                            }}
                            className="flex-1 py-3 text-xs font-bold rounded-xl transition-all uppercase tracking-widest bg-white dark:bg-slate-800 text-primary shadow-xl ring-1 ring-black/5"
                        >
                            Sou Coach
                        </button>
                    </div>
                )}

                {/* Blocker for orphan students */}
                {!coachId && role === 'student' && (
                    <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <p className="uppercase tracking-widest mb-1">Atenção</p>
                        Para se cadastrar como aluno, você deve utilizar o link enviado pelo seu treinador.
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                placeholder="Seu nome"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">WhatsApp</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={handlePhoneChange}
                                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                placeholder="(11) 99999-9999"
                                maxLength={15}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                placeholder="seu@email.com"
                            />
                        </div>
                    </div>

                    {/* Conditional Fields for Coach */}
                    {role === 'coach' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Número do CREF</label>
                                <input
                                    type="text"
                                    required
                                    value={cref}
                                    onChange={(e) => {
                                        let value = e.target.value.toUpperCase();
                                        value = value.replace(/[^0-9A-Z]/g, ''); // Remove symbols

                                        if (value.length > 6) {
                                            value = value.replace(/^(\d{6})([A-Z])?([A-Z]{0,2})?.*/, '$1-$2/$3');
                                            value = value.replace(/\/$/, ''); // Remove trailing slash if incomplete
                                        }

                                        // Final Cleanup to standard format
                                        if (value.length > 11) value = value.slice(0, 11);

                                        setCref(value);
                                    }}
                                    className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                    placeholder="000000-G/UF"
                                    maxLength={11}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Biografia Curta</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium min-h-[100px] resize-none"
                                    placeholder="Conte um pouco sobre sua experiência..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Conditional Fields for Student */}
                    {role === 'student' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        required
                                        value={birthDate}
                                        onChange={(e) => setBirthDate(e.target.value)}
                                        className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Seu Objetivo</label>
                                    <select
                                        required
                                        value={goal}
                                        onChange={(e) => setGoal(e.target.value)}
                                        className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium appearance-none"
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Emagrecimento">Emagrecimento</option>
                                        <option value="Hipertrofia">Hipertrofia</option>
                                        <option value="Condicionamento">Condicionamento</option>
                                        <option value="Performance">Performance</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Gênero</label>
                                    <select
                                        required
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium appearance-none"
                                    >
                                        <option value="male">Masculino</option>
                                        <option value="female">Feminino</option>
                                        <option value="other">Outro</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Altura (cm)</label>
                                    <input
                                        type="number"
                                        required
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                        className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                        placeholder="175"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Peso (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                                        placeholder="80.5"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Crie sua Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-100/50 dark:bg-slate-900/50 border border-transparent dark:border-slate-700/50 rounded-2xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none transition-all font-medium"
                            placeholder="Mínimo 6 caracteres"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || (!coachId && role === 'student')}
                        className="w-full h-14 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary-dark hover:to-emerald-600 text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2 text-lg">
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>Criando conta...</span>
                                </>
                            ) : (
                                <>
                                    <span>{inviteCoachName ? 'Confirmar Cadastro' : 'Cadastrar Agora'}</span>
                                    <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </form>

                <div className="mt-10 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-primary font-bold hover:text-primary-dark transition-all hover:underline decoration-2 underline-offset-4">
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>

            <p className="my-8 text-xs text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                Fitcoach Pro © 2025
            </p>
        </div>
    );
};

export default Register;
