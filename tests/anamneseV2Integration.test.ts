import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  formatAnamneseDossierLines,
  MACHINE_LABELS as FITCOACH_MACHINE_LABELS,
  normalizeAnamneseContent,
} from '../.agents/skills/weekly-workout-adjuster/scripts/anamnese_utils.mjs';
import {
  MACHINE_LABELS as QUESTIONARIOS_MACHINE_LABELS,
} from '../../Questionários/src/domain/anamnese/normalizer';
import { MACHINE_CATALOG as CONSULTORIA_MACHINE_CATALOG } from '../../Consultoria/src/lib/anamnese/v2';
import { matchStudentAnamneseAndCrm } from '../.agents/skills/weekly-workout-adjuster/scripts/whatsapp_utils.mjs';
import { generateDossiersFromData } from '../.agents/skills/weekly-workout-adjuster/scripts/generate_all_student_dossiers.mjs';
import { buildCrmDataForStudent } from '../.agents/skills/weekly-workout-adjuster/scripts/fetch_weekly_review.mjs';

describe('Fitcoach Integração Anamnese v2 + Legado v1', () => {
  it('recupera agenda combinada, alternância qui/sáb, jiu-jitsu seg/qua leve e rola pesado sexta no normalizer e dossiê', () => {
    const fictionalV2 = {
      schemaVersion: '2.0',
      version: 2,
      submissionId: 'sub-fit-jj-01',
      fullName: 'Lucas Fictício Silva',
      age: '29',
      gender: 'Masculino',
      weight: '82.5',
      weightUnit: 'kg',
      weightKg: 82.5,
      height: '178',
      heightUnit: 'cm',
      heightCm: 178,
      whatsapp: '11999990001',
      profession: 'Analista',
      agendaSemanal: {
        status: 'definida',
        musculacao: {
          diasFixos: ['seg', 'ter', 'sex'],
          alternancias: [
            {
              id: 'alt-1',
              diaPrincipal: 'qui',
              diaAlternativo: 'sab',
              frequencia: 'semanas_alternadas',
            },
          ],
          metaDiasPorSemana: 4,
          duracaoPadraoMinutos: 60,
          horarioPreferido: 'noite',
        },
        outrasAtividades: {
          possui: 'sim',
          itens: [
            {
              id: 'jj-1',
              modalidade: 'Jiu-Jitsu',
              frequenciaSemanal: 3,
              dias: ['seg', 'qua', 'sex'],
              duracaoAproximadaMinutos: 90,
              intensidadePorDia: { seg: 'leve', qua: 'leve', sex: 'pesada' },
              sessaoMaisPuxada: {
                tipo: 'dia_especifico',
                dia: 'sex',
                descricao: 'Rola pesado',
              },
              coincideComMusculacao: 'sim',
              diasCoincidentes: ['seg', 'sex'],
              tempoDisponivelMusculacaoNoDiaCoincidenteMinutos: 45,
            },
          ],
        },
      },
      objetivos: {
        objetivoPrincipal: 'hipertrofia',
        gruposPrioritariosStatus: 'selecionados',
        gruposMuscularesPrioritarios: ['Costas / Dorsal', 'Ombros (Deltoides)'],
        prazoOuEventoAlvo: 'nenhum',
      },
      historicoTreino: {
        fitnessLevel: 'intermediario',
        situacaoAtual: 'Treina há 2 anos',
        tempoNaFichaAtual: 'mais_6_meses',
        ondeTravouStatus: 'identificado',
        ondeTravouTags: ['cargas'],
        fichaAtualTexto: 'Puxada 4x10',
        printsTreino: [{ id: 'p1', path: 'workout-prints/sub-fit-jj-01/ficha.png' }],
        cargasRecentesStatus: 'informadas',
        cargasRecentes: [{ exercicio: 'Supino Reto', cargaKg: '70', repeticoes: '8' }],
      },
      preferenciasELogistica: {
        exerciciosQueGostaStatus: 'informado',
        exerciciosQueGosta: 'Barra fixa',
        exerciciosParaEvitarStatus: 'nenhum',
        exerciciosQueNaoConsegueStatus: 'nao_informado',
        treinaComParceiro: 'sozinho',
        incrementoMinimoPeso: 'padrao_academia',
      },
      equipamentos: {
        localTreino: 'academia',
        maquinasDisponiveis: {
          'cadeira-extensora': 'sim',
          'agachamento-hack': 'nao',
          'gluteo-maquina': 'nao_sei',
        },
      },
      recuperacaoESaude: {
        fatoresQueAfetamTreinoStatus: 'sim',
        fatoresQueAfetamTreino: ['outro_esporte'],
        qualidadeSono: 'boa',
        nivelEstresse: 'moderado',
        dorOuLesao: { possui: 'nenhum', regioes: [] },
        condicaoMedicaOuMedicacao: { possui: 'nenhum' },
        documentosMedicos: [],
      },
    };

    const summary = normalizeAnamneseContent(fictionalV2);
    expect(summary.schemaVersion).toBe('2.0');
    expect(summary.agenda.alternancias[0].label).toContain('Quinta-feira ou Sábado');
    expect(summary.agenda.sessaoMaisPesadaSemana).toContain('Rola pesado');
    expect(summary.preferenciasELogistica.evitar).toBe('Nenhum');
    expect(summary.preferenciasELogistica.naoConsegue).toBe('Não informado');
    expect(summary.equipamentos.maquinasConfirmadas.map((m) => m.nome)).toContain('Cadeira Extensora');
    expect(summary.equipamentos.maquinasAusentes.map((m) => m.nome)).toContain('Agachamento Hack');
    expect(summary.equipamentos.maquinasNaoSabe.map((m) => m.nome)).toContain('Máquina de Glúteo / Coice');

    const mdLines = formatAnamneseDossierLines(summary).join('\n');
    expect(mdLines).toContain('Grade Combinada (Seg–Dom)');
    expect(mdLines).toContain('Quinta-feira ou Sábado (semanas alternadas)');
    expect(mdLines).toContain('Sexta-feira — Rola pesado');
    expect(mdLines).toContain('Tempo musculação: 45 min');
    expect(mdLines).toContain('Máquinas disponíveis');
    expect(mdLines).toContain('Máquinas a confirmar ("Não sei")');
    expect(mdLines).toContain('Pendências para o 1º Check-in');
  });

  it('matchStudentAnamneseAndCrm vincula anamnese por aluno_id mesmo com anamnese.id diferente de aluno.id', () => {
    const match = matchStudentAnamneseAndCrm(
      { fitcoachId: 'fc-1', name: 'Lucas Fictício Silva', email: 'lucas@fitcoach.com' },
      [{ id: 'crm-aluno-1', nome: 'Lucas Fictício Silva', telefone: '11999990001', fitcoach_student_id: 'fc-1' }],
      [{ id: 'anam-uuid-diferente', aluno_id: 'crm-aluno-1', content: { fullName: 'Lucas Fictício Silva' } }],
    );

    expect(match.crmAluno?.id).toBe('crm-aluno-1');
    expect(match.anamnese?.id).toBe('anam-uuid-diferente');
  });

  it('mantém compatibilidade com anamnese v1 antiga e trata rotina marcada como "varia"', () => {
    const v1Summary = normalizeAnamneseContent({
      fullName: 'Carla Legada',
      primaryGoal: 'hipertrofia',
      daysPerWeek: '4',
      timePerWorkout: '50',
      trainingLocation: 'academia',
      currentActivity: 'Nenhuma',
      hasInjuries: 'nao',
      hasDiseases: 'nao',
      fitnessLevel: 'intermediario',
    });

    expect(v1Summary.schemaVersion).toBe('1.0');
    expect(v1Summary.isLegacy).toBe(true);
    expect(v1Summary.agenda.outrasAtividadesResumo).toBe('Nenhum');
    expect(v1Summary.saudeERecuperacao.dorOuLesao.status).toBe('nenhum');

    const variaSummary = normalizeAnamneseContent({
      schemaVersion: '2.0',
      version: 2,
      agendaSemanal: {
        status: 'varia',
        musculacao: { diasFixos: [], alternancias: [], metaDiasPorSemana: 'varia', duracaoPadraoMinutos: 'ainda_nao_sei' },
        outrasAtividades: { possui: 'nao_informado', itens: [] },
      },
      objetivos: { objetivoPrincipal: 'saude_longevidade', gruposPrioritariosStatus: 'nao_informado', gruposMuscularesPrioritarios: [] },
      historicoTreino: { fitnessLevel: 'iniciante', situacaoAtual: 'Iniciando' },
      equipamentos: { localTreino: 'casa', maquinasDisponiveis: {} },
      recuperacaoESaude: { dorOuLesao: { possui: 'nenhum', regioes: [] }, condicaoMedicaOuMedicacao: { possui: 'nenhum' } },
    });

    expect(variaSummary.agenda.status).toBe('varia');
    expect(variaSummary.agenda.outrasAtividadesResumo).toBe('Não informado');
    expect(variaSummary.pendencias.some((p) => p.codigo === 'agenda_variavel')).toBe(true);
    expect(
      variaSummary.perguntasSugeridasPrimeiroCheckin.some((q) => q.origemPendencia === 'agenda_variavel'),
    ).toBe(true);
  });

  it('corrige labels PT, todas_leves sem falso alerta pesado, 18%%, legado Nenhuma e dossiê completo >320 chars', () => {
    const longRoutineText = 'Treino A Peito/Tríceps ' + 'Supino reto 4x8 '.repeat(35);
    const summary = normalizeAnamneseContent({
      schemaVersion: '2.0',
      version: 2,
      fullName: 'Atleta Completo',
      bodyFat: '18%',
      naoEnviarFotosAgora: false,
      agendaSemanal: {
        status: 'definida',
        musculacao: { diasFixos: ['seg', 'qua', 'sex'], alternancias: [], metaDiasPorSemana: 3, duracaoPadraoMinutos: 60 },
        outrasAtividades: {
          possui: 'sim',
          itens: [
            {
              id: 'surf',
              modalidade: 'Surf',
              frequenciaSemanal: 'varia',
              dias: 'varia',
              duracaoAproximadaMinutos: 60,
              sessaoMaisPuxada: { tipo: 'todas_leves' },
              coincideComMusculacao: 'ainda_nao_sei',
            },
          ],
        },
      },
      objetivos: { objetivoPrincipal: 'condicionamento_esportivo', gruposPrioritariosStatus: 'nenhum', gruposMuscularesPrioritarios: [] },
      historicoTreino: {
        fitnessLevel: 'intermediario',
        situacaoAtual: 'Treino regular',
        fichaAtualTexto: longRoutineText,
        ondeTravouStatus: 'nenhum',
        cargasRecentesStatus: 'nenhum',
      },
      equipamentos: { localTreino: 'casa', maquinasDisponiveis: {}, outrosEquipamentos: [], cargaMaximaDisponivelKg: '40 kg', observacoesEquipamentos: 'Barra fixa na porta' },
      recuperacaoESaude: {
        fatoresQueAfetamTreinoStatus: 'sim',
        fatoresQueAfetamTreino: ['plantao_turno'],
        detalhesRotinaRecuperacao: 'Plantões às terças à noite',
        qualidadeSono: 'boa',
        nivelEstresse: 'muito_alto',
        dorOuLesao: { possui: 'nenhum', regioes: [] },
        condicaoMedicaOuMedicacao: {
          possui: 'sim',
          descricao: 'Asma leve',
          medicamentos: 'Bombinha SOS',
          orientacaoMedicaOuRestricao: 'Aquecer progressivamente antes de aeróbio intenso',
        },
      },
    });

    expect(summary.identificacao.gorduraCorporal).toBe('18%');
    expect(summary.objetivos.objetivoPrincipal).toBe('Apoio a outro esporte');
    expect(summary.historico.nivel).toBe('Intermediário');
    expect(summary.saudeERecuperacao.qualidadeSono).toBe('Boa');
    expect(summary.saudeERecuperacao.nivelEstresse).toBe('Muito alto');
    expect(summary.midiaELgpd.naoEnviouFotos).toBe(true);
    expect(summary.perguntasSugeridasPrimeiroCheckin.some((q) => q.id === 'chk-fadiga-sessao-pesada')).toBe(false);
    expect(summary.pendencias.some((p) => p.codigo === 'esporte_agenda_indefinida')).toBe(true);

    const lines = formatAnamneseDossierLines(summary).join('\n');
    expect(lines).toContain('Plantões às terças à noite');
    expect(lines).toContain('Aquecer progressivamente antes de aeróbio intenso');
    expect(lines).toContain('Barra fixa na porta');
    expect(lines).toContain('40 kg');
    expect(lines.length).toBeGreaterThan(700);
    expect(lines).toContain(longRoutineText.trim().slice(0, 500));

    const v1Summary = normalizeAnamneseContent({
      fullName: 'Legado Limpo',
      hasInjuries: 'nao',
      hasDiseases: 'nao',
    });
    expect(v1Summary.saudeERecuperacao.dorOuLesao.orientacaoProfissional).toBe('Nenhuma');
    expect(v1Summary.saudeERecuperacao.condicaoMedica.orientacaoMedica).toBe('Nenhuma');
  });

  it('executa generateDossiersFromData em diretório temporário e buildCrmDataForStudent (fetch_weekly_review) para perfil fictício completo + legado v1 + varia', async () => {
    const fictionalV2 = {
      schemaVersion: '2.0',
      version: 2,
      submissionId: 'sub-sandbox-jj-01',
      fullName: 'Lucas Fictício Silva',
      age: '29',
      gender: 'Masculino',
      weight: '82,5',
      weightUnit: 'kg',
      weightKg: 82.5,
      height: '1,78',
      heightUnit: 'm',
      heightCm: 178,
      whatsapp: '11999990001',
      profession: 'Analista',
      selectedPlan: 'trimestral',
      agendaSemanal: {
        status: 'definida',
        musculacao: {
          diasFixos: ['seg', 'ter', 'sex'],
          alternancias: [
            {
              id: 'alt-1',
              diaPrincipal: 'qui',
              diaAlternativo: 'sab',
              frequencia: 'semanas_alternadas',
            },
          ],
          metaDiasPorSemana: 4,
          duracaoPadraoMinutos: 60,
          horarioPreferido: 'noite',
        },
        outrasAtividades: {
          possui: 'sim',
          itens: [
            {
              id: 'jj-1',
              modalidade: 'Jiu-Jitsu',
              frequenciaSemanal: 3,
              dias: ['seg', 'qua', 'sex'],
              duracaoAproximadaMinutos: 90,
              intensidadePorDia: { seg: 'leve', qua: 'leve', sex: 'pesada' },
              sessaoMaisPuxada: {
                tipo: 'dia_especifico',
                dia: 'sex',
                descricao: 'Rola pesado',
              },
              coincideComMusculacao: 'sim',
              diasCoincidentes: ['seg', 'sex'],
              tempoDisponivelMusculacaoNoDiaCoincidenteMinutos: 45,
            },
          ],
        },
      },
      objetivos: {
        objetivoPrincipal: 'hipertrofia',
        gruposPrioritariosStatus: 'selecionados',
        gruposMuscularesPrioritarios: ['Costas / Dorsal', 'Ombros (Deltoides)'],
        prazoOuEventoAlvo: 'nenhum',
      },
      historicoTreino: {
        fitnessLevel: 'intermediario',
        situacaoAtual: 'Treina há 2 anos',
        tempoNaFichaAtual: 'mais_6_meses',
        ondeTravouStatus: 'identificado',
        ondeTravouTags: ['cargas'],
        fichaAtualTexto: 'Puxada aberta 4x10\nRemada curvada 4x8',
        printsTreino: [{ id: 'p1', path: 'workout-prints/sub-sandbox-jj-01/ficha.png' }],
        cargasRecentesStatus: 'informadas',
        cargasRecentes: [{ exercicio: 'Supino Reto', cargaKg: '70', repeticoes: '8' }],
      },
      preferenciasELogistica: {
        exerciciosQueGostaStatus: 'informado',
        exerciciosQueGosta: 'Barra fixa',
        exerciciosParaEvitarStatus: 'nenhum',
        exerciciosQueNaoConsegueStatus: 'nao_informado',
        treinaComParceiro: 'sozinho',
        incrementoMinimoPeso: 'padrao_academia',
      },
      equipamentos: {
        localTreino: 'academia',
        maquinasDisponiveis: {
          'cadeira-extensora': 'sim',
          'agachamento-hack': 'nao',
          'gluteo-maquina': 'nao_sei',
        },
      },
      recuperacaoESaude: {
        fatoresQueAfetamTreinoStatus: 'sim',
        fatoresQueAfetamTreino: ['outro_esporte'],
        qualidadeSono: 'boa',
        nivelEstresse: 'moderado',
        dorOuLesao: {
          possui: 'sim',
          regioes: ['Ombro'],
          movimentosQueIncomodam: 'Desenvolvimento atrás da nuca',
          orientacaoProfissionalRecebida: 'Evitar rotação interna extrema',
        },
        condicaoMedicaOuMedicacao: { possui: 'nenhum' },
        documentosMedicos: [{ id: 'doc-1', path: 'medical-docs/sub-sandbox-jj-01/laudo.pdf' }],
      },
    };

    const tempDir = mkdtempSync(join(tmpdir(), 'fitcoach-dossier-sandbox-'));
    try {
      const { countDossiersGenerated, generatedFiles } = await generateDossiersFromData(
        [
          {
            slug: 'lucas-ficticio-silva',
            name: 'Lucas Fictício Silva',
            email: 'lucasficticiosilva@fitcoach.com',
            fitcoachId: 'fc-sandbox-1',
            crmId: 'crm-sandbox-1',
            phone: '11999990001',
            routineId: null,
            routineName: null,
            isActive: true,
            createdAt: '2026-11-18T10:00:00Z',
            anamnese: { id: 'anam-sandbox-1', created_at: '2026-11-18T10:00:00Z', content: fictionalV2 },
            checkins: [],
            logs: [],
            exHistory: new Map(),
          },
        ],
        {
          outputDir: tempDir,
          whatsappCacheDir: join(tempDir, '.whatsapp_cache'),
          nowISO: '2026-11-18T18:00:00Z',
          logger: () => undefined,
        },
      );

      expect(countDossiersGenerated).toBe(1);
      expect(generatedFiles).toHaveLength(1);
      const md = readFileSync(generatedFiles[0], 'utf8');

      expect(md).toContain('# Dossiê de Acompanhamento — Lucas Fictício Silva');
      expect(md).toContain('**Alternância Semanal Prevista**: Quinta-feira ou Sábado (semanas alternadas)');
      expect(md).toContain('**Seg**: Musculação (fixo) + Jiu-Jitsu [leve] + Tempo musculação: 45 min');
      expect(md).toContain('**Qua**: Jiu-Jitsu [leve]');
      expect(md).toContain('**Qui**: Musculação (opção principal — Quinta-feira ou Sábado (semanas alternadas))');
      expect(md).toContain('**Sex**: Musculação (fixo) + Jiu-Jitsu [MAIS PESADA] + Tempo musculação: 45 min');
      expect(md).toContain('**Sáb**: Musculação (opção alternativa — Quinta-feira ou Sábado (semanas alternadas))');
      expect(md).toContain('**Sessão Mais Pesada da Semana**: Jiu-Jitsu: Sexta-feira — Rola pesado');
      expect(md).toContain('**Cargas Recentes Declaradas**: Supino Reto: 70 x 8');
      expect(md).toContain('**Máquinas Confirmadas:** Cadeira Extensora');
      expect(md).toContain('**Máquinas Indisponíveis:** Agachamento Hack');
      expect(md).toContain('**Máquinas a Confirmar ("Não sei"):** Máquina de Glúteo / Coice');
      expect(md).toContain('REVISÃO CLÍNICA — Dor/lesão em Ombro');
      expect(md).toContain('ANEXO MÉDICO PRIVADO (LGPD)');
      expect(md).toContain('Pendências abertas da Anamnese');

      const crmData = buildCrmDataForStudent(
        { id: 'fc-sandbox-1', name: 'Lucas Fictício Silva', email: 'lucasficticiosilva@fitcoach.com' },
        [{ id: 'crm-sandbox-1', nome: 'Lucas Fictício Silva', telefone: '11999990001', fitcoach_student_id: 'fc-sandbox-1' }],
        [{ id: 'anam-sandbox-1', aluno_id: 'crm-sandbox-1', created_at: '2026-11-18T10:00:00Z', content: fictionalV2 }],
        new Map(),
      );

      expect(crmData).not.toBeNull();
      expect(crmData?.anamnese?.schemaVersion).toBe('2.0');
      expect(crmData?.anamnese?.resumo.alternancias[0]?.label).toContain('Quinta-feira ou Sábado');
      expect(crmData?.anamnese?.resumo.sessaoMaisPesadaSemana).toContain('Rola pesado');
      expect(crmData?.anamnese?.resumo.preferencias.evitar).toBe('Nenhum');
      expect(crmData?.anamnese?.resumo.preferencias.naoConsegue).toBe('Não informado');
      expect(crmData?.anamnese?.resumo.maquinasConfirmadas).toContain('Cadeira Extensora');
      expect(crmData?.anamnese?.resumo.maquinasAusentes).toContain('Agachamento Hack');
      expect(crmData?.anamnese?.resumo.maquinasNaoSabe).toContain('Máquina de Glúteo / Coice');
      expect(crmData?.anamnese?.resumo.documentosMedicosCount).toBe(1);
      expect(crmData?.anamnese?.resumo.pendencias.some((p: { codigo: string }) => p.codigo === 'agenda_alternancia')).toBe(true);
      expect(
        crmData?.anamnese?.resumo.perguntasSugeridasPrimeiroCheckin.some(
          (q: { origemPendencia: string }) => q.origemPendencia === 'agenda_alternancia',
        ),
      ).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('REGRESSÃO: deriva dia pesado de intensidadePorDia=pesada, preserva diasFixos em rotina=varia, ignora diasCoincidentes quando coincide=nao e expõe lotação/gordura/observações no dossiê e CRM', () => {
    const content = {
      schemaVersion: '2.0',
      version: 2,
      fullName: 'Marcos Fictício Paridade',
      age: '34',
      profession: 'Médico',
      bodyFat: '16',
      agendaSemanal: {
        status: 'varia',
        musculacao: {
          diasFixos: ['seg', 'qua'],
          alternancias: [],
          metaDiasPorSemana: 'varia',
          duracaoPadraoMinutos: 50,
          horarioPreferido: 'varia',
        },
        outrasAtividades: {
          possui: 'sim',
          itens: [
            {
              id: 'corrida',
              modalidade: 'Corrida',
              frequenciaSemanal: 2,
              dias: ['ter', 'sex'],
              duracaoAproximadaMinutos: 60,
              intensidadePorDia: { ter: 'leve', sex: 'pesada' },
              sessaoMaisPuxada: { tipo: 'todas_leves' },
              coincideComMusculacao: 'nao',
              diasCoincidentes: ['sex'],
            },
          ],
        },
      },
      objetivos: {
        objetivoPrincipal: 'forca',
        gruposPrioritariosStatus: 'nenhum',
        gruposMuscularesPrioritarios: [],
      },
      historicoTreino: {
        fitnessLevel: 'intermediario',
        situacaoAtual: 'Treina 2x fixas e varia o resto',
        tempoNaFichaAtual: '1_a_3_meses',
        ondeTravouStatus: 'nenhum',
        cargasRecentesStatus: 'nenhum',
      },
      equipamentos: {
        localTreino: 'academia',
        horarioLotacaoAcademia: 'lotada_pico',
        maquinasDisponiveis: {},
      },
      recuperacaoESaude: {
        fatoresQueAfetamTreinoStatus: 'nenhum',
        qualidadeSono: 'boa',
        nivelEstresse: 'moderado',
        dorOuLesao: { possui: 'nenhum', regioes: [] },
        condicaoMedicaOuMedicacao: { possui: 'nenhum' },
      },
      dietRestrictions: 'Baixo sódio',
      expectations: 'Manter corrida forte sexta sem fadigar lombar',
    };

    const normalized = normalizeAnamneseContent(content);
    expect(normalized).not.toBeNull();
    expect(normalized?.agenda.sessaoMaisPesadaSemana).toContain('Corrida: Sexta-feira');
    expect(normalized?.agenda.sessaoMaisPesadaSemana).not.toContain('Sem sessão pesada extra');
    expect(
      normalized?.saudeERecuperacao.alertasRevisaoTreinador.some((a: string) =>
        a.includes('INTERFERÊNCIA ESPORTIVA'),
      ),
    ).toBe(true);
    expect(
      normalized?.perguntasSugeridasPrimeiroCheckin.some(
        (q: { id: string }) => q.id === 'chk-fadiga-sessao-pesada',
      ),
    ).toBe(true);

    const seg = normalized?.agenda.gradeCombinada.find((d: { dia: string }) => d.dia === 'seg');
    const ter = normalized?.agenda.gradeCombinada.find((d: { dia: string }) => d.dia === 'ter');
    const sex = normalized?.agenda.gradeCombinada.find((d: { dia: string }) => d.dia === 'sex');
    expect(seg?.musculacao).toBe('fixo');
    expect(ter?.musculacao).toBe('varia');
    expect(sex?.outrasAtividades[0]?.maisPuxada).toBe(true);
    expect(sex?.coincide).toBe(false);

    const lines = formatAnamneseDossierLines(normalized).join('\n');
    expect(lines).toContain('% Gordura: 16%');
    expect(lines).toContain('Lotação da academia');
    expect(lines).toContain('Lotada (horário de pico)');
    expect(lines).toContain('Restrições alimentares: Baixo sódio');
    expect(lines).toContain('Expectativas: Manter corrida forte sexta sem fadigar lombar');

    const crmData = buildCrmDataForStudent(
      { id: 'fc-paridade-1', name: 'Marcos Fictício Paridade', email: 'marcos@fitcoach.com' },
      [{ id: 'crm-paridade-1', nome: 'Marcos Fictício Paridade', telefone: '11966665555', fitcoach_student_id: 'fc-paridade-1' }],
      [{ id: 'anam-paridade-1', aluno_id: 'crm-paridade-1', created_at: '2026-11-18T10:00:00Z', content }],
      new Map(),
    );
    expect(crmData?.anamnese?.resumo.horarioLotacaoAcademia).toBe('Lotada (horário de pico)');
    expect(crmData?.anamnese?.resumo.sessaoMaisPesadaSemana).toContain('Corrida: Sexta-feira');
  });

  it('PARIDADE & CARDIO: mantém catálogo de máquinas 100% sincronizado entre Consultoria, Questionários e Fitcoach e propaga logística de cardio', () => {
    const consultoriaIds = CONSULTORIA_MACHINE_CATALOG.map((m) => m.id);
    for (const id of consultoriaIds) {
      expect(FITCOACH_MACHINE_LABELS[id]).toBeTruthy();
      expect(QUESTIONARIOS_MACHINE_LABELS[id]).toBeTruthy();
      expect(FITCOACH_MACHINE_LABELS[id]).toBe(QUESTIONARIOS_MACHINE_LABELS[id]);
    }

    const withCardio = {
      schemaVersion: '2.0',
      version: 2,
      submissionId: 'sub-cardio-parity-1',
      fullName: 'Marcos Cardio Paridade',
      age: '30',
      gender: 'Masculino',
      weight: '80',
      weightUnit: 'kg',
      weightKg: 80,
      height: '178',
      heightUnit: 'cm',
      heightCm: 178,
      whatsapp: '11966665555',
      agendaSemanal: {
        status: 'definida',
        musculacao: {
          diasFixos: ['seg', 'qua', 'sex'],
          alternancias: [],
          metaDiasPorSemana: 3,
          duracaoPadraoMinutos: 60,
          horarioPreferido: 'noite',
        },
        outrasAtividades: { possui: 'nenhum', itens: [] },
      },
      cardio: {
        status: 'definido',
        equipamentosPreferidos: ['escada', 'corda'],
        aversaoCardioContinuo: true,
        diasDisponiveis: ['seg', 'sex'],
        horarioPreferido: 'mesmo_da_musculacao',
        horarioEspecifico: '19:40 após musculação',
        momentoEmRelacaoAoTreino: 'na_academia_depois',
        tempoDisponivelMinutos: 20,
        observacoes: 'Evita esteira contínua',
      },
      objetivos: {
        objetivoPrincipal: 'emagrecimento',
        gruposPrioritariosStatus: 'nenhum',
        gruposMuscularesPrioritarios: [],
      },
      historicoTreino: {
        fitnessLevel: 'intermediario',
        situacaoAtual: 'Treina 3x',
        tempoNaFichaAtual: '1_a_3_meses',
        ondeTravouStatus: 'nenhum',
        cargasRecentesStatus: 'nenhum',
      },
      equipamentos: {
        localTreino: 'academia',
        maquinasDisponiveis: {
          'mesa-flexora': 'sim',
          'remada-t-bar': 'sim',
          'remada-cavalinho': 'sim',
          'banco-romano': 'sim',
          graviton: 'sim',
        },
      },
      recuperacaoESaude: {
        fatoresQueAfetamTreinoStatus: 'nenhum',
        qualidadeSono: 'boa',
        nivelEstresse: 'moderado',
        dorOuLesao: { possui: 'nenhum', regioes: [] },
        condicaoMedicaOuMedicacao: { possui: 'nenhum' },
      },
    };

    const normalized = normalizeAnamneseContent(withCardio);
    expect(normalized?.cardio.equipamentosDisplay).toBe('Escada (simulador), Corda');
    expect(normalized?.cardio.aversaoCardioContinuo).toBe(true);
    expect(normalized?.cardio.diasDisplay).toBe('Seg, Sex');
    expect(normalized?.cardio.tempoDisponivelDisplay).toBe('20 min');

    const lines = formatAnamneseDossierLines(normalized).join('\n');
    expect(lines).toContain('**Cardio & Aeróbios**');
    expect(lines).toContain('Aversão a cardio contínuo');
    expect(lines).toContain('Na academia, logo depois do treino');
    expect(lines).toContain('Mesa Flexora');
    expect(lines).toContain('Remada T-Bar (Apoio no Peito)');

    const crmData = buildCrmDataForStudent(
      { id: 'fc-cardio-1', name: 'Marcos Cardio Paridade', email: 'cardio@fitcoach.com' },
      [{ id: 'crm-cardio-1', nome: 'Marcos Cardio Paridade', telefone: '11966665555', fitcoach_student_id: 'fc-cardio-1' }],
      [{ id: 'anam-cardio-1', aluno_id: 'crm-cardio-1', created_at: '2026-11-18T10:00:00Z', content: withCardio }],
      new Map(),
    );
    expect(crmData?.anamnese?.resumo.cardio?.aversaoCardioContinuo).toBe(true);
    expect(crmData?.anamnese?.resumo.cardio?.tempoDisponivelDisplay).toBe('20 min');
    expect(crmData?.anamnese?.resumo.maquinasConfirmadas).toContain('Remada Cavalinho');
  });
});
