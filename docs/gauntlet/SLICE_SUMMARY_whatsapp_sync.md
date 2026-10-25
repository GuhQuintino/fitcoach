# Slice Summary - Integração do Histórico de Conversas e Áudios do WhatsApp Web nos Dossiês de Alunos (`weekly-workout-adjuster`)

- **Status:** COMPLETED
- **Perfil / Stack:** `data-pipeline` (Node.js ESM + `pg` Session Pooler + Playwright CDP + Gemini 2.5 Flash Multimodal Audio API + Vitest)
- **Arquivos Criados/Modificados:**
  - `C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\scripts\whatsapp_utils.mjs`: Utilitários puros e testáveis (normalização de telefones brasileiros com/sem 9º dígito e últimos 8 dígitos, parser de `data-pre-plain-text`, classificador de tags clínicas/treino, cálculo de janela temporal Cold Start 75d vs Incremental 10d, merge idempotente preservando transcrições de áudio, cliente REST Gemini 2.5 Flash e renderizador Markdown da Seção 6).
  - `C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\scripts\sync_whatsapp_history.mjs`: Script CLI para sincronização incremental via Chrome DevTools Protocol (`--cdp-url`), contexto persistente Playwright (`--launch`) ou importação de payload (`--import-file`), aplicando a estratégia híbrida da Regra W2 (`1º Filtro "Consultoria" -> 2º Telefone -> 3º Nome`).
  - `C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\scripts\generate_all_student_dossiers.mjs`: Atualizado para ler automaticamente `docs/students/.whatsapp_cache/{slug}.json`, suportar `--sync-whatsapp`, injetar a **Seção 6: Histórico de Conversas & Áudios (WhatsApp)** e renumerar **Seção 7: Diretrizes para Revisões Semanais da Skill** em todas as 20 fichas reais em `docs/students/*.md`.
  - `C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\scripts\fetch_weekly_review.mjs`: Atualizado para incluir o objeto `whatsappHistory` (`lastSyncAt`, `matchedVia`, `recentMessages`, `audioTranscriptionsCount`, `clinicalHighlights`) no JSON de revisão semanal e suportar `--sync-whatsapp`.
  - `C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\scripts\apply_approved_adjustments.mjs`: Atualizado para preservar e migrar automaticamente a Seção 6 (WhatsApp) e Seção 7 (Diretrizes) ao persistir `dossierUpdates`.
  - `C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\SKILL.md`, `references/dossier-template.md`, `references/report-template.md` e `C:\Users\Gustavo\Desktop\Fitcoach\docs\students\README.md`: Documentação atualizada com a nova arquitetura e comandos CLI.
  - `C:\Users\Gustavo\.gemini\config\skills\weekly-workout-adjuster\*`: Espelho global 100% sincronizado com todos os scripts, referências e `SKILL.md`.
  - `C:\Users\Gustavo\Desktop\Fitcoach\tests\whatsappDossierSync.test.ts`: Suíte de testes unitários e de integração (Vitest) validando todas as regras W1 a W5.

### Entregas End-to-End das 3 Fatias Verticais:
1. **Fatia Vertical 1 (Motor de Extração WhatsApp Web + Transcrição Gemini + Cache Incremental):**
   - Implementação completa de `whatsapp_utils.mjs` e `sync_whatsapp_history.mjs` atendendo às Regras W1, W2, W3 e W4.
2. **Fatia Vertical 2 (Integração nos Dossiês `docs/students/*.md` e na Revisão Semanal):**
   - Atualização de `generate_all_student_dossiers.mjs`, `fetch_weekly_review.mjs` e `apply_approved_adjustments.mjs`, com regeneração real de todos os 20 dossiês em `C:\Users\Gustavo\Desktop\Fitcoach\docs\students\*.md`.
3. **Fatia Vertical 3 (Documentação, Sincronização Global e Testes Automatizados):**
   - Sincronização integral entre o repositório `Fitcoach` e `~/.gemini/config/skills/weekly-workout-adjuster/`, documentação completa e suíte de testes Vitest (`tests/whatsappDossierSync.test.ts`).

### Desvios / Decisões Técnicas (Deviation Rules):
- Nenhum desvio de escopo. Todos os scripts possuem fallback gracioso caso o navegador CDP ou a chave `GEMINI_API_KEY` não estejam ativos no momento da execução offline.

### Handover para Stage 3 / Stage 4:
- Executar `npx vitest run tests/whatsappDossierSync.test.ts` em `C:\Users\Gustavo\Desktop\Fitcoach`.
- Executar `node "C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\scripts\generate_all_student_dossiers.mjs"` e `node "C:\Users\Gustavo\Desktop\Fitcoach\.agents\skills\weekly-workout-adjuster\scripts\fetch_weekly_review.mjs" --student="Diandra"`.
