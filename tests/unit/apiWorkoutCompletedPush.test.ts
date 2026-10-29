import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler, {
  timingSafeEqual,
  processWorkoutCompletedPush,
} from '../../api/workout-completed-push.ts';

describe('api/workout-completed-push: timingSafeEqual', () => {
  it('retorna true para strings idênticas', () => {
    expect(timingSafeEqual('super-secret-key-123', 'super-secret-key-123')).toBe(true);
    expect(timingSafeEqual('', '')).toBe(true);
  });

  it('retorna false para strings de tamanhos diferentes', () => {
    expect(timingSafeEqual('secret', 'secret123')).toBe(false);
    expect(timingSafeEqual('short', 'longer-string')).toBe(false);
  });

  it('retorna false para strings do mesmo tamanho com conteúdo diferente', () => {
    expect(timingSafeEqual('abcdef', 'abcdeg')).toBe(false);
  });

  it('retorna false para valores nulos ou inválidos', () => {
    expect(timingSafeEqual(null as any, 'secret')).toBe(false);
    expect(timingSafeEqual('secret', undefined as any)).toBe(false);
  });
});

describe('api/workout-completed-push: Vercel handler', () => {
  const SECRET = 'test-webhook-secret-999';

  beforeEach(() => {
    vi.stubEnv('WORKOUT_PUSH_WEBHOOK_SECRET', SECRET);
  });

  function createMockResponse() {
    const res: any = {
      statusCode: 200,
      jsonBody: null,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: any) {
        this.jsonBody = body;
        return this;
      }
    };
    return res;
  }

  it('retorna 405 para métodos diferentes de POST', async () => {
    const req = { method: 'GET', headers: {} };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.jsonBody).toEqual({ error: 'Method not allowed' });
  });

  it('retorna 401 quando x-webhook-secret está ausente ou incorreto', async () => {
    const req1 = { method: 'POST', headers: {} };
    const res1 = createMockResponse();
    await handler(req1, res1);
    expect(res1.statusCode).toBe(401);

    const req2 = { method: 'POST', headers: { 'x-webhook-secret': 'wrong-secret' } };
    const res2 = createMockResponse();
    await handler(req2, res2);
    expect(res2.statusCode).toBe(401);
  });

  it('retorna 400 se workout_log_id não for informado no body', async () => {
    const req = {
      method: 'POST',
      headers: { 'x-webhook-secret': SECRET },
      body: { other_field: '123' }
    };
    const res = createMockResponse();

    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'workout_log_id is required' });
  });
});

describe('api/workout-completed-push: processWorkoutCompletedPush logic', () => {
  const noon = new Date('2026-10-29T15:00:00Z'); // 12:00 BRT
  const night = new Date('2026-10-30T01:00:00Z'); // 22:00 BRT

  function createMockSupabase(overrides: {
    log?: any;
    claim?: any;
    student?: any;
    coach?: any;
    subscriptions?: any[];
  } = {}) {
    const logData = overrides.log !== undefined ? overrides.log : {
      id: 'log-1',
      student_id: 'stu-1',
      workout_id: 'w-1',
      started_at: '2026-10-29T11:00:00Z',
      finished_at: '2026-10-29T12:00:00Z',
    };

    const claimData = overrides.claim !== undefined ? overrides.claim : {
      id: 'notif-claim-1',
      coach_id: 'coach-1',
    };

    const studentData = overrides.student !== undefined ? overrides.student : {
      name: 'Gabriel',
      full_name: 'Gabriel Souza',
    };

    const coachData = overrides.coach !== undefined ? overrides.coach : {
      preferences: { notifications: { push: true, student_workout_completed: true } }
    };

    const subsData = overrides.subscriptions !== undefined ? overrides.subscriptions : [
      { id: 'sub-1', endpoint: 'https://push.example.com/1', p256dh: 'key1', auth: 'auth1' },
      { id: 'sub-2', endpoint: 'https://push.example.com/2', p256dh: 'key2', auth: 'auth2' },
    ];

    const deletedIds: string[][] = [];
    const insertedNotifications: any[] = [];

    const client = {
      from(table: string) {
        if (table === 'workout_logs') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: logData, error: null })
              })
            })
          };
        }
        if (table === 'workout_completion_notifications') {
          return {
            update: () => ({
              eq: () => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: claimData, error: null })
                  })
                })
              })
            })
          };
        }
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => {
                  if (val === 'stu-1') return { data: studentData, error: null };
                  return { data: coachData, error: null };
                }
              })
            })
          };
        }
        if (table === 'notification_logs') {
          return {
            insert: (entry: any) => {
              insertedNotifications.push(entry);
              return {
                select: () => ({
                  single: async () => ({ data: { id: 'notif-log-1', ...entry }, error: null })
                })
              };
            }
          };
        }
        if (table === 'push_subscriptions') {
          return {
            select: () => ({
              eq: async () => ({ data: subsData, error: null })
            }),
            delete: () => ({
              in: async (_col: string, ids: string[]) => {
                deletedIds.push(ids);
                return { error: null };
              }
            })
          };
        }
        throw new Error(`Unexpected table ${table}`);
      },
      _state: { deletedIds, insertedNotifications }
    };

    return client;
  }

  it('pula envio se o treino não estiver finalizado', async () => {
    const supabase = createMockSupabase({
      log: { id: 'log-1', student_id: 'stu-1', finished_at: null }
    });

    const res = await processWorkoutCompletedPush(
      { workout_log_id: 'log-1' },
      { supabaseClient: supabase, now: noon }
    );

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, skipped: 'log_not_completed' });
  });

  it('respeita idempotência: pula se já notificado para este treino', async () => {
    const supabase = createMockSupabase({ claim: null });

    const res = await processWorkoutCompletedPush(
      { workout_log_id: 'log-1' },
      { supabaseClient: supabase, now: noon }
    );

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, skipped: 'already_notified' });
  });

  it('respeita coach com student_workout_completed desativado', async () => {
    const supabase = createMockSupabase({
      coach: { preferences: { notifications: { student_workout_completed: false } } }
    });

    const res = await processWorkoutCompletedPush(
      { workout_log_id: 'log-1' },
      { supabaseClient: supabase, now: noon }
    );

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, skipped: 'topic_disabled' });
    expect(supabase._state.insertedNotifications.length).toBe(0);
  });

  it('registra notification_logs mas não faz push em quiet_hours', async () => {
    const supabase = createMockSupabase();
    const mockWebPush: any = {
      sendNotification: vi.fn(),
      setVapidDetails: vi.fn(),
    };

    const res = await processWorkoutCompletedPush(
      { workout_log_id: 'log-1' },
      { supabaseClient: supabase, webpushClient: mockWebPush, now: night }
    );

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, skipped: 'quiet_hours' });
    expect(supabase._state.insertedNotifications.length).toBe(1);
    expect(mockWebPush.sendNotification).not.toHaveBeenCalled();
  });

  it('envia Web Push para assinaturas ativas e remove assinaturas 410', async () => {
    const supabase = createMockSupabase();
    const sentPayloads: any[] = [];

    const mockWebPush: any = {
      sendNotification: vi.fn().mockImplementation(async (sub, payloadStr) => {
        if (sub.endpoint.includes('/2')) {
          const err: any = new Error('Gone');
          err.statusCode = 410;
          throw err;
        }
        sentPayloads.push(JSON.parse(payloadStr));
        return { statusCode: 201 };
      }),
      setVapidDetails: vi.fn(),
    };

    const res = await processWorkoutCompletedPush(
      { workout_log_id: 'log-1' },
      { supabaseClient: supabase, webpushClient: mockWebPush, now: noon }
    );

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ success: true, sent: 1, removed: 1 });
    expect(mockWebPush.sendNotification).toHaveBeenCalledTimes(2);

    expect(sentPayloads[0]).toMatchObject({
      title: 'Treino Finalizado',
      body: 'Gabriel finalizou o treino!',
      icon: '/icon-gq.png',
      badge: '/icon-gq.png',
      action_url: '/coach/student/stu-1',
      topic: 'workout_completed',
    });

    expect(supabase._state.deletedIds).toEqual([['sub-2']]);
  });
});
