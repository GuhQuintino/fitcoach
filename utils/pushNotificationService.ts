import { supabase } from '../lib/supabaseClient';

export const DEFAULT_VAPID_PUBLIC_KEY = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VAPID_PUBLIC_KEY) ||
    'BGfLruXs9mOKs6fJpz6Sd0zTm0KLgdexzNgdsYs2s5YxFXDXsoyjCaMbCLDFdJNKk72j7zLingTrxVQingKsc9A';

/**
 * Converte chave pública VAPID em base64url para Uint8Array exigido pelo PushManager.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = typeof window !== 'undefined' && window.atob ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Verifica se o navegador atual oferece suporte à Web Push API e Service Workers.
 */
export function isPushSupported(): boolean {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    return Boolean(
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Detecta se o dispositivo é iOS (iPhone, iPad, iPod).
 */
export function isIOS(): boolean {
    if (typeof navigator === 'undefined') return false;
    const isApple = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isMSStream = typeof window !== 'undefined' && Boolean((window as any)?.MSStream);
    return isApple && !isMSStream;
}

/**
 * Detecta se o PWA está em execução no modo instalado (Standalone).
 * Requisito estrito para Push no iOS Safari (>= 16.4).
 */
export function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandaloneWindow = window.matchMedia?.('(display-mode: standalone)')?.matches;
    const isIOSStandalone = (navigator as any)?.standalone === true;
    return Boolean(isStandaloneWindow || isIOSStandalone);
}

/**
 * Retorna o status atual da permissão de notificações do navegador.
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Solicita permissão nativa de notificações ao usuário (deve ser chamado a partir de um clique).
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'denied';
    }
    return await Notification.requestPermission();
}

/**
 * Obtém a assinatura ativa do PushManager, se houver.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
    if (!isPushSupported()) return null;
    try {
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    } catch (err) {
        console.warn('[PushService] Erro ao obter subscription ativa:', err);
        return null;
    }
}

/**
 * Inscreve o usuário na Web Push API e sincroniza as credenciais no Supabase (`push_subscriptions`).
 */
export async function subscribeUserToPush(
    userId: string,
    vapidKey: string = DEFAULT_VAPID_PUBLIC_KEY
): Promise<{ success: boolean; subscription?: any; error?: string }> {
    if (!userId) {
        return { success: false, error: 'User ID is required' };
    }

    if (!isPushSupported()) {
        if (isIOS() && !isStandalonePWA()) {
            return {
                success: false,
                error: 'No iPhone, adicione o Fitcoach à Tela de Início (Compartilhar > Adicionar à Tela de Início) para ativar notificações.'
            };
        }
        return { success: false, error: 'Notificações push não são suportadas neste navegador.' };
    }

    try {
        const permission = await requestPushPermission();
        if (permission !== 'granted') {
            return { success: false, error: 'Permissão de notificação não foi concedida.' };
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const applicationServerKey = urlBase64ToUint8Array(vapidKey);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });
        }

        const subJson = subscription.toJSON();
        const endpoint = subJson.endpoint;
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        if (!endpoint || !p256dh || !auth) {
            return { success: false, error: 'Falha ao extrair chaves de criptografia da assinatura push.' };
        }

        // Sincronizar com Supabase
        const { error: dbError } = await supabase
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint,
                p256dh,
                auth,
                user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'endpoint' });

        if (dbError) {
            console.error('[PushService] Erro ao sincronizar subscription no banco:', dbError);
            return { success: false, error: dbError.message };
        }

        return { success: true, subscription: subJson };
    } catch (err: any) {
        console.error('[PushService] Erro no fluxo de inscrição push:', err);
        return { success: false, error: err.message || 'Erro ao ativar notificações push.' };
    }
}

/**
 * Remove a assinatura do dispositivo e apaga do Supabase.
 */
export async function unsubscribeUserFromPush(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    if (!isPushSupported()) return { success: true };

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const endpoint = subscription.endpoint;
            await subscription.unsubscribe();

            if (userId && endpoint) {
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('endpoint', endpoint);
            }
        }

        return { success: true };
    } catch (err: any) {
        console.error('[PushService] Erro ao desinscrever do push:', err);
        return { success: false, error: err.message || 'Erro ao desativar notificações.' };
    }
}
