/**
 * Normalizes text by removing accents and converting to lowercase.
 * Useful for client-side searching.
 */
export const normalizeText = (text: string): string => {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

/**
 * Checks if search text matches target text (accent and case insensitive).
 */
export const matchesSearch = (target: string, search: string): boolean => {
    if (!search) return true;
    if (!target) return false;
    return normalizeText(target).includes(normalizeText(search));
};
