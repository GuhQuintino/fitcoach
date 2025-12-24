import React from 'react';
import BottomNav from '../../components/BottomNav';
import ThemeToggle from '../../components/ThemeToggle';
import { supabase } from '../../lib/supabaseClient';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CoachProfile: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [profileData, setProfileData] = React.useState({
        full_name: '',
        email: '',
        phone: '',
        avatar_url: '',
        bio: '',
        cref: ''
    });
    const [uploading, setUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (user) {
            fetchProfile();
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user!.id)
                .single();

            if (profileError) throw profileError;

            // Fetch coach specific data
            const { data: coachData, error: coachError } = await supabase
                .from('coaches_data')
                .select('*')
                .eq('id', user!.id)
                .single();

            // Note: coaches_data might not exist yet for new users
            setProfileData({
                full_name: profile.full_name || '',
                email: profile.email || '',
                phone: profile.phone || coachData?.phone || '',
                avatar_url: profile.avatar_url || '',
                bio: coachData?.bio || '',
                cref: coachData?.cref || ''
            });
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Update profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: profileData.full_name,
                    avatar_url: profileData.avatar_url
                })
                .eq('id', user!.id);

            if (profileError) throw profileError;

            // Upsert coach data
            const { error: coachError } = await supabase
                .from('coaches_data')
                .upsert({
                    id: user!.id,
                    phone: profileData.phone,
                    bio: profileData.bio,
                    cref: profileData.cref
                });

            if (coachError) throw coachError;

            toast.success('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            toast.error('Erro ao atualizar perfil.');
        } finally {
            setSaving(false);
        }
    };

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

            setProfileData({ ...profileData, avatar_url: publicUrl });
            toast.success('Foto de perfil atualizada!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Erro ao enviar foto.');
        } finally {
            setUploading(false);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
    };
    if (loading) {
        return (
            <div className="bg-slate-50 dark:bg-slate-900 min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-50 via-white to-sky-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 min-h-screen pb-24">
            {/* Ambient Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-72 h-72 bg-sky-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-40 left-0 w-56 h-56 bg-indigo-400/10 rounded-full blur-3xl"></div>
            </div>

            {/* Aesthetic Header */}
            <header className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl pt-12 pb-16 px-6 overflow-hidden border-b border-slate-100/50 dark:border-slate-700/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>

                <div className="relative flex items-center justify-between mb-8">
                    <h1 className="font-display text-2xl font-black text-slate-900 dark:text-white tracking-tight text-glow">Meu Perfil</h1>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        <button className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-95">
                            <span className="material-symbols-rounded text-slate-600 dark:text-slate-300">settings</span>
                        </button>
                    </div>
                </div>

                {/* Profile Info Card Header */}
                <div className="relative flex flex-col items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={uploading}
                    />
                    <div className="relative mb-4">
                        <div
                            className="w-28 h-28 rounded-[2rem] border-4 border-white dark:border-slate-800 overflow-hidden shadow-2xl ring-4 ring-primary/10 cursor-pointer flex items-center justify-center bg-slate-100 dark:bg-slate-700"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            ) : (
                                <img
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${profileData.full_name}&background=random&size=128`}
                                />
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="absolute bottom-1 -right-1 bg-primary text-white p-2.5 rounded-2xl shadow-xl hover:bg-primary-dark transition-all transform hover:rotate-12 active:scale-90 border-2 border-white dark:border-slate-800 disabled:opacity-50"
                        >
                            <span className="material-symbols-rounded text-lg font-bold">photo_camera</span>
                        </button>
                    </div>
                    <div className="text-center">
                        <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white">{profileData.full_name}</h2>
                        <div className="flex items-center justify-center gap-2 mt-1">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Personal Trainer</span>
                            {profileData.cref && (
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                                    CREF: {profileData.cref}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-5 -mt-8 relative z-10 space-y-6">
                {/* Personal Info Section */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-700/50 p-8 animate-slide-up">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <span className="material-symbols-rounded text-primary">person_edit</span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">Informações</h3>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-sky-500 text-white px-5 py-2 rounded-xl text-sm font-black shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-rounded text-lg">check_circle</span>
                            )}
                            Salvar
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Nome Completo</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 group-focus-within:text-primary transition-colors">
                                    <span className="material-symbols-rounded text-xl">account_circle</span>
                                </span>
                                <input
                                    className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                    type="text"
                                    value={profileData.full_name}
                                    onChange={e => setProfileData({ ...profileData, full_name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">CREF</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <span className="material-symbols-rounded text-xl">badge</span>
                                    </span>
                                    <input
                                        className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                        type="text"
                                        placeholder="G00000-G/XX"
                                        value={profileData.cref}
                                        onChange={e => setProfileData({ ...profileData, cref: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Telefone</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 group-focus-within:text-primary transition-colors">
                                        <span className="material-symbols-rounded text-xl">phone_iphone</span>
                                    </span>
                                    <input
                                        className="w-full pl-14 pr-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                        type="tel"
                                        value={profileData.phone}
                                        onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Biografia</label>
                            <textarea
                                rows={4}
                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none"
                                placeholder="Conte um pouco sobre sua formação e experiência..."
                                value={profileData.bio}
                                onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* App Settings */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-slate-700/50 p-4 space-y-2">
                    <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                                <span className="material-symbols-rounded">notifications</span>
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Notificações</span>
                        </div>
                        <span className="material-symbols-rounded text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                                <span className="material-symbols-rounded">shield</span>
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-200">Privacidade</span>
                        </div>
                        <span className="material-symbols-rounded text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </button>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleSignOut}
                    className="w-full p-5 rounded-[2rem] border-2 border-danger/10 bg-danger/5 text-danger font-black flex items-center justify-center gap-3 hover:bg-danger/10 transition-all active:scale-[0.98] mt-4"
                >
                    <span className="material-symbols-rounded">logout</span>
                    Sair da Conta
                </button>

                <p className="text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] py-4">
                    Fitcoach v1.0.4
                </p>
            </main>

            <BottomNav />
        </div>
    );
};

export default CoachProfile;