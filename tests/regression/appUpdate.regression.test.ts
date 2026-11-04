import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { watchAppUpdates, AppReleaseUpdate } from '../../utils/appUpdateService';

describe('atualização do app em celulares', () => {
    let win: EventTarget & { location: { reload: ReturnType<typeof vi.fn> } };
    let doc: EventTarget & { visibilityState: string };
    let sw: EventTarget & { controller: object | null; register: ReturnType<typeof vi.fn> };
    let registration: EventTarget & { waiting: { postMessage: ReturnType<typeof vi.fn> } | null; installing: null; update: ReturnType<typeof vi.fn> };
    let stop: (() => void) | undefined;
    let fetchMock: ReturnType<typeof vi.fn>;
    const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
    beforeEach(() => {
        vi.useFakeTimers();
        win = Object.assign(new EventTarget(), { location: { reload: vi.fn() } });
        doc = Object.assign(new EventTarget(), { visibilityState: 'visible' });
        registration = Object.assign(new EventTarget(), { waiting: null, installing: null, update: vi.fn().mockResolvedValue(undefined) });
        sw = Object.assign(new EventTarget(), { controller: {}, register: vi.fn().mockResolvedValue(registration) });
        fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 'old' }) });
        vi.stubGlobal('window', win); vi.stubGlobal('document', doc); vi.stubGlobal('navigator', { serviceWorker: sw }); vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => { stop?.(); stop = undefined; vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
    it('detecta nova publicação mesmo sem mudança ou instalação do worker; nunca recarrega sozinho', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: 'new' }) });
        const available = vi.fn(); stop = watchAppUpdates('old', available); await settle();
        expect(available).toHaveBeenCalledTimes(1);
        expect(sw.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
        expect(win.location.reload).not.toHaveBeenCalled();
        win.dispatchEvent(new Event('focus')); await settle();
        expect(available).toHaveBeenCalledTimes(1);
    });
    it('verifica novamente ao voltar do segundo plano e ao reconectar', async () => {
        const available = vi.fn(); stop = watchAppUpdates('old', available); await settle();
        expect(available).not.toHaveBeenCalled();
        doc.visibilityState = 'hidden';
        const before = fetchMock.mock.calls.length;
        win.dispatchEvent(new Event('focus')); await settle();
        expect(fetchMock.mock.calls.length).toBe(before);
        doc.visibilityState = 'visible';
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: 'new' }) });
        doc.dispatchEvent(new Event('visibilitychange')); await settle();
        expect(available).toHaveBeenCalledTimes(1);
        win.dispatchEvent(new Event('online')); await settle();
        expect(registration.update).toHaveBeenCalled();
    });
    it('ativação aguarda controllerchange antes de recarregar e só após aceite', async () => {
        registration.waiting = { postMessage: vi.fn() };
        let update: AppReleaseUpdate;
        stop = watchAppUpdates('old', value => { update = value; }); await settle();
        expect(registration.waiting.postMessage).not.toHaveBeenCalled();
        const applying = update!.apply(); await settle();
        expect(registration.waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
        expect(win.location.reload).not.toHaveBeenCalled();
        sw.dispatchEvent(new Event('controllerchange')); await applying;
        expect(win.location.reload).toHaveBeenCalledTimes(1);
    });
    it('falha de rede não recarrega e uma reconexão encontra a atualização', async () => {
        fetchMock.mockRejectedValue(new Error('offline'));
        const available = vi.fn(); stop = watchAppUpdates('old', available); await settle();
        expect(available).not.toHaveBeenCalled();
        fetchMock.mockResolvedValue({ ok: true, json: async () => ({ version: 'new' }) });
        win.dispatchEvent(new Event('online')); await settle();
        expect(available).toHaveBeenCalledTimes(1);
        fetchMock.mockRejectedValue(new Error('offline'));
        await expect(available.mock.calls[0][0].apply()).rejects.toThrow('offline');
        expect(win.location.reload).not.toHaveBeenCalled();
    });
    it('limpa listeners e polling ao desmontar, inclusive registro assíncrono', async () => {
        const available = vi.fn(); stop = watchAppUpdates('old', available); stop(); await settle();
        const before = fetchMock.mock.calls.length;
        win.dispatchEvent(new Event('focus')); win.dispatchEvent(new Event('online')); doc.dispatchEvent(new Event('visibilitychange'));
        await vi.advanceTimersByTimeAsync(120000);
        expect(fetchMock.mock.calls.length).toBe(before);
        expect(available).not.toHaveBeenCalled();
    });
});
