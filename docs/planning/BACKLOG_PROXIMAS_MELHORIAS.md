# Backlog de Próximas Melhorias Técnicas e Otimizações

Documento gerado para registro de observações arquiteturais e pontos de atenção identificados durante a execução autônoma do Gauntlet Loop e suíte de testes.

---

### 1. Otimização de Chunks do Recharts no Rollup / Vite [RESOLVIDO / CONCLUÍDO]
- **Diagnóstico:** O Vite/Rollup emitia um aviso informando que os módulos do `recharts` (`Bar.js` e `CartesianChart`) estavam distribuídos entre chunks diferentes (`manualChunks` no `vite.config.ts`), gerando dependência circular leve entre chunks.
- **Resolução (15/10/2026):**
  - Adicionado `'vendor-recharts': ['recharts']` em `vite.config.ts -> rollupOptions.output.manualChunks`.
  - Resultado no build: Criado chunk dedicado `dist/assets/vendor-recharts-C0ZUWiqA.js` (358.18 kB │ gzip: 107.40 kB).
  - Aviso de dependência circular eliminado com zero warnings de empacotamento.

### 2. Atualização da Base Caniuse-Lite (Browserslist) [RESOLVIDO / CONCLUÍDO]
- **Diagnóstico:** A base do `caniuse-lite` possuía mais de 10 meses.
- **Resolução (15/10/2026):**
  - Executado `npx --yes update-browserslist-db@latest` com sucesso.
  - Atualizado da versão `1.0.30001761` para a versão mais recente `1.0.30001816` no lockfile.
  - Diretrizes de compatibilidade com navegadores legados e modernos 100% atualizadas.

---
*Atualizado em 15/10/2026 após execução do Gauntlet Builder e validação com suíte de testes 100% verde (88/88 testes).*
