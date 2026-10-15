# Slice Summary - Otimização de Chunks do Recharts & Atualização Caniuse-Lite

- **Status:** COMPLETED
- **Perfil / Stack:** full-stack (React 19 + TypeScript + Vite + TailwindCSS + Supabase / PostgreSQL)
- **Arquivos Criados/Modificados:**
  - `vite.config.ts`: Adicionado chunk dedicado `'vendor-recharts': ['recharts']` em `build.rollupOptions.output.manualChunks`.
  - `package-lock.json`: Atualizado `caniuse-lite` da versão `1.0.30001761` para `1.0.30001816` via `npx update-browserslist-db@latest`.
  - `docs/planning/BACKLOG_PROXIMAS_MELHORIAS.md`: Marcados itens 1 e 2 como `[RESOLVIDO / CONCLUÍDO]` com histórico e evidências.

### Entregas End-to-End da Fatia:
1. **Dados & Modelos:**
   - N/A (fatia puramente de infraestrutura de build e compatibilidade web).
2. **Serviços & Contratos:**
   - Configuração de build Rollup/Vite otimizada para cache granular no navegador.
   - Base de navegadores caniuse-lite atualizada para a versão mais recente do registro.
3. **Interface & Componentes:**
   - Gráficos Recharts agora isolados no chunk `dist/assets/vendor-recharts-C0ZUWiqA.js` (358.18 kB │ gzip: 107.40 kB).
   - Aviso de dependência circular no Rollup eliminado completamente.
4. **Testes & Validação:**
   - `npm run build`: Compilação de produção bem-sucedida em 20.94s, gerando `vendor-recharts` isolado e zero avisos de dependência circular.
   - `npm test`: 9 arquivos de teste executados e 88/88 testes passando com 100% de sucesso (2.06s).

### Desvios / Decisões Técnicas (Deviation Rules):
- Nenhum desvio necessário. Ambas as correções foram cirúrgicas e determinísticas.

### Handover para Stage 3 / Stage 4:
- Pode ser verificado diretamente com `npm run build` e `npm test`.
