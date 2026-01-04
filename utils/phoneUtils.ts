export const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '');
};

export const formatToWhatsappUrl = (phone: string | null | undefined, message?: string): string | null => {
    if (!phone) return null;

    let cleanPhone = normalizePhone(phone);

    // Se for um número válido BR (10 ou 11 dígitos), adiciona 55 se não tiver
    // Ex: 11999999999 -> 5511999999999
    // Ex: 5511999999999 -> mantém
    if ((cleanPhone.length === 10 || cleanPhone.length === 11) && !cleanPhone.startsWith('55')) {
        cleanPhone = `55${cleanPhone}`;
    }

    // Validação básica de comprimento mínimo para evitar links quebrados
    if (cleanPhone.length < 10) return null;

    const queryParams = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${cleanPhone}${queryParams}`;
};
