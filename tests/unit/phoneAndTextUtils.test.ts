import { describe, it, expect } from 'vitest';
import { normalizePhone, formatToWhatsappUrl } from '../../utils/phoneUtils';
import { normalizeText, matchesSearch } from '../../utils/textUtils';

describe('UNIT TEST: phoneUtils & textUtils', () => {
    describe('phoneUtils', () => {
        it('deve normalizar telefones removendo caracteres não numéricos', () => {
            expect(normalizePhone('(11) 98765-4321')).toBe('11987654321');
            expect(normalizePhone('+55 21 99999-0000')).toBe('5521999990000');
            expect(normalizePhone('abc 123 def 456')).toBe('123456');
        });

        it('deve retornar null se o telefone for nulo, indefinido ou inválido (< 10 dígitos)', () => {
            expect(formatToWhatsappUrl(null)).toBeNull();
            expect(formatToWhatsappUrl(undefined)).toBeNull();
            expect(formatToWhatsappUrl('')).toBeNull();
            expect(formatToWhatsappUrl('1234567')).toBeNull(); // < 10 dígitos
        });

        it('deve prefixar 55 em números BR com 10 ou 11 dígitos que não tenham DDI', () => {
            expect(formatToWhatsappUrl('11987654321')).toBe('https://wa.me/5511987654321');
            expect(formatToWhatsappUrl('(11) 98765-4321')).toBe('https://wa.me/5511987654321');
            expect(formatToWhatsappUrl('(21) 3456-7890')).toBe('https://wa.me/552134567890');
        });

        it('deve manter o número inalterado se já começar com 55', () => {
            expect(formatToWhatsappUrl('+55 11 98765-4321')).toBe('https://wa.me/5511987654321');
        });

        it('deve adicionar mensagem codificada em URI quando fornecida', () => {
            const url = formatToWhatsappUrl('11987654321', 'Olá, tudo bem? Seu treino foi atualizado!');
            expect(url).toContain('https://wa.me/5511987654321?text=');
            expect(url).toContain(encodeURIComponent('Olá, tudo bem? Seu treino foi atualizado!'));
        });
    });

    describe('textUtils', () => {
        it('deve remover acentos e converter para minúsculas', () => {
            expect(normalizeText('Agachamento Búlgaro')).toBe('agachamento bulgaro');
            expect(normalizeText('Elevação Pélvica')).toBe('elevacao pelvica');
            expect(normalizeText('Tríceps & Bíceps')).toBe('triceps & biceps');
            expect(normalizeText('')).toBe('');
        });

        it('matchesSearch deve retornar true para buscas com correspondência sem diferenciar acentos ou maiúsculas', () => {
            expect(matchesSearch('Elevação Pélvica Máquina', 'pelvica')).toBe(true);
            expect(matchesSearch('Elevação Pélvica Máquina', 'ELEVACAO')).toBe(true);
            expect(matchesSearch('Supino Reto com Barra', 'reto')).toBe(true);
            expect(matchesSearch('Stiff Halteres', 'stiff')).toBe(true);
        });

        it('matchesSearch deve retornar true se a busca for vazia e false se o alvo for nulo/vazio', () => {
            expect(matchesSearch('Qualquer Texto', '')).toBe(true);
            expect(matchesSearch('', 'busca')).toBe(false);
            expect(matchesSearch(null as any, 'busca')).toBe(false);
        });
    });
});
