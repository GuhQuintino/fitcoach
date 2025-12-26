import React, { useEffect, useState } from 'react';
import MainLayout from '../../components/Layout/MainLayout';

import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';
import EvolutionGallery from '../../components/student/EvolutionGallery';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import InstallTutorial from '../../components/shared/InstallTutorial';

const StudentProfile: React.FC = () => {
    const { user, signOut, preferences, updatePreferences } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [studentData, setStudentData] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Form Stats
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('male');
    const [goal, setGoal] = useState('');
    const [coachProfile, setCoachProfile] = useState<any>(null);
    const [weightHistory, setWeightHistory] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (user) {
            fetchProfile();
            fetchWeightHistory();
        }
    }, [user]);

    const fetchWeightHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('weight_history')
                .select('*')
                .eq('student_id', user!.id)
                .order('recorded_at', { ascending: true });

            if (error) throw error;
            setWeightHistory(data || []);
        } catch (error) {
            console.error('Error fetching weight history:', error);
        }
    };

    const fetchProfile = async () => {
        try {
            setLoading(true);
            // 1. Fetch Profile (Name, Avatar)
            const { data: pData, error: pError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();
            if (pError) throw pError;
            setProfile(pData);

            // 2. Fetch Student Data (Height, Weight, DOB)
            const { data: sData, error: sError } = await supabase
                .from('students_data')
                .select('*')
                .eq('id', user!.id)
                .single();

            if (sError && sError.code !== 'PGRST116') {
                console.error(sError);
                // Don't throw if just missing row
            }

            if (sData) {
                setStudentData(sData);
                setWeight(sData.weight_kg?.toString() || '');
                setHeight(sData.height_cm?.toString() || '');
                setGender(sData.gender || 'male');
                setBirthDate(sData.birth_date || '');
                setGoal(sData.goal || '');

                if (sData.coach_id) {
                    const { data: cData } = await supabase
                        .from('profiles')
                        .select('full_name, phone')
                        .eq('id', sData.coach_id)
                        .single();
                    setCoachProfile(cData);
                }

                // Age calc if dob exists
                if (sData.birth_date) {
                    const dob = new Date(sData.birth_date);
                    const diff = Date.now() - dob.getTime();
                    const ageDate = new Date(diff);
                    setAge(Math.abs(ageDate.getUTCFullYear() - 1970).toString());
                } else {
                    setAge('');
                }
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error('Erro ao carregar perfil.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const numWeight = weight ? parseFloat(weight.toString().replace(',', '.')) : null;
            const numHeight = height ? parseFloat(height.toString().replace(',', '.')) : null;

            // Update 'students_data'
            const updates = {
                id: user!.id,
                weight_kg: numWeight,
                height_cm: numHeight,
                gender: gender,
                birth_date: birthDate || null,
                goal: goal,
                updated_at: new Date()
            };

            const { error } = await supabase
                .from('students_data')
                .upsert(updates);

            if (error) throw error;

            // Save to weight history if weight changed
            if (numWeight && (!studentData || studentData.weight_kg !== numWeight)) {
                await supabase.from('weight_history').insert({
                    student_id: user!.id,
                    weight_kg: numWeight
                });
                fetchWeightHistory();
            }

            toast.success('Perfil atualizado com sucesso!');
            setIsEditing(false);
            fetchProfile();

        } catch (error) {
            console.error('Save error:', error);
            toast.error('Erro ao salvar. Verifique se os campos estão corretos.');
        } finally {
            setSaving(false);
        }
    };

    const calculateTMB = () => {
        const w = parseFloat(weight.toString().replace(',', '.'));
        const h = parseFloat(height.toString().replace(',', '.'));
        const a = parseInt(age);
        if (isNaN(w) || isNaN(h) || isNaN(a)) return 0;

        if (gender === 'male') {
            return Math.round((10 * w) + (6.25 * h) - (5 * a) + 5);
        } else {
            return Math.round((10 * w) + (6.25 * h) - (5 * a) - 161);
        }
    };

    const getWhatsappUrl = () => {
        if (!coachProfile?.phone) return '#';
        const phone = coachProfile.phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${coachProfile.full_name}, sou o aluno ${profile?.full_name} e gostaria de tirar uma dúvida.`);
        return `https://wa.me/55${phone}?text=${message}`;
    };

    const tmb = calculateTMB();
    const maintenance = Math.round(tmb * 1.35);

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user!.id);

            if (updateError) throw updateError;

            setProfile({ ...profile, avatar_url: publicUrl });
            toast.success('Foto de perfil atualizada!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Erro ao enviar foto.');
        } finally {
            setUploading(false);
        }
    };

    const handleSignOut = async () => {
        if (!confirm('Deseja realmente sair?')) return;
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
    };

    if (loading) return (
        <MainLayout>
            <div className="flex items-center justify-center h-[80vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        </MainLayout>
    );

    return (
        <MainLayout>
            {/* Clean Header */}
            <header className="bg-white dark:bg-slate-800 pt-12 pb-6 px-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h1 className="font-display text-2xl font-black text-slate-900 dark:text-white leading-tight">Perfil</h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Sua Conta e Progresso</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-2xl">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-white dark:hover:bg-slate-600 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-6 py-2 bg-primary text-white font-bold text-xs hover:bg-primary-dark rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {saving ? (
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <span className="material-symbols-rounded text-base">check</span>
                                    )}
                                    Salvar
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-soft hover:border-primary hover:text-primary transition-all active:scale-95 group"
                            >
                                <span className="material-symbols-rounded text-2xl group-hover:rotate-12 transition-transform">edit_note</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                    />
                    <div className="relative group mb-4">
                        <div
                            className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 overflow-hidden border-2 border-slate-200 dark:border-slate-600 shadow-soft flex items-center justify-center cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            ) : profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-rounded text-4xl text-slate-400">person</span>
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute -bottom-1 -right-1 p-2 bg-primary text-white rounded-xl shadow-soft hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            <span className="material-symbols-rounded text-lg">photo_camera</span>
                        </button>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{profile?.full_name || 'Usuário'}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Aluno desde {new Date(profile?.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>

                    {coachProfile && (
                        <a
                            href={getWhatsappUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.393 0 12.029c0 2.119.554 4.188 1.604 6.04L0 24l6.097-1.6c1.789.976 3.805 1.491 5.948 1.493h.005c6.634 0 12.032-5.396 12.036-12.033a11.83 11.83 0 00-3.479-8.502z" />
                            </svg>
                            Falar com Coach
                        </a>
                    )}
                </div>
            </header>

            <main className="px-5 pt-6 space-y-6">
                {/* Personal Info Grid - Unified & Organized */}
                <section className="animate-slide-up bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-6">
                        <span className="material-symbols-rounded text-primary">person</span>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Dados Pessoais</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data de Nascimento</label>
                            <input
                                className="p-0 border-none bg-transparent font-display font-bold text-lg text-slate-900 dark:text-white focus:ring-0 w-full"
                                type="date"
                                value={birthDate}
                                onChange={e => setBirthDate(e.target.value)}
                                readOnly={!isEditing}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Peso (kg)</label>
                            <div className="flex items-baseline gap-1">
                                <input
                                    type="number"
                                    placeholder="0.0"
                                    value={weight}
                                    onChange={(e) => setWeight(e.target.value)}
                                    disabled={!isEditing}
                                    className="bg-transparent border-none p-0 text-xl font-black text-slate-900 dark:text-white focus:ring-0 w-20 disabled:opacity-70"
                                />
                                <span className="text-[10px] text-slate-400 font-bold uppercase">kg</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Altura (cm)</label>
                            <div className="flex items-baseline gap-1">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={height}
                                    onChange={(e) => setHeight(e.target.value)}
                                    disabled={!isEditing}
                                    className="bg-transparent border-none p-0 text-xl font-black text-slate-900 dark:text-white focus:ring-0 w-20 disabled:opacity-70"
                                />
                                <span className="text-[10px] text-slate-400 font-bold uppercase">cm</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Idade</label>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-slate-900 dark:text-white">{age || '--'}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">anos</span>
                            </div>
                        </div>
                    </div>

                    {/* Gender Selection */}
                    <div className="flex flex-col gap-3 mt-6">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Gênero</label>
                        <div className="grid grid-cols-3 gap-2 bg-slate-100/50 dark:bg-slate-900/80 p-1.5 rounded-3xl border border-slate-200 dark:border-slate-800">
                            {[
                                { id: 'male', label: 'Masc', icon: 'male' },
                                { id: 'female', label: 'Fem', icon: 'female' },
                                { id: 'other', label: 'Outro', icon: 'person' }
                            ].map((g) => (
                                <button
                                    key={g.id}
                                    disabled={!isEditing}
                                    onClick={() => isEditing && setGender(g.id)}
                                    className={`py-3 px-2 rounded-2xl flex flex-col items-center gap-1 transition-all ${gender === g.id ? 'bg-white dark:bg-slate-700 text-primary shadow-soft' : 'text-slate-500 opacity-50'}`}
                                >
                                    <span className="material-symbols-rounded text-xl">{g.icon}</span>
                                    <span className="text-[9px] font-black uppercase tracking-wider">{g.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Goal Selection */}
                    <div className="flex flex-col gap-3 mt-6">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Foco Atual</label>
                        {isEditing ? (
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'Emagrecimento', label: 'Emagrecimento', icon: 'fitness_center' },
                                    { id: 'Hipertrofia', label: 'Hipertrofia', icon: 'bolt' },
                                    { id: 'Condicionamento', label: 'Condic.', icon: 'monitor_heart' },
                                    { id: 'Performance', label: 'Perform.', icon: 'speed' }
                                ].map((g) => (
                                    <button
                                        key={g.id}
                                        onClick={() => setGoal(g.id)}
                                        className={`p-3 rounded-2xl border-2 flex items-center gap-2 transition-all ${goal === g.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${goal === g.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                            <span className="material-symbols-rounded text-lg">{g.icon}</span>
                                        </div>
                                        <span className="font-bold text-[10px] uppercase tracking-wider">{g.label}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-br from-primary/10 to-sky-500/10 p-5 rounded-[2rem] border border-primary/20 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary shadow-soft">
                                    <span className="material-symbols-rounded text-3xl">
                                        {goal === 'Emagrecimento' ? 'fitness_center' : goal === 'Hipertrofia' ? 'bolt' : goal === 'Performance' ? 'speed' : 'monitor_heart'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Objetivo Ativo</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                        {goal || 'Não Definido'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Metabolic Rate Section */}
                {tmb > 0 && (
                    <section className="bg-gradient-to-br from-orange-500 to-rose-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-orange-500/20 relative overflow-hidden animate-slide-up">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <span className="material-symbols-rounded text-8xl">local_fire_department</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="material-symbols-rounded text-rose-200">bolt</span>
                                <h3 className="font-bold text-lg">Metabolismo Basal</h3>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black">{tmb}</span>
                                <span className="text-sm font-bold opacity-80">kcal/dia</span>
                            </div>
                            <p className="text-xs opacity-70 mt-4 leading-relaxed bg-white/10 p-3 rounded-2xl">
                                Valor estimado via fórmula Mifflin-St Jeor. Consulte um nutricionista para um plano personalizado.
                            </p>
                        </div>
                    </section>
                )}

                {/* Maintenance Section */}
                {tmb > 0 && (
                    <section className="bg-emerald-500 dark:bg-emerald-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden animate-slide-up">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <span className="material-symbols-rounded text-8xl">favorite</span>
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-rounded text-emerald-200">restaurant</span>
                                <h3 className="font-bold text-lg text-emerald-50/90">Nutrição é a chave</h3>
                            </div>
                            <p className="text-sm text-emerald-50/80 mb-6">Estimativa para manutenção de peso.</p>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between bg-white/10 p-4 rounded-2xl border border-white/10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Gasto Basal (TMB)</span>
                                        <span className="text-lg font-bold">{tmb} kcal</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] uppercase font-black tracking-widest opacity-60">Manutenção</span>
                                        <span className="text-lg font-bold">~{maintenance} kcal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Evolution Summary Cards */}
                <section className="grid grid-cols-2 gap-3 animate-slide-up">
                    <div className="bg-sky-50 dark:bg-sky-900/10 p-5 rounded-3xl border border-sky-100 dark:border-sky-500/10">
                        <p className="text-[10px] font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-1">Peso Inicial</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">
                                {weightHistory.length > 0 ? weightHistory[0].weight_kg : '-'}
                            </span>
                            <span className="text-xs font-bold text-slate-500">kg</span>
                        </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-500/10">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Diferença</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-slate-900 dark:text-white">
                                {(() => {
                                    if (weightHistory.length < 2) return '-';
                                    const first = weightHistory[0].weight_kg;
                                    const last = weightHistory[weightHistory.length - 1].weight_kg;
                                    const diff = (last - first).toFixed(1);
                                    return diff.startsWith('-') ? diff : `+${diff}`;
                                })()}
                            </span>
                            <span className="text-xs font-bold text-slate-500">kg</span>
                        </div>
                    </div>
                </section>

                {/* Weight History Chart */}
                {weightHistory.length > 0 && (
                    <section className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-soft border border-slate-100 dark:border-slate-700 animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Evolução de Peso</h3>
                                <p className="text-xs text-slate-500">Seu progresso ao longo do tempo</p>
                            </div>
                            <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center text-success">
                                <span className="material-symbols-rounded">trending_up</span>
                            </div>
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weightHistory.map(h => ({
                                    weight: h.weight_kg,
                                    date: new Date(h.recorded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                                }))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748B' }}
                                    />
                                    <YAxis
                                        hide
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                        labelStyle={{ color: '#64748B' }}
                                        itemStyle={{ color: '#0ea5e9' }}
                                        formatter={(value: any) => [`${value} kg`, 'Peso']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="weight"
                                        stroke="#0ea5e9"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, fill: '#0ea5e9', strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>
                )
                }

                {/* Evolution Section */}
                <section className="space-y-4 animate-slide-up pt-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-primary">photo_library</span>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Galeria de Evolução</h3>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seu Olhar No Espelho</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-[2.5rem] shadow-soft border border-slate-100 dark:border-slate-700">
                        <EvolutionGallery />
                    </div>
                </section>

                {/* Preferences Section */}
                <section className="space-y-3 animate-slide-up">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Experiência</h3>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                        <div className="flex items-center justify-between p-5">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${preferences.focusMode ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                    <span className="material-symbols-rounded">select_window</span>
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white">Modo Foco</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destaca exercício atual</p>
                                </div>
                            </div>
                            <button
                                onClick={() => updatePreferences({ focusMode: !preferences.focusMode })}
                                className={`w-14 h-8 rounded-full transition-all relative flex items-center px-1 ${preferences.focusMode ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all ${preferences.focusMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Settings Section */}
                <section className="space-y-3 animate-slide-up">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Configurações</h3>
                    <div className="space-y-3">
                        <InstallTutorial />
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                            <Link to="/student/settings/notifications" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-primary">
                                        <span className="material-symbols-rounded">notifications</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Notificações</p>
                                </div>
                                <span className="material-symbols-rounded text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </Link>
                            <Link to="/student/settings/privacy" className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-success">
                                        <span className="material-symbols-rounded">shield</span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">Privacidade</p>
                                </div>
                                <span className="material-symbols-rounded text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Logout Button */}
                <div className="pt-2 pb-6">
                    <button
                        onClick={handleSignOut}
                        className="w-full p-4 rounded-2xl border-2 border-danger/20 bg-danger/5 text-danger font-bold flex items-center justify-center gap-2 hover:bg-danger/10 transition-all active:scale-[0.98]"
                    >
                        <span className="material-symbols-rounded">logout</span>
                        Sair da Conta
                    </button>
                </div>
            </main >
        </MainLayout >
    );
};

export default StudentProfile;