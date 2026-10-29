import { describe, it, expect } from 'vitest';
import { timingSafeEqual } from '../../supabase/functions/_shared/timingSafeEqual';

describe('timingSafeEqual (regressão: comparação do x-webhook-secret sem !==)', () => {
    it('retorna true para strings iguais', async () => {
        expect(await timingSafeEqual('segredo-super-secreto', 'segredo-super-secreto')).toBe(true);
    });

    it('retorna false para strings diferentes de mesmo tamanho', async () => {
        expect(await timingSafeEqual('segredo-aaaa', 'segredo-aaab')).toBe(false);
    });

    it('retorna false quando a diferença está no primeiro caractere', async () => {
        expect(await timingSafeEqual('xegredo-aaaa', 'segredo-aaaa')).toBe(false);
    });

    it('retorna false para tamanhos diferentes (prefixo e extensão)', async () => {
        expect(await timingSafeEqual('segredo', 'segredo-longo')).toBe(false);
        expect(await timingSafeEqual('segredo-longo', 'segredo')).toBe(false);
    });

    it('trata strings vazias', async () => {
        expect(await timingSafeEqual('', '')).toBe(true);
        expect(await timingSafeEqual('', 'segredo')).toBe(false);
        expect(await timingSafeEqual('segredo', '')).toBe(false);
    });

    it('suporta caracteres multibyte', async () => {
        expect(await timingSafeEqual('çãõ-é', 'çãõ-é')).toBe(true);
        expect(await timingSafeEqual('çãõ-é', 'cao-e')).toBe(false);
    });
});
