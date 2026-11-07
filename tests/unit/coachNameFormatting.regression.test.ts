import { describe, it, expect } from 'vitest';
import { getFirstName } from '../../utils/textUtils';
import { formatToWhatsappUrl } from '../../utils/phoneUtils';

describe('REGRESSION TEST: Sanitização e Primeiro Nome do Coach em Mensagens de WhatsApp e Contato', () => {
    const FULL_COACH_NAME = 'Gustavo Quintino A Santos';
    const COACH_PHONE = '11992616777';

    describe('1. Utilitário Canônico getFirstName', () => {
        it('extrai exclusivamente "Gustavo" de "Gustavo Quintino A Santos"', () => {
            const firstName = getFirstName(FULL_COACH_NAME);
            expect(firstName).toBe('Gustavo');
            expect(firstName).not.toContain('Quintino');
            expect(firstName).not.toContain('Santos');
        });

        it('trata casos com múltiplos espaços intermediários e nas pontas', () => {
            expect(getFirstName('   Gustavo     Quintino   ')).toBe('Gustavo');
            expect(getFirstName('Gustavo   Santos')).toBe('Gustavo');
            expect(getFirstName('  Gustavo  ')).toBe('Gustavo');
        });

        it('mantém nome simples inalterado', () => {
            expect(getFirstName('Gustavo')).toBe('Gustavo');
        });

        it('retorna fallback padrão (string vazia) quando valor é nulo, indefinido ou vazio', () => {
            expect(getFirstName(null)).toBe('');
            expect(getFirstName(undefined)).toBe('');
            expect(getFirstName('')).toBe('');
            expect(getFirstName('   ')).toBe('');
        });

        it('retorna fallback personalizado fornecido quando o nome for inválido ou ausente', () => {
            expect(getFirstName(null, 'Gustavo')).toBe('Gustavo');
            expect(getFirstName(undefined, 'seu treinador')).toBe('seu treinador');
            expect(getFirstName('', 'seu coach')).toBe('seu coach');
            expect(getFirstName('   ', 'coach')).toBe('coach');
            expect(getFirstName(null, 'Coach')).toBe('Coach');
            expect(getFirstName(null, 'WhatsApp')).toBe('WhatsApp');
            expect(getFirstName(123 as any, 'fallback')).toBe('fallback');
        });
    });

    describe('2. Dashboard do Aluno (pages/student/Dashboard.tsx)', () => {
        it('gera mensagem de WhatsApp no card Falar com Coach com primeiro nome e blindagem anti-regressão', () => {
            const coach = { full_name: FULL_COACH_NAME, phone: COACH_PHONE };

            // Padrão exato definido na spec:
            const coachFirstName = getFirstName(coach.full_name, 'Gustavo');
            const message = `Olá ${coachFirstName}! Você poderia me ajudar?`;
            const whatsappUrl = formatToWhatsappUrl(coach.phone, message);

            expect(message).toBe('Olá Gustavo! Você poderia me ajudar?');
            expect(message).not.toContain('Quintino');
            expect(message).not.toContain('Santos');

            expect(whatsappUrl).not.toBeNull();
            expect(whatsappUrl).toContain('https://wa.me/5511992616777?text=');

            const decodedUrl = decodeURIComponent(whatsappUrl!);
            expect(decodedUrl).toContain('Olá Gustavo! Você poderia me ajudar?');
            expect(decodedUrl).not.toContain('Quintino');
            expect(decodedUrl).not.toContain('Santos');
        });

        it('gera aria-label e texto do card apenas com primeiro nome', () => {
            const coach = { full_name: FULL_COACH_NAME, phone: COACH_PHONE };

            const ariaLabel = `Conversar com coach ${getFirstName(coach.full_name, '')} no WhatsApp`;
            const badgeText = getFirstName(coach.full_name, 'WhatsApp');

            expect(ariaLabel).toBe('Conversar com coach Gustavo no WhatsApp');
            expect(ariaLabel).not.toContain('Quintino');
            expect(ariaLabel).not.toContain('Santos');

            expect(badgeText).toBe('Gustavo');
            expect(badgeText).not.toContain('Quintino');
            expect(badgeText).not.toContain('Santos');
        });

        it('nas telas de aprovação pendente e acesso vencido utiliza getFirstName com fallback apropriado', () => {
            const coachWithFullName = { full_name: FULL_COACH_NAME };
            const coachEmpty = { full_name: null };

            // Pendente:
            expect(getFirstName(coachWithFullName.full_name, 'seu treinador')).toBe('Gustavo');
            expect(getFirstName(coachEmpty.full_name, 'seu treinador')).toBe('seu treinador');
            expect(`Falar com coach ${getFirstName(coachWithFullName.full_name, '')} no WhatsApp`).toBe('Falar com coach Gustavo no WhatsApp');

            // Vencido:
            expect(getFirstName(coachWithFullName.full_name, 'seu coach')).toBe('Gustavo');
            expect(getFirstName(coachEmpty.full_name, 'seu coach')).toBe('seu coach');
            expect(`Renovar acesso via WhatsApp com ${getFirstName(coachWithFullName.full_name, 'coach')}`).toBe('Renovar acesso via WhatsApp com Gustavo');
            expect(`Renovar acesso via WhatsApp com ${getFirstName(coachEmpty.full_name, 'coach')}`).toBe('Renovar acesso via WhatsApp com coach');
        });
    });

    describe('3. Perfil do Aluno (pages/student/Profile.tsx)', () => {
        it('gera URL de WhatsApp no Profile usando "Olá Gustavo! Você poderia me ajudar?" sem vazar sobrenomes', () => {
            const coachProfile = { full_name: FULL_COACH_NAME, phone: COACH_PHONE };

            const coachName = getFirstName(coachProfile.full_name, 'Gustavo');
            const message = `Olá ${coachName}! Você poderia me ajudar?`;
            const whatsappUrl = formatToWhatsappUrl(coachProfile.phone, message);

            expect(message).toBe('Olá Gustavo! Você poderia me ajudar?');
            expect(message).not.toContain('Quintino');
            expect(message).not.toContain('Santos');

            const decodedUrl = decodeURIComponent(whatsappUrl!);
            expect(decodedUrl).toContain('Olá Gustavo! Você poderia me ajudar?');
            expect(decodedUrl).not.toContain('Quintino');
            expect(decodedUrl).not.toContain('Santos');
        });

        it('gera botão e aria-label com primeiro nome no perfil', () => {
            const coachProfile = { full_name: FULL_COACH_NAME, phone: COACH_PHONE };

            const ariaLabel = `Conversar com coach ${getFirstName(coachProfile.full_name, '')} no WhatsApp`;
            const buttonText = `Falar com ${getFirstName(coachProfile.full_name, 'Coach')}`;

            expect(ariaLabel).toBe('Conversar com coach Gustavo no WhatsApp');
            expect(ariaLabel).not.toContain('Quintino');
            expect(ariaLabel).not.toContain('Santos');

            expect(buttonText).toBe('Falar com Gustavo');
            expect(buttonText).not.toContain('Quintino');
            expect(buttonText).not.toContain('Santos');
        });

        it('usa fallbacks quando coachProfile não tem nome cadastrado', () => {
            const coachProfileEmpty = { full_name: null, phone: COACH_PHONE };

            const coachName = getFirstName(coachProfileEmpty.full_name, 'Gustavo');
            expect(coachName).toBe('Gustavo');

            const buttonText = `Falar com ${getFirstName(coachProfileEmpty.full_name, 'Coach')}`;
            expect(buttonText).toBe('Falar com Coach');
        });
    });

    describe('4. Tela de Aguardando Aprovação (pages/WaitingApproval.tsx)', () => {
        it('gera mensagem de WhatsApp do aluno recém-cadastrado com primeiro nome do coach', () => {
            const contactName = FULL_COACH_NAME;
            const contactPhone = COACH_PHONE;
            const userName = 'Mariana Silva';

            const coachName = getFirstName(contactName, 'Gustavo');
            const whatsappMessage = `Olá ${coachName}! Meu nome é ${userName} e acabei de criar minha conta no Fitcoach. Poderia liberar meu acesso?`;
            const whatsappLink = formatToWhatsappUrl(contactPhone, whatsappMessage);

            expect(whatsappMessage).toBe('Olá Gustavo! Meu nome é Mariana Silva e acabei de criar minha conta no Fitcoach. Poderia liberar meu acesso?');
            expect(whatsappMessage).not.toContain('Quintino');
            expect(whatsappMessage).not.toContain('Santos');

            const decodedLink = decodeURIComponent(whatsappLink!);
            expect(decodedLink).toContain('Olá Gustavo!');
            expect(decodedLink).not.toContain('Quintino');
            expect(decodedLink).not.toContain('Santos');
        });

        it('gera texto informativo da tela com o primeiro nome do treinador', () => {
            const contactName = FULL_COACH_NAME;
            const descriptiveText = `O treinador ${getFirstName(contactName, 'seu treinador')} liberará seu acesso em breve.`;

            expect(descriptiveText).toBe('O treinador Gustavo liberará seu acesso em breve.');
            expect(descriptiveText).not.toContain('Quintino');
            expect(descriptiveText).not.toContain('Santos');
        });

        it('trata contactName ausente na tela de aprovação com fallback seguro', () => {
            const contactName = null;
            const coachName = getFirstName(contactName, 'Gustavo');
            expect(coachName).toBe('Gustavo');

            const descriptiveText = `O treinador ${getFirstName(contactName, 'seu treinador')} liberará seu acesso em breve.`;
            expect(descriptiveText).toBe('O treinador seu treinador liberará seu acesso em breve.');
        });
    });
});
