import { describe, it, expect, vi } from 'vitest';
import {
  slugifyStudentName,
  normalizePhoneVariants,
  buildStudentNameSearchVariants,
  normalizeNameForComparison,
  matchStudentAnamneseAndCrm,
  parseWhatsAppPrePlainText,
  classifyClinicalTags,
  computeMessageId,
  resolveSyncWindowDays,
  mergeWhatsAppCache,
  transcribeAudioWithGemini,
  formatWhatsAppSectionMarkdown,
} from '../.agents/skills/weekly-workout-adjuster/scripts/whatsapp_utils.mjs';

describe('WhatsApp Web + Gemini Audio Dossier Sync (Regras W1 a W5)', () => {
  describe('1. Normalização de Telefones e Nomes (Regra W2)', () => {
    it('deve normalizar telefone brasileiro com 9º dígito gerando variantes com e sem 9º dígito, DDI 55 e últimos 8 dígitos', () => {
      const variants = normalizePhoneVariants('(47) 98869-3611');
      expect(variants).toContain('47988693611');
      expect(variants).toContain('4788693611');
      expect(variants).toContain('(47) 98869-3611');
      expect(variants).toContain('(47) 8869-3611');
      expect(variants).toContain('5547988693611');
      expect(variants).toContain('554788693611');
      expect(variants).toContain('88693611');
      expect(variants).toContain('8869-3611');
    });

    it('deve normalizar telefone com DDI +55 e sem 9º dígito gerando variante com 9º dígito', () => {
      const variants = normalizePhoneVariants('+55 11 9123-4567');
      expect(variants).toContain('11991234567');
      expect(variants).toContain('1191234567');
      expect(variants).toContain('91234567');
    });

    it('deve retornar lista vazia para telefones inválidos ou vazios', () => {
      expect(normalizePhoneVariants('')).toEqual([]);
      expect(normalizePhoneVariants(null)).toEqual([]);
      expect(normalizePhoneVariants('1234')).toEqual([]);
    });

    it('deve gerar variantes de nome do aluno (nome completo, Primeiro + Último e apelidos conhecidos como Nina)', () => {
      const nameVariants = buildStudentNameSearchVariants('Maria das Graças Meneses de Jesus');
      expect(nameVariants[0]).toBe('Maria das Graças Meneses de Jesus');
      expect(nameVariants).toContain('Maria Jesus');
      expect(nameVariants).toContain('Maria Graças');

      const ninaVariants = buildStudentNameSearchVariants('Maria Aparecida Rosa Dias');
      expect(ninaVariants[0]).toBe('Nina');
      expect(ninaVariants).toContain('Maria Aparecida Rosa Dias');
      expect(ninaVariants).toContain('Maria Dias');
    });

    it('deve converter nomes acentuados em slugs canônicos', () => {
      expect(slugifyStudentName('Natã Fiel Pereira')).toBe('nata-fiel-pereira');
      expect(slugifyStudentName('Antônia Cemira Carneiro')).toBe('antonia-cemira-carneiro');
    });
  });

  describe('2. Parser de Metadados do WhatsApp Web (data-pre-plain-text)', () => {
    it('deve extrair timestampISO, dateBR, timeBR e senderName do formato padrão [HH:MM, DD/MM/YYYY] Nome:', () => {
      const parsed = parseWhatsAppPrePlainText('[19:42, 12/10/2026] Diandra Teo: ');
      expect(parsed.timestampISO).toBe('2026-10-12T19:42:00.000Z');
      expect(parsed.dateBR).toBe('12/10/2026 19:42');
      expect(parsed.timeBR).toBe('19:42');
      expect(parsed.senderName).toBe('Diandra Teo');
    });

    it('deve suportar o formato invertido [DD/MM/YYYY HH:MM] Nome:', () => {
      const parsed = parseWhatsAppPrePlainText('[13/10/2026 08:05] +55 47 98869-3611: ');
      expect(parsed.timestampISO).toBe('2026-10-13T08:05:00.000Z');
      expect(parsed.dateBR).toBe('13/10/2026 08:05');
      expect(parsed.timeBR).toBe('08:05');
      expect(parsed.senderName).toBe('+55 47 98869-3611');
    });

    it('deve combinar horário isolado com fallbackDateStr quando apenas a hora for informada', () => {
      const parsed = parseWhatsAppPrePlainText('[14:30] Gabriel Pontes:', '15/10/2026');
      expect(parsed.timestampISO).toBe('2026-10-15T14:30:00.000Z');
      expect(parsed.dateBR).toBe('15/10/2026 14:30');
      expect(parsed.senderName).toBe('Gabriel Pontes');
    });
  });

  describe('3. Classificação de Tags Clínicas e Biomecânicas', () => {
    it('deve classificar relatos de dor articular, equipamento e carga corretamente', () => {
      const res = classifyClinicalTags(
        'Gustavo, hoje na cadeira flexora senti um incômodo atrás do joelho esquerdo quando subi para 50kg.'
      );
      expect(res.isRelevant).toBe(true);
      expect(res.isClinicallyRelevant).toBe(true);
      expect(res.tags).toContain('dor_lesao');
      expect(res.tags).toContain('equipamento_academia');
      expect(res.tags).toContain('carga_pr');
    });

    it('deve classificar relatos de rotina/viagem e sono/recuperação', () => {
      const res = classifyClinicalTags(
        'Essa semana vou viajar a trabalho na quinta e dormi muito mal por conta da insônia.'
      );
      expect(res.isRelevant).toBe(true);
      expect(res.tags).toContain('rotina_viagem');
      expect(res.tags).toContain('sono_recuperacao');
    });

    it('deve atribuir tag geral quando a mensagem não tiver cunho clínico/treino', () => {
      const res = classifyClinicalTags('Bom dia! Tudo certo por aí?');
      expect(res.isRelevant).toBe(false);
      expect(res.tags).toEqual(['geral']);
    });
  });

  describe('4. Janela Temporal Cold Start vs Incremental (Regra W3)', () => {
    it('deve retornar 75 dias (Cold Start, faixa 60-90d) quando não houver cache prévio ou mensagens', () => {
      expect(resolveSyncWindowDays(null)).toEqual({ days: 75, mode: 'cold_start' });
      expect(resolveSyncWindowDays({ messages: [] })).toEqual({ days: 75, mode: 'cold_start' });
    });

    it('deve retornar 10 dias (Incremental, faixa 7-14d) quando já existir sincronização anterior com mensagens', () => {
      const existingCache = {
        lastSyncAt: '2026-10-10T10:00:00.000Z',
        messages: [{ id: 'msg1', text: 'Treino feito' }],
      };
      expect(resolveSyncWindowDays(existingCache)).toEqual({ days: 10, mode: 'incremental' });
    });

    it('deve respeitar overrideDays quando passado explicitamente via CLI (--days=N)', () => {
      const existingCache = {
        lastSyncAt: '2026-10-10T10:00:00.000Z',
        messages: [{ id: 'msg1', text: 'Treino feito' }],
      };
      expect(resolveSyncWindowDays(existingCache, { overrideDays: 30 })).toEqual({
        days: 30,
        mode: 'override',
      });
    });
  });

  describe('5. Merge Idempotente de Cache e Preservação de Transcrições de Áudio (Regra W4)', () => {
    it('deve mesclar mensagens sem duplicar e preservar transcrições de áudio já realizadas', () => {
      const existingCache = {
        studentId: 'uuid-diandra',
        slug: 'diandra-teo',
        studentName: 'Diandra Teo',
        phone: '(47) 98869-3611',
        matchedChatTitle: 'Diandra Teo',
        matchedVia: 'label:Consultoria',
        firstSyncAt: '2026-10-01T10:00:00.000Z',
        lastSyncAt: '2026-10-10T10:00:00.000Z',
        messages: [
          {
            id: 'audio_msg_1',
            timestamp: '2026-10-12T10:00:00.000Z',
            dateBR: '12/10/2026 10:00',
            sender: 'student',
            type: 'audio',
            text: null,
            audioDuration: '0:42',
            transcription: 'Essa semana vou viajar quinta e sexta, treino seg, ter, qua e sáb.',
            clinicalSummary: 'Viagem quinta/sexta; treinará 4x na semana.',
            clinicalTags: ['rotina_viagem'],
          },
        ],
      };

      const newMessages = [
        // Mesmo áudio re-escaneado na revisão semanal sem re-transcrever
        {
          id: 'audio_msg_1',
          timestamp: '2026-10-12T10:00:00.000Z',
          dateBR: '12/10/2026 10:00',
          sender: 'student',
          type: 'audio',
          text: null,
          audioDuration: '0:42',
          transcription: '[Áudio (0:42) - transcrição pendente]',
          clinicalSummary: null,
        },
        // Nova mensagem de texto mais antiga (para testar ordenação cronológica)
        {
          id: 'text_msg_0',
          timestamp: '2026-10-11T18:30:00.000Z',
          dateBR: '11/10/2026 18:30',
          sender: 'student',
          type: 'text',
          text: 'Senti dor no ombro durante o desenvolvimento com halteres.',
        },
      ];

      const merged = mergeWhatsAppCache(existingCache, newMessages, {
        nowISO: '2026-10-17T00:30:00.000Z',
      });

      expect(merged.firstSyncAt).toBe('2026-10-01T10:00:00.000Z');
      expect(merged.lastSyncAt).toBe('2026-10-17T00:30:00.000Z');
      expect(merged.messages).toHaveLength(2);

      // Ordem cronológica garantida (11/10 antes de 12/10)
      expect(merged.messages[0].id).toBe('text_msg_0');
      expect(merged.messages[0].clinicalTags).toContain('dor_lesao');

      // Transcrição original preservada sem perda
      expect(merged.messages[1].id).toBe('audio_msg_1');
      expect(merged.messages[1].transcription).toBe(
        'Essa semana vou viajar quinta e sexta, treino seg, ter, qua e sáb.'
      );
      expect(merged.messages[1].clinicalSummary).toBe('Viagem quinta/sexta; treinará 4x na semana.');
    });

    it('deve gerar IDs determinísticos via computeMessageId quando rawDataId não estiver disponível', () => {
      const idA = computeMessageId({
        timestampISO: '2026-10-12T19:42:00.000Z',
        sender: 'student',
        type: 'text',
        content: 'Treino concluído',
      });
      const idB = computeMessageId({
        timestampISO: '2026-10-12T19:42:00.000Z',
        sender: 'student',
        type: 'text',
        content: 'Treino concluído',
      });
      expect(idA).toBe(idB);
      expect(idA.startsWith('wa_')).toBe(true);
    });
  });

  describe('6. Transcrição de Áudios via Gemini 2.5 Flash REST API (Regra W4)', () => {
    it('deve transcrever áudio Base64 e classificar tags clínicas quando a API Gemini responde com sucesso', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      transcription:
                        'Professor, a máquina extensora estava em manutenção hoje, fiz no leg press com 120kg.',
                      clinicalSummary: 'Extensora em manutenção; substituiu por Leg Press 120kg.',
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });

      const result = await transcribeAudioWithGemini('UklGRiQAAABXQVZFZm10', 'audio/ogg', 'fake-api-key', {
        fetchImpl: mockFetch,
        durationLabel: '0:28',
      });

      expect(result.fromFallback).toBe(false);
      expect(result.transcription).toContain('máquina extensora estava em manutenção');
      expect(result.clinicalSummary).toBe('Extensora em manutenção; substituiu por Leg Press 120kg.');
      expect(result.clinicalTags).toContain('equipamento_academia');
      expect(result.clinicalTags).toContain('carga_pr');
    });

    it('deve retornar fallback gracioso sem quebrar quando apiKey estiver ausente ou ocorrer erro HTTP', async () => {
      const noKeyRes = await transcribeAudioWithGemini('UklGRiQAAABXQVZFZm10', 'audio/ogg', '', {
        durationLabel: '0:15',
      });
      expect(noKeyRes.fromFallback).toBe(true);
      expect(noKeyRes.transcription).toBe('[Áudio (0:15) - transcrição pendente]');
    });
  });

  describe('7. Formatação Markdown da Seção 6 do Dossiê (Regra W5)', () => {
    it('deve formatar a Seção 6 com destaques clínicos e tabela cronológica contendo transcrições de áudio', () => {
      const sampleCache = {
        studentName: 'Diandra Teo',
        matchedChatTitle: 'Diandra Teo',
        matchedVia: 'label:Consultoria',
        lastSyncAt: '2026-10-17T00:25:00.000Z',
        messages: [
          {
            id: 'm1',
            timestamp: '2026-10-12T19:42:00.000Z',
            dateBR: '12/10/2026 19:42',
            sender: 'student',
            type: 'text',
            text: 'Senti leve incômodo atrás do joelho na cadeira flexora.',
            clinicalTags: ['dor_lesao', 'equipamento_academia'],
          },
          {
            id: 'm2',
            timestamp: '2026-10-13T10:15:00.000Z',
            dateBR: '13/10/2026 10:15',
            sender: 'student',
            type: 'audio',
            audioDuration: '0:42',
            transcription: 'Vou viajar quinta e sexta a trabalho.',
            clinicalSummary: 'Viagem quinta e sexta a trabalho.',
            clinicalTags: ['rotina_viagem'],
          },
        ],
      };

      const md = formatWhatsAppSectionMarkdown(sampleCache);
      expect(md).toContain('## 6. Histórico de Conversas & Áudios (WhatsApp)');
      expect(md).toContain('label:Consultoria');
      expect(md).toContain('1 áudios transcritos');
      expect(md).toContain('### Destaques Clínicos, Biomecânicos e de Rotina (WhatsApp)');
      expect(md).toContain('🎤 [Áudio transcrito]: "Vou viajar quinta e sexta a trabalho."');
    });
  });

  describe('8. Regressão: Correspondência de CRM e Anamnese Insensível a Diacríticos (Victor Miranda Magalhães)', () => {
    it('deve normalizar nomes removendo acentos (NFD), caixa alta e espaços múltiplos', () => {
      expect(normalizeNameForComparison('VICTOR MIRANDA MAGALHAES')).toBe('victor miranda magalhaes');
      expect(normalizeNameForComparison('Victor Miranda Magalhães')).toBe('victor miranda magalhaes');
      expect(normalizeNameForComparison('  Antônia   Cemira  Carneiro ')).toBe('antonia cemira carneiro');
    });

    it('deve vincular "VICTOR MIRANDA MAGALHAES" (sem acento e sem fitcoach_student_id) ao CRM e Anamnese "Victor Miranda Magalhães" (com acento)', () => {
      const fitcoachStudent = {
        fitcoachId: '2fb599a0-3b1d-4592-8795-c45d47c105bd',
        name: 'VICTOR MIRANDA MAGALHAES',
        email: 'victormirandamagalhaes@fitcoach.com',
      };

      const crmAlunos = [
        {
          id: '876e18aa-b778-420c-afeb-d40f82cc5190',
          nome: 'Victor Miranda Magalhães',
          telefone: '(21) 99965-3320',
          fitcoach_student_id: null,
        },
      ];

      const anamneses = [
        {
          id: '876e18aa-b778-420c-afeb-d40f82cc5190',
          status: 'pending',
          created_at: '2026-10-15T13:59:50.799Z',
          content: {
            fullName: 'Victor Miranda Magalhães',
            whatsapp: '(21) 99965-3320',
            fitcoachEmail: 'victormirandamagalhaes@fitcoach.com',
            primaryGoal: 'definicao',
            age: '36',
            weight: '88',
          },
        },
      ];

      const matched = matchStudentAnamneseAndCrm(fitcoachStudent, crmAlunos, anamneses);
      expect(matched.crmAluno).not.toBeNull();
      expect(matched.crmAluno?.id).toBe('876e18aa-b778-420c-afeb-d40f82cc5190');
      expect(matched.anamnese).not.toBeNull();
      expect(matched.anamnese?.id).toBe('876e18aa-b778-420c-afeb-d40f82cc5190');
      expect(matched.anamnese?.content?.primaryGoal).toBe('definicao');
      expect(matched.phone).toBe('(21) 99965-3320');
    });

    it('deve vincular "VICTOR MIRANDA MAGALHAES" à anamnese "Victor Magalhães" mesmo sem nome do meio e sem registro na tabela aluno', () => {
      const fitcoachStudent = {
        fitcoachId: '2fb599a0-3b1d-4592-8795-c45d47c105bd',
        name: 'VICTOR MIRANDA MAGALHAES',
        email: null,
      };

      const anamneses = [
        {
          id: 'anam-victor-short',
          content: {
            fullName: 'Victor Magalhães',
            whatsapp: '(21) 99965-3320',
            primaryGoal: 'definicao',
          },
        },
      ];

      const matched = matchStudentAnamneseAndCrm(fitcoachStudent, [], anamneses);
      expect(matched.crmAluno).toBeNull();
      expect(matched.anamnese).not.toBeNull();
      expect(matched.anamnese?.id).toBe('anam-victor-short');
      expect(matched.phone).toBe('(21) 99965-3320');
    });
  });
});

