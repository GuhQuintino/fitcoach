import { matchesSearch } from './textUtils';

export interface StudentFilterOption {
    id: string; // 'all' ou UUID do aluno
    full_name: string;
    avatar_url: string | null;
}

/**
 * Normaliza e ordena alfabeticamente a lista de alunos vinda do Supabase.
 * Trata variações onde o perfil pode ser retornado como objeto único ou array (join 1:1).
 * Aplica ordenação em português do Brasil considerando sensibilidade base (acentos).
 */
export const normalizeStudentsList = (rawStudents: any[]): StudentFilterOption[] => {
    if (!Array.isArray(rawStudents)) return [];

    const mapped: StudentFilterOption[] = rawStudents
        .map((s) => {
            const profile = Array.isArray(s?.profiles) ? s.profiles[0] : s?.profiles;
            const id = s?.id || profile?.id;
            if (!id || typeof id !== 'string') return null;

            const rawName = profile?.full_name;
            const fullName = typeof rawName === 'string' && rawName.trim().length > 0
                ? rawName.trim()
                : 'Aluno sem nome';

            const rawAvatar = profile?.avatar_url;
            const avatarUrl = typeof rawAvatar === 'string' && rawAvatar.trim().length > 0
                ? rawAvatar.trim()
                : null;

            return {
                id,
                full_name: fullName,
                avatar_url: avatarUrl,
            };
        })
        .filter((s): s is StudentFilterOption => s !== null);

    return mapped.sort((a, b) =>
        a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' })
    );
};

/**
 * Filtra opções de alunos por termo de busca em tempo real.
 * Utiliza matchesSearch para ignorar acentos e maiúsculas/minúsculas.
 */
export const filterStudentsBySearch = (
    students: StudentFilterOption[],
    searchTerm: string
): StudentFilterOption[] => {
    if (!Array.isArray(students)) return [];
    if (!searchTerm || !searchTerm.trim()) return students;

    const trimmed = searchTerm.trim();
    return students.filter((s) => matchesSearch(s.full_name, trimmed));
};

export type WorkoutLogsScope =
    | { mode: 'single'; studentId: string }
    | { mode: 'multiple'; studentIds: string[] }
    | { mode: 'empty' };

/**
 * Resolve o escopo da query de logs no Supabase de acordo com o filtro selecionado.
 */
export const buildWorkoutLogsFilterScope = (
    selectedStudentId: string | 'all',
    allStudentIds: string[]
): WorkoutLogsScope => {
    if (selectedStudentId && selectedStudentId !== 'all') {
        return { mode: 'single', studentId: selectedStudentId };
    }

    if (!Array.isArray(allStudentIds) || allStudentIds.length === 0) {
        return { mode: 'empty' };
    }

    return { mode: 'multiple', studentIds: allStudentIds };
};

/**
 * Formata o texto de confirmação para marcar treinos como lidos.
 * Respeita se há um aluno específico selecionado ou toda a carteira.
 */
export const formatMarkAllAsReadPrompt = (
    unreadCount: number,
    selectedStudentName?: string | null
): string => {
    const itemLabel = unreadCount === 1 ? 'treino' : 'treinos';
    const readLabel = unreadCount === 1 ? 'lido' : 'lidos';

    if (selectedStudentName && selectedStudentName.trim()) {
        return `Marcar ${unreadCount} ${itemLabel} de ${selectedStudentName.trim()} como ${readLabel}?`;
    }

    return `Marcar ${unreadCount} como ${readLabel}?`;
};

/**
 * Formata a mensagem de toast de sucesso após marcar treinos como lidos.
 */
export const formatMarkAllSuccessToast = (
    selectedStudentName?: string | null
): string => {
    if (selectedStudentName && selectedStudentName.trim()) {
        return `Feedbacks de ${selectedStudentName.trim()} marcados como lidos.`;
    }

    return 'Todos os feedbacks foram marcados como lidos.';
};

/**
 * Localiza a opção correspondente ao aluno selecionado ou retorna null se 'all'.
 */
export const getStudentFilterOption = (
    selectedStudentId: string | 'all',
    students: StudentFilterOption[]
): StudentFilterOption | null => {
    if (!selectedStudentId || selectedStudentId === 'all' || !Array.isArray(students)) {
        return null;
    }
    return students.find((s) => s.id === selectedStudentId) || null;
};
