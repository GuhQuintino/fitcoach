import { describe, it, expect, vi } from 'vitest';
import {
  getFirstName as getFirstNameApi,
  buildWorkoutCompletedPayload as buildPayloadApi,
  processWorkoutCompletedPush,
  FALLBACK_STUDENT_NAME as FALLBACK_NAME_API,
} from '../../api/workout-completed-push.ts';
import {
  getFirstName as getFirstNameShared,
  buildWorkoutCompletedPayload as buildPayloadShared,
  FALLBACK_STUDENT_NAME as FALLBACK_NAME_SHARED,
} from '../../supabase/functions/_shared/workoutCompletedPush.ts';

describe('REGRESSION TEST: Extração do primeiro nome do aluno em notificações de treino', () => {
  describe('Cenário 1: Perfil com full_name composto (capitalização correta do primeiro nome)', () => {
    it('extrai "Ana" para "Ana Paula Soares da Silva" em ambas as implementações', () => {
      const profile = { full_name: 'Ana Paula Soares da Silva' };
      expect(getFirstNameApi(profile)).toBe('Ana');
      expect(getFirstNameShared(profile)).toBe('Ana');
    });

    it('extrai "Gabriel" para "Gabriel da Silva Brito" em ambas as implementações', () => {
      const profile = { full_name: 'Gabriel da Silva Brito' };
      expect(getFirstNameApi(profile)).toBe('Gabriel');
      expect(getFirstNameShared(profile)).toBe('Gabriel');
    });

    it('normaliza capitalização (tudo minúsculo ou tudo maiúsculo)', () => {
      expect(getFirstNameApi({ full_name: 'lucas silva' })).toBe('Lucas');
      expect(getFirstNameApi({ full_name: 'BEATRIZ MENDES' })).toBe('Beatriz');
      expect(getFirstNameShared({ full_name: 'lucas silva' })).toBe('Lucas');
      expect(getFirstNameShared({ full_name: 'BEATRIZ MENDES' })).toBe('Beatriz');
    });
  });

  describe('Cenário 2: Objeto retornado pelo Supabase SEM propriedade "name" (schema real de profiles)', () => {
    it('extrai corretamente quando o objeto possui estritamente full_name e email', () => {
      // Simula exatamente o retorno do Supabase .select('full_name, email')
      const supabaseProfileRecord = {
        full_name: 'Gabriel da Silva Brito',
        email: 'brito.gsknow@gmail.com',
      };

      // Confirma que 'name' não existe no payload
      expect('name' in supabaseProfileRecord).toBe(false);

      expect(getFirstNameApi(supabaseProfileRecord)).toBe('Gabriel');
      expect(getFirstNameShared(supabaseProfileRecord)).toBe('Gabriel');
    });

    it('extrai corretamente quando o objeto possui APENAS full_name', () => {
      const supabaseProfileRecord = {
        full_name: 'Mariana Duarte',
      };

      expect(getFirstNameApi(supabaseProfileRecord)).toBe('Mariana');
      expect(getFirstNameShared(supabaseProfileRecord)).toBe('Mariana');
    });
  });

  describe('Cenário 3: Perfil sem full_name mas com email válido', () => {
    it('extrai "Brito" a partir de "brito.gsknow@gmail.com"', () => {
      const profile = { full_name: null, email: 'brito.gsknow@gmail.com' };
      expect(getFirstNameApi(profile)).toBe('Brito');
      expect(getFirstNameShared(profile)).toBe('Brito');
    });

    it('extrai "Gabriel" a partir de "gabriel@gmail.com"', () => {
      const profile = { full_name: '', email: 'gabriel@gmail.com' };
      expect(getFirstNameApi(profile)).toBe('Gabriel');
      expect(getFirstNameShared(profile)).toBe('Gabriel');
    });

    it('suporta separadores comuns no prefixo do email (. _ + -)', () => {
      expect(getFirstNameApi({ email: 'ana.paula@empresa.com' })).toBe('Ana');
      expect(getFirstNameApi({ email: 'marcos_antonio@dominio.com' })).toBe('Marcos');
      expect(getFirstNameApi({ email: 'joao-silva@dominio.com' })).toBe('Joao');
      expect(getFirstNameApi({ email: 'carlos+teste@dominio.com' })).toBe('Carlos');

      expect(getFirstNameShared({ email: 'ana.paula@empresa.com' })).toBe('Ana');
      expect(getFirstNameShared({ email: 'marcos_antonio@dominio.com' })).toBe('Marcos');
      expect(getFirstNameShared({ email: 'joao-silva@dominio.com' })).toBe('Joao');
      expect(getFirstNameShared({ email: 'carlos+teste@dominio.com' })).toBe('Carlos');
    });
  });

  describe('Cenário 4: Perfil sem full_name e sem email -> Fallback "Seu aluno"', () => {
    it('retorna fallback quando profile é null ou undefined', () => {
      expect(getFirstNameApi(null)).toBe(FALLBACK_NAME_API);
      expect(getFirstNameApi(undefined)).toBe(FALLBACK_NAME_API);
      expect(getFirstNameShared(null)).toBe(FALLBACK_NAME_SHARED);
      expect(getFirstNameShared(undefined)).toBe(FALLBACK_NAME_SHARED);
    });

    it('retorna fallback quando full_name e email são vazios ou compostos por espaços', () => {
      expect(getFirstNameApi({ full_name: '   ', email: '   ' })).toBe('Seu aluno');
      expect(getFirstNameApi({ full_name: null, email: null })).toBe('Seu aluno');
      expect(getFirstNameShared({ full_name: '   ', email: '   ' })).toBe('Seu aluno');
      expect(getFirstNameShared({ full_name: null, email: null })).toBe('Seu aluno');
    });

    it('retorna fallback para email sem parte local válida antes do @', () => {
      expect(getFirstNameApi({ full_name: null, email: '@dominio.com' })).toBe('Seu aluno');
      expect(getFirstNameShared({ full_name: null, email: '@dominio.com' })).toBe('Seu aluno');
    });
  });

  describe('Cenário 5: Integração do Payload e Prevenção Definitiva de Regressão ("Gabriel finalizou o treino!")', () => {
    it('garante que buildWorkoutCompletedPayload monta "Gabriel finalizou o treino!" e NUNCA "Seu aluno finalizou o treino!"', () => {
      const payloadApi = buildPayloadApi({
        studentId: 'student-uuid-123',
        studentName: { full_name: 'Gabriel da Silva Brito' },
      });

      expect(payloadApi.body).toBe('Gabriel finalizou o treino!');
      expect(payloadApi.body).not.toBe('Seu aluno finalizou o treino!');

      const payloadShared = buildPayloadShared({
        studentId: 'student-uuid-123',
        studentName: { full_name: 'Gabriel da Silva Brito' },
      });

      expect(payloadShared.body).toBe('Gabriel finalizou o treino!');
      expect(payloadShared.body).not.toBe('Seu aluno finalizou o treino!');
    });

    it('integração com processWorkoutCompletedPush: envia push com nome real recuperado de profiles sem coluna "name"', async () => {
      const studentId = 'stu-gabriel-456';
      const coachId = 'coach-gustavo-789';

      const mockSupabase: any = {
        from: (table: string) => {
          if (table === 'workout_logs') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'log-100',
                      student_id: studentId,
                      workout_id: 'workout-1',
                      started_at: '2026-10-29T10:00:00Z',
                      finished_at: '2026-10-29T11:00:00Z',
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === 'workout_completion_notifications') {
            return {
              update: () => ({
                eq: () => ({
                  is: () => ({
                    select: () => ({
                      maybeSingle: async () => ({
                        data: { id: 'notif-claim-100', coach_id: coachId },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'profiles') {
            return {
              select: (columns: string) => {
                // VERIFICAÇÃO CRÍTICA: se a query solicitar a coluna inexistente 'name', falha como no Supabase real
                const requestedCols = columns.split(',').map((c) => c.trim());
                if (requestedCols.includes('name')) {
                  throw new Error('column profiles.name does not exist');
                }

                return {
                  eq: (_col: string, val: string) => ({
                    maybeSingle: async () => {
                      if (val === studentId) {
                        return {
                          data: {
                            full_name: 'Gabriel da Silva Brito',
                            email: 'brito.gsknow@gmail.com',
                          },
                          error: null,
                        };
                      }
                      return {
                        data: {
                          preferences: {
                            notifications: { push: true, student_workout_completed: true },
                          },
                        },
                        error: null,
                      };
                    },
                  }),
                };
              },
            };
          }
          if (table === 'notification_logs') {
            return {
              insert: (entry: any) => ({
                select: () => ({
                  single: async () => ({ data: { id: 'notif-log-100', ...entry }, error: null }),
                }),
              }),
            };
          }
          if (table === 'push_subscriptions') {
            return {
              select: () => ({
                eq: async () => ({
                  data: [
                    {
                      id: 'sub-coach-1',
                      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
                      p256dh: 'mock-key',
                      auth: 'mock-auth',
                    },
                  ],
                  error: null,
                }),
              }),
            };
          }
          throw new Error(`Unexpected table: ${table}`);
        },
      };

      const capturedPayloads: any[] = [];
      const mockWebPush: any = {
        sendNotification: vi.fn().mockImplementation(async (_sub, payloadStr) => {
          capturedPayloads.push(JSON.parse(payloadStr));
          return { statusCode: 201 };
        }),
        setVapidDetails: vi.fn(),
      };

      const result = await processWorkoutCompletedPush(
        { workout_log_id: 'log-100' },
        {
          supabaseClient: mockSupabase,
          webpushClient: mockWebPush,
          now: new Date('2026-10-29T15:00:00Z'),
        }
      );

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ success: true, sent: 1, removed: 0 });
      expect(mockWebPush.sendNotification).toHaveBeenCalledTimes(1);

      expect(capturedPayloads.length).toBe(1);
      expect(capturedPayloads[0].body).toBe('Gabriel finalizou o treino!');
      expect(capturedPayloads[0].body).not.toBe('Seu aluno finalizou o treino!');
      expect(capturedPayloads[0].title).toBe('Treino Finalizado');
      expect(capturedPayloads[0].action_url).toBe(`/coach/student/${studentId}`);
    });
  });
});
