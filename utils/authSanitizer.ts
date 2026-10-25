/**
 * Utilitários puros para sanitização de credenciais de login.
 * Previne falhas por autocapitalização de celulares e espaços acidentais no fim/início.
 */

export function sanitizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
}

export function sanitizePassword(password: string): string {
    return (password || '').trim();
}
