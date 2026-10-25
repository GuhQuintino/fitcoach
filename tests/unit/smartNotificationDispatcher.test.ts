import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getUnreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getRecentNotifications
} from '../../utils/smartNotificationDispatcher';
import { supabase } from '../../lib/supabaseClient';

vi.mock('../../lib/supabaseClient', () => {
    return {
        supabase: {
            from: vi.fn()
        }
    };
});

describe('smartNotificationDispatcher', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('deve retornar 0 para userId vazio ou indefinido', async () => {
        expect(await getUnreadNotificationsCount('')).toBe(0);
        expect(await getRecentNotifications('')).toEqual([]);
        expect(await markNotificationAsRead('')).toBe(false);
        expect(await markAllNotificationsAsRead('')).toBe(false);
    });

    it('deve consultar contagem exata de notificações não lidas no Supabase', async () => {
        const mockSelect = vi.fn().mockReturnThis();
        const mockEq = vi.fn().mockReturnThis();
        const mockIs = vi.fn().mockResolvedValue({ count: 3, error: null });

        (supabase.from as any).mockReturnValue({
            select: mockSelect,
            eq: mockEq,
            is: mockIs
        });

        const count = await getUnreadNotificationsCount('user-123');

        expect(supabase.from).toHaveBeenCalledWith('notification_logs');
        expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true });
        expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockIs).toHaveBeenCalledWith('read_at', null);
        expect(count).toBe(3);
    });

    it('deve buscar histórico ordenado de notificações', async () => {
        const mockList = [
            { id: '1', title: 'Treino A', read_at: null, created_at: '2026-10-25T10:00:00Z' },
            { id: '2', title: 'Complete seu perfil', read_at: '2026-10-24T12:00:00Z', created_at: '2026-10-24T10:00:00Z' }
        ];

        const mockLimit = vi.fn().mockResolvedValue({ data: mockList, error: null });
        const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
        const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
        const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

        (supabase.from as any).mockReturnValue({
            select: mockSelect
        });

        const result = await getRecentNotifications('user-123', 10);
        expect(result).toEqual(mockList);
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
        expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('deve marcar notificação individual como lida atribuindo timestamp', async () => {
        const mockEq = vi.fn().mockResolvedValue({ error: null });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

        (supabase.from as any).mockReturnValue({
            update: mockUpdate
        });

        const success = await markNotificationAsRead('notif-999');
        expect(success).toBe(true);
        expect(supabase.from).toHaveBeenCalledWith('notification_logs');
        expect(mockEq).toHaveBeenCalledWith('id', 'notif-999');
    });

    it('deve marcar todas as notificações não lidas do usuário como lidas', async () => {
        const mockIs = vi.fn().mockResolvedValue({ error: null });
        const mockEq = vi.fn().mockReturnValue({ is: mockIs });
        const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

        (supabase.from as any).mockReturnValue({
            update: mockUpdate
        });

        const success = await markAllNotificationsAsRead('user-123');
        expect(success).toBe(true);
        expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockIs).toHaveBeenCalledWith('read_at', null);
    });
});
