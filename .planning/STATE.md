# STATE — Fitcoach Pro

**Última Atualização:** 15 de Outubro de 2026  
**Fase Ativa:** Fase 11 — Otimização de Chunks do Recharts no Rollup / Vite & Atualização Caniuse-Lite (Concluída com Sucesso)  
**Status Global:** Saúde excelente, 0 erros TypeScript (`tsc --noEmit`), 88 testes automatizados Vitest passando (100% em 9 arquivos de teste), build de produção Vite 100% OK em 11.78s sem warnings de dependência circular, chunk dedicado `vendor-recharts` (358.18 kB │ gzip: 107.40 kB) gerado com sucesso, base `caniuse-lite` atualizada de `1.0.30001761` para `1.0.30001816` via `update-browserslist-db`, banco de dados Supabase com enum `set_type` estendido e compatível, dados de treino e séries de Maria Aparecida recuperados com integridade matemática e empírica (17 séries, 5808 kg), Laudo de Auditoria Gauntlet Critic com nota máxima **3.00 / 3.00 (Média 6D — PASS)** ([`QA_REPORT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_rollup_and_caniuse.md)) e Laudo Craft Auditor **PASS** ([`CRAFT_AUDIT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/CRAFT_AUDIT_rollup_and_caniuse.md)).

---

## 🎯 Marco Atual Concluído
- **Objetivo**: Otimização do empacotamento do Vite/Rollup eliminando warnings de dependência circular através da segregação do Recharts em chunk dedicado de vendor, atualização da base de dados de compatibilidade de navegadores `caniuse-lite` (Browserslist) e resolução formal dos itens no backlog técnico.
- **Entregáveis da Fatia Vertical (End-to-End)**:
  - **Isolamento de Chunks no Rollup / Vite ([`vite.config.ts`](file:///c:/Users/Gustavo/Desktop/Fitcoach/vite.config.ts))**:
    - Configuração de `'vendor-recharts': ['recharts']` em `build.rollupOptions.output.manualChunks`.
    - Geração do chunk dedicado `dist/assets/vendor-recharts-C0ZUWiqA.js` (358.18 kB │ gzip: 107.40 kB), erradicando avisos de circularidade entre `Bar.js` e `CartesianChart`.
  - **Atualização da Base Caniuse-Lite ([`package-lock.json`](file:///c:/Users/Gustavo/Desktop/Fitcoach/package-lock.json))**:
    - Execução do `npx --yes update-browserslist-db@latest`, atualizando o pacote `caniuse-lite` da versão defasada `1.0.30001761` para `1.0.30001816` (0 vulnerabilities no lockfile).
  - **Saneamento de Backlog Técnico ([`docs/planning/BACKLOG_PROXIMAS_MELHORIAS.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/planning/BACKLOG_PROXIMAS_MELHORIAS.md))**:
    - Fechamento formal dos itens 1 e 2 do backlog com registro histórico e evidências físicas auditadas.
  - **Validação Automatizada Abrangente**:
    - 88/88 testes automatizados no Vitest em 9 arquivos (100% de sucesso).
    - 0 erros TypeScript (`tsc --noEmit`), build Vite concluído em 11.78s gerando 778 módulos e Laudo Gauntlet Critic aprovado com nota máxima **3.00 / 3.00 (Média 6D — PASS)** ([`QA_REPORT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_rollup_and_caniuse.md)).

---

## 🔒 Decisões Travadas (Locked Decisions)
- **Isolamento Granular de Vendor Chunks no Rollup / Vite (`manualChunks`):** Módulos pesados e autônomos de visualização/gráficos (`recharts`) residem compulsoriamente em chunk dedicado (`vendor-recharts`), erradicando dependências circulares entre chunks e otimizando o cache HTTP do navegador para os demais vendors (`vendor-react`, `vendor-supabase`).
- **Atualização Contínua da Base de Navegadores (`caniuse-lite`):** A base de dados do browserslist é mantida atualizada periodicamente através de `npx update-browserslist-db@latest` para assegurar compilações de produção com alvos de compatibilidade precisos e sem alertas obsoletos.
- **Sanitização Universal de `set_type` (`sanitizeSetType`):** Todas as inserções em `set_logs` (diretas no player, pela fila offline ou via auto-finalização de treinos obsoletos) passam compulsoriamente por `sanitizeSetType()` em `utils/specialSetTokens.ts`, normalizando variantes e aplicando fallback seguro para `'working'`.
- **Desdobramento de Dropsets & Compatibilidade no Postgres:** Sub-séries de dropset desdobram como tipo `'drop'`, mantendo conformidade com o enum nativo do PostgreSQL. Em paralelo, a migration `20261014000000_add_dropset_to_set_type_enum.sql` adicionou `'dropset'` ao tipo enumerado `set_type` no Postgres para retrocompatibilidade total com schemas legados e payloads desnormalizados.
- **Preservação Perpétua de Histórico na Fila Offline (Anti-Data-Loss):** A fila offline do aluno NUNCA descarta silenciosamente treinos realizados. Falhas de conexão retêm os itens na fila (`remainingQueue.push(item)`) com registro de `lastError`, protegendo o histórico do atleta até a rede ser restabelecida.
- **Suporte Completo a Sub-Séries (`sub_sets_records`) e Metadados nos Serviços:** O serviço de sincronização offline e o detector de treinos obsoletos (`staleWorkoutService.ts`) processam integralmente sub-séries concluídas de métodos avançados com todos os metadados das 4 camadas (`group_round`, `set_method`, `micro_set_index`, `execution_mode`, `tempo_used`, `timer_mode`).
- **Recuperação com Fidelidade Matemática e Empírica (Maria Aparecida 14/10/2026):** O treino de 14/10/2026 da aluna Maria Aparecida (`156372b5-22f3-4a0d-98c8-e91a36fce1fc`) foi restaurado com fidelidade matemática exata (17 séries, 5807.50 kg de volume, feedback técnico da panturrilha) e protegido por script de execução idempotente.
- **Taxonomia Ortogonal em 4 Camadas:** Separação estrita e independente entre Camada 1 (Agrupamento entre exercícios), Camada 2 (Método da série), Camada 3 (Modo de execução/cadência) e Camada 4 (Timers & Rest).
- **Tabela Relacional Dedicada `exercise_groups`:** Agrupamentos residem em tabela própria com integridade referencial, foreign keys e controle de rounds (`rounds`), tempo de descanso entre rounds (`rest_between_rounds_seconds`) e tempo de transição entre exercícios (`transition_rest_seconds`).
- **Rollback Cirúrgico Resiliente:** Persistência de treinos e auto-finalização no aluno possuem rollback explícito (`delete().eq('id', createdLogId)`) em caso de erro na gravação de séries, prevenindo registros órfãos.
- **Padrão Visual Nativo & Geometria Limpa:** Remoção de bordas laterais grossas (`border-l-4`) em favor da estética original arredondada e limpa do app. Cores de métodos atuam exclusivamente como fundo suave (`bg-*-50/60`) durante o estado ativo/pendente.
- **Transição Compulsória para Verde Claro no Check:** Qualquer série ou sub-série marcada com `[✓]` assume compulsoriamente o fundo verde claro padrão do aplicativo (`bg-emerald-100/70 dark:bg-emerald-900/30`), garantindo feedback visual consistente em toda a experiência de treino.
- **Independência Estrita de Sub-Séries & Drops:** O check na série mãe não auto-conclui sub-séries. Cada etapa fracionada exige check individual, respeitando o fluxo sequencial real do atleta.
- **Timer Único Inferior Padrão:** Micro-pausas de métodos (ex: 15s em Rest-Pause) e descansos convencionais compartilham a mesma infraestrutura do cronômetro inferior flutuante, eliminando poluição de múltiplos timers simultâneos em tela.

---

## 📊 Métricas de Qualidade
- **TypeScript:** 0 erros de tipagem estática (`tsc --noEmit`)
- **Testes Automatizados (Vitest):** 88 passed / 88 total (100% de sucesso em 9 arquivos de teste)
  - `utils/specialSetTokens.test.ts`: 14/14 passed
  - `utils/workoutHistoryGrouper.test.ts`: 5/5 passed
  - `utils/sessionComparison.test.ts`: 13/13 passed
  - `utils/studentStatus.test.ts`: 20/20 passed
  - Demais arquivos da suíte: 36/36 passed
- **Build de Produção:** Vite build 100% concluído em 11.78s sem erros ou warnings de dependência circular (`npm run build`)
- **Chunk Dedicado:** `dist/assets/vendor-recharts-C0ZUWiqA.js` isolado (358.18 kB │ gzip: 107.40 kB)
- **Base Browserslist:** caniuse-lite atualizada para versão `1.0.30001816`
- **Acessibilidade:** 0 violações críticas P0 (WAI-ARIA `role="dialog"`, touch targets $\ge 44\text{px}$, suporte a tecla `Escape` em 100% dos modais)
- **Laudo Gauntlet Critic (rollup_and_caniuse):** **3.00 / 3.00 (Média 6D — PASS)** documentado em [`QA_REPORT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/QA_REPORT_rollup_and_caniuse.md)
- **Laudo Craft Auditor:** **PASS (0 erros estáticos, build limpo, secrets protegidos)** documentado em [`CRAFT_AUDIT_rollup_and_caniuse.md`](file:///c:/Users/Gustavo/Desktop/Fitcoach/docs/gauntlet/CRAFT_AUDIT_rollup_and_caniuse.md)

---

## 🚀 Próximo Passo
- Alinhamento de novas fatias verticais ou expansões de produto no ecossistema Fitcoach Pro.
