import { describe, it, expect } from 'vitest';
import {
    getFirstName,
    buildDedupeKey,
    buildWorkoutCompletedPayload,
    decideCoachPush,
    isCompletedLog,
    isExpiredPushStatus,
    isWithinQuietHours,
    getBrazilMinutes,
    FALLBACK_STUDENT_NAME
} from '../../supabase/functions/_shared/workoutCompletedPush';

describe('workoutCompletedPush: primeiro nome', () => {
    it('usa a primeira palavra de full_name capitalizada', () => {
        expect(getFirstName({ full_name: 'joão pedro da silva' })).toBe('João');
        expect(getFirstName({ full_name: '  MARIA   souza ' })).toBe('Maria');
    });

    it('usa name quando full_name está vazio', () => {
        expect(getFirstName({ full_name: '', name: 'carlos eduardo' })).toBe('Carlos');
        expect(getFirstName({ name: 'ana' })).toBe('Ana');
    });

    it('retorna "Seu aluno" sem nome utilizável', () => {
        expect(getFirstName(null)).toBe(FALLBACK_STUDENT_NAME);
        expect(getFirstName(undefined)).toBe('Seu aluno');
        expect(getFirstName({ full_name: '   ', name: null })).toBe('Seu aluno');
    });
});

describe('workoutCompletedPush: payload', () => {
    it('monta título, corpo, ícone e URL do coach', () => {
        const payload = buildWorkoutCompletedPayload({
            studentId: 'stu-1',
            studentName: { full_name: 'lucas almeida' },
            notificationId: 'n-1'
        });
        expect(payload.title).toBe('Treino Finalizado');
        expect(payload.body).toBe('Lucas finalizou o treino!');
        expect(payload.icon).toBe('/icon-192.png');
        expect(payload.action_url).toBe('/coach/student/stu-1');
        expect(payload.topic).toBe('workout_completed');
        expect(payload.id).toBe('n-1');
    });

    it('usa fallback "Seu aluno finalizou o treino!"', () => {
        const payload = buildWorkoutCompletedPayload({ studentId: 's', studentName: null });
        expect(payload.body).toBe('Seu aluno finalizou o treino!');
        expect(payload.id).toBeNull();
    });
});

describe('workoutCompletedPush: idempotência', () => {
    const base = { student_id: 'stu-1', workout_id: 'w-1', started_at: '2026-10-29T12:00:00.000Z' };

    it('gera a mesma chave quando o sync offline recria o log com novo ID', () => {
        const first = buildDedupeKey({ ...base });
        const retry = buildDedupeKey({ ...base, started_at: '2026-10-29T09:00:00.000-03:00' });
        expect(retry).toBe(first);
    });

    it('gera chaves distintas para treinos diferentes', () => {
        const a = buildDedupeKey(base);
        expect(buildDedupeKey({ ...base, workout_id: 'w-2' })).not.toBe(a);
        expect(buildDedupeKey({ ...base, started_at: '2026-10-30T12:00:00.000Z' })).not.toBe(a);
        expect(buildDedupeKey({ ...base, student_id: 'stu-2' })).not.toBe(a);
    });

    it('aceita workout_id nulo', () => {
        expect(buildDedupeKey({ ...base, workout_id: null })).toBe('stu-1|none|2026-10-29T12:00:00.000Z');
    });

    it('simula UNIQUE(dedupe_key): segunda conclusão do mesmo treino não notifica', () => {
        const store = new Set<string>();
        const claim = (log: typeof base) => {
            const key = buildDedupeKey(log);
            if (store.has(key)) return false;
            store.add(key);
            return true;
        };
        expect(claim(base)).toBe(true);
        expect(claim({ ...base })).toBe(false);
    });

    it('só considera concluído quando finished_at existe', () => {
        expect(isCompletedLog({ finished_at: '2026-10-29T13:00:00Z' })).toBe(true);
        expect(isCompletedLog({ finished_at: null })).toBe(false);
        expect(isCompletedLog(null)).toBe(false);
    });
});

describe('workoutCompletedPush: preferências e assinaturas', () => {
    // 15:00 UTC = 12:00 em São Paulo (fora do silêncio padrão)
    const noon = new Date('2026-10-29T15:00:00Z');
    // 01:00 UTC = 22:00 em São Paulo (dentro do silêncio padrão 21:30-07:30)
    const night = new Date('2026-10-30T01:00:00Z');

    it('envia por padrão', () => {
        expect(decideCoachPush({}, noon)).toEqual({ send: true });
        expect(decideCoachPush(null, noon)).toEqual({ send: true });
    });

    it('respeita push desativado e tópico desativado', () => {
        expect(decideCoachPush({ push: false }, noon)).toEqual({ send: false, reason: 'push_disabled' });
        expect(decideCoachPush({ student_workout_completed: false }, noon)).toEqual({
            send: false,
            reason: 'topic_disabled'
        });
    });

    it('respeita horário de silêncio', () => {
        expect(decideCoachPush({}, night)).toEqual({ send: false, reason: 'quiet_hours' });
        expect(decideCoachPush({ quiet_hours_start: '23:00', quiet_hours_end: '05:00' }, night)).toEqual({ send: true });
    });

    it('calcula minutos em America/Sao_Paulo e faixas de silêncio', () => {
        expect(getBrazilMinutes(noon)).toBe(12 * 60);
        expect(isWithinQuietHours(60, '01:00', '06:00')).toBe(true);
        expect(isWithinQuietHours(7 * 60, '21:30', '07:30')).toBe(true);
        expect(isWithinQuietHours(8 * 60, '21:30', '07:30')).toBe(false);
        expect(isWithinQuietHours(100, '10:00', '10:00')).toBe(false);
    });

    it('remove assinaturas apenas para 404/410', () => {
        expect(isExpiredPushStatus(404)).toBe(true);
        expect(isExpiredPushStatus(410)).toBe(true);
        expect(isExpiredPushStatus(500)).toBe(false);
        expect(isExpiredPushStatus(201)).toBe(false);
        expect(isExpiredPushStatus(undefined)).toBe(false);
    });
});
