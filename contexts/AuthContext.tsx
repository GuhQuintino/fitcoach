import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

type Role = 'admin' | 'coach' | 'student' | null;

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: Role;
    avatarUrl: string | null;
    status: string | null;
    expiresAt: string | null;
    coachExpiresAt: string | null;
    preferences: UserPreferences;
    loading: boolean;
    signOut: () => Promise<void>;
    updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

interface UserPreferences {
    focusMode: boolean;
    [key: string]: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface CachedAuthProfile {
    role: Role;
    status: string | null;
    avatarUrl: string | null;
    expiresAt: string | null;
    coachExpiresAt: string | null;
    preferences: UserPreferences;
}

const getCachedAuthProfile = (userId: string): CachedAuthProfile | null => {
    try {
        const raw = localStorage.getItem(`fc_auth_profile_${userId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const setCachedAuthProfile = (userId: string, data: CachedAuthProfile): void => {
    try {
        localStorage.setItem(`fc_auth_profile_${userId}`, JSON.stringify(data));
    } catch {}
};

const removeCachedAuthProfile = (userId: string): void => {
    try {
        localStorage.removeItem(`fc_auth_profile_${userId}`);
    } catch {}
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [coachExpiresAt, setCoachExpiresAt] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences>({ focusMode: false });
    const [loading, setLoading] = useState(true);

    const prevUserId = React.useRef<string | null>(null);

    const applyCachedProfile = (userId: string): boolean => {
        const cached = getCachedAuthProfile(userId);
        if (cached) {
            if (cached.role) setRole(cached.role);
            if (cached.status) setStatus(cached.status);
            if (cached.avatarUrl) setAvatarUrl(cached.avatarUrl);
            if (cached.expiresAt) setExpiresAt(cached.expiresAt);
            if (cached.coachExpiresAt) setCoachExpiresAt(cached.coachExpiresAt);
            if (cached.preferences) setPreferences(cached.preferences);
            return true;
        }
        return false;
    };

    useEffect(() => {
        // Obter sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                // Tenta restaurar do cache imediatamente para render instantâneo mesmo offline
                applyCachedProfile(session.user.id);
                fetchUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Escutar mudanças na autenticação
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                if (currentUser.id !== prevUserId.current) {
                    // Restaura cache imediatamente ao trocar de usuário
                    applyCachedProfile(currentUser.id);
                    setLoading(true);
                    prevUserId.current = currentUser.id;
                    fetchUserProfile(currentUser.id);
                }
            } else {
                prevUserId.current = null;
                setRole(null);
                setAvatarUrl(null);
                setStatus(null);
                setExpiresAt(null);
                setCoachExpiresAt(null);
                setPreferences({ focusMode: false });
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string) => {
        if (!userId) return;
        try {
            // First, fetch the core profile to get the role and preferences
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role, status, avatar_url, preferences')
                .eq('id', userId)
                .single();

            if (error) throw error;

            let resolvedRole: Role = null;
            let resolvedStatus: string | null = null;
            let resolvedAvatar: string | null = null;
            let resolvedExpiresAt: string | null = null;
            let resolvedCoachExpiresAt: string | null = null;
            let resolvedPrefs: UserPreferences = { focusMode: false };

            if (profile) {
                resolvedRole = profile.role as Role;
                resolvedStatus = profile.status;
                resolvedAvatar = profile.avatar_url;
                if (profile.preferences) {
                    resolvedPrefs = profile.preferences;
                }

                setRole(resolvedRole);
                setStatus(resolvedStatus);
                setAvatarUrl(resolvedAvatar);
                setPreferences(resolvedPrefs);

                // Fetch extra data in parallel based on role
                if (profile.role === 'coach') {
                    const { data: coachData } = await supabase
                        .from('coaches_data')
                        .select('subscription_expires_at')
                        .eq('id', userId)
                        .single();
                    resolvedExpiresAt = coachData?.subscription_expires_at ?? null;
                    setExpiresAt(resolvedExpiresAt);
                } else if (profile.role === 'student') {
                    const { data: studentData } = await supabase
                        .from('students_data')
                        .select('consultancy_expires_at, coach_id')
                        .eq('id', userId)
                        .single();

                    if (studentData) {
                        resolvedExpiresAt = studentData.consultancy_expires_at ?? null;
                        setExpiresAt(resolvedExpiresAt);

                        if (studentData.coach_id) {
                            const { data: coachDataDesc } = await supabase
                                .from('coaches_data')
                                .select('subscription_expires_at')
                                .eq('id', studentData.coach_id)
                                .single();
                            resolvedCoachExpiresAt = coachDataDesc?.subscription_expires_at ?? null;
                            setCoachExpiresAt(resolvedCoachExpiresAt);
                        }
                    }
                }

                // Salva no cache local para resiliência offline
                setCachedAuthProfile(userId, {
                    role: resolvedRole,
                    status: resolvedStatus,
                    avatarUrl: resolvedAvatar,
                    expiresAt: resolvedExpiresAt,
                    coachExpiresAt: resolvedCoachExpiresAt,
                    preferences: resolvedPrefs
                });

            } else {
                const metaRole = session?.user?.user_metadata?.role;
                if (metaRole) {
                    setRole(metaRole as Role);
                    setStatus(metaRole === 'admin' ? 'active' : 'pending');
                }
            }
        } catch (error: any) {
            console.warn('[AuthContext] Falha na busca online do perfil, utilizando cache:', error);

            const hasCache = applyCachedProfile(userId);
            if (!hasCache) {
                const metaRole = session?.user?.user_metadata?.role;
                if (metaRole) {
                    setRole(metaRole as Role);
                    setStatus('active');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    // Real-time listener for coaches to receive student sign-up notifications
    useEffect(() => {
        if (role !== 'coach' || !user) return;

        const channel = supabase
            .channel('coach_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'students_data',
                    filter: `coach_id=eq.${user.id}`
                },
                async (payload) => {
                    // Fetch student name for the notification
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', payload.new.id)
                        .single();

                    const studentName = profile?.full_name || 'Um novo aluno';
                    toast.success(`${studentName} acabou de se cadastrar usando seu link!`, {
                        duration: 6000,
                        icon: '👋',
                        style: {
                            borderRadius: '16px',
                            background: '#0f172a',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [role, user]);

    const signOut = async () => {
        if (user) {
            removeCachedAuthProfile(user.id);
        }
        await supabase.auth.signOut();
        setRole(null);
        setStatus(null);
        setExpiresAt(null);
        setCoachExpiresAt(null);
        setSession(null);
        setUser(null);
        setPreferences({ focusMode: false });
    };

    const updatePreferences = async (newPrefs: Partial<UserPreferences>) => {
        if (!user) return;
        try {
            const updated = { ...preferences, ...newPrefs };
            const { error } = await supabase
                .from('profiles')
                .update({ preferences: updated })
                .eq('id', user.id);

            if (error) throw error;
            setPreferences(updated);
        } catch (error) {
            console.error('Error updating preferences:', error);
            toast.error('Erro ao salvar preferências.');
        }
    };

    const value = useMemo(() => ({
        session,
        user,
        role,
        avatarUrl,
        status,
        expiresAt,
        coachExpiresAt,
        preferences,
        loading,
        signOut,
        updatePreferences
    }), [session, user, role, avatarUrl, status, expiresAt, coachExpiresAt, preferences, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
