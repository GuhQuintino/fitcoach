/**
 * Módulo Canônico de Classificação e Formatação de Alunos e Dashboard do Fitcoach.
 * Garante sincronização 100% idêntica entre /coach/dashboard e /coach/students.
 */

export type StudentClassification = 'active' | 'pending' | 'inactive';

export interface StudentLike {
    status?: string | null;
    consultancy_expires_at?: string | null;
    profiles?: {
        status?: string | null;
        [key: string]: any;
    } | null;
    [key: string]: any;
}

export interface DashboardStatsResult {
    totalStudents: number;
    activeStudents: number;
    pendingStudents: number;
    inactiveStudents: number;
    activePercentage: number;
}

export interface LastWorkoutFormat {
    label: string;
    isStale: boolean;
    daysAgo: number | null;
    badgeVariant: 'emerald' | 'slate' | 'amber' | 'muted';
}

export interface PlanExpirationFormat {
    text: string;
    diffDays: number | null;
    isUrgent: boolean;
    isExpiredRecent: boolean;
    isExpiredLong: boolean;
    urgency: 'normal' | 'warning' | 'urgent' | 'grace' | 'expired';
}

/**
 * Classifica o aluno conforme a regra de negócio S1 do PRODUCT.md:
 * - Se status === 'pending', retorna 'pending'.
 * - Se status === 'rejected' || status === 'banned', retorna 'inactive'.
 * - Se !consultancy_expires_at, retorna 'inactive'.
 * - Se expiresAt >= now, retorna 'active'.
 * - Se expiresAt < now:
 *     - Se venceu há <= 7 dias, retorna 'pending' (período de tolerância para renovação).
 *     - Se venceu há > 7 dias, retorna 'inactive'.
 */
export function classifyStudent(
    student: StudentLike | null | undefined,
    now: Date = new Date()
): StudentClassification {
    if (!student) return 'inactive';

    const status = student.profiles?.status ?? student.status;

    if (status === 'pending') {
        return 'pending';
    }

    if (status === 'rejected' || status === 'banned') {
        return 'inactive';
    }

    if (!student.consultancy_expires_at) {
        return 'inactive';
    }

    const exp = new Date(student.consultancy_expires_at);
    if (isNaN(exp.getTime())) {
        return 'inactive';
    }

    if (exp.getTime() >= now.getTime()) {
        return 'active';
    }

    // Plano venceu: calcula a tolerância de até 7 dias
    const diffMs = now.getTime() - exp.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
        return 'pending';
    }

    return 'inactive';
}

/**
 * Calcula os contadores globais da base do coach utilizando a classificação canônica.
 */
export function calculateDashboardStats(
    students: StudentLike[] = [],
    now: Date = new Date()
): DashboardStatsResult {
    const totalStudents = students.length;
    let activeStudents = 0;
    let pendingStudents = 0;
    let inactiveStudents = 0;

    for (const student of students) {
        const classification = classifyStudent(student, now);
        if (classification === 'active') {
            activeStudents++;
        } else if (classification === 'pending') {
            pendingStudents++;
        } else {
            inactiveStudents++;
        }
    }

    const activePercentage = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

    return {
        totalStudents,
        activeStudents,
        pendingStudents,
        inactiveStudents,
        activePercentage
    };
}

/**
 * Formata o último treino do aluno com cálculo de dias decorridos e alerta de desengajamento (> 7 dias).
 */
export function formatLastWorkout(
    finishedAt: string | null | undefined,
    now: Date = new Date()
): LastWorkoutFormat {
    if (!finishedAt) {
        return {
            label: 'Sem treinos registrados',
            isStale: false,
            daysAgo: null,
            badgeVariant: 'muted'
        };
    }

    const finishedDate = new Date(finishedAt);
    if (isNaN(finishedDate.getTime())) {
        return {
            label: 'Sem treinos registrados',
            isStale: false,
            daysAgo: null,
            badgeVariant: 'muted'
        };
    }

    // Compara por dias civis (zerando horários)
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const finishedDateOnly = new Date(finishedDate.getFullYear(), finishedDate.getMonth(), finishedDate.getDate());
    const diffMs = nowDateOnly.getTime() - finishedDateOnly.getTime();
    const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (daysAgo === 0) {
        return {
            label: 'Treinou hoje',
            isStale: false,
            daysAgo: 0,
            badgeVariant: 'emerald'
        };
    }

    if (daysAgo === 1) {
        return {
            label: 'Treinou ontem',
            isStale: false,
            daysAgo: 1,
            badgeVariant: 'emerald'
        };
    }

    if (daysAgo <= 7) {
        return {
            label: `Treinou há ${daysAgo} dias`,
            isStale: false,
            daysAgo,
            badgeVariant: 'slate'
        };
    }

    return {
        label: `Sem treinar há ${daysAgo} dias`,
        isStale: true,
        daysAgo,
        badgeVariant: 'amber'
    };
}

/**
 * Formata o vencimento da consultoria com cálculo de urgência e janela de renovação.
 */
export function formatPlanExpiration(
    expiresAt: string | null | undefined,
    now: Date = new Date()
): PlanExpirationFormat {
    if (!expiresAt) {
        return {
            text: 'Sem plano ativo',
            diffDays: null,
            isUrgent: false,
            isExpiredRecent: false,
            isExpiredLong: true,
            urgency: 'expired'
        };
    }

    const exp = new Date(expiresAt);
    if (isNaN(exp.getTime())) {
        return {
            text: 'Sem plano ativo',
            diffDays: null,
            isUrgent: false,
            isExpiredRecent: false,
            isExpiredLong: true,
            urgency: 'expired'
        };
    }

    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expDateOnly = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
    const diffTime = expDateOnly.getTime() - nowDateOnly.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
        return {
            text: `Vence em ${diffDays} dias`,
            diffDays,
            isUrgent: false,
            isExpiredRecent: false,
            isExpiredLong: false,
            urgency: 'normal'
        };
    }

    if (diffDays > 0 && diffDays <= 7) {
        return {
            text: `Vence em ${diffDays} dia${diffDays > 1 ? 's' : ''}`,
            diffDays,
            isUrgent: true,
            isExpiredRecent: false,
            isExpiredLong: false,
            urgency: 'warning'
        };
    }

    if (diffDays === 0) {
        return {
            text: 'Vence hoje',
            diffDays: 0,
            isUrgent: true,
            isExpiredRecent: false,
            isExpiredLong: false,
            urgency: 'urgent'
        };
    }

    // diffDays < 0 (vencido)
    const absDays = Math.abs(diffDays);
    if (absDays <= 7) {
        return {
            text: `Venceu há ${absDays} dia${absDays > 1 ? 's' : ''} (renovação)`,
            diffDays,
            isUrgent: true,
            isExpiredRecent: true,
            isExpiredLong: false,
            urgency: 'grace'
        };
    }

    return {
        text: `Vencido há ${absDays} dias`,
        diffDays,
        isUrgent: false,
        isExpiredRecent: false,
        isExpiredLong: true,
        urgency: 'expired'
    };
}

/**
 * Retorna as classes de estilo e rótulo para badges visuais de status.
 */
export function getStatusBadgeConfig(classification: StudentClassification) {
    switch (classification) {
        case 'active':
            return {
                label: 'Ativo',
                dotClass: 'bg-emerald-500',
                textClass: 'text-emerald-700 dark:text-emerald-400',
                bgClass: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/30'
            };
        case 'pending':
            return {
                label: 'Pendente',
                dotClass: 'bg-amber-500',
                textClass: 'text-amber-700 dark:text-amber-400',
                bgClass: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/30'
            };
        case 'inactive':
        default:
            return {
                label: 'Inativo',
                dotClass: 'bg-rose-500',
                textClass: 'text-rose-700 dark:text-rose-400',
                bgClass: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-800/30'
            };
    }
}
