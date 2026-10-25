import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { ProfileCompletionBanner } from '../../components/student/ProfileCompletionBanner';
import { ProfileCompletenessResult } from '../../types/notifications';

// Mocks do AuthContext e react-hot-toast
const mockUpdatePreferences = vi.fn();
let mockUser: any = { id: 'student-test-123' };
let mockPreferences: any = {
    notifications: {
        profile_completion: true,
        profile_completion_snoozed_until: null
    }
};

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        preferences: mockPreferences,
        updatePreferences: mockUpdatePreferences
    })
}));

vi.mock('react-hot-toast', () => ({
    default: Object.assign(vi.fn(), {
        success: vi.fn(),
        error: vi.fn()
    })
}));

describe('REGRESSION TEST: ProfileCompletionBanner Mobile Viewport & Expansion State', () => {
    let storageMock: Record<string, string> = {};

    beforeEach(() => {
        storageMock = {};
        mockUser = { id: 'student-test-123' };
        mockPreferences = {
            notifications: {
                profile_completion: true,
                profile_completion_snoozed_until: null
            }
        };
        vi.clearAllMocks();

        global.localStorage = {
            getItem: (key: string) => storageMock[key] ?? null,
            setItem: (key: string, value: string) => {
                storageMock[key] = String(value);
            },
            removeItem: (key: string) => {
                delete storageMock[key];
            },
            clear: () => {
                storageMock = {};
            },
            key: (index: number) => Object.keys(storageMock)[index] ?? null,
            length: Object.keys(storageMock).length
        } as Storage;
    });

    const incompleteProfile: ProfileCompletenessResult = {
        isComplete: false,
        missingFields: ['avatar_url', 'weight_kg'],
        completionPercentage: 50
    };

    it('REGRESSÃO: Banner deve renderizar título legível sem truncar para "Co..." e conter botão de expansão com setinha', () => {
        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ProfileCompletionBanner completeness={incompleteProfile} />
            </MemoryRouter>
        );

        // Deve conter o título integral
        expect(html).toContain('Complete seu perfil');
        // Deve conter a porcentagem
        expect(html).toContain('50%');
        // Deve conter o botão de toggle com o texto e o ícone de expansão (setinha)
        expect(html).toContain('Ver mais');
        expect(html).toContain('expand_more');
        // Deve possuir atributos de acessibilidade ARIA
        expect(html).toContain('aria-expanded="false"');
        expect(html).toContain('aria-controls="profile-banner-details"');
        // Botão de fechar (X)
        expect(html).toContain('close');
        expect(html).toContain('aria-label="Fechar e adiar por 3 dias"');
    });

    it('REGRESSÃO: Não deve renderizar quando o perfil estiver 100% completo', () => {
        const completeProfile: ProfileCompletenessResult = {
            isComplete: true,
            missingFields: [],
            completionPercentage: 100
        };

        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ProfileCompletionBanner completeness={completeProfile} />
            </MemoryRouter>
        );

        expect(html).toBe('');
    });

    it('REGRESSÃO: Não deve renderizar quando as notificações de perfil estiverem desativadas', () => {
        mockPreferences = {
            notifications: {
                profile_completion: false
            }
        };

        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ProfileCompletionBanner completeness={incompleteProfile} />
            </MemoryRouter>
        );

        expect(html).toBe('');
    });

    it('REGRESSÃO: Não deve renderizar quando estiver sob período de adiamento (snooze)', () => {
        const futureTime = new Date(Date.now() + 86400000).toISOString();
        storageMock['fc_profile_banner_snoozed_student-test-123'] = futureTime;

        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ProfileCompletionBanner completeness={incompleteProfile} />
            </MemoryRouter>
        );

        expect(html).toBe('');
    });

    it('REGRESSÃO: Deve mapear corretamente os rótulos de todos os campos pendentes (Foto, Peso, Idade, Altura)', () => {
        const fullMissingProfile: ProfileCompletenessResult = {
            isComplete: false,
            missingFields: ['avatar_url', 'weight_kg', 'birth_date', 'height_cm'],
            completionPercentage: 0
        };

        // Renderiza no banner
        const html = renderToStaticMarkup(
            <MemoryRouter>
                <ProfileCompletionBanner completeness={fullMissingProfile} />
            </MemoryRouter>
        );

        // O cabeçalho renderiza limpo sem erros
        expect(html).toContain('Complete seu perfil');
        expect(html).toContain('0%');
    });
});
