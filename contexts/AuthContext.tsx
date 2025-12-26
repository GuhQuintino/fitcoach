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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [coachExpiresAt, setCoachExpiresAt] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<UserPreferences>({ focusMode: true });
    const [loading, setLoading] = useState(true);

    const prevUserId = React.useRef<string | null>(null);

    useEffect(() => {
        // Obter sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
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
                // Stabilizer: Only re-fetch if the user ID actually changed
                // This prevents heavy RPC/Select calls on every browser focus (which triggers session refreshes)
                if (currentUser.id !== prevUserId.current) {
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
                setPreferences({ focusMode: true });
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

            if (profile) {
                setRole(profile.role as Role);
                setStatus(profile.status);
                setAvatarUrl(profile.avatar_url);
                if (profile.preferences) {
                    setPreferences(profile.preferences);
                }

                // Fetch extra data in parallel based on role
                if (profile.role === 'coach') {
                    const { data: coachData } = await supabase
                        .from('coaches_data')
                        .select('subscription_expires_at')
                        .eq('id', userId)
                        .single();
                    setExpiresAt(coachData?.subscription_expires_at ?? null);
                } else if (profile.role === 'student') {
                    const { data: studentData } = await supabase
                        .from('students_data')
                        .select('consultancy_expires_at, coach_id')
                        .eq('id', userId)
                        .single();

                    if (studentData) {
                        setExpiresAt(studentData.consultancy_expires_at ?? null);

                        if (studentData.coach_id) {
                            // Fetch coach subscription status
                            const { data: coachDataDesc } = await supabase
                                .from('coaches_data')
                                .select('subscription_expires_at')
                                .eq('id', studentData.coach_id)
                                .single();
                            setCoachExpiresAt(coachDataDesc?.subscription_expires_at ?? null);
                        }
                    }
                } else {
                    // Fallback to metadata if profile doesn't exist yet (e.g., brand new user)
                    const metaRole = session?.user?.user_metadata?.role;
                    if (metaRole) {
                        setRole(metaRole as Role);
                        // Only set pending if not admin
                        setStatus(metaRole === 'admin' ? 'active' : 'pending');
                    }
                }
            } else {
                // Trigger metadata fallback if profile fetch fails
                const metaRole = session?.user?.user_metadata?.role;
                if (metaRole) {
                    setRole(metaRole as Role);
                    setStatus(metaRole === 'admin' ? 'active' : 'pending');
                }
            }
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
            // Fallback on error too
            const metaRole = session?.user?.user_metadata?.role;
            if (metaRole) {
                setRole(metaRole as Role);
                setStatus(metaRole === 'admin' ? 'active' : 'pending');
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
        await supabase.auth.signOut();
        setRole(null);
        setStatus(null);
        setExpiresAt(null);
        setCoachExpiresAt(null);
        setSession(null);
        setUser(null);
        setPreferences({ focusMode: true });
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
