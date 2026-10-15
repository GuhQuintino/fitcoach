# Backlog de Próximas Melhorias Técnicas e Otimizações

Documento gerado para registro de observações arquiteturais e pontos de atenção identificados durante a execução autônoma do Gauntlet Loop e suíte de testes.

---

### 1. Otimização de Chunks do Recharts no Rollup / Vite
- **Diagnóstico:** O Vite/Rollup emite um aviso informando que os módulos do `recharts` (`Bar.js` e `CartesianChart`) estão distribuídos entre chunks diferentes (`manualChunks` no `vite.config.ts`), gerando dependência circular leve entre chunks.
- **Impacto Atual:** Baixo. A compilação é concluída com sucesso (11.07s) e os gráficos de evolução e histórico renderizam sem quebra em runtime.
- **Proposta para Próxima Leva:** 
  - Adicionar `'vendor-recharts': ['recharts']` em `vite.config.ts -> rollupOptions.output.manualChunks` para consolidar toda a biblioteca de gráficos em um único chunk estático e cacheável.

### 2. Atualização da Base Caniuse-Lite (Browserslist)
- **Diagnóstico:** A base do `caniuse-lite` possui mais de 10 meses.
- **Proposta para Próxima Leva:**
  - Executar `npx update-browserslist-db@latest` para manter as diretrizes de compatibilidade com navegadores legados e modernos atualizadas.

---
*Registrado em 15/10/2026 durante o ciclo de testes e governança do Gauntlet Loop.*
