import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    urlBase64ToUint8Array,
    isPushSupported,
    isIOS,
    isStandalonePWA,
    getNotificationPermission,
    DEFAULT_VAPID_PUBLIC_KEY
} from '../../utils/pushNotificationService';

describe('pushNotificationService', () => {
    it('deve converter chave pública VAPID base64url para Uint8Array válido', () => {
        const uint8 = urlBase64ToUint8Array(DEFAULT_VAPID_PUBLIC_KEY);
        expect(uint8).toBeInstanceOf(Uint8Array);
        expect(uint8.length).toBeGreaterThan(0);
    });

    describe('Detecção de Plataforma e Recursos', () => {
        const originalNavigator = global.navigator;
        const originalWindow = global.window;

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('deve identificar iOS via User Agent', () => {
            vi.stubGlobal('navigator', {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)'
            });
            expect(isIOS()).toBe(true);

            vi.stubGlobal('navigator', {
                userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)'
            });
            expect(isIOS()).toBe(false);
        });

        it('deve detectar PWA Standalone via matchMedia ou navigator.standalone', () => {
            // Standalone via matchMedia
            vi.stubGlobal('window', {
                matchMedia: (query: string) => ({
                    matches: query.includes('standalone')
                })
            });
            expect(isStandalonePWA()).toBe(true);

            // Não standalone
            vi.stubGlobal('window', {
                matchMedia: () => ({ matches: false })
            });
            vi.stubGlobal('navigator', { standalone: false });
            expect(isStandalonePWA()).toBe(false);
        });

        it('deve retornar unsupported quando Notification não existe no window', () => {
            vi.stubGlobal('window', {});
            expect(getNotificationPermission()).toBe('unsupported');
        });
    });
});
