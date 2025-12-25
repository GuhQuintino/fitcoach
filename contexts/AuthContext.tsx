import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

type Role = 'admin' | 'coach' | 'student' | null;

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: Role;
    avatarUrl: string | null;
    status: string | null;
    expiresAt: string | null;
    coachExpiresAt: string | null;
    loading: boolean;
    signOut: () => Promise<void>;
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
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string) => {
        if (!userId) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, status, avatar_url')
                .eq('id', userId)
                .single();

            if (data) {
                setRole(data.role as Role);
                setStatus(data.status);
                setAvatarUrl(data.avatar_url);

                // Fetch Expiration Date based on Role
                if (data.role === 'coach') {
                    const { data: coachData } = await supabase
                        .from('coaches_data')
                        .select('subscription_expires_at')
                        .eq('id', userId)
                        .single();
                    setExpiresAt(coachData?.subscription_expires_at ?? null);
                } else if (data.role === 'student') {
                    const { data: studentData } = await supabase
                        .from('students_data')
                        .select('consultancy_expires_at, coach_id')
                        .eq('id', userId)
                        .single();
                    setExpiresAt(studentData?.consultancy_expires_at ?? null);

                    if (studentData?.coach_id) {
                        const { data: coachDataDesc } = await supabase
                            .from('coaches_data')
                            .select('subscription_expires_at')
                            .eq('id', studentData.coach_id)
                            .single();
                        setCoachExpiresAt(coachDataDesc?.subscription_expires_at ?? null);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setRole(null);
        setStatus(null);
        setExpiresAt(null);
        setCoachExpiresAt(null);
        setSession(null);
        setUser(null);
    };

    const value = useMemo(() => ({
        session,
        user,
        role,
        avatarUrl,
        status,
        expiresAt,
        coachExpiresAt,
        loading,
        signOut
    }), [session, user, role, avatarUrl, status, expiresAt, coachExpiresAt, loading]);

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
