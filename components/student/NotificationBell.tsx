import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getUnreadNotificationsCount } from '../../utils/smartNotificationDispatcher';

interface NotificationBellProps {
    userId?: string | null;
    className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId, className = '' }) => {
    const [unreadCount, setUnreadCount] = useState<number>(0);

    useEffect(() => {
        if (!userId) return;

        let isMounted = true;

        const loadCount = async () => {
            const count = await getUnreadNotificationsCount(userId);
            if (isMounted) {
                setUnreadCount(count);
            }
        };

        loadCount();

        // Realtime subscription para atualizar instantaneamente quando houver novas notificações ou leitura
        const channel = supabase
            .channel(`notifs-bell-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notification_logs',
                    filter: `user_id=eq.${userId}`
                },
                () => {
                    loadCount();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return (
        <Link
            to="/student/settings/notifications"
            aria-label={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
            className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors relative active:scale-95 ${className}`}
        >
            <span className="material-symbols-rounded text-xl" aria-hidden="true">
                {unreadCount > 0 ? 'notifications_active' : 'notifications'}
            </span>

            {/* O badge só é renderizado quando houver notificações não lidas reais */}
            {unreadCount > 0 && (
                <span className="absolute top-2 right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white dark:border-slate-800 shadow-sm animate-scale-in">
                    {unreadCount > 9 ? '9+' : unreadCount}
                </span>
            )}
        </Link>
    );
};
